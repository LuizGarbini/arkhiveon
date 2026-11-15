-- =============================================================================
-- Migration 0069: RPC set_character_resources — recursos de mesa sem regravar a ficha
-- =============================================================================
-- O UPDATE de characters só deixa owner/editor da campanha (policy da 0003).
-- O jogador que criou a ficha precisa gastar espaço de magia, usar Inspiração,
-- marcar salvaguardas contra a morte e gastar dados de vida na mesa, sem ganhar
-- escrita na ficha inteira.
--
-- Esta função só muda quatro campos de `data`, todos validados:
--   spellSlotsState  { slots: { "1".."9": { total 0..20, used 0..total } },
--                      pact?: { level 1..9, total 0..20, used 0..total } }
--   inspiration      inteiro 0..99, gravado em data->'tableResources'->'inspiration'
--                    (o resto de tableResources fica como está)
--   deathSaves       { successes 0..3, failures 0..3 }
--   hitDiceUsed      inteiro 0..60
-- Qualquer outra chave leva exception. Não toca em nome, atributos, PV,
-- inventário, equipamento nem em outro campo da ficha.
--
-- Quem pode (mesma regra da set_character_equipment, 0067):
--   mestre (owner) ou editor da campanha: qualquer ficha da campanha;
--   quem criou a ficha (created_by): só a própria.
--   Outros e auth.uid() nulo levam exception.
--
-- NULL: toda checagem de tipo usa IS DISTINCT FROM; com `<>`, uma chave ausente dá NULL
-- e a validação não dispara (testado na transação descartada).
--
-- Rollback:
--   drop function if exists public.set_character_resources(uuid, jsonb);

begin;

create or replace function public.set_character_resources(
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
	v_slots jsonb;
	v_pact jsonb;
	v_level text;
	v_entry jsonb;
	v_saves jsonb;
	v_resources jsonb;
	v_out jsonb := '{}'::jsonb;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para usar os recursos da ficha.'
			using errcode = '28000';
	end if;

	if p_character_id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;

	if p_changes is null
		or jsonb_typeof(p_changes) is distinct from 'object'
		or p_changes = '{}'::jsonb then
		raise exception 'Mudanças de recursos inválidas.'
			using errcode = '22023';
	end if;

	if exists (
		select 1
		from jsonb_object_keys(p_changes) as k
		where k not in ('spellSlotsState', 'inspiration', 'deathSaves', 'hitDiceUsed')
	) then
		raise exception 'Só espaços de magia, inspiração, salvaguardas contra a morte e dados de vida podem mudar.'
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
		raise exception 'Só membros da campanha podem usar os recursos da ficha.'
			using errcode = '42501';
	end if;
	if v_role is distinct from 'owner' and v_role is distinct from 'editor' then
		if v_created_by is distinct from v_uid then
			raise exception 'Você não pode mudar os recursos desta ficha.'
				using errcode = '42501';
		end if;
	end if;

	v_data := coalesce(v_data, '{}'::jsonb);

	-- Espaços de magia ---------------------------------------------------------
	if p_changes ? 'spellSlotsState' then
		if jsonb_typeof(p_changes->'spellSlotsState') is distinct from 'object'
			or jsonb_typeof(p_changes->'spellSlotsState'->'slots') is distinct from 'object' then
			raise exception 'Espaços de magia inválidos.'
				using errcode = '22023';
		end if;

		if exists (
			select 1
			from jsonb_object_keys(p_changes->'spellSlotsState') as k
			where k not in ('slots', 'pact')
		) then
			raise exception 'Espaços de magia inválidos.'
				using errcode = '22023';
		end if;

		v_slots := p_changes->'spellSlotsState'->'slots';
		for v_level, v_entry in select key, value from jsonb_each(v_slots) loop
			if v_level !~ '^[1-9]$'
				or jsonb_typeof(v_entry) is distinct from 'object'
				or jsonb_typeof(v_entry->'total') is distinct from 'number'
				or jsonb_typeof(v_entry->'used') is distinct from 'number'
				or (v_entry->>'total') !~ '^[0-9]+$'
				or (v_entry->>'used') !~ '^[0-9]+$'
				or (v_entry->>'total')::int > 20
				or (v_entry->>'used')::int > (v_entry->>'total')::int then
				raise exception 'Espaços de magia do nível % inválidos.', v_level
					using errcode = '22023';
			end if;
		end loop;

		v_pact := p_changes->'spellSlotsState'->'pact';
		if v_pact is not null and jsonb_typeof(v_pact) <> 'null' then
			if jsonb_typeof(v_pact) is distinct from 'object'
				or jsonb_typeof(v_pact->'level') is distinct from 'number'
				or jsonb_typeof(v_pact->'total') is distinct from 'number'
				or jsonb_typeof(v_pact->'used') is distinct from 'number'
				or (v_pact->>'level') !~ '^[1-9]$'
				or (v_pact->>'total') !~ '^[0-9]+$'
				or (v_pact->>'used') !~ '^[0-9]+$'
				or (v_pact->>'total')::int > 20
				or (v_pact->>'used')::int > (v_pact->>'total')::int then
				raise exception 'Espaços de Pacto inválidos.'
					using errcode = '22023';
			end if;
		end if;

		v_data := jsonb_set(v_data, '{spellSlotsState}', p_changes->'spellSlotsState', true);
		v_out := v_out || jsonb_build_object('spellSlotsState', p_changes->'spellSlotsState');
	end if;

	-- Inspiração ---------------------------------------------------------------
	if p_changes ? 'inspiration' then
		if jsonb_typeof(p_changes->'inspiration') is distinct from 'number'
			or (p_changes->>'inspiration') !~ '^[0-9]{1,2}$' then
			raise exception 'Inspiração inválida (0 a 99).'
				using errcode = '22023';
		end if;

		v_resources := v_data->'tableResources';
		if jsonb_typeof(v_resources) is distinct from 'object' then
			v_resources := '{}'::jsonb;
		end if;
		v_resources := jsonb_set(v_resources, '{inspiration}', p_changes->'inspiration', true);
		v_data := jsonb_set(v_data, '{tableResources}', v_resources, true);
		v_out := v_out || jsonb_build_object('inspiration', p_changes->'inspiration');
	end if;

	-- Salvaguardas contra a morte ----------------------------------------------
	if p_changes ? 'deathSaves' then
		v_saves := p_changes->'deathSaves';
		if jsonb_typeof(v_saves) is distinct from 'object'
			or jsonb_typeof(v_saves->'successes') is distinct from 'number'
			or jsonb_typeof(v_saves->'failures') is distinct from 'number'
			or (v_saves->>'successes') !~ '^[0-3]$'
			or (v_saves->>'failures') !~ '^[0-3]$' then
			raise exception 'Salvaguardas contra a morte inválidas (0 a 3).'
				using errcode = '22023';
		end if;
		if exists (
			select 1 from jsonb_object_keys(v_saves) as k
			where k not in ('successes', 'failures')
		) then
			raise exception 'Salvaguardas contra a morte inválidas.'
				using errcode = '22023';
		end if;

		v_data := jsonb_set(v_data, '{deathSaves}', v_saves, true);
		v_out := v_out || jsonb_build_object('deathSaves', v_saves);
	end if;

	-- Dados de vida gastos -----------------------------------------------------
	if p_changes ? 'hitDiceUsed' then
		if jsonb_typeof(p_changes->'hitDiceUsed') is distinct from 'number'
			or (p_changes->>'hitDiceUsed') !~ '^[0-9]{1,2}$'
			or (p_changes->>'hitDiceUsed')::int > 60 then
			raise exception 'Dados de vida gastos inválidos (0 a 60).'
				using errcode = '22023';
		end if;

		v_data := jsonb_set(v_data, '{hitDiceUsed}', p_changes->'hitDiceUsed', true);
		v_out := v_out || jsonb_build_object('hitDiceUsed', p_changes->'hitDiceUsed');
	end if;

	update public.characters
	set data = v_data
	where id = p_character_id;

	return v_out;
end;
$$;

revoke all on function public.set_character_resources(uuid, jsonb) from public, anon;
grant execute on function public.set_character_resources(uuid, jsonb) to authenticated;

commit;
