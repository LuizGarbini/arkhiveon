-- Bootstrap LOCAL descartável para a 0087. Não é migration de produção.
-- Réplica mínima: auth.uid, papéis, campaigns, memberships, o guard da 0059,
-- a RPC de transferência e as policies de DELETE. Host: 127.0.0.1.

create extension if not exists pgcrypto;

do $$
begin
	if not exists (select 1 from pg_roles where rolname = 'anon') then
		create role anon nologin;
	end if;
	if not exists (select 1 from pg_roles where rolname = 'authenticated') then
		create role authenticated nologin;
	end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);

create or replace function auth.uid()
returns uuid language sql stable as $$
	select nullif(
		coalesce(
			nullif(current_setting('request.jwt.claim.sub', true), ''),
			nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
		),
		''
	)::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.campaigns (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid,
	name text not null default '',
	world_id uuid,
	updated_at timestamptz not null default now()
);

create table public.memberships (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	user_id uuid not null,
	role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
	unique (campaign_id, user_id)
);

create unique index memberships_single_owner_campaign_uidx
	on public.memberships (campaign_id) where role = 'owner';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.campaign_ownership_operations (
	operation_id uuid primary key,
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	previous_owner_id uuid not null,
	new_owner_id uuid not null,
	accepted_invite_id uuid,
	previous_membership_id uuid not null,
	target_membership_id uuid not null
);
revoke all on private.campaign_ownership_operations from public, anon, authenticated;
alter table private.campaign_ownership_operations enable row level security;

create or replace function public.user_campaign_role(p_campaign_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
	select role from memberships
	where campaign_id = p_campaign_id
		and user_id = auth.uid()
	limit 1;
$$;
grant execute on function public.user_campaign_role(uuid) to anon, authenticated;

create or replace function private.guard_campaign_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
	v_operation private.campaign_ownership_operations%rowtype;
	v_row_id uuid;
	v_expected_user uuid;
	v_expected_role text;
begin
	if (select auth.uid()) is null then return coalesce(new, old); end if;

	-- Policies/grants continuam a autorizar membros comuns. Este trigger só abre
	-- owner/delete para a transferência validada ou trigger autônomo de criação.
	if tg_op = 'INSERT' and new.role in ('viewer','editor') then return new; end if;
	if tg_op = 'DELETE' and old.role in ('viewer','editor') then return old; end if;
	if tg_op = 'UPDATE' and old.role in ('viewer','editor')
		and new.role in ('viewer','editor') and new.campaign_id = old.campaign_id
		and new.user_id = old.user_id and new.id = old.id
	then return new; end if;

 -- Trigger autônomo cria a primeira membership de uma cota privada atômica.
	-- Sem essa linha privada, usuário não consegue falsificar autorização via set_config.
	if tg_op = 'INSERT' and new.role = 'owner'
		and new.user_id = (select auth.uid())
		and exists (
			select 1 from private.campaign_ownership_operations o
			where o.operation_id = new.campaign_id and o.campaign_id = new.campaign_id
				and o.previous_owner_id = new.user_id and o.new_owner_id = new.user_id
				and o.previous_membership_id = new.campaign_id and o.target_membership_id = new.campaign_id
		)
		and (select count(*) from public.memberships m where m.campaign_id = new.campaign_id) = 0
	then return new; end if;

	-- Aceite autenticado tem sua própria cota, de execução única. Não depende
	-- da policy de convite pendente (a linha já foi aceita neste AFTER trigger).
	if tg_op = 'INSERT' and new.role in ('viewer','editor')
		and new.user_id = (select auth.uid())
		and exists (
			select 1 from private.campaign_ownership_operations o
			where o.operation_id = current_setting('arkhiveon.invite_accept_operation_id', true)::uuid
				and o.campaign_id = new.campaign_id and o.new_owner_id = new.user_id
				and o.accepted_invite_id = o.previous_membership_id
				and o.previous_owner_id = new.user_id and o.target_membership_id = new.id
		)
	then return new; end if;

	-- Compat F1: repetir exatamente o owner existente pelo client atual é no-op.
	-- Isso nunca cria nem muda papel: só ignora o segundo INSERT redundante de F1.
	-- O banco já contém esse único owner da criação; remover este pedaço é F2.
	if tg_op = 'INSERT' and new.role = 'owner'
		and new.user_id = (select auth.uid())
		and exists (
			select 1 from public.campaigns c
			where c.id = new.campaign_id and c.owner_id = new.user_id
		)
		and exists (
			select 1 from public.memberships m
			where m.campaign_id = new.campaign_id and m.user_id = new.user_id and m.role = 'owner'
		)
		and (select count(*) from public.memberships m where m.campaign_id = new.campaign_id) = 1
	then return null; end if;
	begin
		select o.* into v_operation from private.campaign_ownership_operations o
		where o.operation_id = current_setting('arkhiveon.ownership_operation_id', true)::uuid
			and o.previous_owner_id = (select auth.uid());
	exception when invalid_text_representation then
		raise exception 'transferência de mestre não permitida' using errcode = '42501';
	end;
	v_row_id := case when tg_op = 'DELETE' then old.id else new.id end;
	v_expected_user := case when v_row_id = v_operation.previous_membership_id
		then v_operation.previous_owner_id else v_operation.new_owner_id end;
	v_expected_role := case when v_row_id = v_operation.previous_membership_id
		then 'editor' else 'owner' end;

	if v_operation.operation_id is not null and v_row_id not in (
		v_operation.previous_membership_id, v_operation.target_membership_id
	) then
		raise exception 'transferência de mestre não permitida' using errcode = '42501';
	end if;
	if tg_op <> 'UPDATE' or v_operation.operation_id is null
		or old.campaign_id is distinct from v_operation.campaign_id
		or old.id not in (v_operation.previous_membership_id, v_operation.target_membership_id)
		or new.id is distinct from old.id or new.campaign_id is distinct from old.campaign_id
		or new.user_id is distinct from v_expected_user or new.role is distinct from v_expected_role
		or (old.id = v_operation.previous_membership_id
			and (old.role <> 'owner' or old.user_id <> v_operation.previous_owner_id))
		or (old.id = v_operation.target_membership_id
			and (old.role not in ('viewer','editor') or old.user_id <> v_operation.new_owner_id))
	then raise exception 'transferência de mestre não permitida' using errcode = '42501'; end if;
	return new;
end;
$function$;

drop trigger if exists campaigns_guard_owner_membership on public.memberships;
create trigger campaigns_guard_owner_membership
	before insert or update or delete on public.memberships
	for each row execute function private.guard_campaign_owner_membership();

revoke all on function private.guard_campaign_owner_membership() from public, anon, authenticated;

create or replace function public.transfer_campaign_ownership(
	p_campaign_id uuid,
	p_new_owner_id uuid
)
returns table(campaign_id uuid, previous_owner_id uuid, new_owner_id uuid)
language plpgsql
security definer
set search_path = public
as $function$
declare
	v_previous_owner uuid;
	v_target_ids uuid[];
	v_previous_membership_id uuid;
	v_operation_id uuid := gen_random_uuid();
	v_count integer;
begin
	if auth.uid() is null then
		raise exception 'transferência de mestre não permitida' using errcode = '42501';
	end if;

	select c.owner_id into v_previous_owner
	from public.campaigns c
	where c.id = p_campaign_id
	for update;
	if not found or v_previous_owner is distinct from auth.uid() then
		raise exception 'transferência de mestre não permitida' using errcode = '42501';
	end if;

	select array_agg(m.id order by m.id) into v_target_ids
	from (
		select m.id from public.memberships m
		where m.campaign_id = p_campaign_id and m.user_id = p_new_owner_id
		for update
	) m;
	if cardinality(v_target_ids) is distinct from 1 then
		raise exception 'transferência de mestre não permitida' using errcode = '42501';
	end if;
	if p_new_owner_id <> v_previous_owner and exists (
		select 1 from public.memberships m
		where m.id = v_target_ids[1] and m.role not in ('viewer','editor')
	) then
		raise exception 'transferência de mestre não permitida' using errcode = '42501';
	end if;

	-- O no-op só é válido com o owner canônico inteiro. Não considere
	-- o papel do campaign nem outra membership owner como prova do caller.
	if p_new_owner_id = v_previous_owner then
		select count(*)::integer into v_count
		from public.memberships m
		where m.campaign_id = p_campaign_id
			and m.id = v_target_ids[1]
			and m.user_id = v_previous_owner
			and m.role = 'owner'
			and exists (
				select 1 from public.campaigns c
				where c.id = p_campaign_id and c.owner_id = m.user_id
			);
		if v_count <> 1 or exists (
			select 1
			from public.campaigns c
			left join public.memberships m on m.campaign_id = c.id
			where c.id = p_campaign_id
			group by c.id, c.owner_id
			having count(*) filter (where m.role = 'owner') <> 1
				or count(*) filter (
					where m.role = 'owner' and m.user_id = c.owner_id
				) <> 1
		) then
			raise exception 'ownership invariant violated' using errcode = '23514';
		end if;
		return query select p_campaign_id, v_previous_owner, p_new_owner_id;
		return;
	end if;

	select m.id into v_previous_membership_id
	from public.memberships m
	where m.campaign_id = p_campaign_id
		and m.user_id = v_previous_owner and m.role = 'owner'
	for update;
	if not found
		or v_previous_membership_id is null
		or exists (
			select 1 from public.memberships m
			where m.id = v_target_ids[1] and m.role not in ('viewer', 'editor')
		)
	then
		raise exception 'ownership invariant violated' using errcode = '23514';
	end if;

	insert into private.campaign_ownership_operations (
		operation_id, campaign_id, previous_owner_id, new_owner_id,
		previous_membership_id, target_membership_id
	) values (
		v_operation_id, p_campaign_id, v_previous_owner, p_new_owner_id,
		v_previous_membership_id, v_target_ids[1]
	);
	perform set_config('arkhiveon.ownership_operation_id', v_operation_id::text, true);

	update public.memberships
	set role = 'editor'
	where id = v_previous_membership_id;

	update public.memberships
	set role = 'owner'
	where id = v_target_ids[1];

	update public.campaigns
	set owner_id = p_new_owner_id, updated_at = now()
	where id = p_campaign_id and owner_id = v_previous_owner;
	get diagnostics v_count = row_count;
	if v_count <> 1 then
		raise exception 'campaign owner changed, retry' using errcode = '40001';
	end if;

	select count(*)::integer into v_count
	from public.memberships m
	where m.campaign_id = p_campaign_id and m.role = 'owner';
	if v_count <> 1 then
		raise exception 'ownership invariant violated' using errcode = '23514';
	end if;

	return query select p_campaign_id, v_previous_owner, p_new_owner_id;
	delete from private.campaign_ownership_operations where operation_id = v_operation_id;
end;
$function$;

revoke all on function public.transfer_campaign_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_campaign_ownership(uuid, uuid) to authenticated;

alter table public.campaigns enable row level security;
alter table public.memberships enable row level security;

drop policy if exists "Members can view campaign" on public.campaigns;
create policy "Members can view campaign"
	on public.campaigns for select
	using (user_campaign_role(id) is not null);

drop policy if exists "Authenticated users can create campaigns" on public.campaigns;
create policy "Authenticated users can create campaigns"
	on public.campaigns for insert
	with check (auth.uid() is not null and owner_id = auth.uid());

drop policy if exists "Owner can update campaign" on public.campaigns;
create policy "Owner can update campaign"
	on public.campaigns for update
	using (user_campaign_role(id) = 'owner')
	with check (user_campaign_role(id) = 'owner');

drop policy if exists "Owner can delete campaign" on public.campaigns;
create policy "Owner can delete campaign"
	on public.campaigns for delete
	using (user_campaign_role(id) = 'owner');

drop policy if exists "Members can view memberships" on public.memberships;
create policy "Members can view memberships"
	on public.memberships for select
	using (user_campaign_role(campaign_id) is not null);

drop policy if exists "Owner can add members" on public.memberships;
drop policy if exists "Owner can add non-owner members" on public.memberships;
create policy "Owner can add non-owner members"
	on public.memberships for insert
	with check (
		exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid())
		and role in ('viewer', 'editor')
	);

drop policy if exists "Owner can update member roles" on public.memberships;
drop policy if exists "Owner can update non-owner membership roles" on public.memberships;
create policy "Owner can update non-owner membership roles"
	on public.memberships for update
	using (
		role in ('viewer', 'editor')
		and exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid())
	)
	with check (role in ('viewer', 'editor'));

drop policy if exists "Owner can remove members or self-leave" on public.memberships;
create policy "Owner can remove members or self-leave"
	on public.memberships for delete
	using (
		user_campaign_role(campaign_id) = 'owner'
		or user_id = auth.uid()
	);

grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.campaigns to authenticated;
grant select, insert, delete on public.memberships to authenticated;

revoke update on table public.campaigns from authenticated;
grant update(name) on table public.campaigns to authenticated;
revoke update on table public.memberships from authenticated;
grant update(role) on table public.memberships to authenticated;
