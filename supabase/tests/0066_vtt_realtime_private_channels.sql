-- Teste de negação da 0066. SÓ Postgres local descartável. Termina em ROLLBACK.
-- Não usa supabase db push, link, nem projeto remoto.
--
-- Formato que o Realtime local usa (conferido neste stack, sem alterar o schema):
-- * realtime.messages é tabela particionada por RANGE (inserted_at).
--   inserted_at é timestamp without time zone, default timezone('utc', clock_timestamp()).
--   A partição do dia é realtime.messages_YYYY_MM_DD (ex.: messages_2026_11_13).
-- * Colunas: topic, extension, payload, event, private boolean default false,
--   updated_at, inserted_at, id uuid, binary_payload, skip_broadcast, expires_at.
-- * RLS ligada no pai (relrowsecurity = true, relforcerowsecurity = false).
--   anon e authenticated têm GRANT select/insert/update. Sem policy, SELECT
--   devolve 0 linhas e INSERT levanta 42501.
-- * A autorização de canal privado NÃO é um SELECT solto do cliente: a função
--   realtime.authorize(role, topic, claims, sub, headers, read_ext, write_ext)
--   1) insere sondas como o papel privilegiado com
--      (id, topic, extension, inserted_at, updated_at) — private fica false;
--   2) set_config('role', role, true)  [equivale a SET LOCAL ROLE neste Postgres],
--      set_config('realtime.topic', topic, true),
--      set_config('request.jwt.claims', claims, true),
--      set_config('request.jwt.claim.sub', sub, true),
--      set_config('request.jwt.claim.role', role, true),
--      set_config('request.headers', headers, true);
--   3) leitura: a sonda com aquele id só é visível se alguma policy de SELECT passa;
--   4) escrita: INSERT (topic, extension, inserted_at, updated_at) já no role;
--      insufficient_privilege (42501) = negado;
--   5) desfaz as sondas com RAISE sqlstate RTA01.
-- * realtime.topic() lê current_setting('realtime.topic', true).
-- * As policies da 0066 não olham a coluna private nem messages.topic.
--   Olham extension e o GUC realtime.topic().
-- Este arquivo simula os passos 2–4 com SET LOCAL ROLE (current_user vira
-- authenticated/anon; RESET ROLE volta para postgres) e os mesmos set_config.
-- Contas sintéticas 00000000-… e e-mails @example.invalid. A saída é uma linha
-- PASS por subcaso; falha = RAISE EXCEPTION. Nada disso é commitado.
--
-- Uso: docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -v ON_ERROR_STOP=1 < este arquivo

\pset pager off
\pset tuples_only on
\pset format unaligned

begin;

do $$
begin
	if exists (select 1 from public.campaigns) then
		raise exception 'Banco tem campanhas: rode este teste só em Postgres local descartável.';
	end if;
end $$;

insert into auth.users (id, email) values
	('00000000-0000-0000-0000-000000000001', 'owner@example.invalid'),
	('00000000-0000-0000-0000-000000000002', 'editor@example.invalid'),
	('00000000-0000-0000-0000-000000000003', 'viewer@example.invalid'),
	('00000000-0000-0000-0000-000000000004', 'viewer2@example.invalid'),
	('00000000-0000-0000-0000-000000000005', 'outsider@example.invalid'),
	('00000000-0000-0000-0000-000000000006', 'owner2@example.invalid');

insert into public.worlds (id, owner_user_id, name) values
	('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'Mundo C'),
	('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000006', 'Mundo C2');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Campanha C', '00000000-0000-0000-0000-000000000041', 20),
	('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000006', 'Campanha C2', '00000000-0000-0000-0000-000000000042', 20),
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000001', 'Campanha caixa', '00000000-0000-0000-0000-000000000041', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'editor'),
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'viewer'),
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000004', 'viewer');

insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000021', 'Cena ativa', true),
	('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000021', 'Cena inativa', false),
	('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000022', 'Cena C2', true),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Cena caixa', true);

create temp table case_results (
	ord integer generated always as identity,
	line text not null
);

create function pg_temp.record_pass(p_id text, p_desc text) returns void
language plpgsql as $$
begin
	insert into pg_temp.case_results (line) values ('PASS ' || p_id || ' ' || p_desc);
end $$;

create function pg_temp.assume(p_role text, p_sub text, p_topic text) returns void
language plpgsql as $$
begin
	perform set_config(
		'request.jwt.claims',
		case
			when p_sub = '' then json_build_object('role', p_role)::text
			else json_build_object('sub', p_sub, 'role', p_role)::text
		end,
		true
	);
	perform set_config('request.jwt.claim.sub', p_sub, true);
	perform set_config('request.jwt.claim.role', p_role, true);
	perform set_config('request.headers', '{}', true);
	perform set_config('realtime.topic', p_topic, true);
	execute format('set local role %I', p_role);
end $$;

create function pg_temp.release() returns void
language plpgsql as $$
begin
	reset role;
	perform set_config('request.jwt.claims', '', true);
	perform set_config('request.jwt.claim.sub', '', true);
	perform set_config('request.jwt.claim.role', '', true);
	perform set_config('request.headers', '', true);
	perform set_config('realtime.topic', '', true);
end $$;

-- Leitura: sonda privilegiada (id, topic, extension, inserted_at, updated_at),
-- depois SELECT desse id no role do caso. Igual ao probe de realtime.authorize.
create function pg_temp.expect_read(
	p_id text,
	p_desc text,
	p_role text,
	p_sub text,
	p_topic text,
	p_extension text,
	p_visible boolean
) returns void
language plpgsql as $$
declare
	v_id uuid := gen_random_uuid();
	v_at timestamp := now() at time zone 'utc';
	v_seen integer;
begin
	insert into realtime.messages (id, topic, extension, inserted_at, updated_at)
	values (v_id, p_topic, p_extension, v_at, v_at);

	perform pg_temp.assume(p_role, p_sub, p_topic);
	begin
		select count(*) into v_seen
		from realtime.messages m
		where m.inserted_at = v_at
			and m.id = v_id;
	exception when others then
		perform pg_temp.release();
		raise exception 'FAIL % % (leitura levantou % %)', p_id, p_desc, sqlstate, sqlerrm;
	end;
	perform pg_temp.release();

	if p_visible and v_seen is distinct from 1 then
		raise exception 'FAIL % % (esperava linha visivel, veio %)', p_id, p_desc, v_seen;
	elsif not p_visible and v_seen is distinct from 0 then
		raise exception 'FAIL % % (esperava 0 linhas, veio %)', p_id, p_desc, v_seen;
	end if;
	perform pg_temp.record_pass(p_id, p_desc);
end $$;

-- Escrita: INSERT (topic, extension, inserted_at, updated_at) no role do caso.
-- private permanece no default false, como a sonda de escrita do authorize.
-- Negação esperada: 42501, nunca erro de cast (22P02).
create function pg_temp.expect_write(
	p_id text,
	p_desc text,
	p_role text,
	p_sub text,
	p_topic text,
	p_extension text,
	p_allow boolean
) returns void
language plpgsql as $$
declare
	v_state text := 'OK';
	v_msg text := '';
	v_at timestamp := now() at time zone 'utc';
begin
	perform pg_temp.assume(p_role, p_sub, p_topic);
	begin
		insert into realtime.messages (topic, extension, inserted_at, updated_at)
		values (p_topic, p_extension, v_at, v_at);
	exception when others then
		v_state := sqlstate;
		v_msg := sqlerrm;
	end;
	perform pg_temp.release();

	if p_allow then
		if v_state is distinct from 'OK' then
			raise exception 'FAIL % % (esperava permitir, veio % %)', p_id, p_desc, v_state, v_msg;
		end if;
	else
		if v_state is distinct from '42501' then
			raise exception 'FAIL % % (esperava 42501 sem erro de cast, veio % %)', p_id, p_desc, v_state, v_msg;
		end if;
	end if;
	perform pg_temp.record_pass(p_id, p_desc);
end $$;

-- Atalhos dos tópicos. Tudo minúsculo, como o cliente vai gerar.
-- C / S1 ativa, S2 inativa, S3 na outra campanha.
-- O resultado void de cada chamada vai para /dev/null; a saída do teste
-- é só o SELECT final, uma linha PASS por subcaso.

\o /dev/null

select pg_temp.expect_read('N1.1', 'nao-membro nao le gm da cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('N1.2', 'nao-membro nao escreve gm da cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_read('N1.3', 'nao-membro nao le gmonly', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_write('N1.4', 'nao-membro nao escreve gmonly', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_read('N1.5', 'nao-membro nao le o proprio topico u', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000005', 'broadcast', false);
select pg_temp.expect_write('N1.6', 'nao-membro nao escreve o proprio topico u', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000005', 'broadcast', false);
select pg_temp.expect_read('N1.ok', 'controle: dono le gm da cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);
select pg_temp.expect_write('N1.ok2', 'controle: dono escreve gm da cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);

select pg_temp.expect_read('N2.1', 'anon nao le gm', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('N2.2', 'anon nao escreve gm', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_read('N2.3', 'anon nao le topico u', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000001', 'broadcast', false);
select pg_temp.expect_write('N2.4', 'anon nao escreve gmonly', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_read('N2.ok', 'controle: autenticado dono le o proprio topico u', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000001', 'broadcast', true);

select pg_temp.expect_write('N3.1', 'jogador nao escreve gm', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('N3.2', 'jogador nao escreve gmonly', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_write('N3.ok', 'controle: jogador escreve broadcast no proprio u', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'broadcast', true);

select pg_temp.expect_read('N4.1', 'jogador nao le gmonly', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_read('N4.ok', 'controle: dono le gmonly', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', true);
select pg_temp.expect_read('N4.ok2', 'controle: co-mestre le gmonly', 'authenticated', '00000000-0000-0000-0000-000000000002', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', true);

select pg_temp.expect_write('N5.1', 'jogador nao escreve no topico u do dono', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000001', 'broadcast', false);
select pg_temp.expect_write('N5.2', 'jogador nao escreve no topico u do co-mestre', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000002', 'broadcast', false);
select pg_temp.expect_write('N5.3', 'jogador nao escreve no topico u do outro jogador', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000004', 'broadcast', false);
select pg_temp.expect_write('N5.ok1', 'controle: jogador escreve broadcast no proprio u', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'broadcast', true);
select pg_temp.expect_write('N5.ok2', 'controle: jogador escreve presence no proprio u', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'presence', true);

select pg_temp.expect_write('N6.1', 'co-mestre nao escreve no topico u do dono', 'authenticated', '00000000-0000-0000-0000-000000000002', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000001', 'broadcast', false);
select pg_temp.expect_write('N6.ok1', 'controle: co-mestre escreve gm', 'authenticated', '00000000-0000-0000-0000-000000000002', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);
select pg_temp.expect_write('N6.ok2', 'controle: co-mestre escreve gmonly', 'authenticated', '00000000-0000-0000-0000-000000000002', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', true);

select pg_temp.expect_read('N7.1', 'jogador nao le gm da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:gm', 'broadcast', false);
select pg_temp.expect_write('N7.2', 'jogador nao escreve no proprio u da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:u:00000000-0000-0000-0000-000000000003', 'broadcast', false);
select pg_temp.expect_read('N7.ok1', 'controle: dono le gm da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:gm', 'broadcast', true);
select pg_temp.expect_read('N7.ok2', 'controle: co-mestre le gm da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000002', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:gm', 'broadcast', true);

select pg_temp.expect_read('N8.1', 'dono nao le gm com cena de outra campanha', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000033:gm', 'broadcast', false);
select pg_temp.expect_write('N8.2', 'dono nao escreve gm com cena de outra campanha', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000033:gm', 'broadcast', false);
select pg_temp.expect_read('N8.3', 'jogador nao le gm com cena de outra campanha', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000033:gm', 'broadcast', false);
select pg_temp.expect_write('N8.4', 'jogador nao escreve gm com cena de outra campanha', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000033:gm', 'broadcast', false);
select pg_temp.expect_read('N8.ok', 'controle: dono le gm da propria cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);

select pg_temp.expect_read('N9.1', 'membro de outra campanha nao le gm desta', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('N9.2', 'membro de outra campanha nao escreve gm desta', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_read('N9.ok', 'controle: dono da outra campanha le gm da cena dela', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000022:00000000-0000-0000-0000-000000000033:gm', 'broadcast', true);

do $$
declare
	v_owner text := '00000000-0000-0000-0000-000000000001';
	v_c text := '00000000-0000-0000-0000-000000000021';
	v_s text := '00000000-0000-0000-0000-000000000031';
	v_c_hex text := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
	v_s_hex text := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
	v_upper text;
	v_lower text;
	v_extra text;
	v_u_empty text;
	v_pct text;
	v_semi text;
	v_prefix text;
	v_text text;
begin
	-- Os UUIDs só com dígitos não mudam com upper(); este par tem a-f.
	v_lower := 'vtt:' || v_c_hex || ':' || v_s_hex || ':gm';
	v_upper := 'vtt:' || upper(v_c_hex) || ':' || upper(v_s_hex) || ':gm';
	v_extra := 'vtt:' || v_c || ':' || v_s || ':gm:extra';
	v_u_empty := 'vtt:' || v_c || ':' || v_s || ':u:';
	v_pct := 'vtt:' || v_c || ':' || v_s || ':gm%';
	v_semi := 'vtt:' || v_c || ':' || v_s || ':gm;';
	v_prefix := 'room:' || v_c || ':' || v_s || ':gm';
	v_text := 'vtt:nao-e-uuid:tambem-nao:gm';

	perform pg_temp.expect_read('N10.0', 'controle: UUID minusculo com a-f le', 'authenticated', v_owner, v_lower, 'broadcast', true);
	perform pg_temp.expect_read('N10.1', 'UUID maiusculo nao le e nao da erro de cast', 'authenticated', v_owner, v_upper, 'broadcast', false);
	perform pg_temp.expect_write('N10.2', 'UUID maiusculo nao escreve e nao da erro de cast', 'authenticated', v_owner, v_upper, 'broadcast', false);
	perform pg_temp.expect_read('N10.3', 'segmento extra nao le', 'authenticated', v_owner, v_extra, 'broadcast', false);
	perform pg_temp.expect_write('N10.4', 'segmento extra nao escreve', 'authenticated', v_owner, v_extra, 'broadcast', false);
	perform pg_temp.expect_read('N10.5', 'u sem id nao le', 'authenticated', v_owner, v_u_empty, 'broadcast', false);
	perform pg_temp.expect_write('N10.6', 'u sem id nao escreve', 'authenticated', v_owner, v_u_empty, 'broadcast', false);
	perform pg_temp.expect_read('N10.7', 'gm com curinga nao le', 'authenticated', v_owner, v_pct, 'broadcast', false);
	perform pg_temp.expect_write('N10.8', 'gm com curinga nao escreve', 'authenticated', v_owner, v_pct, 'broadcast', false);
	perform pg_temp.expect_read('N10.9', 'gm com ponto e virgula nao le', 'authenticated', v_owner, v_semi, 'broadcast', false);
	perform pg_temp.expect_write('N10.10', 'gm com ponto e virgula nao escreve', 'authenticated', v_owner, v_semi, 'broadcast', false);
	perform pg_temp.expect_read('N10.11', 'prefixo diferente nao le', 'authenticated', v_owner, v_prefix, 'broadcast', false);
	perform pg_temp.expect_write('N10.12', 'prefixo diferente nao escreve', 'authenticated', v_owner, v_prefix, 'broadcast', false);
	perform pg_temp.expect_read('N10.13', 'texto sem UUID nao le', 'authenticated', v_owner, v_text, 'broadcast', false);
	perform pg_temp.expect_write('N10.14', 'texto sem UUID nao escreve', 'authenticated', v_owner, v_text, 'broadcast', false);
end $$;

select pg_temp.expect_write('N10.ok', 'controle: topico bem formado ainda permite o dono escrever gm', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);

select pg_temp.expect_write('N11.1', 'dono nao escreve presence em gm', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'presence', false);
select pg_temp.expect_read('N11.2', 'dono nao le presence em gm', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'presence', false);
select pg_temp.expect_write('N11.3', 'co-mestre nao escreve presence em gmonly', 'authenticated', '00000000-0000-0000-0000-000000000002', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'presence', false);
select pg_temp.expect_read('N11.4', 'dono nao le presence em gmonly', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'presence', false);
select pg_temp.expect_write('N11.ok', 'controle: jogador escreve presence no proprio u', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'presence', true);
select pg_temp.expect_write('N11.ok2', 'controle: dono escreve broadcast em gm', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);

select pg_temp.expect_read('N12.antes', 'controle: jogador ainda le gm antes de sair', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);

do $$
declare
	v_n integer;
begin
	perform pg_temp.release();
	delete from public.memberships
	where campaign_id = '00000000-0000-0000-0000-000000000021'
		and user_id = '00000000-0000-0000-0000-000000000003';
	get diagnostics v_n = row_count;
	if v_n <> 1 then
		raise exception 'FAIL N12 setup membership do jogador nao foi removida';
	end if;
end $$;

select pg_temp.expect_read('N12.1', 'jogador removido nao le gm na avaliacao nova', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('N12.2', 'jogador removido nao escreve no proprio u', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'broadcast', false);
select pg_temp.expect_read('N12.ok', 'controle: dono continua lendo gm depois da remocao', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);

select pg_temp.expect_read('N13.1', 'topico privado room-1 nao le', 'authenticated', '00000000-0000-0000-0000-000000000001', 'room-1', 'broadcast', false);
select pg_temp.expect_write('N13.2', 'topico privado room-1 nao escreve', 'authenticated', '00000000-0000-0000-0000-000000000001', 'room-1', 'broadcast', false);
select pg_temp.expect_read('N13.ok', 'controle: gm da cena ativa continua legivel para o dono', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);

do $$
declare
	v_names text[];
	v_expected text[] := array[
		'vtt_rt_receive_gm_only',
		'vtt_rt_receive_scene_topics',
		'vtt_rt_send_gm_topics',
		'vtt_rt_send_own_user_topic'
	];
	v_auth integer;
	v_cmds integer;
	v_bad integer;
	v_total integer;
	v_rls boolean;
begin
	select coalesce(array_agg(polname order by polname), '{}')
	into v_names
	from pg_policy
	where polrelid = 'realtime.messages'::regclass
		and polname like 'vtt_rt_%';

	select count(*) into v_total
	from pg_policy
	where polrelid = 'realtime.messages'::regclass;

	select count(*) into v_auth
	from pg_policy
	where polrelid = 'realtime.messages'::regclass
		and polname like 'vtt_rt_%'
		and polroles = array[(select oid from pg_roles where rolname = 'authenticated')];

	select count(*) into v_cmds
	from pg_policy
	where polrelid = 'realtime.messages'::regclass
		and (
			(polname in ('vtt_rt_receive_scene_topics', 'vtt_rt_receive_gm_only') and polcmd = 'r')
			or (polname in ('vtt_rt_send_gm_topics', 'vtt_rt_send_own_user_topic') and polcmd = 'a')
		);

	if v_names is distinct from v_expected or v_total <> 4 or v_auth <> 4 or v_cmds <> 4 then
		raise exception 'FAIL N14.1 catalogo de policies diferente do esperado';
	end if;
	perform pg_temp.record_pass('N14.1', 'quatro policies vtt_rt com os nomes esperados, so authenticated, select nas de receber e insert nas de enviar');

	select count(*) into v_bad
	from pg_policy p
	where p.polrelid = 'realtime.messages'::regclass
		and (
			p.polroles = '{0}'
			or exists (
				select 1
				from pg_roles r
				where r.oid = any (p.polroles)
					and r.rolname in ('anon', 'public')
			)
		);
	if v_bad <> 0 then
		raise exception 'FAIL N14.2 existe policy para anon ou public';
	end if;
	perform pg_temp.record_pass('N14.2', 'nenhuma policy de realtime.messages para anon ou public');

	select c.relrowsecurity into v_rls
	from pg_class c
	where c.oid = 'realtime.messages'::regclass;
	if v_rls is not true then
		raise exception 'FAIL N14.3 relrowsecurity desligado';
	end if;
	perform pg_temp.record_pass('N14.3', 'relrowsecurity ligado em realtime.messages');
end $$;

\o

select line from pg_temp.case_results order by ord;

rollback;
