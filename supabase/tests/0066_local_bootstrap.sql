-- Bootstrap LOCAL descartável para simular as policies da 0066.
-- Não é migration de produção. Host obrigatório: loopback.
-- Sobe um stub de realtime.messages e realtime.topic(), mais campaigns,
-- memberships e vtt_scenes. Sem Docker e sem projeto remoto.

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
	name text not null default ''
);

create table public.memberships (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	user_id uuid not null,
	role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
	unique (campaign_id, user_id)
);

create table public.vtt_scenes (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	name text not null default 'Nova Cena',
	is_active boolean not null default false
);

grant usage on schema public to anon, authenticated;
grant select on public.campaigns, public.memberships, public.vtt_scenes to authenticated, anon;

create schema if not exists realtime;

create or replace function realtime.topic()
returns text language sql stable as $$
	select nullif(current_setting('realtime.topic', true), '');
$$;

grant usage on schema realtime to anon, authenticated;
grant execute on function realtime.topic() to anon, authenticated;

-- Stub mínimo: as policies da 0066 olham extension e realtime.topic(), não a coluna topic.
create table realtime.messages (
	id uuid primary key default gen_random_uuid(),
	topic text not null,
	extension text,
	payload jsonb,
	event text,
	private boolean default false,
	inserted_at timestamp without time zone not null default timezone('utc', clock_timestamp()),
	updated_at timestamp without time zone not null default timezone('utc', clock_timestamp())
);

alter table realtime.messages enable row level security;
grant select, insert, update on realtime.messages to anon, authenticated;
