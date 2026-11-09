-- =============================================================================
-- Migration 0064: roll_dice aceita fórmula mesclada 1d8+1d6+3 (F4)
-- =============================================================================
-- Não redefine o contrato de 6 argumentos nem o JSON de retorno
-- {id, total, is_secret, formula}. 2d6+3 continua igual.
-- parse_dice_formula passa a devolver `pools`; roll_dice soma todos.
-- Limite de texto 200 (alinha com o snapshot de consume_ammo).
-- =============================================================================

create or replace function public.parse_dice_formula(p_formula text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
	v_text text;
	v_match text[];
	v_dice text;
	v_mod integer := 0;
	v_term text;
	v_tm text[];
	v_count integer;
	v_faces integer;
	v_total_count integer := 0;
	v_first_faces integer;
	v_pools jsonb := '[]'::jsonb;
	v_canonical text := '';
	v_part text;
begin
	if p_formula is null or char_length(p_formula) > 200 then
		raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
			using errcode = '22023';
	end if;

	v_text := lower(regexp_replace(p_formula, '\s+', '', 'g'));
	v_match := regexp_match(
		v_text,
		'^((?:[0-9]{0,3}d[0-9]{1,4}\+)*[0-9]{0,3}d[0-9]{1,4})([+-][0-9]{1,7})?$'
	);
	if v_match is null then
		raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
			using errcode = '22023';
	end if;

	v_dice := v_match[1];
	if v_match[2] is null then
		v_mod := 0;
	else
		v_mod := v_match[2]::integer;
	end if;
	if v_mod < -1000000 or v_mod > 1000000 then
		raise exception 'O modificador deve ficar entre -1000000 e 1000000.'
			using errcode = '22023';
	end if;

	foreach v_term in array string_to_array(v_dice, '+')
	loop
		v_tm := regexp_match(v_term, '^([0-9]{0,3})d([0-9]{1,4})$');
		if v_tm is null then
			raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
				using errcode = '22023';
		end if;
		if v_tm[1] is null or v_tm[1] = '' then
			v_count := 1;
		else
			v_count := v_tm[1]::integer;
		end if;
		v_faces := v_tm[2]::integer;
		if v_count < 1 or v_count > 100 then
			raise exception 'A quantidade de dados deve ser de 1 a 100.'
				using errcode = '22023';
		end if;
		if v_faces < 2 or v_faces > 1000 then
			raise exception 'O dado deve ter de 2 a 1000 faces.'
				using errcode = '22023';
		end if;
		v_total_count := v_total_count + v_count;
		if v_total_count > 100 then
			raise exception 'A quantidade de dados deve ser de 1 a 100.'
				using errcode = '22023';
		end if;
		if v_first_faces is null then
			v_first_faces := v_faces;
		end if;
		v_pools := v_pools || jsonb_build_array(
			jsonb_build_object('count', v_count, 'faces', v_faces)
		);
		v_part := v_count::text || 'd' || v_faces::text;
		if v_canonical = '' then
			v_canonical := v_part;
		else
			v_canonical := v_canonical || '+' || v_part;
		end if;
	end loop;

	if v_mod > 0 then
		v_canonical := v_canonical || '+' || v_mod::text;
	elsif v_mod < 0 then
		v_canonical := v_canonical || v_mod::text;
	end if;

	return jsonb_build_object(
		'count', v_total_count,
		'faces', v_first_faces,
		'modifier', v_mod,
		'formula', v_canonical,
		'pools', v_pools
	);
end;
$$;

create or replace function public.roll_dice(
	p_campaign_id uuid,
	p_scene_id uuid,
	p_formula text,
	p_secret boolean,
	p_label text,
	p_character_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_role text;
	v_secret boolean := coalesce(p_secret, false);
	v_label text := nullif(btrim(p_label), '');
	v_parsed jsonb;
	v_count integer;
	v_faces integer;
	v_mod integer;
	v_formula text;
	v_rolls jsonb := '[]'::jsonb;
	v_die integer;
	v_sum integer := 0;
	v_total integer;
	v_session uuid;
	v_id uuid;
	v_details jsonb;
	v_pool jsonb;
	v_n integer;
	v_i integer;
begin
	v_role := public.vtt_require_member(p_campaign_id);
	if v_secret and v_role not in ('owner', 'editor') then
		raise exception 'Só o mestre pode rolar em segredo.'
			using errcode = '42501';
	end if;
	if v_label is not null and char_length(v_label) > 80 then
		raise exception 'O rótulo pode ter no máximo 80 caracteres.'
			using errcode = '22023';
	end if;

	perform public.vtt_assert_scene(p_campaign_id, p_scene_id);
	perform public.vtt_assert_character(p_campaign_id, p_character_id, v_role);

	v_parsed := public.parse_dice_formula(p_formula);
	v_mod := (v_parsed->>'modifier')::integer;
	v_formula := v_parsed->>'formula';

	for v_pool in
		select value from jsonb_array_elements(coalesce(v_parsed->'pools', '[]'::jsonb))
	loop
		v_n := (v_pool->>'count')::integer;
		v_faces := (v_pool->>'faces')::integer;
		for v_i in 1..v_n loop
			v_die := floor(random() * v_faces)::integer + 1;
			if v_die < 1 or v_die > v_faces then
				raise exception 'Falha ao gerar o dado.'
					using errcode = '55000';
			end if;
			v_rolls := v_rolls || jsonb_build_array(v_die);
			v_sum := v_sum + v_die;
		end loop;
	end loop;

	v_count := (v_parsed->>'count')::integer;
	v_faces := (v_parsed->>'faces')::integer;
	v_total := v_sum + v_mod;
	v_session := public.vtt_open_feed_session(p_campaign_id, v_uid, false);

	v_details := jsonb_build_object(
		'formula', v_formula,
		'count', v_count,
		'faces', v_faces,
		'modifier', v_mod,
		'rolls', v_rolls,
		'pools', v_parsed->'pools'
	);

	insert into public.vtt_rolls (
		campaign_id,
		scene_id,
		session_id,
		author_id,
		character_id,
		kind,
		formula,
		label,
		message,
		is_secret
	) values (
		p_campaign_id,
		p_scene_id,
		v_session,
		v_uid,
		p_character_id,
		'roll',
		case when v_secret then null else v_formula end,
		v_label,
		null,
		v_secret
	)
	returning id into v_id;

	insert into public.vtt_roll_results (roll_id, total, details)
	values (v_id, v_total, v_details);

	return jsonb_build_object(
		'id', v_id,
		'total', v_total,
		'is_secret', v_secret,
		'formula', v_formula
	);
end;
$$;

revoke all on function public.parse_dice_formula(text) from public, anon;
grant execute on function public.parse_dice_formula(text) to authenticated;
revoke all on function public.roll_dice(uuid, uuid, text, boolean, text, uuid) from public, anon;
grant execute on function public.roll_dice(uuid, uuid, text, boolean, text, uuid) to authenticated;
