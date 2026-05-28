-- Adiciona colunas para controle de armazenamento e rate limiting na tabela user_plans
alter table public.user_plans
	add column if not exists storage_used_bytes bigint not null default 0,
	add column if not exists last_upload_time timestamptz;
