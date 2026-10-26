-- Teste da migration 0053: publish_scene num passo só, com uma cena ativa por campanha.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0053 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0053_publish_scene.sql
-- Saída esperada: linhas "OK N: ..." e "0053: todos os cenários passaram".

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- GM = owner de A, E = editor de A, V = viewer de A, X = logado sem membership.
-- G2 = owner da campanha C (outro GM).
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'gm@teste.local'),
	('00000000-0000-0000-0000-0000000000e1', 'editor@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador@teste.local'),
	('00000000-0000-0000-0000-0000000000c1', 'fora@teste.local'),
	('00000000-0000-0000-0000-0000000000b1', 'gm-c@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),
	('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Mundo C');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Campanha C', '10000000-0000-0000-0000-0000000000c1', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer'),
	('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'owner');

-- A ativa e B inativa na campanha A. Na C: C1 ativa e C2 inativa (o GM de A tenta publicar C2).
insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Cena A', true),
	('40000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a1', 'Cena B', false),
	('40000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000c1', 'Cena C', true),
	('40000000-0000-0000-0000-0000000000c2', '20000000-0000-0000-0000-0000000000c1', 'Cena C2', false);

-- 1. GM (owner) publica B. Exatamente uma ativa, e é a B.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

do $$
declare
	v_id uuid;
	v_count int;
	v_active uuid;
begin
	v_id := public.publish_scene('40000000-0000-0000-0000-0000000000a2');
	if v_id is distinct from '40000000-0000-0000-0000-0000000000a2'::uuid then
		raise exception 'falhou 1: retorno %', v_id;
	end if;
	select count(*)::int into v_count
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select id into v_active
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	if v_count <> 1 or v_active is distinct from '40000000-0000-0000-0000-0000000000a2'::uuid then
		raise exception 'falhou 1: ativas=% id=%', v_count, v_active;
	end if;
	raise notice 'OK 1: GM publica B e só B fica ativa';
end $$;

-- 2. Publicar B de novo é idempotente.
do $$
declare
	v_id uuid;
	v_count int;
	v_active uuid;
begin
	v_id := public.publish_scene('40000000-0000-0000-0000-0000000000a2');
	if v_id is distinct from '40000000-0000-0000-0000-0000000000a2'::uuid then
		raise exception 'falhou 2: retorno %', v_id;
	end if;
	select count(*)::int into v_count
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select id into v_active
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	if v_count <> 1 or v_active is distinct from '40000000-0000-0000-0000-0000000000a2'::uuid then
		raise exception 'falhou 2: ativas=% id=%', v_count, v_active;
	end if;
	raise notice 'OK 2: publicar B de novo continua com uma ativa (B)';
end $$;

-- 3. Editor publica A.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';

do $$
declare
	v_id uuid;
	v_count int;
	v_active uuid;
begin
	v_id := public.publish_scene('40000000-0000-0000-0000-0000000000a1');
	if v_id is distinct from '40000000-0000-0000-0000-0000000000a1'::uuid then
		raise exception 'falhou 3: retorno %', v_id;
	end if;
	select count(*)::int into v_count
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select id into v_active
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	if v_count <> 1 or v_active is distinct from '40000000-0000-0000-0000-0000000000a1'::uuid then
		raise exception 'falhou 3: ativas=% id=%', v_count, v_active;
	end if;
	raise notice 'OK 3: editor publica';
end $$;

-- 4. Jogador (viewer) é recusado e o estado não muda (A segue ativa).
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';

do $$
begin
	begin
		perform public.publish_scene('40000000-0000-0000-0000-0000000000a2');
		raise exception 'falhou 4: jogador publicou';
	exception
		when insufficient_privilege then
			if sqlstate <> '42501' or sqlerrm <> 'sem permissão' then
				raise exception 'falhou 4: % %', sqlstate, sqlerrm;
			end if;
	end;
end $$;

reset role;

do $$
declare
	v_count int;
	v_active uuid;
begin
	select count(*)::int into v_count
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select id into v_active
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	if v_count <> 1 or v_active is distinct from '40000000-0000-0000-0000-0000000000a1'::uuid then
		raise exception 'falhou 4: estado mudou (ativas=% id=%)', v_count, v_active;
	end if;
	raise notice 'OK 4: jogador (viewer) recusado (42501) e estado inalterado';
end $$;

-- 5. Outsider logado, sem membership, é recusado.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';

do $$
begin
	begin
		perform public.publish_scene('40000000-0000-0000-0000-0000000000a2');
		raise exception 'falhou 5: outsider publicou';
	exception
		when insufficient_privilege then
			if sqlstate <> '42501' or sqlerrm <> 'sem permissão' then
				raise exception 'falhou 5: % %', sqlstate, sqlerrm;
			end if;
	end;
end $$;

reset role;

do $$
declare
	v_count int;
	v_active uuid;
begin
	select count(*)::int into v_count
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select id into v_active
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	if v_count <> 1 or v_active is distinct from '40000000-0000-0000-0000-0000000000a1'::uuid then
		raise exception 'falhou 5: estado mudou (ativas=% id=%)', v_count, v_active;
	end if;
	raise notice 'OK 5: outsider recusado (42501)';
end $$;

-- 6. anon não tem EXECUTE (42501), antes de entrar na função.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
set local request.jwt.claim.sub = '';

do $$
begin
	begin
		perform public.publish_scene('40000000-0000-0000-0000-0000000000a2');
		raise exception 'falhou 6: anon executou publish_scene';
	exception
		when insufficient_privilege then
			if sqlstate <> '42501' then
				raise exception 'falhou 6: sqlstate %', sqlstate;
			end if;
			-- A função, se entrasse, levantaria 'sem permissão'. Falta de EXECUTE cita a função.
			if sqlerrm = 'sem permissão'
				or (
					position('publish_scene' in sqlerrm) = 0
					and position('permission denied' in lower(sqlerrm)) = 0
					and position('permissão negada' in lower(sqlerrm)) = 0
				)
			then
				raise exception 'falhou 6: esperava falta de EXECUTE, veio %', sqlerrm;
			end if;
	end;
end $$;

reset role;

do $$
declare
	v_count int;
	v_active uuid;
begin
	select count(*)::int into v_count
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select id into v_active
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	if v_count <> 1 or v_active is distinct from '40000000-0000-0000-0000-0000000000a1'::uuid then
		raise exception 'falhou 6: estado mudou (ativas=% id=%)', v_count, v_active;
	end if;
	raise notice 'OK 6: anon recusado sem permissão de execute (42501)';
end $$;

-- 7. GM de A não publica a cena inativa da campanha C. C fica como estava.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

do $$
begin
	begin
		perform public.publish_scene('40000000-0000-0000-0000-0000000000c2');
		raise exception 'falhou 7: GM de A publicou cena da campanha C';
	exception
		when insufficient_privilege then
			if sqlstate <> '42501' or sqlerrm <> 'sem permissão' then
				raise exception 'falhou 7: % %', sqlstate, sqlerrm;
			end if;
	end;
end $$;

reset role;

do $$
declare
	v_count_a int;
	v_active_a uuid;
	v_count_c int;
	v_active_c uuid;
begin
	select count(*)::int into v_count_a
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select id into v_active_a
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000a1' and is_active;
	select count(*)::int into v_count_c
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000c1' and is_active;
	select id into v_active_c
	from public.vtt_scenes
	where campaign_id = '20000000-0000-0000-0000-0000000000c1' and is_active;
	if v_count_a <> 1 or v_active_a is distinct from '40000000-0000-0000-0000-0000000000a1'::uuid then
		raise exception 'falhou 7: campanha A mudou (ativas=% id=%)', v_count_a, v_active_a;
	end if;
	if v_count_c <> 1 or v_active_c is distinct from '40000000-0000-0000-0000-0000000000c1'::uuid then
		raise exception 'falhou 7: campanha C mudou (ativas=% id=%)', v_count_c, v_active_c;
	end if;
	if exists (
		select 1 from public.vtt_scenes
		where id = '40000000-0000-0000-0000-0000000000c2' and is_active
	) then
		raise exception 'falhou 7: a cena inativa de C foi ativada';
	end if;
	raise notice 'OK 7: GM de A recusado na cena da campanha C, C inalterada';
end $$;

-- 8. Como postgres: inserir outra cena ativa na campanha que já tem uma falha 23505.
do $$
begin
	begin
		insert into public.vtt_scenes (id, campaign_id, name, is_active)
		values (
			'40000000-0000-0000-0000-0000000000a3',
			'20000000-0000-0000-0000-0000000000a1',
			'Cena extra',
			true
		);
		raise exception 'falhou 8: insert de segunda cena ativa passou';
	exception
		when unique_violation then
			if sqlstate <> '23505' then
				raise exception 'falhou 8: sqlstate %', sqlstate;
			end if;
	end;
	if exists (
		select 1 from public.vtt_scenes where id = '40000000-0000-0000-0000-0000000000a3'
	) then
		raise exception 'falhou 8: a cena extra ficou gravada';
	end if;
	raise notice 'OK 8: insert de segunda cena ativa falha com unique_violation (23505)';
end $$;

-- 9. Como postgres: ativar B enquanto A já está ativa falha 23505.
do $$
declare
	v_b boolean;
begin
	begin
		update public.vtt_scenes
		set is_active = true
		where id = '40000000-0000-0000-0000-0000000000a2';
		raise exception 'falhou 9: update que ativa a segunda cena passou';
	exception
		when unique_violation then
			if sqlstate <> '23505' then
				raise exception 'falhou 9: sqlstate %', sqlstate;
			end if;
	end;
	select is_active into v_b
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a2';
	if v_b is true then
		raise exception 'falhou 9: a cena B ficou ativa';
	end if;
	raise notice 'OK 9: update que ativaria uma segunda cena falha com unique_violation (23505)';
end $$;

do $$
begin
	raise notice '0053: todos os cenários passaram';
end $$;

rollback;
