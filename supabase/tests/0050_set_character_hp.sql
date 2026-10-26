-- Teste da migration 0050: set_character_hp só mexe em health/healthMax.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0050 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0050_set_character_hp.sql
-- "permitido" = a RPC devolveu o JSON de PV. "negado" = exception.
-- auth.uid() vem de request.jwt.claims + set role, como no teste 0048.

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- A = mestre, E = editor, F = dono da ficha (viewer), V = viewer sem ser dono,
-- C = outsider, B = mestre de outra campanha.
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'gm@teste.local'),
	('00000000-0000-0000-0000-0000000000e1', 'editor@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'dono@teste.local'),
	('00000000-0000-0000-0000-0000000000d1', 'viewer@teste.local'),
	('00000000-0000-0000-0000-0000000000c1', 'outsider@teste.local'),
	('00000000-0000-0000-0000-0000000000b1', 'outro@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),
	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Campanha B', '10000000-0000-0000-0000-0000000000b1', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 'viewer'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner');

insert into public.characters (id, campaign_id, name, user_id, created_by, data) values
	('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1', 'Ficha do jogador',
	 '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1',
	 '{"health": 8, "healthMax": 10, "marker": "keep", "notes": "segredo"}');

create temp table _res (n int, cenario text, esperado text, obtido text);
grant all on _res to authenticated, anon;

create function pg_temp.as_user(p_uid text, p_sql text)
returns text language plpgsql as $f$
declare
	v text;
begin
	if p_uid is null then
		perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
	else
		perform set_config('request.jwt.claims',
			json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
	end if;
	perform set_config('role', 'authenticated', true);
	begin
		execute p_sql into v;
	exception when others then
		perform set_config('role', 'postgres', true);
		return 'negado (' || sqlstate || ': ' || sqlerrm || ')';
	end;
	perform set_config('role', 'postgres', true);
	return 'permitido ' || coalesce(v, '');
end $f$;

create function pg_temp.reset_sheet()
returns void language sql as $$
	update public.characters
	set data = '{"health": 8, "healthMax": 10, "marker": "keep", "notes": "segredo"}'::jsonb
	where id = '30000000-0000-0000-0000-0000000000f1';
$$;

create function pg_temp.assert_sheet(p_health int, p_max int)
returns void language plpgsql as $$
declare
	d jsonb;
	v_name text;
	v_user uuid;
begin
	select data, name, user_id into d, v_name, v_user
	from public.characters
	where id = '30000000-0000-0000-0000-0000000000f1';
	if v_name is distinct from 'Ficha do jogador'
		or v_user is distinct from '00000000-0000-0000-0000-0000000000f1'::uuid
		or (d->>'health')::int is distinct from p_health
		or (d->>'healthMax')::int is distinct from p_max
		or d->>'marker' is distinct from 'keep'
		or d->>'notes' is distinct from 'segredo'
	then
		raise exception 'ficha mudou além do PV: %', d;
	end if;
end $$;

create function pg_temp.assert_ok(p_n int, p_health int, p_max int)
returns void language plpgsql as $$
declare
	v text;
	j jsonb;
begin
	select obtido into v from _res where n = p_n;
	if v is null or v not like 'permitido%' then
		raise exception 'cenário %: esperado permitido, veio %', p_n, v;
	end if;
	j := substr(v, length('permitido ') + 1)::jsonb;
	if (j->>'health')::int is distinct from p_health
		or (j->>'healthMax')::int is distinct from p_max
	then
		raise exception 'cenário %: retorno %', p_n, v;
	end if;
	perform pg_temp.assert_sheet(p_health, p_max);
end $$;

create function pg_temp.assert_denied(p_n int)
returns void language plpgsql as $$
declare
	v text;
begin
	select obtido into v from _res where n = p_n;
	if v is null or v not like 'negado%' then
		raise exception 'cenário %: esperado negado, veio %', p_n, v;
	end if;
	perform pg_temp.assert_sheet(8, 10);
end $$;

-- 1. Mestre muda current e max; current acima do max novo é clampado.
select pg_temp.reset_sheet();
insert into _res values (1, 'mestre ok (current e max, clampa)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 30, 12)$q$));
select pg_temp.assert_ok(1, 12, 12);

-- 2. Editor muda current e max na ficha de outro.
select pg_temp.reset_sheet();
insert into _res values (2, 'editor ok (current e max)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 4, 20)$q$));
select pg_temp.assert_ok(2, 4, 20);

-- 3. Dono (viewer) muda só o current, inclusive zero.
select pg_temp.reset_sheet();
insert into _res values (3, 'dono ok (current)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 0)$q$));
select pg_temp.assert_ok(3, 0, 10);

-- 4. Dono acima do healthMax atual: clampa, sem mexer no max.
select pg_temp.reset_sheet();
insert into _res values (4, 'dono ok (current clampado no max atual)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 50)$q$));
select pg_temp.assert_ok(4, 10, 10);

-- 5. Dono não altera max.
select pg_temp.reset_sheet();
insert into _res values (5, 'dono alterando max negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 3, 99)$q$));
select pg_temp.assert_denied(5);

-- 6. Viewer da mesma campanha, sem ser dono.
select pg_temp.reset_sheet();
insert into _res values (6, 'viewer sem ser dono negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000d1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 3)$q$));
select pg_temp.assert_denied(6);

-- 7. Outsider (conta sem membership).
select pg_temp.reset_sheet();
insert into _res values (7, 'outsider negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 3)$q$));
select pg_temp.assert_denied(7);

-- 8. Membro de outra campanha.
select pg_temp.reset_sheet();
insert into _res values (8, 'membro de outra campanha negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 3)$q$));
select pg_temp.assert_denied(8);

-- 9. Sem login: role authenticated, JWT sem sub (auth.uid() nulo).
select pg_temp.reset_sheet();
insert into _res values (9, 'sem login negado', 'negado', pg_temp.as_user(null,
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 3)$q$));
select pg_temp.assert_denied(9);

-- 10. anon não tem EXECUTE.
select pg_temp.reset_sheet();
do $$
declare
	v text;
begin
	perform set_config('request.jwt.claims', '{"role":"anon"}', true);
	perform set_config('role', 'anon', true);
	begin
		perform public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 3);
		v := 'permitido';
	exception when others then
		v := 'negado (' || sqlstate || ': ' || sqlerrm || ')';
	end;
	perform set_config('role', 'postgres', true);
	insert into _res values (10, 'anon sem execute negado', 'negado', v);
end $$;
select pg_temp.assert_denied(10);

-- 11. Entrada inválida não grava.
select pg_temp.reset_sheet();
insert into _res values (11, 'current negativo negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', -1)$q$));
select pg_temp.assert_denied(11);

select pg_temp.reset_sheet();
insert into _res values (12, 'max zero negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 3, 0)$q$));
select pg_temp.assert_denied(12);

select pg_temp.reset_sheet();
insert into _res values (13, 'ficha inexistente negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000ff', 3)$q$));
select pg_temp.assert_denied(13);

-- 14. Sem healthMax não há teto; a chave não é criada.
update public.characters
set data = '{"health": 8, "marker": "keep", "notes": "segredo"}'::jsonb
where id = '30000000-0000-0000-0000-0000000000f1';
insert into _res values (14, 'dono sem healthMax não clampa', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 15)$q$));
do $$
declare
	d jsonb;
	v text;
	j jsonb;
begin
	select obtido into v from _res where n = 14;
	if v is null or v not like 'permitido%' then
		raise exception 'cenário 14: esperado permitido, veio %', v;
	end if;
	j := substr(v, length('permitido ') + 1)::jsonb;
	select data into d from public.characters where id = '30000000-0000-0000-0000-0000000000f1';
	if (d->>'health')::int is distinct from 15
		or d ? 'healthMax'
		or d->>'marker' is distinct from 'keep'
		or d->>'notes' is distinct from 'segredo'
		or (j->>'health')::int is distinct from 15
		or j ? 'healthMax'
	then
		raise exception 'cenário 14: data % retorno %', d, v;
	end if;
end $$;

-- 15–16. Dono só por user_id (created_by é o mestre).
update public.characters
set user_id = '00000000-0000-0000-0000-0000000000f1',
	created_by = '00000000-0000-0000-0000-0000000000a1',
	data = '{"health": 8, "healthMax": 10, "marker": "keep", "notes": "segredo"}'::jsonb
where id = '30000000-0000-0000-0000-0000000000f1';
insert into _res values (15, 'dono só por user_id ok (current)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 6)$q$));
insert into _res values (16, 'dono só por user_id alterando max negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 6, 40)$q$));

-- 17–18. Dono só por created_by (user_id é o mestre).
update public.characters
set user_id = '00000000-0000-0000-0000-0000000000a1',
	created_by = '00000000-0000-0000-0000-0000000000f1',
	data = '{"health": 8, "healthMax": 10, "marker": "keep", "notes": "segredo"}'::jsonb
where id = '30000000-0000-0000-0000-0000000000f1';
insert into _res values (17, 'dono só por created_by ok (current)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 7)$q$));
insert into _res values (18, 'dono só por created_by alterando max negado', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 7, 40)$q$));

do $$
declare
	d jsonb;
	v_user uuid;
	v_created uuid;
	v15 text;
	v16 text;
	v17 text;
	v18 text;
begin
	select obtido into v15 from _res where n = 15;
	select obtido into v16 from _res where n = 16;
	select obtido into v17 from _res where n = 17;
	select obtido into v18 from _res where n = 18;
	if v15 not like 'permitido%' or (substr(v15, length('permitido ') + 1)::jsonb->>'health')::int is distinct from 6 then
		raise exception 'cenário 15: %', v15;
	end if;
	if v16 not like 'negado%' then
		raise exception 'cenário 16: %', v16;
	end if;
	if v17 not like 'permitido%' or (substr(v17, length('permitido ') + 1)::jsonb->>'health')::int is distinct from 7 then
		raise exception 'cenário 17: %', v17;
	end if;
	if v18 not like 'negado%' then
		raise exception 'cenário 18: %', v18;
	end if;
	select data, user_id, created_by into d, v_user, v_created
	from public.characters
	where id = '30000000-0000-0000-0000-0000000000f1';
	if (d->>'health')::int is distinct from 7
		or (d->>'healthMax')::int is distinct from 10
		or d->>'marker' is distinct from 'keep'
		or v_user is distinct from '00000000-0000-0000-0000-0000000000a1'::uuid
		or v_created is distinct from '00000000-0000-0000-0000-0000000000f1'::uuid
	then
		raise exception 'cenário 17/18: data % user % created %', d, v_user, v_created;
	end if;
end $$;

select n, cenario, esperado, obtido,
	case when obtido like esperado || '%' then 'ok' else 'FALHOU' end as status
from _res order by n;

do $$
begin
	if exists (select 1 from _res where obtido not like esperado || '%') then
		raise exception '0050: falhou: %', (
			select string_agg(n::text || ' ' || cenario || ' => ' || obtido, ' | ' order by n)
			from _res
			where obtido not like esperado || '%'
		);
	end if;
	raise notice '0050: todos os cenários passaram';
end $$;

rollback;
