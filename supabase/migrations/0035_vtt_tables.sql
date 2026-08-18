-- =============================================================================
-- Migration 0035: Tabletop Virtual (VTT) Tables & RLS Policies
-- =============================================================================

-- 1. Create vtt_scenes table
create table if not exists public.vtt_scenes (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns(id) on delete cascade,
    name text not null default 'Nova Cena',
    map_image_url text,
    grid_type text not null default 'square' check (grid_type in ('square', 'hex_pointy', 'hex_flat', 'none')),
    grid_size integer not null default 70,
    grid_color text not null default '#ffffff',
    grid_opacity double precision not null default 0.2,
    grid_scale_distance double precision not null default 1.5,
    grid_scale_unit text not null default 'm' check (grid_scale_unit in ('m', 'ft', 'sq')),
    width integer not null default 4000,
    height integer not null default 4000,
    fog_enabled boolean not null default false,
    fog_exploration boolean not null default true,
    is_active boolean not null default false,
    order_index integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Create vtt_tokens table
create table if not exists public.vtt_tokens (
    id uuid primary key default gen_random_uuid(),
    scene_id uuid not null references public.vtt_scenes(id) on delete cascade,
    character_id uuid references public.characters(id) on delete set null,
    npc_id uuid references public.npcs(id) on delete set null,
    name text not null default 'Token',
    avatar_url text,
    layer text not null default 'token' check (layer in ('map', 'token', 'gm')),
    x double precision not null default 0,
    y double precision not null default 0,
    size_cells double precision not null default 1.0,
    rotation double precision not null default 0,
    hp_current integer,
    hp_max integer,
    elevation double precision not null default 0,
    conditions jsonb not null default '[]'::jsonb,
    auras jsonb not null default '[]'::jsonb,
    vision_range double precision not null default 0,
    is_locked boolean not null default false,
    is_hidden boolean not null default false,
    controlled_by jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Create vtt_fog_states table
create table if not exists public.vtt_fog_states (
    id uuid primary key default gen_random_uuid(),
    scene_id uuid not null unique references public.vtt_scenes(id) on delete cascade,
    revealed_paths jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes for high-performance querying and realtime lookups
create index if not exists vtt_scenes_campaign_id_idx on public.vtt_scenes(campaign_id);
create index if not exists vtt_scenes_is_active_idx on public.vtt_scenes(campaign_id, is_active);
create index if not exists vtt_tokens_scene_id_idx on public.vtt_tokens(scene_id);
create index if not exists vtt_tokens_character_id_idx on public.vtt_tokens(character_id);
create index if not exists vtt_tokens_npc_id_idx on public.vtt_tokens(npc_id);
create index if not exists vtt_fog_states_scene_id_idx on public.vtt_fog_states(scene_id);

-- Triggers for updated_at
create trigger vtt_scenes_set_updated_at
before update on public.vtt_scenes
for each row execute function public.set_updated_at();

create trigger vtt_tokens_set_updated_at
before update on public.vtt_tokens
for each row execute function public.set_updated_at();

create trigger vtt_fog_states_set_updated_at
before update on public.vtt_fog_states
for each row execute function public.set_updated_at();

-- =============================================================================
-- Helper function to resolve scene's campaign role
-- =============================================================================
create or replace function public.user_scene_campaign_role(p_scene_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select user_campaign_role(s.campaign_id)
    from vtt_scenes s
    where s.id = p_scene_id
    limit 1;
$$;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS
alter table public.vtt_scenes enable row level security;
alter table public.vtt_tokens enable row level security;
alter table public.vtt_fog_states enable row level security;

-- -----------------------------------------------------------------------------
-- vtt_scenes policies
-- -----------------------------------------------------------------------------
drop policy if exists "Members can view scenes" on public.vtt_scenes;
create policy "Members can view scenes" on public.vtt_scenes
for select using (
    user_campaign_role(campaign_id) in ('owner', 'editor')
    or (user_campaign_role(campaign_id) = 'viewer' and is_active = true)
);

drop policy if exists "GM can insert scenes" on public.vtt_scenes;
create policy "GM can insert scenes" on public.vtt_scenes
for insert with check (
    user_campaign_role(campaign_id) in ('owner', 'editor')
);

drop policy if exists "GM can update scenes" on public.vtt_scenes;
create policy "GM can update scenes" on public.vtt_scenes
for update using (
    user_campaign_role(campaign_id) in ('owner', 'editor')
) with check (
    user_campaign_role(campaign_id) in ('owner', 'editor')
);

drop policy if exists "GM can delete scenes" on public.vtt_scenes;
create policy "GM can delete scenes" on public.vtt_scenes
for delete using (
    user_campaign_role(campaign_id) in ('owner', 'editor')
);

-- -----------------------------------------------------------------------------
-- vtt_tokens policies
-- -----------------------------------------------------------------------------
drop policy if exists "Users can view tokens based on role and layer" on public.vtt_tokens;
create policy "Users can view tokens based on role and layer" on public.vtt_tokens
for select using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
    or (
        user_scene_campaign_role(scene_id) = 'viewer'
        and layer != 'gm'
        and is_hidden = false
    )
);

drop policy if exists "GM or token owners can insert tokens" on public.vtt_tokens;
create policy "GM or token owners can insert tokens" on public.vtt_tokens
for insert with check (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
    or (
        user_scene_campaign_role(scene_id) = 'viewer'
        and (
            controlled_by @> jsonb_build_array(auth.uid()::text)
            or (
                character_id is not null
                and exists (
                    select 1 from characters c
                    where c.id = character_id
                    and (c.user_id = auth.uid() or c.created_by = auth.uid())
                )
            )
        )
    )
);

drop policy if exists "GM or token controllers can update tokens" on public.vtt_tokens;
create policy "GM or token controllers can update tokens" on public.vtt_tokens
for update using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
    or (
        user_scene_campaign_role(scene_id) = 'viewer'
        and is_locked = false
        and (
            controlled_by @> jsonb_build_array(auth.uid()::text)
            or (
                character_id is not null
                and exists (
                    select 1 from characters c
                    where c.id = character_id
                    and (c.user_id = auth.uid() or c.created_by = auth.uid())
                )
            )
        )
    )
) with check (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
    or (
        user_scene_campaign_role(scene_id) = 'viewer'
        and is_locked = false
    )
);

drop policy if exists "GM or token controllers can delete tokens" on public.vtt_tokens;
create policy "GM or token controllers can delete tokens" on public.vtt_tokens
for delete using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
    or (
        user_scene_campaign_role(scene_id) = 'viewer'
        and (
            controlled_by @> jsonb_build_array(auth.uid()::text)
            or (
                character_id is not null
                and exists (
                    select 1 from characters c
                    where c.id = character_id
                    and (c.user_id = auth.uid() or c.created_by = auth.uid())
                )
            )
        )
    )
);

-- -----------------------------------------------------------------------------
-- vtt_fog_states policies
-- -----------------------------------------------------------------------------
drop policy if exists "Members can view fog state" on public.vtt_fog_states;
create policy "Members can view fog state" on public.vtt_fog_states
for select using (
    user_scene_campaign_role(scene_id) is not null
);

drop policy if exists "GM can insert fog state" on public.vtt_fog_states;
create policy "GM can insert fog state" on public.vtt_fog_states
for insert with check (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

drop policy if exists "GM can update fog state" on public.vtt_fog_states;
create policy "GM can update fog state" on public.vtt_fog_states
for update using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
) with check (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

drop policy if exists "GM can delete fog state" on public.vtt_fog_states;
create policy "GM can delete fog state" on public.vtt_fog_states
for delete using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

-- =============================================================================
-- Enable Realtime Replication for VTT
-- =============================================================================
alter table public.vtt_scenes replica identity full;
alter table public.vtt_tokens replica identity full;
alter table public.vtt_fog_states replica identity full;

do $$
declare
    pub_id oid;
begin
    select oid into pub_id from pg_publication where pubname = 'supabase_realtime';
    if pub_id is not null then
        if not exists (select 1 from pg_publication_rel where prpubid = pub_id and prrelid = 'public.vtt_scenes'::regclass) then
            alter publication supabase_realtime add table public.vtt_scenes;
        end if;
        if not exists (select 1 from pg_publication_rel where prpubid = pub_id and prrelid = 'public.vtt_tokens'::regclass) then
            alter publication supabase_realtime add table public.vtt_tokens;
        end if;
        if not exists (select 1 from pg_publication_rel where prpubid = pub_id and prrelid = 'public.vtt_fog_states'::regclass) then
            alter publication supabase_realtime add table public.vtt_fog_states;
        end if;
    end if;
end $$;
