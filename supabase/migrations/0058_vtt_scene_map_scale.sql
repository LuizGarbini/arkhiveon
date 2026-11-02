-- ROLLBACK (não aplicar nesta fatia; só o Luiz, no Supabase local):
-- drop function if exists public.scale_scene_geometry(uuid, double precision);
-- alter table public.vtt_scenes drop constraint if exists vtt_scenes_grid_size_range;
-- alter table public.vtt_scenes drop constraint if exists vtt_scenes_map_scale_range;
-- alter table public.vtt_scenes drop column if exists grid_offset_x;
-- alter table public.vtt_scenes drop column if exists grid_offset_y;
-- alter table public.vtt_scenes drop column if exists map_scale;
-- alter table public.vtt_scenes
--   alter column grid_size type integer using round(grid_size)::integer;
--
-- NÃO APLICADA. Não rodar supabase db push, db link, nem nada no projeto
-- uaopatoluletcdyohudc. Nenhuma policy de vtt_scenes é criada ou afrouxada
-- (update continua "GM can update scenes" da 0035: só owner/editor).

-- =============================================================================
-- Migration 0058: offset do grid, célula decimal e escala da geometria
-- =============================================================================
-- grid_size passa a double precision (décimos de pixel).
-- grid_offset_x/y deslocam as linhas. map_scale guarda o fator acumulado do
-- sprite (1 = original). scale_scene_geometry multiplica tokens e paredes e
-- grava map_scale na mesma função (uma transação).
--
-- Verificação só-leitura, rode na base alvo antes de aplicar. O esperado é
-- zero linhas; se voltar alguma, o UPDATE abaixo prende no intervalo:
-- select id, grid_size
-- from public.vtt_scenes
-- where grid_size < 10 or grid_size > 400;

alter table public.vtt_scenes
	alter column grid_size type double precision
	using grid_size::double precision;

alter table public.vtt_scenes
	add column if not exists grid_offset_x double precision not null default 0,
	add column if not exists grid_offset_y double precision not null default 0,
	add column if not exists map_scale double precision not null default 1;

alter table public.vtt_scenes
	drop constraint if exists vtt_scenes_map_scale_range;

alter table public.vtt_scenes
	add constraint vtt_scenes_map_scale_range
	check (map_scale > 0 and map_scale <= 8);

-- Clamp documentado: traz célula fora de 10–400 antes do CHECK.
update public.vtt_scenes
set grid_size = least(400::double precision, greatest(10::double precision, grid_size))
where grid_size < 10 or grid_size > 400;

alter table public.vtt_scenes
	drop constraint if exists vtt_scenes_grid_size_range;

alter table public.vtt_scenes
	add constraint vtt_scenes_grid_size_range
	check (grid_size >= 10 and grid_size <= 400);

create or replace function public.scale_scene_geometry(
	p_scene_id uuid,
	p_factor double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_campaign_id uuid;
	v_role text;
	v_scale double precision;
	v_next double precision;
begin
	if auth.uid() is null then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	select s.campaign_id, s.map_scale
	into v_campaign_id, v_scale
	from public.vtt_scenes s
	where s.id = p_scene_id
	for update;

	if v_campaign_id is null then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	v_role := public.user_campaign_role(v_campaign_id);
	if v_role is null or v_role not in ('owner', 'editor') then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	-- (0, 8] no fator e na escala resultante. Quem não é mestre já saiu acima.
	if p_factor is null
		or p_factor <= 0
		or p_factor > 8
		or p_factor <> p_factor
	then
		raise exception 'fator inválido' using errcode = '22023';
	end if;

	v_next := v_scale * p_factor;
	if v_next is null
		or v_next <= 0
		or v_next > 8
		or v_next <> v_next
	then
		raise exception 'fator inválido' using errcode = '22023';
	end if;

	update public.vtt_tokens
	set x = x * p_factor,
		y = y * p_factor
	where scene_id = p_scene_id;

	update public.vtt_walls
	set x1 = x1 * p_factor,
		y1 = y1 * p_factor,
		x2 = x2 * p_factor,
		y2 = y2 * p_factor
	where scene_id = p_scene_id;

	update public.vtt_scenes
	set map_scale = v_next
	where id = p_scene_id
		and campaign_id = v_campaign_id;
end;
$$;

revoke all on function public.scale_scene_geometry(uuid, double precision) from public;
revoke all on function public.scale_scene_geometry(uuid, double precision) from anon;
grant execute on function public.scale_scene_geometry(uuid, double precision) to authenticated;
