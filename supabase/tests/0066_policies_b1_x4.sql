-- Simulação das políticas da 0066 (B1–B7 e X1–X4) em PG local com stub
-- de realtime.messages e realtime.topic(). SÓ banco descartável. Termina em ROLLBACK.
-- Usa set_config('request.jwt.claims') e SET LOCAL ROLE authenticated/anon.
-- Contas sintéticas 00000000-… e e-mails @example.invalid. Nada é commitado.

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

insert into public.campaigns (id, owner_id, name) values
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Campanha C'),
	('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000006', 'Campanha C2');

insert into public.memberships (campaign_id, user_id, role) values
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'owner'),
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'editor'),
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'viewer'),
	('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000004', 'viewer'),
	('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000006', 'owner');

insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000021', 'Cena ativa', true),
	('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000021', 'Cena inativa', false),
	('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000022', 'Cena C2', true);

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
	perform set_config('realtime.topic', '', true);
end $$;

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
			raise exception 'FAIL % % (esperava 42501, veio % %)', p_id, p_desc, v_state, v_msg;
		end if;
	end if;
	perform pg_temp.record_pass(p_id, p_desc);
end $$;

-- Tópicos
-- C  = 00000000-0000-0000-0000-000000000021
-- S  = 00000000-0000-0000-0000-000000000031 (ativa)
-- Si = 00000000-0000-0000-0000-000000000032 (inativa)
-- C2 = 00000000-0000-0000-0000-000000000022
-- S2 = 00000000-0000-0000-0000-000000000033
-- A (mestre de C) = ...0001; B (jogador de C) = ...0003; P (outro jogador) = ...0004
-- O2 (mestre de C2) = ...0006; outsider = ...0005

-- Controles positivos da cena ativa
select pg_temp.expect_read('CTRL.1', 'mestre le gm da cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);
select pg_temp.expect_write('CTRL.2', 'mestre escreve gm da cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);
select pg_temp.expect_read('CTRL.3', 'jogador B le gm da cena ativa', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', true);
select pg_temp.expect_read('CTRL.4', 'jogador B le o topico u do mestre', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000001', 'broadcast', true);

-- B1: B não escreve no tópico de outro (mestre ou outro jogador)
select pg_temp.expect_write('B1.1', 'B nao escreve em u:A (mestre)', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000001', 'broadcast', false);
select pg_temp.expect_write('B1.2', 'B nao escreve em u:P (outro jogador)', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000004', 'broadcast', false);

-- B2: B não escreve em gm nem gmonly
select pg_temp.expect_write('B2.1', 'B nao escreve em gm', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('B2.2', 'B nao escreve em gmonly', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);

-- B3: B não lê gmonly
select pg_temp.expect_read('B3', 'B nao le gmonly', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_read('B3.ok', 'controle: mestre le gmonly', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', true);

-- B4: no servidor, B pode escrever no próprio u:B (o descarte de fog_update é do cliente)
select pg_temp.expect_write('B4', 'B pode escrever broadcast no proprio u:B (descarte de fog e do cliente)', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'broadcast', true);

-- B5: payload.userId não entra na policy; B escreve no próprio tópico
select pg_temp.expect_write('B5', 'B pode escrever no proprio u:B (remetente no cliente sai do topico)', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'broadcast', true);

-- B6: presence no próprio u:B é permitida (isCoGM na presença é cosmético; o cliente ignora)
select pg_temp.expect_write('B6', 'B pode fazer track (presence) no proprio u:B', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000003', 'presence', true);

-- B7: viewer não entra na cena inativa
select pg_temp.expect_read('B7.1', 'B nao le gm da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:gm', 'broadcast', false);
select pg_temp.expect_write('B7.2', 'B nao escreve o proprio u da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:u:00000000-0000-0000-0000-000000000003', 'broadcast', false);
select pg_temp.expect_read('B7.3', 'B nao le o proprio u da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000003', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:u:00000000-0000-0000-0000-000000000003', 'broadcast', false);
select pg_temp.expect_write('B7.ok', 'controle: mestre escreve gm da cena inativa', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000032:gm', 'broadcast', true);

-- X1: mestre de outra campanha não lê nem escreve tópicos de C
select pg_temp.expect_read('X1.1', 'O2 nao le gm de C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('X1.2', 'O2 nao escreve gm de C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_read('X1.3', 'O2 nao le u:A de C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000001', 'broadcast', false);
select pg_temp.expect_write('X1.4', 'O2 nao escreve u:O2 em C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000006', 'broadcast', false);
select pg_temp.expect_read('X1.5', 'O2 nao le gmonly de C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_write('X1.6', 'O2 nao escreve gmonly de C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_read('X1.ok', 'controle: O2 le gm da propria campanha C2', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000022:00000000-0000-0000-0000-000000000033:gm', 'broadcast', true);

-- X2: tópico misturado (campanha de O2 + cena de C)
select pg_temp.expect_read('X2.1', 'O2 nao le vtt:C2:S1:gm', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000022:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('X2.2', 'O2 nao escreve vtt:C2:S1:gm', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000022:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_read('X2.3', 'mestre de C nao le vtt:C2:S1:gm', 'authenticated', '00000000-0000-0000-0000-000000000001', 'vtt:00000000-0000-0000-0000-000000000022:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);

-- X3: mestre de C2 tenta o gmonly de C
select pg_temp.expect_read('X3.1', 'O2 nao le gmonly de C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_write('X3.2', 'O2 nao escreve gmonly de C', 'authenticated', '00000000-0000-0000-0000-000000000006', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);

-- X4: não-membro e anon
select pg_temp.expect_read('X4.1', 'nao-membro nao le gm de C', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('X4.2', 'nao-membro nao escreve gm de C', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_read('X4.3', 'nao-membro nao le o proprio u em C', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000005', 'broadcast', false);
select pg_temp.expect_write('X4.4', 'nao-membro nao escreve o proprio u em C', 'authenticated', '00000000-0000-0000-0000-000000000005', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:u:00000000-0000-0000-0000-000000000005', 'broadcast', false);
select pg_temp.expect_read('X4.5', 'anon nao le gm de C', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_write('X4.6', 'anon nao escreve gm de C', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gm', 'broadcast', false);
select pg_temp.expect_read('X4.7', 'anon nao le gmonly de C', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);
select pg_temp.expect_write('X4.8', 'anon nao escreve gmonly de C', 'anon', '', 'vtt:00000000-0000-0000-0000-000000000021:00000000-0000-0000-0000-000000000031:gmonly', 'broadcast', false);

select line from pg_temp.case_results order by ord;

rollback;
