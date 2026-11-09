-- Bootstrap LOCAL descartável para 0063. Não é migration de produção.
-- Replica o mínimo (auth.uid, papéis, campanha/ficha/item, RLS 0003, 0056, 0052)
-- para aplicar supabase/migrations/0063_consume_ammo.sql neste Postgres.
-- Host obrigatório: 127.0.0.1. Nunca apontar para projeto remoto.

create extension if not exists pgcrypto;

do $$
begin
	if not exists (select 1 from pg_roles where rolname = 'anon') then
		create role anon nologin;
	end if;
	if not exists (select 1 from pg_roles where rolname = 'authenticated') then
		create role authenticated nologin;
	end if;
	if not exists (select 1 from pg_roles where rolname = 'service_role') then
		create role service_role nologin bypassrls;
	end if;
end $$;

grant anon to current_user;
grant authenticated to current_user;
grant anon to postgres;
grant authenticated to postgres;

create schema if not exists auth;

create table if not exists auth.users (
	id uuid primary key,
	email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
	select nullif(
		coalesce(
			nullif(current_setting('request.jwt.claim.sub', true), ''),
			nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
		),
		''
	)::uuid;
$$;

create table if not exists public.worlds (
	id uuid primary key,
	owner_user_id uuid,
	name text not null default ''
);

create table if not exists public.campaigns (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid,
	name text not null default '',
	world_id uuid references public.worlds(id),
	member_limit int not null default 20
);

create table if not exists public.memberships (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	user_id uuid not null,
	role text not null default 'viewer'
		check (role in ('owner', 'editor', 'viewer')),
	created_at timestamptz not null default now(),
	unique (campaign_id, user_id)
);

create table if not exists public.items (
	id uuid primary key default gen_random_uuid(),
	user_id uuid,
	created_by uuid,
	campaign_id uuid,
	world_id uuid,
	name text not null default '',
	item_type text not null default '',
	rarity text not null default 'comum',
	visibility text not null default 'public',
	data jsonb not null default '{}'::jsonb
);

create table if not exists public.characters (
	id uuid primary key default gen_random_uuid(),
	user_id uuid,
	created_by uuid,
	campaign_id uuid references public.campaigns(id) on delete set null,
	name text not null default '',
	system text not null default 'generic',
	data jsonb not null default '{}'::jsonb
);

create or replace function public.user_campaign_role(p_campaign_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
	select role from public.memberships
	where campaign_id = p_campaign_id
		and user_id = auth.uid()
	limit 1;
$$;

alter table public.worlds enable row level security;
alter table public.campaigns enable row level security;
alter table public.memberships enable row level security;
alter table public.items enable row level security;
alter table public.characters enable row level security;

drop policy if exists "Members can view campaign" on public.campaigns;
create policy "Members can view campaign"
	on public.campaigns for select
	using (public.user_campaign_role(id) is not null);

drop policy if exists "Members can view memberships" on public.memberships;
create policy "Members can view memberships"
	on public.memberships for select
	using (public.user_campaign_role(campaign_id) is not null);

drop policy if exists "Campaign members can view characters" on public.characters;
create policy "Campaign members can view characters"
	on public.characters for select
	using (public.user_campaign_role(campaign_id) is not null);

drop policy if exists "Editors can update characters" on public.characters;
create policy "Editors can update characters"
	on public.characters for update
	using (public.user_campaign_role(campaign_id) in ('owner', 'editor'))
	with check (public.user_campaign_role(campaign_id) in ('owner', 'editor'));

drop policy if exists "Campaign members can view items" on public.items;
create policy "Campaign members can view items"
	on public.items for select
	using (
		exists (
			select 1 from public.memberships m
			inner join public.campaigns c on c.id = m.campaign_id
			where c.world_id = items.world_id
				and m.user_id = auth.uid()
		)
	);

-- 0056 mínimo: guarda de vínculos (prova que 0063 não a remove).
create or replace function public.character_item_links(p_data jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
	select coalesce(
		jsonb_agg(
			jsonb_build_object(
				'id', e->'id',
				'campaignItemId', e->'campaignItemId'
			)
			order by e->>'id', e->>'campaignItemId'
		),
		'[]'::jsonb
	)
	from jsonb_array_elements(
		case
			when jsonb_typeof(p_data->'inventoryList') = 'array'
				then p_data->'inventoryList'
			else '[]'::jsonb
		end
	) as e
	where jsonb_typeof(e) = 'object'
		and coalesce(e->>'campaignItemId', '') <> '';
$$;

create or replace function public.guard_character_item_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_old jsonb := '[]'::jsonb;
	v_new jsonb;
	v_role text;
	v_creator uuid;
	v_world uuid;
	v_item_id text;
begin
	if v_uid is null then
		return new;
	end if;
	if tg_op = 'UPDATE' then
		v_old := public.character_item_links(old.data);
	end if;
	v_new := public.character_item_links(new.data);
	if v_old = v_new then
		return new;
	end if;
	v_role := coalesce(public.user_campaign_role(new.campaign_id), '');
	v_creator := case when tg_op = 'UPDATE' then old.created_by else new.created_by end;
	if v_role = '' then
		raise exception 'Só membros da campanha podem vincular itens da campanha.'
			using errcode = '42501';
	end if;
	if not (v_role in ('owner', 'editor') or v_creator is not distinct from v_uid) then
		raise exception 'Só o mestre, editores da campanha ou quem criou a ficha podem vincular itens da campanha.'
			using errcode = '42501';
	end if;
	select c.world_id into v_world from public.campaigns c where c.id = new.campaign_id;
	for v_item_id in
		select distinct n->>'campaignItemId'
		from jsonb_array_elements(v_new) n
		where not exists (
			select 1 from jsonb_array_elements(v_old) o
			where o->>'campaignItemId' = n->>'campaignItemId'
		)
	loop
		if not exists (
			select 1 from public.items i
			where i.id::text = v_item_id and i.world_id = v_world
		) then
			raise exception 'Item % não pertence ao mundo desta campanha.', v_item_id
				using errcode = '42501';
		end if;
	end loop;
	return new;
end;
$$;

drop trigger if exists characters_guard_item_links on public.characters;
create trigger characters_guard_item_links
	before insert or update on public.characters
	for each row execute function public.guard_character_item_links();

-- Stub 0052: contrato roll_dice(p_campaign_id, p_scene_id, p_formula, p_secret, p_label, p_character_id)
create table if not exists public.vtt_rolls (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid,
	scene_id uuid,
	author_id uuid,
	character_id uuid,
	formula text,
	label text,
	is_secret boolean not null default false,
	created_at timestamptz not null default now()
);

create table if not exists public.vtt_roll_results (
	roll_id uuid primary key references public.vtt_rolls(id) on delete cascade,
	total integer not null,
	details jsonb not null
);

create or replace function public.parse_dice_formula(p_formula text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
	v_text text;
	v_match text[];
	v_count integer;
	v_faces integer;
	v_mod integer;
	v_canonical text;
begin
	if p_formula is null or char_length(p_formula) > 64 then
		raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
			using errcode = '22023';
	end if;
	v_text := lower(regexp_replace(p_formula, '\s+', '', 'g'));
	v_match := regexp_match(v_text, '^([0-9]{0,3})d([0-9]{1,4})([+-][0-9]{1,7})?$');
	if v_match is null then
		raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
			using errcode = '22023';
	end if;
	if v_match[1] is null or v_match[1] = '' then
		v_count := 1;
	else
		v_count := v_match[1]::integer;
	end if;
	v_faces := v_match[2]::integer;
	if v_match[3] is null then
		v_mod := 0;
	else
		v_mod := v_match[3]::integer;
	end if;
	if v_count < 1 or v_count > 100 or v_faces < 2 or v_faces > 1000 then
		raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
			using errcode = '22023';
	end if;
	v_canonical := v_count::text || 'd' || v_faces::text;
	if v_mod > 0 then
		v_canonical := v_canonical || '+' || v_mod::text;
	elsif v_mod < 0 then
		v_canonical := v_canonical || v_mod::text;
	end if;
	return jsonb_build_object(
		'count', v_count, 'faces', v_faces, 'modifier', v_mod, 'formula', v_canonical
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
	v_parsed jsonb;
	v_id uuid;
	v_total integer;
	v_formula text;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para usar a mesa.'
			using errcode = '42501';
	end if;
	v_role := public.user_campaign_role(p_campaign_id);
	if v_role is null then
		raise exception 'Você não participa desta campanha.'
			using errcode = '42501';
	end if;
	v_parsed := public.parse_dice_formula(p_formula);
	v_formula := v_parsed->>'formula';
	v_total := 1 + coalesce((v_parsed->>'modifier')::integer, 0);
	insert into public.vtt_rolls (
		campaign_id, scene_id, author_id, character_id, formula, label, is_secret
	) values (
		p_campaign_id, p_scene_id, v_uid, p_character_id, v_formula, p_label,
		coalesce(p_secret, false)
	)
	returning id into v_id;
	insert into public.vtt_roll_results (roll_id, total, details)
	values (v_id, v_total, v_parsed);
	return jsonb_build_object(
		'id', v_id, 'total', v_total, 'is_secret', coalesce(p_secret, false),
		'formula', v_formula
	);
end;
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on function public.user_campaign_role(uuid) to authenticated;
grant execute on function public.roll_dice(uuid, uuid, text, boolean, text, uuid) to authenticated;
grant execute on function public.parse_dice_formula(text) to authenticated;
