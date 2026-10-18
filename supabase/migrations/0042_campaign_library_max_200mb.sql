-- Biblioteca de PDFs (Fatia 1d): limite por arquivo sobe de 50 MB para 200 MB.
--
-- A 0040 criou a CHECK inline (sem nome), então o Postgres a chamou de
-- `campaign_library_files_size_bytes_check`. Troca pela mesma regra com o
-- novo teto, agora com nome explícito.
--
-- ORDEM DE DEPLOY: aplicar esta migração ANTES de republicar a Edge Function
-- `library-r2` com LIBRARY_MAX_BYTES = 209715200. Se a função subir antes,
-- o INSERT de um PDF entre 50 e 200 MB falha nesta CHECK (erro 500).
--
-- Não mexe em policy: a tabela continua só com SELECT; toda escrita passa pela
-- função com service role, que também recusa > 200 MB (guard + HEAD no R2).

alter table public.campaign_library_files
	drop constraint if exists campaign_library_files_size_bytes_check;

alter table public.campaign_library_files
	add constraint campaign_library_files_size_bytes_check
	check (size_bytes > 0 and size_bytes <= 209715200);
