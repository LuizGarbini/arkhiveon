-- Bootstrap LOCAL descartável para a 0081. Não é migration de produção.
-- Replica do prod (lido em pg_policies / information_schema, 2026-11-22) só o
-- necessário: auth.uid, papéis, campaigns, memberships, characters, npcs,
-- vtt_scenes, vtt_tokens, as policies atuais dessas tabelas, os helpers de
-- papel e o guard do UPDATE de token. Host obrigatório: 127.0.0.1.

create extension if not exists pgcrypto;

do $$
begin
	if not exists (select 1 from pg_roles where rolname = 'anon') then
		create role anon nologin;
	end if;
	if not exists (select 1 from pg_roles where rolname = 'authenticated') then
		create role authenticated nologin;
	end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);

create or replace function auth.uid()
returns uuid language sql stable as $$
	select nullif(
		coalesce(
			nullif(current_setting('request.jwt.claim.sub', true), ''),
			nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
		),
		''
	)::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.campaigns (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid,
	name text not null default '',
	world_id uuid
);

create table public.memberships (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	user_id uuid not null,
	role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
	unique (campaign_id, user_id)
);

create table public.characters (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	name text not null default '',
	system text not null default 'generic',
	data jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	created_by uuid not null default auth.uid()
);

create table public.npcs (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid(),
	campaign_id uuid not null,
	name text not null default '',
	importance text not null default 'supporting',
	data jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	created_by uuid not null default auth.uid(),
	world_id uuid not null,
	publication_scope text not null default 'restricted',
	visibility text not null default 'public',
	campaign_ids uuid[] not null default '{}'::uuid[]
);

create table public.vtt_scenes (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	name text not null default 'Nova Cena',
	width integer not null default 4000,
	height integer not null default 4000,
	is_active boolean not null default false
);

create table public.vtt_tokens (
	id uuid primary key default gen_random_uuid(),
	scene_id uuid not null references public.vtt_scenes(id) on delete cascade,
	character_id uuid,
	npc_id uuid,
	name text not null default 'Token',
	avatar_url text,
	layer text not null default 'token',
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
	updated_at timestamptz not null default now(),
	temp_hp integer default 0
);

create or replace function public.user_campaign_role(p_campaign_id uuid)
returns text language sql stable security definer set search_path to 'public' as $function$
	select role from memberships where campaign_id = p_campaign_id and user_id = auth.uid() limit 1;
$function$;

create or replace function public.user_scene_campaign_role(p_scene_id uuid)
returns text language sql stable security definer set search_path to 'public' as $function$
	select user_campaign_role(s.campaign_id) from vtt_scenes s where s.id = p_scene_id limit 1;
$function$;

create or replace function public.vtt_tokens_player_update_guard()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
	if auth.uid() is null then return new; end if;
	if user_scene_campaign_role(old.scene_id) in ('owner', 'editor') then return new; end if;
	if new.scene_id is distinct from old.scene_id
		or new.character_id is distinct from old.character_id
		or new.npc_id is distinct from old.npc_id
		or new.controlled_by is distinct from old.controlled_by
		or new.layer is distinct from old.layer
		or new.is_hidden is distinct from old.is_hidden
		or new.is_locked is distinct from old.is_locked
	then
		raise exception 'Só o mestre pode mudar cena, ficha, controle, camada, visibilidade ou trava do token.'
			using errcode = '42501';
	end if;
	return new;
end;
$function$;
create trigger vtt_tokens_player_update_guard before update on public.vtt_tokens
	for each row execute function public.vtt_tokens_player_update_guard();

alter table public.characters enable row level security;
alter table public.npcs enable row level security;
alter table public.vtt_scenes enable row level security;
alter table public.vtt_tokens enable row level security;

create policy "Campaign members can view characters" on public.characters for select using (
	exists (select 1 from (memberships m join campaigns c on c.id = characters.campaign_id)
		where m.campaign_id = characters.campaign_id and m.user_id = auth.uid()
			and ((c.owner_id = auth.uid()) or (characters.created_by = auth.uid())
				or (coalesce(characters.data ->> 'share', 'table') = 'table')
				or ((characters.data ->> 'share') = 'staff' and m.role = any (array['owner', 'editor']))
				or ((characters.data ->> 'share') = 'players' and m.role = 'viewer')
				or ((characters.data ->> 'share') = 'chosen' and (characters.data -> 'sharedWith') ? (auth.uid())::text)))
);

create policy "World members can view npcs" on public.npcs for select using (
	exists (select 1 from (memberships m join campaigns c on c.id = m.campaign_id)
		where c.world_id = npcs.world_id and m.user_id = auth.uid()
			and (((c.owner_id = auth.uid()) and ((npcs.publication_scope = 'global') or (c.id = any (npcs.campaign_ids))))
				or (npcs.created_by = auth.uid())
				or ((coalesce(npcs.data ->> 'share', '') = '')
					and (((npcs.visibility = 'master_secret') and (m.role = any (array['owner', 'editor'])))
						or ((npcs.visibility = 'public') and ((npcs.publication_scope = 'global')
							or ((npcs.publication_scope = 'restricted') and (c.id = any (npcs.campaign_ids)))))))
				or (((npcs.data ->> 'share') = 'staff') and (m.role = any (array['owner', 'editor'])))
				or (((npcs.data ->> 'share') = any (array['table', 'players', 'chosen']))
					and ((npcs.publication_scope = 'global') or ((npcs.publication_scope = 'restricted') and (c.id = any (npcs.campaign_ids))))
					and (((npcs.data ->> 'share') = 'table')
						or (((npcs.data ->> 'share') = 'players') and (m.role = 'viewer'))
						or (((npcs.data ->> 'share') = 'chosen') and ((npcs.data -> 'sharedWith') ? (auth.uid())::text))))))
);

create policy "Members can view scenes" on public.vtt_scenes for select using (
	(user_campaign_role(campaign_id) = any (array['owner', 'editor']))
	or ((user_campaign_role(campaign_id) = 'viewer') and (is_active = true))
);

create policy "Users can view tokens based on role and layer" on public.vtt_tokens for select using (
	(user_scene_campaign_role(scene_id) = any (array['owner', 'editor']))
	or ((user_scene_campaign_role(scene_id) = 'viewer') and (layer <> 'gm') and (is_hidden = false))
);

create policy "GM or token owners can insert tokens" on public.vtt_tokens for insert with check (
	(user_scene_campaign_role(scene_id) = any (array['owner', 'editor']))
	or ((user_scene_campaign_role(scene_id) = 'viewer')
		and ((controlled_by @> jsonb_build_array((auth.uid())::text))
			or ((character_id is not null) and (exists (select 1 from characters c
				where c.id = vtt_tokens.character_id and (c.user_id = auth.uid() or c.created_by = auth.uid()))))))
);

create policy "GM or token controllers can update tokens" on public.vtt_tokens for update using (
	(user_scene_campaign_role(scene_id) = any (array['owner', 'editor']))
	or ((user_scene_campaign_role(scene_id) = 'viewer') and (is_locked = false)
		and ((controlled_by @> jsonb_build_array((auth.uid())::text))
			or ((character_id is not null) and (exists (select 1 from characters c
				where c.id = vtt_tokens.character_id and (c.user_id = auth.uid() or c.created_by = auth.uid()))))))
) with check (
	(user_scene_campaign_role(scene_id) = any (array['owner', 'editor']))
	or ((user_scene_campaign_role(scene_id) = 'viewer') and (is_locked = false) and (layer <> 'gm') and (is_hidden = false))
);

create policy "GM or token controllers can delete tokens" on public.vtt_tokens for delete using (
	(user_scene_campaign_role(scene_id) = any (array['owner', 'editor']))
	or ((user_scene_campaign_role(scene_id) = 'viewer')
		and ((controlled_by @> jsonb_build_array((auth.uid())::text))
			or ((character_id is not null) and (exists (select 1 from characters c
				where c.id = vtt_tokens.character_id and (c.user_id = auth.uid() or c.created_by = auth.uid()))))))
);

-- Grants como no Supabase (a RLS é quem filtra).
grant usage on schema public to anon, authenticated;
grant select on public.campaigns, public.memberships to authenticated;
grant select, insert, update, delete on public.characters, public.npcs, public.vtt_scenes, public.vtt_tokens to authenticated;
