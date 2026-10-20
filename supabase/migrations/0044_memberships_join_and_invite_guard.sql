-- Entrada em campanha: join por link via RPC, convite só para a própria
-- campanha e com o papel do convite, e convite que o convidado não pode editar.
--
-- Causa: na 0028 a policy "Invitee can self insert membership" comparou
-- `i.campaign_id = campaign_id` sem qualificar; dentro de `FROM invites i` o nome
-- resolve para `i.campaign_id`, e a condição ficou sempre verdadeira. Também não
-- limitava papel nem status do convite. Além disso, "Owner or invitee can update
-- invite" deixava o convidado alterar qualquer coluna do convite (campaign_id,
-- role, status), e o trigger `handle_invite_acceptance` (security definer)
-- transforma o convite aceito em membership.
--
-- O que muda:
--   1. `join_campaign_via_link(p_campaign_id)`: security definer. Mesma regra
--      efetiva da rota /join hoje (a rota só segue se o usuário enxerga a
--      campanha: dono, membro ou convite pendente para o e-mail dele). Insere só
--      viewer, `on conflict do nothing`; nunca muda o papel de quem já é membro.
--   2. "Invitee can self insert membership": convite pendente da MESMA campanha,
--      do e-mail do JWT, com o MESMO papel, e user_id = auth.uid().
--   3. Trigger `guard_invite_update`: quem não é owner da campanha só pode mudar
--      o status de um convite pendente para accepted/declined, sem tocar nas
--      outras colunas. Convite já aceito/recusado não volta a valer.
--
-- Fica como está (conferido): "Owner can add members" (INSERT só owner da
-- campanha ou dono em campaigns), "Owner can update member roles" (UPDATE só
-- owner), "Owner can remove members or self-leave" (DELETE).
--
-- Teste: supabase/tests/0044_memberships_join_and_invite_guard.sql

begin;

-- 1. Join por link ----------------------------------------------------------
create or replace function public.join_campaign_via_link(p_campaign_id uuid)
returns table (role text, campaign_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
	v_name text;
	v_owner uuid;
	v_role text;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para usar o link.' using errcode = '28000';
	end if;

	select c.name, c.owner_id into v_name, v_owner
	from public.campaigns c
	where c.id = p_campaign_id;

	if not found then
		raise exception 'Campanha não encontrada ou link inválido.' using errcode = 'P0002';
	end if;

	select m.role into v_role
	from public.memberships m
	where m.campaign_id = p_campaign_id and m.user_id = v_uid;

	if v_role is null and v_owner = v_uid then
		v_role := 'owner';
	end if;

	if v_role is null then
		if v_email = '' or not exists (
			select 1 from public.invites i
			where i.campaign_id = p_campaign_id
				and i.status = 'pending'
				and lower(trim(i.email)) = v_email
		) then
			raise exception 'Campanha não encontrada ou link inválido.' using errcode = 'P0002';
		end if;

		insert into public.memberships (campaign_id, user_id, role)
		values (p_campaign_id, v_uid, 'viewer')
		on conflict (campaign_id, user_id) do nothing;

		select m.role into v_role
		from public.memberships m
		where m.campaign_id = p_campaign_id and m.user_id = v_uid;
	end if;

	return query select v_role, v_name;
end;
$$;

revoke all on function public.join_campaign_via_link(uuid) from public, anon;
grant execute on function public.join_campaign_via_link(uuid) to authenticated;

-- 2. Self-insert por convite -------------------------------------------------
drop policy if exists "Invitee can self insert membership" on public.memberships;
create policy "Invitee can self insert membership"
	on public.memberships for insert
	with check (
		memberships.user_id = auth.uid()
		and exists (
			select 1 from public.invites i
			where i.campaign_id = memberships.campaign_id
				and i.role = memberships.role
				and i.status = 'pending'
				and lower(trim(i.email)) = lower(trim(auth.jwt() ->> 'email'))
		)
	);

-- 3. Convidado só aceita ou recusa -----------------------------------------
create or replace function public.guard_invite_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	-- Sem usuário (service role / SQL do painel) ou owner da campanha: livre.
	if auth.uid() is null
		or public.user_campaign_role(old.campaign_id) = 'owner'
		or exists (select 1 from public.campaigns c where c.id = old.campaign_id and c.owner_id = auth.uid())
	then
		return new;
	end if;

	if new.campaign_id is distinct from old.campaign_id
		or new.email is distinct from old.email
		or new.role is distinct from old.role
		or new.invited_by is distinct from old.invited_by
		or new.created_at is distinct from old.created_at
		or new.id is distinct from old.id
	then
		raise exception 'Convite não pode ser alterado.' using errcode = '42501';
	end if;

	if old.status <> 'pending' or new.status not in ('accepted', 'declined') then
		raise exception 'Convite não está mais pendente.' using errcode = '42501';
	end if;

	return new;
end;
$$;

drop trigger if exists guard_invite_update on public.invites;
create trigger guard_invite_update
	before update on public.invites
	for each row execute function public.guard_invite_update();

commit;
