-- Rollback da 0087: restaura private.guard_campaign_owner_membership()
-- exatamente como na 0059. Só Postgres local descartável.
-- Não aplicar em produção neste PR.

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
