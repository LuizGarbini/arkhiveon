-- Teste da 0085: campaign_library_files.uploaded_by vira SET NULL.
-- SÓ Postgres local descartável. Tudo numa transação com ROLLBACK no fim.
-- Uso: psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/0085_library_uploaded_by_set_null.sql

\set ON_ERROR_STOP on
\set VERBOSITY terse
set client_min_messages = notice;

begin;
\ir plano_pro_s1a_bootstrap.sql

insert into public.campaign_library_files (id, campaign_id, r2_key, title, size_bytes, status, uploaded_by) values
	('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1',
	 'library/20000000-0000-0000-0000-0000000000a1/30000000-0000-0000-0000-0000000000f1.pdf',
	 'PDF do jogador', 1000, 'ready', '00000000-0000-0000-0000-0000000000f1');

do $$
begin
	if (select pg_get_constraintdef(oid) from pg_constraint where conname = 'campaign_library_files_uploaded_by_fkey')
		not like '%ON DELETE SET NULL%' then
		raise exception 'FAIL: FK não é SET NULL';
	end if;
	if (select is_nullable from information_schema.columns
		where table_schema = 'public' and table_name = 'campaign_library_files' and column_name = 'uploaded_by') <> 'YES' then
		raise exception 'FAIL: uploaded_by ainda é NOT NULL';
	end if;

	-- A conta do jogador some: o PDF fica na campanha, sem autor
	delete from auth.users where id = '00000000-0000-0000-0000-0000000000f1';
	if not exists (select 1 from public.campaign_library_files
		where id = '30000000-0000-0000-0000-0000000000f1' and uploaded_by is null) then
		raise exception 'FAIL: apagar a conta levou o PDF junto';
	end if;
	raise notice 'PASS 0085 FK SET NULL: apagar a conta de quem subiu mantém o PDF na campanha (uploaded_by nulo)';
end $$;

rollback;
\echo '0085: todos os casos passaram'
