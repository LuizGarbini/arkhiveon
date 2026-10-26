-- =============================================================================
-- Migration 0050: RPC set_character_hp — PV da ficha sem regravar o JSON
-- =============================================================================
-- O UPDATE de characters só deixa owner/editor da campanha (policy da 0003).
-- O jogador dono da ficha precisa mudar o PV atual sem abrir a ficha inteira.
-- Esta função altera só data->health e, quando p_max vem preenchido,
-- data->healthMax, via jsonb_set. O resto do JSON fica como está.
-- Não cria nem altera policy, trigger ou RLS.
--
-- Quem pode:
--   mestre (membership owner) ou editor da campanha da ficha: current e max;
--   dono da ficha (user_id ou created_by), se não for mestre/editor: só current.
-- Qualquer outro, e auth.uid() nulo, leva exception.
-- NÃO APLICADA. Merge e aplicação só pelo Luiz.

create or replace function public.set_character_hp(
	p_character_id uuid,
	p_current int,
	p_max int default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_user_id uuid;
	v_created_by uuid;
	v_campaign_id uuid;
	v_data jsonb;
	v_role text;
	v_cap int;
	v_health int;
	v_num numeric;
	v_result jsonb;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para alterar os PV.'
			using errcode = '28000';
	end if;

	if p_character_id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;

	if p_current is null or p_current < 0 then
		raise exception 'O PV atual tem que ser zero ou mais.'
			using errcode = '22023';
	end if;

	if p_max is not null and p_max <= 0 then
		raise exception 'O PV máximo tem que ser maior que zero.'
			using errcode = '22023';
	end if;

	select c.user_id, c.created_by, c.campaign_id, c.data
	into v_user_id, v_created_by, v_campaign_id, v_data
	from public.characters c
	where c.id = p_character_id
	for update;

	if not found then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;

	v_role := public.user_campaign_role(v_campaign_id);
	-- null in ('owner','editor') não é verdadeiro: quem não é mestre/editor cai aqui.
	if v_role is distinct from 'owner' and v_role is distinct from 'editor' then
		if v_user_id is distinct from v_uid and v_created_by is distinct from v_uid then
			raise exception 'Você não pode alterar os PV desta ficha.'
				using errcode = '42501';
		end if;
		if p_max is not null then
			raise exception 'Só o mestre pode alterar o PV máximo.'
				using errcode = '42501';
		end if;
	end if;

	v_health := p_current;
	v_cap := p_max;
	if v_cap is null and jsonb_typeof(v_data->'healthMax') = 'number' then
		v_num := (v_data->>'healthMax')::numeric;
		if v_num >= 2147483647 then
			v_cap := 2147483647;
		elsif v_num > 0 then
			v_cap := floor(v_num)::int;
		else
			v_cap := 0;
		end if;
	end if;
	if v_health < 0 then
		v_health := 0;
	end if;
	if v_cap is not null and v_health > v_cap then
		v_health := v_cap;
	end if;

	update public.characters
	set data = case
		when p_max is null then jsonb_set(data, '{health}', to_jsonb(v_health), true)
		else jsonb_set(
			jsonb_set(data, '{healthMax}', to_jsonb(p_max), true),
			'{health}',
			to_jsonb(v_health),
			true
		)
	end
	where id = p_character_id
	returning jsonb_strip_nulls(jsonb_build_object(
		'health', data->'health',
		'healthMax', data->'healthMax'
	))
	into v_result;

	if not found then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;

	return v_result;
end;
$$;

revoke all on function public.set_character_hp(uuid, int, int) from public, anon;
grant execute on function public.set_character_hp(uuid, int, int) to authenticated;
