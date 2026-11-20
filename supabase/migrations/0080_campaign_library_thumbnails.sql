-- Biblioteca de PDFs: colunas da capa em campaign_library_files.
--
-- A 0040 criou a tabela com id, campaign_id e status (pending/ready do PDF).
-- A capa fica ao lado: thumb_status, thumb_path e thumb_updated_at.
-- Linha que já existe nasce com thumb_status = 'pending', sem path e sem data.
--
-- ORDEM DE DEPLOY: aplicar esta migração ANTES da edge function e da UI que
-- leem thumb_status. Sem as colunas, quem for ler ou gravar a capa não tem onde.
--
-- Não cria policy e não dá grant. thumb_* só muda pela edge function com
-- service role (fatia futura). authenticated continua só com SELECT na tabela,
-- sujeito à policy da 0040. Idempotente.

begin;

alter table public.campaign_library_files
	add column if not exists thumb_status text not null default 'pending',
	add column if not exists thumb_path text,
	add column if not exists thumb_updated_at timestamptz;

alter table public.campaign_library_files
	drop constraint if exists campaign_library_files_thumb_status_check,
	drop constraint if exists campaign_library_files_thumb_path_check;

-- `=` com thumb_path nulo dá UNKNOWN, e CHECK aceita UNKNOWN. `IS NOT DISTINCT
-- FROM` faz ready sem path (ou com path de outra linha) cair para FALSE.
alter table public.campaign_library_files
	add constraint campaign_library_files_thumb_status_check
		check (thumb_status in ('pending', 'ready', 'failed')),
	add constraint campaign_library_files_thumb_path_check
		check (
			(thumb_status = 'ready'
				and thumb_path is not distinct from (
					'library/' || campaign_id::text || '/' || id::text || '.thumb.webp'
				)
				and thumb_updated_at is not null)
			or (thumb_status <> 'ready' and thumb_path is null)
		);

create index if not exists campaign_library_files_thumb_pending_idx
	on public.campaign_library_files (id) where thumb_status = 'pending' and status = 'ready';

commit;

-- Rollback da 0080 (não faz parte do deploy; não executar junto com o bloco acima):
-- drop index if exists campaign_library_files_thumb_pending_idx;
-- alter table public.campaign_library_files drop constraint if exists campaign_library_files_thumb_path_check, drop constraint if exists campaign_library_files_thumb_status_check, drop column if exists thumb_updated_at, drop column if exists thumb_path, drop column if exists thumb_status;
