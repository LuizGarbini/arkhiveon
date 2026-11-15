-- 0075 · Áreas de luz na cena (VTT).
--
-- Até aqui a luz era uma só por cena (clara ou escura, 0072). Agora o mestre marca
-- ÁREAS dentro da cena com o tipo de luz de cada uma:
--   bright = luz do dia      dim = penumbra      dark = escuridão
-- O alcance de visão do personagem muda conforme a luz do lugar onde ele está:
-- fora de qualquer área vale a luz padrão da cena (vtt_scenes.light_level, que
-- agora também aceita 'dim'); dentro de uma área vale a dela; se duas se
-- sobrepõem, vale a criada por último.
--
-- vtt_light_zones: uma linha por área.
--   shape    'circle' | 'rect' | 'polygon'
--   geometry circle  {x, y, radius}
--            rect    {x, y, width, height}
--            polygon {points: [{x, y}, ...]}  (de 3 a 64 pontos)
--   level    'bright' | 'dim' | 'dark'
-- Quem lê: todo participante da campanha (o cliente precisa da área para calcular
-- a visão do jogador). Quem cria/edita/apaga: mestre e co-mestre (owner/editor).
-- No máximo 200 áreas por cena (gatilho). Entra no Realtime, como as paredes.
--
-- Rollback:
--   drop table if exists public.vtt_light_zones;
--   drop function if exists public.vtt_light_zones_limit();
--   (antes de voltar o check, ponha as cenas em 'bright' ou 'dark':
--    update public.vtt_scenes set light_level = 'bright' where light_level = 'dim';)
--   alter table public.vtt_scenes drop constraint if exists vtt_scenes_light_level_check;
--   alter table public.vtt_scenes add constraint vtt_scenes_light_level_check
--     check (light_level in ('bright', 'dark'));

begin;

alter table public.vtt_scenes
	drop constraint if exists vtt_scenes_light_level_check;
alter table public.vtt_scenes
	add constraint vtt_scenes_light_level_check
	check (light_level in ('bright', 'dim', 'dark'));

create table if not exists public.vtt_light_zones (
	id uuid primary key default gen_random_uuid(),
	scene_id uuid not null references public.vtt_scenes(id) on delete cascade,
	shape text not null,
	level text not null,
	geometry jsonb not null,
	created_by uuid references auth.users(id) on delete set null default auth.uid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint vtt_light_zones_shape_check check (shape in ('circle', 'rect', 'polygon')),
	constraint vtt_light_zones_level_check check (level in ('bright', 'dim', 'dark')),
	constraint vtt_light_zones_geometry_check check (
		(shape = 'circle'
			and jsonb_typeof(geometry) = 'object'
			and geometry ?& array['x', 'y', 'radius'])
		or (shape = 'rect'
			and jsonb_typeof(geometry) = 'object'
			and geometry ?& array['x', 'y', 'width', 'height'])
		or (shape = 'polygon'
			and jsonb_typeof(geometry) = 'object'
			and jsonb_typeof(geometry->'points') = 'array'
			and jsonb_array_length(geometry->'points') between 3 and 64)
	)
);

create index if not exists vtt_light_zones_scene_idx
	on public.vtt_light_zones (scene_id, created_at);

drop trigger if exists vtt_light_zones_set_updated_at on public.vtt_light_zones;
create trigger vtt_light_zones_set_updated_at
before update on public.vtt_light_zones
for each row execute function public.set_updated_at();

-- Limite por cena como gatilho (uma policy que consulta a própria tabela dá
-- "infinite recursion", como na 0070).
create or replace function public.vtt_light_zones_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if (
		select count(*) from public.vtt_light_zones z where z.scene_id = new.scene_id
	) >= 200 then
		raise exception 'Limite de 200 áreas de luz por cena.'
			using errcode = '54000';
	end if;
	return new;
end;
$$;

drop trigger if exists vtt_light_zones_limit on public.vtt_light_zones;
create trigger vtt_light_zones_limit
before insert on public.vtt_light_zones
for each row execute function public.vtt_light_zones_limit();

alter table public.vtt_light_zones enable row level security;

revoke all on public.vtt_light_zones from anon;

drop policy if exists "Campaign participants can view light zones" on public.vtt_light_zones;
create policy "Campaign participants can view light zones" on public.vtt_light_zones
for select using (
	user_scene_campaign_role(scene_id) is not null
);

drop policy if exists "GM can insert light zones" on public.vtt_light_zones;
create policy "GM can insert light zones" on public.vtt_light_zones
for insert with check (
	user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

drop policy if exists "GM can update light zones" on public.vtt_light_zones;
create policy "GM can update light zones" on public.vtt_light_zones
for update using (
	user_scene_campaign_role(scene_id) in ('owner', 'editor')
) with check (
	user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

drop policy if exists "GM can delete light zones" on public.vtt_light_zones;
create policy "GM can delete light zones" on public.vtt_light_zones
for delete using (
	user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

grant select, insert, update, delete on public.vtt_light_zones to authenticated;

do $$
declare
	pub_id oid;
begin
	select oid into pub_id from pg_publication where pubname = 'supabase_realtime';
	if pub_id is not null then
		if not exists (
			select 1 from pg_publication_rel pr
			join pg_class c on c.oid = pr.prrelid
			join pg_namespace n on n.oid = c.relnamespace
			where pr.prpubid = pub_id
				and n.nspname = 'public'
				and c.relname = 'vtt_light_zones'
		) then
			alter publication supabase_realtime add table public.vtt_light_zones;
		end if;
	end if;
end;
$$;

comment on table public.vtt_light_zones is
	'Áreas de luz da cena (luz do dia, penumbra, escuridão): o alcance de visão muda conforme a luz do lugar do personagem.';

commit;
