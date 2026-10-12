-- Migration 0040: Biblioteca de PDFs da campanha (Fatia 1a) — metadados + piloto
--
-- Aplicar manualmente no SQL Editor do Supabase (Luiz), primeiro em ambiente
-- de teste. Idempotente. Os arquivos ficam no Cloudflare R2 (bucket privado
-- separado); aqui só ficam os metadados.
--
-- - Escrita (insert/update/delete) só pela Edge Function `library-r2` com
--   service role, depois de checar JWT, papel e piloto. `authenticated` só lê.
-- - Leitura: membro (ou dono) da campanha. Jogador (viewer) só vê `ready`;
--   mestre/editor também vê `pending`.
-- - Piloto: só campanhas em `campaign_library_pilot_campaigns` (mesmo modelo
--   da 0037, tabela separada para não amarrar Biblioteca à IA da mesa).
--   Ligar:    insert into public.campaign_library_pilot_campaigns (campaign_id) values ('<uuid>');
--   Desligar: delete from public.campaign_library_pilot_campaigns where campaign_id = '<uuid>';

begin;

-- 1. Piloto (allowlist)
create table if not exists public.campaign_library_pilot_campaigns (
	campaign_id uuid primary key references public.campaigns(id) on delete cascade,
	created_at timestamptz not null default now()
);

alter table public.campaign_library_pilot_campaigns enable row level security;

revoke all on table public.campaign_library_pilot_campaigns from anon, authenticated;
grant select on table public.campaign_library_pilot_campaigns to authenticated;

drop policy if exists "Campaign members can view library pilot" on public.campaign_library_pilot_campaigns;
create policy "Campaign members can view library pilot"
	on public.campaign_library_pilot_campaigns for select
	to authenticated
	using (
		exists (
			select 1 from public.campaigns c
			where c.id = campaign_library_pilot_campaigns.campaign_id
		)
	);

-- Rise of Tiamat. Só insere se a campanha existir neste banco.
insert into public.campaign_library_pilot_campaigns (campaign_id)
select c.id from public.campaigns c
where c.id = '3e9555fc-085e-43dd-a063-bcd02847032d'
on conflict (campaign_id) do nothing;

-- 2. Metadados dos PDFs
create table if not exists public.campaign_library_files (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	r2_key text not null unique,
	title text not null check (char_length(title) between 1 and 200),
	size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
	content_type text not null default 'application/pdf' check (content_type = 'application/pdf'),
	status text not null default 'pending' check (status in ('pending', 'ready')),
	uploaded_by uuid not null references auth.users(id) on delete cascade,
	created_at timestamptz not null default now(),
	ready_at timestamptz,
	constraint campaign_library_files_key_prefix
		check (r2_key = 'library/' || campaign_id::text || '/' || id::text || '.pdf')
);

create index if not exists campaign_library_files_campaign_idx
	on public.campaign_library_files (campaign_id, status, created_at desc);

alter table public.campaign_library_files enable row level security;

revoke all on table public.campaign_library_files from anon, authenticated;
grant select on table public.campaign_library_files to authenticated;

drop policy if exists "Campaign members can view library files" on public.campaign_library_files;
create policy "Campaign members can view library files"
	on public.campaign_library_files for select
	to authenticated
	using (
		-- mestre/editor: tudo (inclui pending)
		public.user_campaign_role(campaign_id) in ('owner', 'editor')
		or exists (
			select 1 from public.campaigns c
			where c.id = campaign_library_files.campaign_id
				and c.owner_id = auth.uid()
		)
		-- demais membros: só prontos
		or (
			status = 'ready'
			and public.user_campaign_role(campaign_id) is not null
		)
	);

-- Sem policies de insert/update/delete: só service role (Edge Function).

commit;
