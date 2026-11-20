-- Teste da 0080: capa (thumb_*) em campaign_library_files.
-- SÓ Postgres local descartável. Tudo numa transação com ROLLBACK no fim.
-- Não usa supabase db push, link, nem projeto remoto.
-- Não imprime chave, e-mail nem id de usuário.
--
-- O mesmo arquivo cobre a tabela nova e a tabela restaurada pelo rollback:
-- se thumb_status existe, exige os CHECKs, a RLS e a negação de UPDATE;
-- se não existe, exige o formato da 0079 (sem colunas thumb, RLS antiga).
--
-- Prova de linha existente: scripts/test-0080-local.sh troca a linha marcada
-- no meio deste arquivo pelo corpo da migração (duas vezes, sem begin/commit)
-- depois dos INSERTs e ainda dentro desta transação.
--
-- Contas sintéticas. A saída é uma linha PASS por subcaso. Falha = RAISE.
-- Uso: docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -v ON_ERROR_STOP=1 < este arquivo

\set ON_ERROR_STOP on
\pset pager off
\pset tuples_only on
\pset format unaligned

begin;

do $$
declare
	v_addr inet := inet_server_addr();
begin
	if v_addr is not null and host(v_addr) not in ('127.0.0.1', '::1') then
		raise exception 'conexão recusada: não é socket local nem loopback';
	end if;
	if to_regclass('public.campaign_library_files') is null then
		raise exception 'tabela campaign_library_files não existe';
	end if;
	if exists (select 1 from public.campaigns) or exists (select 1 from public.campaign_library_files) then
		raise exception 'Banco tem campanha ou arquivo de biblioteca: rode só em Postgres local descartável.';
	end if;
end $$;

create temp table session_flags (
	proof boolean not null
);

insert into session_flags (proof) values (false);

create temp table case_results (
	ord integer generated always as identity,
	line text not null
);

-- Contas sintéticas. A = campanha do mestre A, B = outra campanha.
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'mestre-a@example.invalid'),
	('00000000-0000-0000-0000-0000000000e1', 'editor-a@example.invalid'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador-a@example.invalid'),
	('00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid'),
	('00000000-0000-0000-0000-0000000000c1', 'fora@example.invalid');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),
	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Campanha B', '10000000-0000-0000-0000-0000000000b1', 20);

-- O trigger da 0059 já cria o owner. ON CONFLICT cobre banco sem esse trigger.
insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner')
on conflict do nothing;

insert into public.campaign_library_files (id, campaign_id, r2_key, title, size_bytes, status, uploaded_by) values
	('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1',
	 'library/20000000-0000-0000-0000-0000000000a1/30000000-0000-0000-0000-0000000000a1.pdf',
	 'Pronto A', 1000, 'ready', '00000000-0000-0000-0000-0000000000a1'),
	('30000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a1',
	 'library/20000000-0000-0000-0000-0000000000a1/30000000-0000-0000-0000-0000000000a2.pdf',
	 'Pendente A', 1000, 'pending', '00000000-0000-0000-0000-0000000000a1'),
	('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1',
	 'library/20000000-0000-0000-0000-0000000000b1/30000000-0000-0000-0000-0000000000b1.pdf',
	 'Pronto B', 1000, 'ready', '00000000-0000-0000-0000-0000000000b1');

-- <<<MIGRATE_HERE>>>

create function pg_temp.record_pass(p_line text) returns void
language plpgsql as $$
begin
	insert into pg_temp.case_results (line) values ('PASS ' || p_line);
end $$;

create function pg_temp.become(p_uid text) returns void
language plpgsql as $$
begin
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_uid, 'role', 'authenticated')::text,
		true
	);
	perform set_config('request.jwt.claim.sub', p_uid, true);
	perform set_config('request.jwt.claim.role', 'authenticated', true);
	perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.restore() returns void
language plpgsql as $$
begin
	perform set_config('role', 'postgres', true);
end $$;

create function pg_temp.count_as(p_uid text) returns integer
language plpgsql as $$
declare
	v_n integer;
begin
	perform pg_temp.become(p_uid);
	begin
		select count(*)::integer into v_n from public.campaign_library_files;
		perform pg_temp.restore();
		return v_n;
	exception when others then
		perform pg_temp.restore();
		raise;
	end;
end $$;

create function pg_temp.count_campaign_as(p_uid text, p_campaign uuid) returns integer
language plpgsql as $$
declare
	v_n integer;
begin
	perform pg_temp.become(p_uid);
	begin
		select count(*)::integer into v_n
		from public.campaign_library_files
		where campaign_id = p_campaign;
		perform pg_temp.restore();
		return v_n;
	exception when others then
		perform pg_temp.restore();
		raise;
	end;
end $$;

create function pg_temp.count_status_as(p_uid text, p_status text) returns integer
language plpgsql as $$
declare
	v_n integer;
begin
	perform pg_temp.become(p_uid);
	begin
		select count(*)::integer into v_n
		from public.campaign_library_files
		where status = p_status;
		perform pg_temp.restore();
		return v_n;
	exception when others then
		perform pg_temp.restore();
		raise;
	end;
end $$;

create function pg_temp.count_thumb_path_as(p_uid text) returns integer
language plpgsql as $$
declare
	v_n integer;
begin
	perform pg_temp.become(p_uid);
	begin
		select count(*)::integer into v_n
		from public.campaign_library_files
		where thumb_path is not null;
		perform pg_temp.restore();
		return v_n;
	exception when others then
		perform pg_temp.restore();
		raise;
	end;
end $$;

create function pg_temp.thumb_status_as(p_uid text, p_id uuid) returns text
language plpgsql as $$
declare
	v_t text;
begin
	perform pg_temp.become(p_uid);
	begin
		select thumb_status into v_t
		from public.campaign_library_files
		where id = p_id;
		perform pg_temp.restore();
		return v_t;
	exception when others then
		perform pg_temp.restore();
		raise;
	end;
end $$;

create function pg_temp.attempt_write(p_uid text, p_sql text) returns text
language plpgsql as $$
declare
	v_state text;
	v_n integer;
begin
	perform pg_temp.become(p_uid);
	begin
		execute p_sql;
		get diagnostics v_n = row_count;
		perform pg_temp.restore();
		return 'linhas ' || v_n::text;
	exception when others then
		get stacked diagnostics v_state = returned_sqlstate;
		perform pg_temp.restore();
		return 'negado ' || v_state;
	end;
end $$;

do $$
declare
	v_has boolean;
	v_proof boolean;
	v_n integer;
	v_def text;
	v_expr text;
	v_got text;
	v_owner constant text := '00000000-0000-0000-0000-0000000000a1';
	v_editor constant text := '00000000-0000-0000-0000-0000000000e1';
	v_viewer constant text := '00000000-0000-0000-0000-0000000000f1';
	v_b constant text := '00000000-0000-0000-0000-0000000000b1';
	v_out constant text := '00000000-0000-0000-0000-0000000000c1';
	v_camp_a constant uuid := '20000000-0000-0000-0000-0000000000a1';
	v_camp_b constant uuid := '20000000-0000-0000-0000-0000000000b1';
	v_file_ready constant uuid := '30000000-0000-0000-0000-0000000000a1';
	v_file_pending constant uuid := '30000000-0000-0000-0000-0000000000a2';
	v_file_b constant uuid := '30000000-0000-0000-0000-0000000000b1';
	v_cols text[];
	v_col text;
begin
	select proof into v_proof from session_flags;
	select exists (
		select 1 from information_schema.columns
		where table_schema = 'public'
			and table_name = 'campaign_library_files'
			and column_name = 'thumb_status'
	) into v_has;

	if v_proof and not v_has then
		raise exception 'prova pediu a migração e thumb_status não apareceu';
	end if;

	if (select count(*) from pg_policy where polrelid = 'public.campaign_library_files'::regclass) <> 1 then
		raise exception 'policy nova ou policy da 0040 sumiu; pare sem criar policy';
	end if;
	select polcmd::text, pg_get_expr(polqual, polrelid)
	into v_got, v_expr
	from pg_policy
	where polrelid = 'public.campaign_library_files'::regclass;
	if v_got is distinct from 'r'
		or (select polname from pg_policy where polrelid = 'public.campaign_library_files'::regclass)
			is distinct from 'Campaign members can view library files'
	then
		raise exception 'a única policy deixou de ser o SELECT da 0040';
	end if;
	if position('thumb_' in v_expr) > 0 then
		raise exception 'policy passou a mencionar thumb_; pare sem alterar RLS';
	end if;
	perform pg_temp.record_pass('nenhuma policy nova');

	if exists (
		select 1 from pg_attribute
		where attrelid = 'public.campaign_library_files'::regclass
			and attnum > 0
			and not attisdropped
			and attacl is not null
	) then
		raise exception 'há grant por coluna em campaign_library_files; pare sem alterar grant';
	end if;
	if not has_table_privilege('authenticated', 'public.campaign_library_files', 'SELECT')
		or has_table_privilege('authenticated', 'public.campaign_library_files', 'INSERT')
		or has_table_privilege('authenticated', 'public.campaign_library_files', 'UPDATE')
		or has_table_privilege('authenticated', 'public.campaign_library_files', 'DELETE')
		or has_table_privilege('anon', 'public.campaign_library_files', 'SELECT')
	then
		raise exception 'grant de authenticated/anon mudou; pare sem alterar grant';
	end if;

	if not exists (select 1 from pg_roles where rolname = 'service_role') then
		raise exception 'papel service_role ausente; não dá para conferir o grant da edge function';
	end if;
	if not has_table_privilege('service_role', 'public.campaign_library_files', 'UPDATE') then
		raise exception 'service_role sem UPDATE na tabela; pare e reporte, sem conceder grant nesta fatia';
	end if;

	select pg_get_constraintdef(oid) into v_def
	from pg_constraint
	where conrelid = 'public.campaign_library_files'::regclass
		and conname = 'campaign_library_files_status_check';
	if v_def is null or position('pending' in v_def) = 0 or position('ready' in v_def) = 0
		or position('failed' in v_def) > 0
	then
		raise exception 'check de status do PDF mudou';
	end if;
	select pg_get_constraintdef(oid) into v_def
	from pg_constraint
	where conrelid = 'public.campaign_library_files'::regclass
		and conname = 'campaign_library_files_size_bytes_check';
	if v_def is null or position('209715200' in v_def) = 0 then
		raise exception 'teto de 200MB da 0042 sumiu';
	end if;
	if not exists (
		select 1 from pg_constraint
		where conrelid = 'public.campaign_library_files'::regclass
			and conname = 'campaign_library_files_key_prefix'
	) then
		raise exception 'check do r2_key sumiu';
	end if;
	if to_regclass('public.campaign_library_files_campaign_idx') is null then
		raise exception 'índice da 0040 sumiu';
	end if;

	begin
		insert into public.campaign_library_files (campaign_id, r2_key, title, size_bytes, uploaded_by)
		values (v_camp_a, 'outra/coisa.pdf', 'x', 10, v_owner::uuid);
		raise exception 'chave fora do padrão foi aceita';
	exception when check_violation then
		null;
	end;
	begin
		insert into public.campaign_library_files (id, campaign_id, r2_key, title, size_bytes, uploaded_by)
		values (
			'30000000-0000-0000-0000-0000000000ff',
			v_camp_a,
			'library/20000000-0000-0000-0000-0000000000a1/30000000-0000-0000-0000-0000000000ff.pdf',
			'grande',
			209715201,
			v_owner::uuid
		);
		raise exception 'arquivo acima de 200MB foi aceito';
	exception when check_violation then
		null;
	end;
	perform pg_temp.record_pass('chave e limite de 200MB seguem');

	if pg_temp.count_campaign_as(v_b, v_camp_a) <> 0
		or pg_temp.count_as(v_b) <> 1
		or pg_temp.count_campaign_as(v_b, v_camp_b) <> 1
	then
		raise exception 'conta B leu linha da campanha A ou não leu a própria';
	end if;
	if pg_temp.count_status_as(v_viewer, 'pending') <> 0
		or pg_temp.count_status_as(v_viewer, 'ready') <> 1
		or pg_temp.count_campaign_as(v_viewer, v_camp_b) <> 0
	then
		raise exception 'jogador leu PDF pending ou campanha alheia';
	end if;
	if pg_temp.count_campaign_as(v_editor, v_camp_a) <> 2
		or pg_temp.count_status_as(v_editor, 'pending') <> 1
		or pg_temp.count_campaign_as(v_editor, v_camp_b) <> 0
	then
		raise exception 'editor não vê ready e pending só da própria campanha';
	end if;
	if pg_temp.count_as(v_out) <> 0 then
		raise exception 'não-membro leu arquivo';
	end if;
	if pg_temp.count_as(v_owner) <> 2 then
		raise exception 'mestre não vê as duas linhas da própria campanha';
	end if;
	perform pg_temp.record_pass('editor vê ready e pending da própria campanha');

	if not v_has then
		if exists (
			select 1 from information_schema.columns
			where table_schema = 'public'
				and table_name = 'campaign_library_files'
				and column_name in ('thumb_path', 'thumb_updated_at')
		) or to_regclass('public.campaign_library_files_thumb_pending_idx') is not null
		or exists (
			select 1 from pg_constraint
			where conrelid = 'public.campaign_library_files'::regclass
				and conname in (
					'campaign_library_files_thumb_status_check',
					'campaign_library_files_thumb_path_check'
				)
		) then
			raise exception 'rollback deixou resto de thumb_*';
		end if;
		select array_agg(column_name order by column_name) into v_cols
		from information_schema.columns
		where table_schema = 'public' and table_name = 'campaign_library_files';
		if v_cols is distinct from array[
			'campaign_id', 'content_type', 'created_at', 'id', 'r2_key',
			'ready_at', 'size_bytes', 'status', 'title', 'uploaded_by'
		]::text[] then
			raise exception 'colunas depois do rollback não são as da 0079';
		end if;
		foreach v_col in array v_cols loop
			if v_col like 'thumb%' then
				raise exception 'coluna thumb sobreviveu ao rollback';
			end if;
		end loop;
		perform pg_temp.record_pass('rollback: tabela como na 0079, sem colunas thumb');
		perform pg_temp.record_pass('conta B não lê linhas da campanha A');
		perform pg_temp.record_pass('jogador não lê linhas com status pending');
		perform pg_temp.record_pass('select da tabela segue só leitura');
		perform pg_temp.record_pass('service_role segue podendo escrever a tabela');

		v_got := pg_temp.attempt_write(
			v_owner,
			'update public.campaign_library_files set title = title'
		);
		if v_got is distinct from 'negado 42501' then
			raise exception 'authenticated escreveu direto e veio %', v_got;
		end if;
		v_got := pg_temp.attempt_write(
			v_viewer,
			'delete from public.campaign_library_files where false'
		);
		if v_got is distinct from 'negado 42501' then
			raise exception 'authenticated apagou direto e veio %', v_got;
		end if;
		perform pg_temp.record_pass('authenticated não escreve direto (42501)');
		return;
	end if;

	if not has_column_privilege('authenticated', 'public.campaign_library_files', 'thumb_status', 'SELECT')
		or not has_column_privilege('authenticated', 'public.campaign_library_files', 'thumb_path', 'SELECT')
		or not has_column_privilege('authenticated', 'public.campaign_library_files', 'thumb_updated_at', 'SELECT')
	then
		raise exception 'SELECT da tabela não cobre thumb_*; pare e reporte, sem conceder grant nesta fatia';
	end if;
	if has_column_privilege('authenticated', 'public.campaign_library_files', 'thumb_status', 'UPDATE')
		or has_column_privilege('authenticated', 'public.campaign_library_files', 'thumb_path', 'UPDATE')
		or has_column_privilege('authenticated', 'public.campaign_library_files', 'thumb_updated_at', 'UPDATE')
	then
		raise exception 'authenticated já pode atualizar thumb_*; pare sem alterar grant';
	end if;
	if not has_column_privilege('service_role', 'public.campaign_library_files', 'thumb_status', 'UPDATE')
		or not has_column_privilege('service_role', 'public.campaign_library_files', 'thumb_path', 'UPDATE')
		or not has_column_privilege('service_role', 'public.campaign_library_files', 'thumb_updated_at', 'UPDATE')
	then
		raise exception 'service_role não cobre thumb_*; pare e reporte, sem conceder grant nesta fatia';
	end if;
	perform pg_temp.record_pass('select da tabela cobre thumb e não há grant de escrita');
	perform pg_temp.record_pass('service_role segue podendo escrever thumb');

	if exists (
		select 1 from public.campaign_library_files
		where thumb_status is distinct from 'pending'
			or thumb_path is not null
			or thumb_updated_at is not null
	) or (select count(*) from public.campaign_library_files) <> 3 then
		raise exception 'as três linhas não nasceram thumb pending sem path';
	end if;
	if v_proof then
		perform pg_temp.record_pass('linhas existentes viram pending');
	else
		perform pg_temp.record_pass('linha nova nasce thumb pending');
	end if;

	select count(*) into v_n
	from pg_constraint
	where conrelid = 'public.campaign_library_files'::regclass
		and conname = 'campaign_library_files_thumb_status_check';
	if v_n <> 1 then
		raise exception 'constraint de thumb_status ausente ou duplicada';
	end if;
	select pg_get_constraintdef(oid) into v_def
	from pg_constraint
	where conrelid = 'public.campaign_library_files'::regclass
		and conname = 'campaign_library_files_thumb_status_check';
	if position('pending' in v_def) = 0 or position('ready' in v_def) = 0 or position('failed' in v_def) = 0 then
		raise exception 'check de thumb_status diferente do previsto';
	end if;
	select count(*) into v_n
	from pg_constraint
	where conrelid = 'public.campaign_library_files'::regclass
		and conname = 'campaign_library_files_thumb_path_check';
	if v_n <> 1 then
		raise exception 'constraint de thumb_path ausente ou duplicada';
	end if;
	select pg_get_constraintdef(oid) into v_def
	from pg_constraint
	where conrelid = 'public.campaign_library_files'::regclass
		and conname = 'campaign_library_files_thumb_path_check';
	if position('campaign_id' in v_def) = 0 or position('thumb.webp' in v_def) = 0
		or position('thumb_updated_at' in v_def) = 0
	then
		raise exception 'check de thumb_path diferente do previsto';
	end if;
	select count(*) into v_n
	from pg_class c
	join pg_namespace n on n.oid = c.relnamespace
	where n.nspname = 'public' and c.relname = 'campaign_library_files_thumb_pending_idx';
	if v_n <> 1 then
		raise exception 'índice thumb ausente ou duplicado';
	end if;
	select pg_get_indexdef(c.oid) into v_def
	from pg_class c
	join pg_namespace n on n.oid = c.relnamespace
	where n.nspname = 'public' and c.relname = 'campaign_library_files_thumb_pending_idx';
	if position('(id)' in v_def) = 0 or position('thumb_status' in v_def) = 0
		or position('pending' in v_def) = 0 or position('ready' in v_def) = 0
		or position('WHERE' in v_def) = 0
	then
		raise exception 'índice parcial diferente do previsto';
	end if;
	perform pg_temp.record_pass('migração repetida deixa um índice e uma constraint de cada');

	begin
		update public.campaign_library_files
		set thumb_status = 'ready', thumb_path = null, thumb_updated_at = now()
		where id = v_file_ready;
		raise exception 'ready sem path foi aceito';
	exception when check_violation then
		perform pg_temp.record_pass('check recusa ready sem path');
	end;

	begin
		update public.campaign_library_files
		set thumb_status = 'ready',
			thumb_path = 'library/' || v_camp_b::text || '/' || v_file_ready::text || '.thumb.webp',
			thumb_updated_at = now()
		where id = v_file_ready;
		raise exception 'ready com path de outra campanha foi aceito';
	exception when check_violation then
		perform pg_temp.record_pass('check recusa ready com path de outra campanha');
	end;

	begin
		update public.campaign_library_files
		set thumb_status = 'ready',
			thumb_path = 'library/' || v_camp_a::text || '/' || v_file_pending::text || '.thumb.webp',
			thumb_updated_at = now()
		where id = v_file_ready;
		raise exception 'ready com path de outro arquivo foi aceito';
	exception when check_violation then
		perform pg_temp.record_pass('check recusa ready com path de outro arquivo');
	end;

	begin
		update public.campaign_library_files
		set thumb_path = 'library/' || campaign_id::text || '/' || id::text || '.thumb.webp'
		where id = v_file_pending;
		raise exception 'pending com path foi aceito';
	exception when check_violation then
		perform pg_temp.record_pass('check recusa pending com path');
	end;

	begin
		update public.campaign_library_files
		set thumb_status = 'ready',
			thumb_path = 'library/' || campaign_id::text || '/' || id::text || '.thumb.webp',
			thumb_updated_at = null
		where id = v_file_ready;
		raise exception 'ready sem thumb_updated_at foi aceito';
	exception when check_violation then
		perform pg_temp.record_pass('check recusa ready com path certo sem thumb_updated_at');
	end;

	begin
		update public.campaign_library_files
		set thumb_status = 'nope'
		where id = v_file_pending;
		raise exception 'thumb_status fora da lista foi aceito';
	exception when check_violation then
		perform pg_temp.record_pass('check recusa thumb_status fora da lista');
	end;

	update public.campaign_library_files
	set thumb_status = 'failed', thumb_path = null, thumb_updated_at = null
	where id = v_file_pending;
	if (select thumb_status from public.campaign_library_files where id = v_file_pending) is distinct from 'failed' then
		raise exception 'failed sem path foi recusado';
	end if;
	begin
		update public.campaign_library_files
		set thumb_path = 'library/' || campaign_id::text || '/' || id::text || '.thumb.webp'
		where id = v_file_pending;
		raise exception 'failed com path foi aceito';
	exception when check_violation then
		null;
	end;
	update public.campaign_library_files
	set thumb_status = 'pending', thumb_path = null, thumb_updated_at = null
	where id = v_file_pending;
	perform pg_temp.record_pass('failed sem path entra e failed com path não');

	if pg_temp.thumb_status_as(v_viewer, v_file_ready) is distinct from 'pending'
		or pg_temp.count_thumb_path_as(v_viewer) <> 0
	then
		raise exception 'jogador não leu thumb pending da linha ready';
	end if;

	update public.campaign_library_files
	set thumb_status = 'ready',
		thumb_path = 'library/' || campaign_id::text || '/' || id::text || '.thumb.webp',
		thumb_updated_at = now()
	where id = v_file_ready;
	if not exists (
		select 1 from public.campaign_library_files
		where id = v_file_ready
			and thumb_status = 'ready'
			and thumb_path = 'library/' || campaign_id::text || '/' || id::text || '.thumb.webp'
			and thumb_updated_at is not null
	) then
		raise exception 'ready com path correto não gravou';
	end if;
	if (
		select count(*) from public.campaign_library_files
		where thumb_status = 'pending' and status = 'ready'
	) <> 1 then
		raise exception 'fila do índice parcial não ficou só com o PDF ready sem capa';
	end if;
	perform pg_temp.record_pass('check aceita ready com path correto e thumb_updated_at');

	if pg_temp.thumb_status_as(v_viewer, v_file_ready) is distinct from 'ready'
		or pg_temp.count_thumb_path_as(v_viewer) <> 1
		or pg_temp.count_status_as(v_viewer, 'pending') <> 0
		or pg_temp.thumb_status_as(v_viewer, v_file_pending) is not null
	then
		raise exception 'jogador não leu a capa da linha ready ou leu a linha pending';
	end if;
	if pg_temp.count_campaign_as(v_b, v_camp_a) <> 0
		or pg_temp.count_thumb_path_as(v_b) <> 0
		or pg_temp.thumb_status_as(v_b, v_file_ready) is not null
		or pg_temp.thumb_status_as(v_b, v_file_b) is distinct from 'pending'
	then
		raise exception 'conta B leu thumb da campanha A ou não leu a própria capa';
	end if;
	perform pg_temp.record_pass('conta B não lê linhas da campanha A, nem thumb_*');
	perform pg_temp.record_pass('jogador não lê linhas com status pending');
	perform pg_temp.record_pass('jogador lê thumb_* só da linha ready');

	v_got := pg_temp.attempt_write(
		v_owner,
		'update public.campaign_library_files set thumb_status = ''failed'' where id = ''30000000-0000-0000-0000-0000000000a2'''
	);
	if v_got is distinct from 'negado 42501' then
		raise exception 'authenticated atualizou thumb e veio %', v_got;
	end if;
	v_got := pg_temp.attempt_write(
		v_viewer,
		'update public.campaign_library_files set thumb_path = null'
	);
	if v_got is distinct from 'negado 42501' then
		raise exception 'jogador atualizou thumb e veio %', v_got;
	end if;
	if (select thumb_status from public.campaign_library_files where id = v_file_pending) is distinct from 'pending' then
		raise exception 'a negação gravou thumb mesmo assim';
	end if;
	perform pg_temp.record_pass('authenticated não atualiza thumb (42501)');

	grant update (thumb_status, thumb_path, thumb_updated_at)
		on public.campaign_library_files to authenticated;
	v_got := pg_temp.attempt_write(
		v_owner,
		'update public.campaign_library_files set thumb_status = ''failed'' where id = ''30000000-0000-0000-0000-0000000000a2'''
	);
	if v_got is distinct from 'linhas 0' then
		raise exception 'RLS deixou update de thumb e veio %', v_got;
	end if;
	revoke update (thumb_status, thumb_path, thumb_updated_at)
		on public.campaign_library_files from authenticated;
	if has_column_privilege('authenticated', 'public.campaign_library_files', 'thumb_status', 'UPDATE')
		or (select thumb_status from public.campaign_library_files where id = v_file_pending) is distinct from 'pending'
		or (select thumb_status from public.campaign_library_files where id = v_file_ready) is distinct from 'ready'
	then
		raise exception 'o grant de teste não foi desfeito ou a RLS gravou thumb';
	end if;
	perform pg_temp.record_pass('authenticated com grant de teste não grava thumb (RLS, 0 linhas)');
end $$;

select line from pg_temp.case_results order by ord;

select '0080: ' || count(*)::text || ' cenários registrados, todos os asserts passaram'
from pg_temp.case_results;

rollback;
