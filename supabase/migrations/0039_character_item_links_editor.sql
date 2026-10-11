-- Migration 0039: editor da campanha também vincula itens em qualquer ficha
--
-- Ajusta só a regra de QUEM pode mudar vínculos (trigger da 0038), para
-- casar com o produto (PR #112): mestre (owner) OU editor da campanha podem
-- vincular/desvincular itens da campanha em qualquer ficha da mesa, mesmo
-- que outra pessoa tenha criado o item ou a ficha. Quem criou a ficha
-- continua podendo (sem regressão).
--
-- Mantido igual à 0038:
--   * cada campaignItemId novo precisa existir em items, no mesmo mundo da
--     campanha;
--   * item master_secret só o mestre (owner) vincula;
--   * auth.uid() nulo (service role / Edge Functions) passa;
--   * trigger, character_item_links() e policies não mudam.
--
-- Idempotente (CREATE OR REPLACE). Não dropa tabela, trigger nem policy.
--
-- Rollback: reaplicar a função guard_character_item_links() da 0038.

begin;

create or replace function public.guard_character_item_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_old jsonb := '[]'::jsonb;
	v_new jsonb;
	v_role text;
	v_creator uuid;
	v_world uuid;
	v_item_id text;
begin
	if v_uid is null then
		return new;
	end if;

	if tg_op = 'UPDATE' then
		v_old := public.character_item_links(old.data);
	end if;
	v_new := public.character_item_links(new.data);

	if v_old = v_new then
		return new;
	end if;

	v_role := public.user_campaign_role(new.campaign_id);
	-- Dono da ficha = created_by ANTES do update (não dá para "assumir" a ficha
	-- e vincular no mesmo salvamento).
	v_creator := case when tg_op = 'UPDATE' then old.created_by else new.created_by end;

	-- 0039: editor da campanha também pode (antes: só owner ou criador).
	if not (v_role in ('owner', 'editor') or v_creator = v_uid) then
		raise exception 'Só o mestre, editores da campanha ou quem criou a ficha podem vincular itens da campanha.'
			using errcode = '42501';
	end if;

	select c.world_id into v_world from public.campaigns c where c.id = new.campaign_id;

	for v_item_id in
		select distinct n->>'campaignItemId'
		from jsonb_array_elements(v_new) n
		where not exists (
			select 1 from jsonb_array_elements(v_old) o
			where o->>'campaignItemId' = n->>'campaignItemId'
		)
	loop
		if not exists (
			select 1
			from public.items i
			where i.id::text = v_item_id
				and i.world_id = v_world
				and (v_role = 'owner' or i.visibility <> 'master_secret')
		) then
			raise exception 'Item % não pertence ao mundo desta campanha.', v_item_id
				using errcode = '42501';
		end if;
	end loop;

	return new;
end;
$$;

revoke all on function public.guard_character_item_links() from public;

commit;
