-- Teste da 0082: storage_objects (RLS, grants, constraints).
-- SÓ Postgres local descartável. Tudo numa transação com ROLLBACK no fim.
-- Não usa supabase db push, link, nem projeto remoto.
-- Uso: psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/0082_storage_objects_rls.sql
-- Saída: uma linha "PASS ..." por caso. Falha = RAISE (o psql para).

\set ON_ERROR_STOP on
\set VERBOSITY terse
set client_min_messages = notice;

begin;
\ir plano_pro_s1a_bootstrap.sql

-- Linhas: A paga uma imagem que J subiu em A1, um PDF dele em A2;
-- B paga um PDF da B1.
insert into public.storage_objects (owner_id, campaign_id, uploaded_by, bucket, r2_key, kind, size_bytes, status, ready_at) values
	('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'images', 'a1/j.webp', 'image', 1000, 'ready', now()),
	('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'library', 'library/a2/x.pdf', 'pdf', 5000, 'ready', now()),
	('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'library', 'library/b1/y.pdf', 'pdf', 7000, 'pending', null);

do $$
begin
	if not (select relrowsecurity from pg_class where oid = 'public.storage_objects'::regclass) then
		raise exception 'FAIL: RLS desligada';
	end if;
	if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'storage_objects') <> 1
		or (select cmd from pg_policies where schemaname = 'public' and tablename = 'storage_objects') <> 'SELECT' then
		raise exception 'FAIL: storage_objects deve ter só a policy de SELECT';
	end if;
	if has_table_privilege('authenticated', 'public.storage_objects', 'INSERT')
		or has_table_privilege('authenticated', 'public.storage_objects', 'UPDATE')
		or has_table_privilege('authenticated', 'public.storage_objects', 'DELETE')
		or has_table_privilege('authenticated', 'public.storage_objects', 'TRUNCATE')
		or has_table_privilege('anon', 'public.storage_objects', 'SELECT') then
		raise exception 'FAIL: grant de escrita (ou leitura anon) sobrando';
	end if;
	raise notice 'PASS 0082 RLS ligada, só policy de SELECT, sem escrita para anon/authenticated';
end $$;

-- Constraints
do $$
begin
	begin
		insert into public.storage_objects (owner_id, bucket, r2_key, kind, size_bytes) values
			('00000000-0000-0000-0000-0000000000a1', 'images', 'z0', 'image', 0);
		raise exception 'FAIL: size 0 aceito';
	exception when check_violation then null; end;
	begin
		insert into public.storage_objects (owner_id, bucket, r2_key, kind, size_bytes) values
			('00000000-0000-0000-0000-0000000000a1', 'outro', 'z1', 'image', 1);
		raise exception 'FAIL: bucket inválido aceito';
	exception when check_violation then null; end;
	begin
		insert into public.storage_objects (owner_id, bucket, r2_key, kind, size_bytes) values
			('00000000-0000-0000-0000-0000000000a1', 'images', 'z2', 'svg', 1);
		raise exception 'FAIL: kind inválido aceito';
	exception when check_violation then null; end;
	begin
		insert into public.storage_objects (owner_id, bucket, r2_key, kind, size_bytes) values
			('00000000-0000-0000-0000-0000000000a1', 'images', 'a1/j.webp', 'image', 1);
		raise exception 'FAIL: r2_key duplicada aceita';
	exception when unique_violation then null; end;
	raise notice 'PASS 0082 checks: tamanho > 0, bucket, kind e r2_key única';
end $$;

-- A (pagador) vê as 2 linhas dele
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'mestre-a@example.invalid');
set local role authenticated;
do $$
begin
	if (select count(*) from public.storage_objects) <> 2 then
		raise exception 'FAIL: A deveria ver 2 linhas';
	end if;
	raise notice 'PASS 0082 pagador A vê as 2 linhas que paga';
end $$;
reset role;

-- J (quem subiu) vê só a imagem que subiu, não o PDF de A
select pg_temp.claims('00000000-0000-0000-0000-0000000000f1', 'jogador-a@example.invalid');
set local role authenticated;
do $$
begin
	if (select count(*) from public.storage_objects) <> 1
		or (select r2_key from public.storage_objects) <> 'a1/j.webp' then
		raise exception 'FAIL: J deveria ver só a imagem que subiu';
	end if;
	raise notice 'PASS 0082 quem subiu (J) vê só a própria linha';
end $$;
reset role;

-- Conta B: não lê nada de A e não escreve em storage_objects
select pg_temp.claims('00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid');
set local role authenticated;
do $$
begin
	if exists (select 1 from public.storage_objects where owner_id = '00000000-0000-0000-0000-0000000000a1') then
		raise exception 'FAIL: B leu linha de A';
	end if;
	if (select count(*) from public.storage_objects) <> 1 then
		raise exception 'FAIL: B deveria ver só a própria linha';
	end if;
	raise notice 'PASS 0082 NEGAÇÃO conta B não lê linha de A (vê só a dela)';

	begin
		insert into public.storage_objects (owner_id, bucket, r2_key, kind, size_bytes)
		values ('00000000-0000-0000-0000-0000000000b1', 'images', 'b/forjada', 'image', 1);
		raise exception 'FAIL: B inseriu';
	exception when insufficient_privilege then null; end;
	begin
		update public.storage_objects set size_bytes = 1 where owner_id = '00000000-0000-0000-0000-0000000000b1';
		raise exception 'FAIL: B atualizou';
	exception when insufficient_privilege then null; end;
	begin
		delete from public.storage_objects;
		raise exception 'FAIL: B apagou';
	exception when insufficient_privilege then null; end;
	begin
		truncate public.storage_objects;
		raise exception 'FAIL: B truncou';
	exception when insufficient_privilege then null; end;
	raise notice 'PASS 0082 NEGAÇÃO conta B não insere, não atualiza, não apaga, não trunca (nem as próprias linhas)';
end $$;
reset role;

-- Sem vínculo e anon
select pg_temp.claims('00000000-0000-0000-0000-000000000099', 'fora@example.invalid');
set local role authenticated;
do $$
begin
	if exists (select 1 from public.storage_objects) then
		raise exception 'FAIL: X viu linha';
	end if;
	raise notice 'PASS 0082 NEGAÇÃO conta sem vínculo não vê nenhuma linha';
end $$;
reset role;
set local role anon;
do $$
begin
	begin
		perform 1 from public.storage_objects;
		raise exception 'FAIL: anon leu storage_objects';
	exception when insufficient_privilege then null; end;
	raise notice 'PASS 0082 NEGAÇÃO anon sem SELECT';
end $$;
reset role;

rollback;
\echo '0082: todos os casos passaram'
