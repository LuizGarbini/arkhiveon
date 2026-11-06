-- 0059 · Transferir mestre, com invariantes de membership no servidor.
-- Arquivo de migration apenas: não aplicar a Supabase remoto/staging/produção.
-- A aplicação exige limpeza manual se a auditoria abaixo encontrar legado.

begin;

-- Antes: exatamente um membership owner, apontando para campaigns.owner_id.
-- Não escolhe vencedor com LIMIT 1, não repara nem reatribui papéis legados.
do $migration$
declare
	v_bad_count integer;
begin
	select count(*)::integer into v_bad_count
	from (
		select c.id
		from public.campaigns c
		left join public.memberships m on m.campaign_id = c.id
		group by c.id, c.owner_id
		having count(*) filter (where m.role = 'owner') <> 1
			or count(*) filter (
				where m.role = 'owner' and m.user_id = c.owner_id
			) <> 1
	) bad_campaigns;

	if v_bad_count <> 0 then
		raise exception '0059: % campanha(s) com owner membership legado; reparo manual necessário', v_bad_count
			using errcode = '23514';
	end if;

	if not exists (
		select 1
		from pg_catalog.pg_constraint
		where conrelid = 'public.memberships'::regclass
			and contype = 'u'
			and pg_get_constraintdef(pg_constraint.oid) like 'UNIQUE (campaign_id, user_id)%'
	) then
		raise exception '0059: UNIQUE(campaign_id,user_id) ausente; corrigir antes de aplicar'
			using errcode = '23514';
	end if;
end
$migration$;

create unique index memberships_single_owner_campaign_uidx
	on public.memberships (campaign_id) where role = 'owner';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

-- Criação da campanha já cria o único owner no banco. O INSERT owner do client
-- continua aceito em F1 por compatibilidade; ele sai do client só em F2.
create table private.campaign_ownership_operations (
	operation_id uuid primary key,
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	previous_owner_id uuid not null,
	new_owner_id uuid not null,
	accepted_invite_id uuid unique references public.invites(id),
	previous_membership_id uuid not null,
	target_membership_id uuid not null
);
revoke all on private.campaign_ownership_operations from public, anon, authenticated;
alter table private.campaign_ownership_operations enable row level security;


create or replace function private.ensure_campaign_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
	if auth.uid() is not null and new.owner_id is distinct from auth.uid() then
		raise exception 'campanha deve pertencer ao usuário autenticado' using errcode = '42501';
	end if;
	insert into private.campaign_ownership_operations (
		operation_id,campaign_id,previous_owner_id,new_owner_id,
		previous_membership_id,target_membership_id
	) values (new.id,new.id,new.owner_id,new.owner_id,new.id,new.id);
	insert into public.memberships (campaign_id,user_id,role)
	values (new.id,new.owner_id,'owner');
	delete from private.campaign_ownership_operations where operation_id = new.id;
	return new;
end;
$function$;

drop trigger if exists campaigns_ensure_owner_membership on public.campaigns;
create trigger campaigns_ensure_owner_membership
	after insert on public.campaigns
	for each row execute function private.ensure_campaign_owner_membership();

-- Operação privada, nunca à vista do cliente. O token aleatório existe apenas
-- durante a transação e vincula a autorização a campaign/old/target exatos:
-- set_config sozinho, gravado por um cliente, não libera nenhuma mudança.

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

-- RLS não limita o trigger SECURITY DEFINER do convite. Ao aceitar convite,
-- preserva o papel da membership pré-existente e só cria viewer/editor.
create or replace function public.handle_invite_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
	v_user_id uuid;
	v_membership_id uuid;
	v_operation_id uuid;
begin
	if new.status = 'accepted' and old.status = 'pending' then
		v_user_id := auth.uid();
		if v_user_id is null then
			select id into v_user_id from auth.users
			where lower(trim(email)) = lower(trim(new.email)) limit 1;
		end if;

		if v_user_id is not null then
			if new.role not in ('viewer', 'editor') then
				raise exception 'convite não pode tornar owner' using errcode = '42501';
			end if;
			insert into private.campaign_ownership_operations (
				operation_id,campaign_id,accepted_invite_id,previous_owner_id,new_owner_id,previous_membership_id,target_membership_id
			) values (gen_random_uuid(),new.campaign_id,new.id,v_user_id,v_user_id,new.id,gen_random_uuid())
			returning operation_id,target_membership_id into v_operation_id,v_membership_id;
			perform set_config('arkhiveon.invite_accept_operation_id', v_operation_id::text, true);
			insert into public.memberships (id,campaign_id, user_id, role)
			values (v_membership_id,new.campaign_id, v_user_id, new.role)
			on conflict (campaign_id, user_id) do nothing;
			perform set_config('arkhiveon.invite_accept_operation_id', '', true);
			delete from private.campaign_ownership_operations where operation_id = v_operation_id;
		end if;
	end if;
	return new;
end;
$function$;

-- O aceite transita pelo ledger; continua negando qualquer INSERT do cliente
-- fora desse ticket, que é apagado antes do commit. Não existe RPC para emitir
-- ticket: apenas o trigger legítimo de convite aceito chega a esse caminho.
drop policy if exists "Owner can add members" on public.memberships;
create policy "Owner can add non-owner members"
	on public.memberships for insert to authenticated
	with check (
		exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = (select auth.uid()))
		and (
			role in ('viewer', 'editor')
			or (
					role = 'owner' and user_id = (select auth.uid())
			)
		)
	);

drop policy if exists "Invitee can self insert membership" on public.memberships;
create policy "Invitee can self insert non-owner membership"
	on public.memberships for insert to authenticated
	with check (
		role in ('viewer', 'editor')
		and user_id = auth.uid()
		and exists (
			select 1 from public.invites i
			where i.campaign_id = memberships.campaign_id
				and i.status = 'pending' and i.role = memberships.role
				and lower(trim(i.email)) = lower(trim((select auth.jwt()) ->> 'email'))
		)
	);

drop policy if exists "Owner can update member roles" on public.memberships;
create policy "Owner can update non-owner membership roles"
	on public.memberships for update to authenticated
	using (
		role in ('viewer', 'editor')
		and exists (select 1 from public.campaigns c where c.id = campaign_id and c.owner_id = auth.uid())
	)
	with check (role in ('viewer', 'editor'));

-- A privilege de tabela prevalece sobre um REVOKE só de coluna. Por isso é
-- necessário revogar UPDATE na tabela e reabrir a allowlist, não só owner_id/role.
revoke update on table public.memberships from authenticated;
grant insert(campaign_id, user_id, role) on table public.memberships to authenticated;
grant update(role) on table public.memberships to authenticated;

revoke update on table public.campaigns from authenticated;
do $grants$
declare
	v_column text;
begin
	foreach v_column in array array[
		'name', 'description', 'data', 'world_id', 'system', 'member_limit',
		'current_feed_session_id', 'spotify_jam_link'
	] loop
		if exists (
			select 1 from pg_catalog.pg_attribute
			where attrelid = 'public.campaigns'::regclass
				and attname = v_column and attnum > 0 and not attisdropped
		) then
			execute format('grant update(%I) on table public.campaigns to authenticated', v_column);
		end if;
	end loop;
end
$grants$;

revoke all on function private.ensure_campaign_owner_membership() from public, anon, authenticated;
revoke all on function private.guard_campaign_owner_membership() from public, anon, authenticated;

commit;
