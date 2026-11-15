-- 0072 · Luz da cena e visão no escuro (VTT).
--
-- 1) vtt_scenes.light_level: 'bright' (clara, padrão) ou 'dark' (escura). Numa
--    cena escura, no modo Exploração, o jogador só enxerga até o alcance da
--    visão no escuro da ficha (sem ela, a casa ao lado). Colunas novas entram
--    no Realtime da tabela sem mais nada.
--
-- 2) set_character_vision(p_character_id, p_vision, p_darkvision): muda SÓ a
--    visão normal e a visão no escuro da ficha (data->'visionDistance' e
--    data->'darkvisionDistance'), na unidade do deslocamento da ficha. É uma
--    função à parte da set_character_resources (0069) de propósito: não mexe
--    numa função que já está em produção.
--      · cada valor: número > 0 e <= 1000 (uma casa decimal), ou NULL para
--        remover (a mesa volta ao padrão do token).
--      · nada mais da ficha é tocado (nome, atributos, PV, inventário...).
--    Quem pode (mesma regra da 0067/0069): mestre (owner) ou editor da
--    campanha em qualquer ficha; quem criou a ficha (created_by) só na própria.
--    auth.uid() nulo e não membros levam exception.
--
-- Rollback:
--   drop function if exists public.set_character_vision(uuid, numeric, numeric);
--   alter table public.vtt_scenes drop constraint if exists vtt_scenes_light_level_check;
--   alter table public.vtt_scenes drop column if exists light_level;

begin;

alter table public.vtt_scenes
	add column if not exists light_level text not null default 'bright';

alter table public.vtt_scenes
	drop constraint if exists vtt_scenes_light_level_check;
alter table public.vtt_scenes
	add constraint vtt_scenes_light_level_check
	check (light_level in ('bright', 'dark'));

create or replace function public.set_character_vision(
	p_character_id uuid,
	p_vision numeric,
	p_darkvision numeric
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
	v_out jsonb := '{}'::jsonb;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para mudar a visão da ficha.'
			using errcode = '28000';
	end if;

	if p_character_id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;

	-- NaN é maior que qualquer número no Postgres, então cai no limite superior.
	if (p_vision is not null and (p_vision <= 0 or p_vision > 1000))
		or (p_darkvision is not null and (p_darkvision <= 0 or p_darkvision > 1000)) then
		raise exception 'Visão inválida (maior que 0 e até 1000).'
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
		raise exception 'Só membros da campanha podem mudar a visão da ficha.'
			using errcode = '42501';
	end if;
	if v_role is distinct from 'owner' and v_role is distinct from 'editor' then
		if v_created_by is distinct from v_uid then
			raise exception 'Você não pode mudar a visão desta ficha.'
				using errcode = '42501';
		end if;
	end if;

	v_data := coalesce(v_data, '{}'::jsonb);

	if p_vision is null then
		v_data := v_data - 'visionDistance';
	else
		v_data := jsonb_set(v_data, '{visionDistance}', to_jsonb(round(p_vision, 1)), true);
		v_out := v_out || jsonb_build_object('visionDistance', round(p_vision, 1));
	end if;

	if p_darkvision is null then
		v_data := v_data - 'darkvisionDistance';
	else
		v_data := jsonb_set(v_data, '{darkvisionDistance}', to_jsonb(round(p_darkvision, 1)), true);
		v_out := v_out || jsonb_build_object('darkvisionDistance', round(p_darkvision, 1));
	end if;

	update public.characters
	set data = v_data
	where id = p_character_id;

	return v_out;
end;
$$;

revoke all on function public.set_character_vision(uuid, numeric, numeric) from public, anon;
grant execute on function public.set_character_vision(uuid, numeric, numeric) to authenticated;

commit;
