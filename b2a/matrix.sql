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

select pg_temp.reset_sheet();
insert into _res values (101, 'mestre | PV atual 5', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5)$q$));
insert into _res select 101, 'mestre | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (102, 'mestre | PV atual 5 e max 15', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5, 15)$q$));
insert into _res select 102, 'mestre | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (103, 'mestre | PV atual 50 (acima do max 10)', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 50)$q$));
insert into _res select 103, 'mestre | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (104, 'mestre | PV atual -3', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', -3)$q$));
insert into _res select 104, 'mestre | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (105, 'mestre | PV atual nulo', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', null)$q$));
insert into _res select 105, 'mestre | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (106, 'editor | PV atual 5', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5)$q$));
insert into _res select 106, 'editor | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (107, 'editor | PV atual 5 e max 15', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5, 15)$q$));
insert into _res select 107, 'editor | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (108, 'editor | PV atual 50 (acima do max 10)', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 50)$q$));
insert into _res select 108, 'editor | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (109, 'editor | PV atual -3', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', -3)$q$));
insert into _res select 109, 'editor | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (110, 'editor | PV atual nulo', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', null)$q$));
insert into _res select 110, 'editor | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (111, 'dono | PV atual 5', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5)$q$));
insert into _res select 111, 'dono | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (112, 'dono | PV atual 5 e max 15', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5, 15)$q$));
insert into _res select 112, 'dono | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (113, 'dono | PV atual 50 (acima do max 10)', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 50)$q$));
insert into _res select 113, 'dono | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (114, 'dono | PV atual -3', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', -3)$q$));
insert into _res select 114, 'dono | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (115, 'dono | PV atual nulo', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', null)$q$));
insert into _res select 115, 'dono | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (116, 'outro jogador | PV atual 5', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000d1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5)$q$));
insert into _res select 116, 'outro jogador | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (117, 'outro jogador | PV atual 5 e max 15', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000d1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5, 15)$q$));
insert into _res select 117, 'outro jogador | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (118, 'outro jogador | PV atual 50 (acima do max 10)', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000d1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 50)$q$));
insert into _res select 118, 'outro jogador | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (119, 'outro jogador | PV atual -3', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000d1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', -3)$q$));
insert into _res select 119, 'outro jogador | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (120, 'outro jogador | PV atual nulo', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000d1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', null)$q$));
insert into _res select 120, 'outro jogador | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (121, 'de fora | PV atual 5', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5)$q$));
insert into _res select 121, 'de fora | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (122, 'de fora | PV atual 5 e max 15', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5, 15)$q$));
insert into _res select 122, 'de fora | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (123, 'de fora | PV atual 50 (acima do max 10)', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 50)$q$));
insert into _res select 123, 'de fora | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (124, 'de fora | PV atual -3', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', -3)$q$));
insert into _res select 124, 'de fora | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (125, 'de fora | PV atual nulo', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1', $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', null)$q$));
insert into _res select 125, 'de fora | ficha depois', '-', (select (data->'health')::text||'/'||(data->'healthMax')::text from public.characters where id='30000000-0000-0000-0000-0000000000f1');
select pg_temp.reset_sheet();
insert into _res values (126, 'sem login | PV atual 5', '-', pg_temp.as_user(null, $q$select public.set_character_hp('30000000-0000-0000-0000-0000000000f1', 5)$q$));
-- Ressalva 0001: dono faz UPDATE direto na ficha inteira (sem RPC)
select pg_temp.reset_sheet();
insert into _res values (200, 'dono | UPDATE direto: health 999, healthMax 999, notes trocadas', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
 $q$with u as (update public.characters set data = data || '{"health":999,"healthMax":999,"notes":"trocada"}' where id='30000000-0000-0000-0000-0000000000f1' returning data) select coalesce((select data::text from u),'0 linhas alteradas')$q$));
insert into _res values (201, 'outro jogador | UPDATE direto', '-', pg_temp.as_user('00000000-0000-0000-0000-0000000000d1',
 $q$with u as (update public.characters set data = data || '{"health":1}' where id='30000000-0000-0000-0000-0000000000f1' returning data) select coalesce((select data::text from u),'0 linhas alteradas')$q$));
select n, cenario, obtido from _res order by n, cenario;
rollback;
