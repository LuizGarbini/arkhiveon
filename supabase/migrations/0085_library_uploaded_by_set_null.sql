-- =============================================================================
-- Migration 0085 (Plano Pro, M5): campaign_library_files.uploaded_by SET NULL
-- =============================================================================
-- Hoje a FK é ON DELETE CASCADE e a coluna é NOT NULL: apagar a conta de um
-- jogador apaga as linhas dos PDFs que ele subiu na mesa de outro mestre, e o
-- objeto fica órfão no R2. Agora a coluna aceita nulo e a FK vira SET NULL; o
-- PDF continua na campanha (e na cota do mestre).
--
-- NÃO APLICADA em nenhum banco. Aplicar em produção só com o OK do Luiz.
-- Rollback: supabase/rollbacks/0085_library_uploaded_by_set_null.down.sql
-- Teste: supabase/tests/0085_library_uploaded_by_set_null.sql
--
-- Dry-run (só leitura): linhas cujo uploaded_by não existe mais (esperado 0)
--   select count(*) from public.campaign_library_files f
--   where f.uploaded_by is not null
--     and not exists (select 1 from auth.users u where u.id = f.uploaded_by);

alter table public.campaign_library_files
	alter column uploaded_by drop not null;

alter table public.campaign_library_files
	drop constraint if exists campaign_library_files_uploaded_by_fkey;

alter table public.campaign_library_files
	add constraint campaign_library_files_uploaded_by_fkey
	foreign key (uploaded_by) references auth.users(id) on delete set null;
