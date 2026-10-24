-- 0046: paredes da mesa (VTT), fatia 1.
-- Merge do Luiz (RLS). NÃO aplicar sem revisão.
--
-- Uma linha por segmento. Fatia 1: só o mestre (owner/editor da campanha da
-- cena) lê e escreve; jogador (viewer) não lê nada. A fatia 3 (visão, #81)
-- revisa o SELECT. Sem realtime nesta fatia (fica com a #81).

create table if not exists public.vtt_walls (
    id uuid primary key default gen_random_uuid(),
    scene_id uuid not null references public.vtt_scenes(id) on delete cascade,
    x1 double precision not null,
    y1 double precision not null,
    x2 double precision not null,
    y2 double precision not null,
    kind text not null default 'wall' check (kind in ('wall')),
    created_by uuid references auth.users(id) on delete set null default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Segmento de comprimento zero não é parede.
    constraint vtt_walls_not_point check (x1 <> x2 or y1 <> y2)
);

create index if not exists vtt_walls_scene_id_idx on public.vtt_walls(scene_id);

drop trigger if exists vtt_walls_set_updated_at on public.vtt_walls;
create trigger vtt_walls_set_updated_at
before update on public.vtt_walls
for each row execute function public.set_updated_at();

alter table public.vtt_walls enable row level security;

drop policy if exists "GM can view walls" on public.vtt_walls;
create policy "GM can view walls" on public.vtt_walls
for select using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

drop policy if exists "GM can insert walls" on public.vtt_walls;
create policy "GM can insert walls" on public.vtt_walls
for insert with check (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

drop policy if exists "GM can update walls" on public.vtt_walls;
create policy "GM can update walls" on public.vtt_walls
for update using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
) with check (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

drop policy if exists "GM can delete walls" on public.vtt_walls;
create policy "GM can delete walls" on public.vtt_walls
for delete using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

grant select, insert, update, delete on public.vtt_walls to authenticated;
