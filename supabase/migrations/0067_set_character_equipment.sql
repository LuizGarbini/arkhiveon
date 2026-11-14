-- =============================================================================
-- Migration 0067: RPC set_character_equipment — equipar itens sem regravar a ficha
-- =============================================================================
-- O UPDATE de characters só deixa owner/editor da campanha (policy da 0003).
-- O jogador que criou a ficha precisa equipar e desequipar os PRÓPRIOS itens
-- (aba Equipamento) sem ganhar escrita na ficha inteira.
--
-- Esta função só muda, em itens que JÁ estão em data->'inventoryList', os
-- campos de equipamento: `location`, `slot` e `isAttuned`. Não cria item, não
-- apaga item, não mexe em quantidade, nome, arma nem em outro campo da ficha.
--
-- p_changes: array de { id, location?, slot?, isAttuned? }
--   id          id da entrada do inventário (obrigatório)
--   location    'equipped' | 'backpack' | 'mount_stash'
--   slot        um dos 10 slots, ou null para limpar
--   isAttuned   true | false
--
-- Quem pode:
--   mestre (owner) ou editor da campanha: qualquer ficha da campanha;
--   quem criou a ficha (created_by): só a própria.
--   Mesma regra do trigger guard_character_item_links (0056), que continua
--   valendo no UPDATE logo abaixo. Outros e auth.uid() nulo levam exception.
--
-- Travas (valem para todos, para o dado não ficar inconsistente):
--   * um item por slot entre os equipados;
-- e, para quem não é mestre/editor (o mestre pode abrir exceção de mesa):
--   * no máximo 3 itens equipados e sintonizados que exijam sintonização.
--
-- Rollback:
--   drop function if exists public.set_character_equipment(uuid, jsonb);
--
-- Aplicada em produção (axnektdqoxjhbbfsidfj) em 2026-11-14, após teste em
-- transação descartada (11 cenários de segurança).

begin;

create or replace function public.set_character_equipment(
	p_character_id uuid,
	p_changes jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_created_by uuid;
	v_campaign_id uuid;
	v_data jsonb;
	v_role text;
	v_inventory jsonb;
	v_change jsonb;
	v_entry jsonb;
	v_idx int;
	v_dup text;
	v_attuned int;
	c_slots constant text[] := array[
		'head', 'neck', 'cloak', 'hands', 'ring1', 'ring2',
		'mainHand', 'offHand', 'armor', 'feet'
	];
	c_max_attuned constant int := 3;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para equipar itens.'
			using errcode = '28000';
	end if;

	if p_character_id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;

	if p_changes is null
		or jsonb_typeof(p_changes) <> 'array'
		or jsonb_array_length(p_changes) = 0
		or jsonb_array_length(p_changes) > 24 then
		raise exception 'Mudanças de equipamento inválidas.'
			using errcode = '22023';
	end if;

	select c.created_by, c.campaign_id, c.data
	into v_created_by, v_campaign_id, v_data
	from public.characters c
	where c.id = p_character_id
	for update;

	if not found then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;

	v_role := public.user_campaign_role(v_campaign_id);
	if v_role is null then
		raise exception 'Só membros da campanha podem equipar itens.'
			using errcode = '42501';
	end if;
	if v_role is distinct from 'owner' and v_role is distinct from 'editor' then
		if v_created_by is distinct from v_uid then
			raise exception 'Você não pode equipar itens desta ficha.'
				using errcode = '42501';
		end if;
	end if;

	v_inventory := v_data->'inventoryList';
	if jsonb_typeof(v_inventory) is distinct from 'array' then
		raise exception 'Esta ficha não tem inventário.'
			using errcode = 'P0002';
	end if;

	for v_change in select value from jsonb_array_elements(p_changes) loop
		v_idx := null;

		if jsonb_typeof(v_change) <> 'object'
			or coalesce(v_change->>'id', '') = '' then
			raise exception 'Mudança de equipamento inválida.'
				using errcode = '22023';
		end if;

		if exists (
			select 1
			from jsonb_object_keys(v_change) as k
			where k not in ('id', 'location', 'slot', 'isAttuned')
		) then
			raise exception 'Só local, slot e sintonia podem mudar.'
				using errcode = '22023';
		end if;

		if v_change ? 'location' and (
			jsonb_typeof(v_change->'location') <> 'string'
			or v_change->>'location' not in ('equipped', 'backpack', 'mount_stash')
		) then
			raise exception 'Local do item inválido.'
				using errcode = '22023';
		end if;

		if v_change ? 'slot'
			and jsonb_typeof(v_change->'slot') <> 'null'
			and (
				jsonb_typeof(v_change->'slot') <> 'string'
				or not (v_change->>'slot' = any (c_slots))
			) then
			raise exception 'Slot inválido.'
				using errcode = '22023';
		end if;

		if v_change ? 'isAttuned'
			and jsonb_typeof(v_change->'isAttuned') <> 'boolean' then
			raise exception 'Sintonia inválida.'
				using errcode = '22023';
		end if;

		select (t.ord - 1)::int
		into v_idx
		from jsonb_array_elements(v_inventory) with ordinality as t(entry, ord)
		where t.entry->>'id' = v_change->>'id'
		limit 1;

		if v_idx is null then
			raise exception 'Item não encontrado no inventário.'
				using errcode = 'P0002';
		end if;

		v_entry := v_inventory->v_idx;

		if v_change ? 'location' then
			v_entry := jsonb_set(v_entry, '{location}', v_change->'location', true);
		end if;
		if v_change ? 'isAttuned' then
			v_entry := jsonb_set(v_entry, '{isAttuned}', v_change->'isAttuned', true);
		end if;
		if v_change ? 'slot' then
			if jsonb_typeof(v_change->'slot') = 'string' then
				v_entry := jsonb_set(v_entry, '{slot}', v_change->'slot', true);
			else
				v_entry := v_entry - 'slot';
			end if;
		end if;

		v_inventory := jsonb_set(v_inventory, array[v_idx::text], v_entry, false);
	end loop;

	-- Um item por slot entre os equipados.
	select x.slot
	into v_dup
	from (
		select e->>'slot' as slot
		from jsonb_array_elements(v_inventory) as e
		where e->>'location' = 'equipped'
			and coalesce(e->>'slot', '') <> ''
	) as x
	group by x.slot
	having count(*) > 1
	limit 1;

	if v_dup is not null then
		raise exception 'Já há um item equipado no slot %.', v_dup
			using errcode = '22023';
	end if;

	-- Limite de sintonia para quem não é mestre/editor.
	if v_role is distinct from 'owner' and v_role is distinct from 'editor' then
		select count(*)
		into v_attuned
		from jsonb_array_elements(v_inventory) as e
		join public.items i on i.id::text = e->>'campaignItemId'
		where e->>'location' = 'equipped'
			and e->'isAttuned' = 'true'::jsonb
			and i.data->'requiresAttunement' = 'true'::jsonb;

		if v_attuned > c_max_attuned then
			raise exception 'Só % itens podem estar sintonizados.', c_max_attuned
				using errcode = '22023';
		end if;
	end if;

	update public.characters
	set data = jsonb_set(data, '{inventoryList}', v_inventory, true)
	where id = p_character_id;

	return jsonb_build_object('inventoryList', v_inventory);
end;
$$;

revoke all on function public.set_character_equipment(uuid, jsonb) from public, anon;
grant execute on function public.set_character_equipment(uuid, jsonb) to authenticated;

commit;
