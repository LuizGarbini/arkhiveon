-- 0077 · Pastas de cenas na mesa (VTT).
--
-- O mestre agrupa cenas em pastas para a barra não listar cada cena no topo.
-- A cena guarda a pasta (folder_id nulo = fora das pastas, como hoje). Apagar
-- a pasta devolve as cenas para a raiz (on delete set null); não apaga a cena.
--
-- Quem lê: qualquer membro da campanha, para a barra do jogador usar o mesmo
-- agrupamento. O SELECT é um EXISTS em memberships, sem função solta: o
-- Realtime descarta o evento quando a policy chama um helper (0023/0068).
-- Quem cria, renomeia e apaga: dono e co-mestre (owner/editor), a mesma regra
-- de escrita de vtt_scenes. A tela só oferece os botões ao mestre.
--
-- Rollback:
--   alter table public.vtt_scenes drop column if exists folder_id;
--   drop table if exists public.vtt_scene_folders;
--   drop function if exists public.vtt_scenes_folder_same_campaign();
--   drop function if exists public.vtt_scene_folders_guard();

begin;

create table if not exists public.vtt_scene_folders (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	name text not null,
	order_index integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint vtt_scene_folders_name_len check (char_length(name) between 1 and 80)
);

create index if not exists vtt_scene_folders_campaign_idx
	on public.vtt_scene_folders (campaign_id, order_index, created_at);

drop trigger if exists vtt_scene_folders_set_updated_at on public.vtt_scene_folders;
create trigger vtt_scene_folders_set_updated_at
before update on public.vtt_scene_folders
for each row execute function public.set_updated_at();

-- Corta o nome e impede levar a pasta para outra campanha.
create or replace function public.vtt_scene_folders_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if tg_op = 'UPDATE' and new.campaign_id is distinct from old.campaign_id then
		raise exception 'A pasta não muda de campanha.'
			using errcode = '23514';
	end if;
	new.name := btrim(new.name);
	if new.name is null or char_length(new.name) < 1 or char_length(new.name) > 80 then
		raise exception 'A pasta precisa de um nome de até 80 caracteres.'
			using errcode = '23514';
	end if;
	return new;
end;
$$;

drop trigger if exists vtt_scene_folders_guard on public.vtt_scene_folders;
create trigger vtt_scene_folders_guard
before insert or update on public.vtt_scene_folders
for each row execute function public.vtt_scene_folders_guard();

alter table public.vtt_scenes
	add column folder_id uuid references public.vtt_scene_folders(id) on delete set null;

create index if not exists vtt_scenes_folder_id_idx
	on public.vtt_scenes (folder_id);

-- A pasta tem de ser da mesma campanha da cena. security definer para a
-- checagem não depender do que a RLS deixa o autor enxergar.
create or replace function public.vtt_scenes_folder_same_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if new.folder_id is null then
		return new;
	end if;
	if not exists (
		select 1
		from public.vtt_scene_folders f
		where f.id = new.folder_id
			and f.campaign_id = new.campaign_id
	) then
		raise exception 'A pasta não pertence a esta campanha.'
			using errcode = '23514';
	end if;
	return new;
end;
$$;

revoke all on function public.vtt_scenes_folder_same_campaign() from public, anon, authenticated;

drop trigger if exists vtt_scenes_folder_same_campaign on public.vtt_scenes;
create trigger vtt_scenes_folder_same_campaign
before insert or update of folder_id, campaign_id on public.vtt_scenes
for each row execute function public.vtt_scenes_folder_same_campaign();

alter table public.vtt_scene_folders enable row level security;

revoke all on public.vtt_scene_folders from anon;
grant select, insert, update, delete on public.vtt_scene_folders to authenticated;

drop policy if exists "Members can view scene folders" on public.vtt_scene_folders;
create policy "Members can view scene folders" on public.vtt_scene_folders
for select using (
	exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_scene_folders.campaign_id
			and m.user_id = auth.uid()
	)
);

drop policy if exists "GM can insert scene folders" on public.vtt_scene_folders;
create policy "GM can insert scene folders" on public.vtt_scene_folders
for insert with check (
	exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_scene_folders.campaign_id
			and m.user_id = auth.uid()
			and m.role in ('owner', 'editor')
	)
);

drop policy if exists "GM can update scene folders" on public.vtt_scene_folders;
create policy "GM can update scene folders" on public.vtt_scene_folders
for update using (
	exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_scene_folders.campaign_id
			and m.user_id = auth.uid()
			and m.role in ('owner', 'editor')
	)
) with check (
	exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_scene_folders.campaign_id
			and m.user_id = auth.uid()
			and m.role in ('owner', 'editor')
	)
);

drop policy if exists "GM can delete scene folders" on public.vtt_scene_folders;
create policy "GM can delete scene folders" on public.vtt_scene_folders
for delete using (
	exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_scene_folders.campaign_id
			and m.user_id = auth.uid()
			and m.role in ('owner', 'editor')
	)
);

alter table public.vtt_scene_folders replica identity full;

do $$
declare
	pub_id oid;
begin
	select oid into pub_id from pg_publication where pubname = 'supabase_realtime';
	if pub_id is not null then
		if not exists (
			select 1
			from pg_publication_rel pr
			join pg_class c on c.oid = pr.prrelid
			join pg_namespace n on n.oid = c.relnamespace
			where pr.prpubid = pub_id
				and n.nspname = 'public'
				and c.relname = 'vtt_scene_folders'
		) then
			alter publication supabase_realtime add table public.vtt_scene_folders;
		end if;
	end if;
end;
$$;

comment on table public.vtt_scene_folders is
	'Pastas de cenas da mesa. A cena aponta para cá; sem pasta, fica na raiz da barra.';
comment on column public.vtt_scenes.folder_id is
	'Pasta da cena. Nulo = raiz da barra. Apagar a pasta devolve a cena para a raiz.';

commit;
