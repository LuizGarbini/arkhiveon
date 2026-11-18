-- =============================================================================
-- Migration 0078: set_character_resources também aceita destino e dados bônus
-- =============================================================================
-- A 0069 já deixava o jogador que criou a ficha gastar espaço de magia,
-- inspiração, salvaguardas contra a morte e dados de vida, sem UPDATE na ficha.
-- A mesa agora gasta e soma, no mesmo bloco, pontos de destino e dados bônus.
-- Sem estas chaves a função recusa o pedido inteiro (22023) e a tela volta.
--
-- Campos novos, dentro de data.tableResources (o resto do objeto fica):
--   fate        inteiro 0..fateTotal. Sem fateTotal gravado, o total é 10
--               (igual à ficha). Não altera fateTotal, divine nem inspiration.
--   bonusDice   lista (até 40) de { id, sides 4|6|8|10|12, quantity 1..9,
--               origin até 24 caracteres }. Lista vazia apaga os dados.
--
-- Quem pode não muda: owner/editor em qualquer ficha da campanha; quem criou,
-- só a própria. Outra chave continua exception.
--
-- Rollback: reaplicar o corpo da função da 0069 (create or replace anterior).

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
	v_fate_total int;
	v_die jsonb;
	v_die_id text;
	v_seen_ids text[] := '{}';
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
		where k not in (
			'spellSlotsState', 'inspiration', 'fate', 'bonusDice',
			'deathSaves', 'hitDiceUsed'
		)
	) then
		raise exception 'Só espaços de magia, inspiração, destino, dados bônus, salvaguardas contra a morte e dados de vida podem mudar.'
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

	-- Pontos de destino (só o que sobra; o total da ficha não muda) -----------
	if p_changes ? 'fate' then
		if jsonb_typeof(p_changes->'fate') is distinct from 'number'
			or (p_changes->>'fate') !~ '^[0-9]{1,2}$' then
			raise exception 'Pontos de destino inválidos.'
				using errcode = '22023';
		end if;

		v_resources := v_data->'tableResources';
		if jsonb_typeof(v_resources) is distinct from 'object' then
			v_resources := '{}'::jsonb;
		end if;

		v_fate_total := 10;
		if v_resources ? 'fateTotal'
			and jsonb_typeof(v_resources->'fateTotal') = 'number'
			and (v_resources->>'fateTotal') ~ '^[0-9]{1,2}$'
			and (v_resources->>'fateTotal')::int <= 99 then
			v_fate_total := (v_resources->>'fateTotal')::int;
		end if;

		if (p_changes->>'fate')::int > v_fate_total then
			raise exception 'Pontos de destino acima do total da ficha.'
				using errcode = '22023';
		end if;

		v_resources := jsonb_set(v_resources, '{fate}', p_changes->'fate', true);
		v_data := jsonb_set(v_data, '{tableResources}', v_resources, true);
		v_out := v_out || jsonb_build_object('fate', p_changes->'fate');
	end if;

	-- Dados bônus --------------------------------------------------------------
	if p_changes ? 'bonusDice' then
		if jsonb_typeof(p_changes->'bonusDice') is distinct from 'array'
			or jsonb_array_length(p_changes->'bonusDice') > 40 then
			raise exception 'Dados bônus inválidos.'
				using errcode = '22023';
		end if;

		v_seen_ids := ARRAY[]::text[];
		for v_die in select value from jsonb_array_elements(p_changes->'bonusDice') loop
			if jsonb_typeof(v_die) is distinct from 'object'
				or exists (
					select 1 from jsonb_object_keys(v_die) as k
					where k not in ('id', 'sides', 'quantity', 'origin')
				) then
				raise exception 'Dados bônus inválidos.'
					using errcode = '22023';
			end if;

			v_die_id := v_die->>'id';
			if v_die_id is null
				or char_length(v_die_id) < 1
				or char_length(v_die_id) > 80
				or v_die_id !~ '^[A-Za-z0-9_-]+$'
				or v_die_id = any (v_seen_ids) then
				raise exception 'Dados bônus inválidos.'
					using errcode = '22023';
			end if;
			v_seen_ids := v_seen_ids || v_die_id;

			if jsonb_typeof(v_die->'sides') is distinct from 'number'
				or (v_die->>'sides') !~ '^(4|6|8|10|12)$'
				or jsonb_typeof(v_die->'quantity') is distinct from 'number'
				or (v_die->>'quantity') !~ '^[1-9]$'
				or jsonb_typeof(v_die->'origin') is distinct from 'string'
				or char_length(v_die->>'origin') > 24
				or (v_die->>'origin') ~ '[[:cntrl:]]' then
				raise exception 'Dados bônus inválidos.'
					using errcode = '22023';
			end if;
		end loop;

		v_resources := v_data->'tableResources';
		if jsonb_typeof(v_resources) is distinct from 'object' then
			v_resources := '{}'::jsonb;
		end if;
		v_resources := jsonb_set(v_resources, '{bonusDice}', p_changes->'bonusDice', true);
		v_data := jsonb_set(v_data, '{tableResources}', v_resources, true);
		v_out := v_out || jsonb_build_object('bonusDice', p_changes->'bonusDice');
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
