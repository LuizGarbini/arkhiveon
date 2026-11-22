-- =============================================================================
-- Migration 0082 (Plano Pro, M1): storage_objects, a fonte de verdade da cota
-- =============================================================================
-- Uma linha por objeto no R2 (imagem, PDF da biblioteca ou capa do PDF).
-- O uso de um pagador é a soma de size_bytes das linhas dele, ready + pending
-- (a reserva conta). A capa do PDF ('thumb') também conta (decisão do Luiz).
--
-- owner_id é quem paga: o dono da campanha, ou o próprio usuário quando o
-- upload não tem campanha (foto da mesa). A FK segue campaigns.owner_id
-- (ON DELETE CASCADE). campaign_id e uploaded_by ficam nulos se a campanha
-- ou a conta somem (a fila de exclusão do R2 chega na S5).
--
-- Leitura: o pagador e quem subiu, só as próprias linhas.
-- Escrita: nenhuma pelo cliente. Só as RPCs da 0083 (security definer) e o
-- service role escrevem. Por isso não existe policy de INSERT/UPDATE/DELETE e
-- os grants de escrita são revogados de anon e authenticated.
--
-- NÃO APLICADA em nenhum banco. Aplicar em produção só com o OK do Luiz.
-- Rollback: supabase/rollbacks/0082_storage_objects.down.sql
-- Teste: supabase/tests/0082_storage_objects_rls.sql
--
-- Dry-run do backfill B1 (só leitura, antes de aplicar):
--   select c.owner_id, count(*), sum(f.size_bytes)
--   from public.campaign_library_files f
--   join public.campaigns c on c.id = f.campaign_id
--   where f.status = 'ready'
--   group by c.owner_id;
--   -- esperado: 366 linhas no total, 7.313.082.977 B.

create table if not exists public.storage_objects (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users(id) on delete cascade,
	campaign_id uuid references public.campaigns(id) on delete set null,
	uploaded_by uuid references auth.users(id) on delete set null,
	bucket text not null,
	r2_key text not null,
	kind text not null,
	size_bytes bigint not null,
	status text not null default 'pending',
	created_at timestamptz not null default now(),
	ready_at timestamptz,
	constraint storage_objects_r2_key_key unique (r2_key),
	constraint storage_objects_bucket_check check (bucket in ('images', 'library')),
	constraint storage_objects_kind_check check (kind in ('image', 'pdf', 'thumb')),
	constraint storage_objects_size_check check (size_bytes > 0),
	constraint storage_objects_status_check check (status in ('pending', 'ready')),
	constraint storage_objects_ready_at_check check (
		(status = 'ready' and ready_at is not null)
		or (status = 'pending' and ready_at is null)
	)
);

create index if not exists storage_objects_owner_status_idx
	on public.storage_objects (owner_id, status);
create index if not exists storage_objects_campaign_idx
	on public.storage_objects (campaign_id);

alter table public.storage_objects enable row level security;

revoke all on table public.storage_objects from public, anon;
revoke insert, update, delete, truncate, references, trigger
	on table public.storage_objects from authenticated;
grant select on table public.storage_objects to authenticated;
grant all on table public.storage_objects to service_role;

drop policy if exists "storage_objects_select_own" on public.storage_objects;
create policy "storage_objects_select_own"
	on public.storage_objects
	for select
	to authenticated
	using (
		owner_id = (select auth.uid())
		or uploaded_by = (select auth.uid())
	);

comment on table public.storage_objects is
	'Fonte de verdade da cota (Plano Pro). Uso = soma de size_bytes (ready + pending) por owner_id (pagador). Escrita só pelas RPCs da 0083 ou service role.';
