-- Teste LOCAL da migration 0063. Prova SQL ROLE + jwt claims, NÃO HTTP/2 browsers.
-- RODAR SÓ EM POSTGRES DESCARTÁVEL. Transação com ROLLBACK no fim.
-- Pré: bootstrap local + 0063 aplicadas. Uso: scripts/test-0063-local.sh

begin;

do $$
begin
	if exists (select 1 from public.ammo_consumptions limit 1) then
		raise exception 'Banco tem ledger de munição: rode só em Postgres descartável.';
	end if;
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode só em Postgres descartável.';
	end if;
end $$;

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

insert into public.items (id, user_id, created_by, campaign_id, world_id, name, item_type, data) values
	('40000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
	 '20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Flechas', 'Munição',
	 '{"type":"Munição","ammo":{"unitLabel":"flecha","damage":{"amount":"1d6","type":"piercing"},"extraDamage":[],"conditions":[{"id":"c1","name":"Envenenada","notes":"1d4 veneno"}]}}'::jsonb),
	('40000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
	 '20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Espada', 'Arma',
	 '{"type":"Arma"}'::jsonb),
	('40000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1',
	 '20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 'Virotes B', 'Munição',
	 '{"type":"Munição","ammo":{"unitLabel":"virote"}}'::jsonb);

insert into public.characters (id, campaign_id, name, user_id, created_by, data) values
	('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1', 'Ficha do jogador',
	 '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1',
	 '{"notes":"keep","inventoryList":[{"id":"inv-ammo","name":"Flechas","quantity":1,"campaignItemId":"40000000-0000-0000-0000-0000000000a1"},{"id":"inv-sword","name":"Espada","quantity":1,"campaignItemId":"40000000-0000-0000-0000-0000000000a2"},{"id":"inv-potion","name":"Poção","quantity":2}]}'::jsonb),
	('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'Ficha B',
	 '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1',
	 '{"inventoryList":[{"id":"inv-b","name":"Virotes","quantity":4,"campaignItemId":"40000000-0000-0000-0000-0000000000b1"}]}'::jsonb);

create temp table _res (n int primary key, cenario text, esperado text, obtido text);
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

create function pg_temp.as_anon(p_sql text)
returns text language plpgsql as $f$
declare
	v text;
begin
	perform set_config('request.jwt.claims', '{"role":"anon"}', true);
	perform set_config('role', 'anon', true);
	begin
		execute p_sql into v;
	exception when others then
		perform set_config('role', 'postgres', true);
		return 'negado (' || sqlstate || ': ' || sqlerrm || ')';
	end;
	perform set_config('role', 'postgres', true);
	return 'permitido ' || coalesce(v, '');
end $f$;

create function pg_temp.ammo_qty()
returns int language sql as $$
	select (e->>'quantity')::int
	from public.characters c,
		jsonb_array_elements(c.data->'inventoryList') e
	where c.id = '30000000-0000-0000-0000-0000000000f1'
		and e->>'id' = 'inv-ammo';
$$;

create function pg_temp.reset_sheet(p_qty int default 1)
returns void language plpgsql as $$
begin
	delete from public.ammo_consumptions
	where character_id in (
		'30000000-0000-0000-0000-0000000000f1'::uuid,
		'30000000-0000-0000-0000-0000000000b1'::uuid
	);
	perform public._ammo_open_qty_write('30000000-0000-0000-0000-0000000000f1');
	update public.characters
	set data = jsonb_build_object(
		'notes', 'keep',
		'inventoryList', jsonb_build_array(
			jsonb_build_object(
				'id', 'inv-ammo', 'name', 'Flechas', 'quantity', p_qty,
				'campaignItemId', '40000000-0000-0000-0000-0000000000a1'
			),
			jsonb_build_object(
				'id', 'inv-sword', 'name', 'Espada', 'quantity', 1,
				'campaignItemId', '40000000-0000-0000-0000-0000000000a2'
			),
			jsonb_build_object(
				'id', 'inv-potion', 'name', 'Poção', 'quantity', 2
			)
		)
	)
	where id = '30000000-0000-0000-0000-0000000000f1';
	perform public._ammo_close_qty_write('30000000-0000-0000-0000-0000000000f1');
end $$;

create function pg_temp.assert_ok(p_n int)
returns void language plpgsql as $$
declare v text;
begin
	select obtido into v from _res where n = p_n;
	if v is null or v not like 'permitido%' then
		raise exception 'cenário %: esperado permitido, veio %', p_n, v;
	end if;
end $$;

create function pg_temp.assert_denied(p_n int, p_code text default '42501')
returns void language plpgsql as $$
declare v text;
begin
	select obtido into v from _res where n = p_n;
	if v is null or v not like 'negado%' then
		raise exception 'cenário %: esperado negado, veio %', p_n, v;
	end if;
	if p_code is not null and v not like '%(' || p_code || ':%' then
		raise exception 'cenário %: esperado código %, veio %', p_n, p_code, v;
	end if;
end $$;

create function pg_temp.assert_qty(p_n int, p_qty int)
returns void language plpgsql as $$
begin
	if pg_temp.ammo_qty() is distinct from p_qty then
		raise exception 'cenário %: qty %, esperado %', p_n, pg_temp.ammo_qty(), p_qty;
	end if;
end $$;

-- 1. Owner consome 1 unidade.
select pg_temp.reset_sheet(1);
insert into _res values (1, 'owner consome', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000001',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d6+2')$q$));
select pg_temp.assert_ok(1);
select pg_temp.assert_qty(1, 0);

-- 2. Replay mesmo ID: mesmo snapshot, qty não muda de novo.
insert into _res values (2, 'replay mesmo id', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000001',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d6+2')$q$));
select pg_temp.assert_ok(2);
select pg_temp.assert_qty(2, 0);
do $$
declare j jsonb; v text;
begin
	select substr(obtido, length('permitido ')+1)::jsonb into j from _res where n = 2;
	if j->>'replayed' is distinct from 'true' then
		raise exception 'replay não marcou replayed: %', j;
	end if;
	if j->'snapshot'->>'mergedFormula' is distinct from '1d6+2' then
		raise exception 'snapshot fórmula perdida: %', j;
	end if;
	if j->'snapshot'->>'conditionsText' is distinct from 'Envenenada — 1d4 veneno' then
		raise exception 'snapshot condições: %', j;
	end if;
end $$;

-- 3. Segundo consumption_id com estoque 0.
insert into _res values (3, 'segundo id estoque 0', 'negado 22023', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000002',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d6+2')$q$));
select pg_temp.assert_denied(3, '22023');
select pg_temp.assert_qty(3, 0);

-- 4. Editor consome.
select pg_temp.reset_sheet(2);
insert into _res values (4, 'editor consome', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000003',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_ok(4);
select pg_temp.assert_qty(4, 1);

-- 5. Dono da ficha consome.
insert into _res values (5, 'dono ficha consome', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000004',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_ok(5);
select pg_temp.assert_qty(5, 0);

-- 6. Viewer alheio (jogador da mesa, não dono da ficha).
select pg_temp.reset_sheet(1);
insert into _res values (6, 'jogador alheio', 'negado 42501', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000d1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000005',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_denied(6, '42501');
select pg_temp.assert_qty(6, 1);

-- 7. Não-membro.
insert into _res values (7, 'não-membro', 'negado 42501', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000c1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000006',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_denied(7, '42501');

-- 8. Mestre de outra campanha.
insert into _res values (8, 'mestre campanha B', 'negado 42501', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000b1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000007',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_denied(8, '42501');

-- 9. Anon sem EXECUTE / 42501.
insert into _res values (9, 'anon consume', 'negado 42501', pg_temp.as_anon(
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000008',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_denied(9, '42501');

-- 10. Mesmo ID, outra campanha/entry: negado, sem vazar dados.
select pg_temp.reset_sheet(3);
insert into _res values (10, 'primeiro consume id 10', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-00000000000a',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_ok(10);
insert into _res values (11, 'mesmo id outra ficha/campanha', 'negado 42501', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000b1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-00000000000a',
		'20000000-0000-0000-0000-0000000000b1',
		'30000000-0000-0000-0000-0000000000b1',
		'inv-b', '1d8')$q$));
select pg_temp.assert_denied(11, '42501');
insert into _res values (12, 'get id outra identidade', 'negado 42501', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000b1',
	$q$select public.get_ammo_consumption(
		'50000000-0000-0000-0000-00000000000a',
		'20000000-0000-0000-0000-0000000000b1',
		'30000000-0000-0000-0000-0000000000b1',
		'inv-b')$q$));
select pg_temp.assert_denied(12, '42501');

-- 13. Ledger SELECT direto: dono ficha ok; outsider/anon negado (0 linhas / 42501).
insert into _res values (13, 'ledger select dono', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$select count(*)::text from public.ammo_consumptions
		where consumption_id = '50000000-0000-0000-0000-00000000000a'$q$));
select pg_temp.assert_ok(13);
do $$
declare v text;
begin
	select obtido into v from _res where n = 13;
	if v is distinct from 'permitido 1' then
		raise exception 'dono deveria ver 1 linha: %', v;
	end if;
end $$;
insert into _res values (14, 'ledger select outsider', 'permitido 0', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000c1',
	$q$select count(*)::text from public.ammo_consumptions$q$));
do $$
declare v text;
begin
	select obtido into v from _res where n = 14;
	if v is distinct from 'permitido 0' then
		raise exception 'outsider não deveria ler ledger: %', v;
	end if;
end $$;
insert into _res values (15, 'ledger insert direto', 'negado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$insert into public.ammo_consumptions (
		consumption_id, user_id, campaign_id, character_id, inventory_entry_id, snapshot
	) values (
		'50000000-0000-0000-0000-0000000000ff',
		'00000000-0000-0000-0000-0000000000a1',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '{}'::jsonb
	) returning consumption_id::text$q$));
select pg_temp.assert_denied(15, '42501');

-- 16. Save legado: qty antiga não repõe; notes e poção LWW; espada LWW.
select pg_temp.reset_sheet(5);
insert into _res values (16, 'consume para qty 4', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000010',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_ok(16);
select pg_temp.assert_qty(16, 4);
insert into _res values (17, 'save legado LWW', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1',
	$q$update public.characters
		set data = '{"notes":"novo","inventoryList":[
			{"id":"inv-ammo","name":"Flechas","quantity":99,"campaignItemId":"40000000-0000-0000-0000-0000000000a1"},
			{"id":"inv-sword","name":"Espada","quantity":7,"campaignItemId":"40000000-0000-0000-0000-0000000000a2"},
			{"id":"inv-potion","name":"Poção","quantity":9}
		]}'::jsonb
		where id = '30000000-0000-0000-0000-0000000000f1'
		returning (data->>'notes')$q$));
select pg_temp.assert_ok(17);
select pg_temp.assert_qty(17, 4);
do $$
declare d jsonb;
begin
	select data into d from public.characters where id = '30000000-0000-0000-0000-0000000000f1';
	if d->>'notes' is distinct from 'novo' then
		raise exception 'notes deveria LWW: %', d;
	end if;
	if (select (e->>'quantity')::int from jsonb_array_elements(d->'inventoryList') e where e->>'id' = 'inv-sword')
		is distinct from 7
	then
		raise exception 'espada deveria LWW: %', d;
	end if;
	if (select (e->>'quantity')::int from jsonb_array_elements(d->'inventoryList') e where e->>'id' = 'inv-potion')
		is distinct from 9
	then
		raise exception 'poção deveria LWW: %', d;
	end if;
end $$;

-- 18. GUC spoof não bypassa o trigger.
insert into _res values (18, 'guc spoof', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1',
	$q$with guc as (
			select set_config('ammo.bypass', '1', true) as a,
				set_config('ammo.allow', 'true', true) as b
		)
		update public.characters
		set data = jsonb_set(data, '{inventoryList,0,quantity}', '77'::jsonb)
		from guc
		where id = '30000000-0000-0000-0000-0000000000f1'
		returning 1::text$q$));
select pg_temp.assert_ok(18);
select pg_temp.assert_qty(18, 4);

-- 19. set_quantity stale → 40001.
insert into _res values (19, 'set_quantity stale', 'negado 40001', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.set_ammo_quantity(
		'30000000-0000-0000-0000-0000000000f1',
		'20000000-0000-0000-0000-0000000000a1',
		'inv-ammo', 99, 8)$q$));
select pg_temp.assert_denied(19, '40001');
select pg_temp.assert_qty(19, 4);

-- 20. set_quantity ok (owner).
insert into _res values (20, 'set_quantity owner', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.set_ammo_quantity(
		'30000000-0000-0000-0000-0000000000f1',
		'20000000-0000-0000-0000-0000000000a1',
		'inv-ammo', 4, 8)$q$));
select pg_temp.assert_ok(20);
select pg_temp.assert_qty(20, 8);

-- 21. Dono da ficha NÃO reestoca.
insert into _res values (21, 'dono set_quantity', 'negado 42501', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$select public.set_ammo_quantity(
		'30000000-0000-0000-0000-0000000000f1',
		'20000000-0000-0000-0000-0000000000a1',
		'inv-ammo', 8, 1)$q$));
select pg_temp.assert_denied(21, '42501');
select pg_temp.assert_qty(21, 8);

-- 22-24. Negativo / zero esperado inválido no set; consume malformado.
insert into _res values (22, 'set negativo', 'negado 22023', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.set_ammo_quantity(
		'30000000-0000-0000-0000-0000000000f1',
		'20000000-0000-0000-0000-0000000000a1',
		'inv-ammo', 8, -1)$q$));
select pg_temp.assert_denied(22, '22023');
insert into _res values (23, 'consume entry vazia', 'negado 22023', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000011',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'', '1d8')$q$));
select pg_temp.assert_denied(23, '22023');
insert into _res values (24, 'consume sem catalog ammo (espada)', 'negado 22023', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000012',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-sword', '1d8')$q$));
select pg_temp.assert_denied(24, '22023');

-- 25. Falha entre débito e ledger: trigger boom no insert → qty intacta.
select pg_temp.reset_sheet(3);
create or replace function public._0063_test_boom_ledger()
returns trigger language plpgsql as $$
begin
	if new.consumption_id = '50000000-0000-0000-0000-0000000000aa' then
		raise exception 'boom ledger' using errcode = 'P0001';
	end if;
	return new;
end $$;
create trigger boom_ledger before insert on public.ammo_consumptions
	for each row execute function public._0063_test_boom_ledger();
insert into _res values (25, 'falha ledger rollback', 'negado P0001', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-0000000000aa',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_denied(25, 'P0001');
select pg_temp.assert_qty(25, 3);
drop trigger boom_ledger on public.ammo_consumptions;
drop function public._0063_test_boom_ledger();

-- 26. Snapshot sobrevive reload (get).
insert into _res values (26, 'consume p/ snapshot', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000013',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_ok(26);
insert into _res values (27, 'get snapshot', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.get_ammo_consumption(
		'50000000-0000-0000-0000-000000000013',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo')$q$));
select pg_temp.assert_ok(27);
do $$
declare j jsonb;
begin
	select substr(obtido, length('permitido ')+1)::jsonb into j from _res where n = 27;
	if j->'snapshot'->>'mergedFormula' is distinct from '1d8' then
		raise exception 'get perdeu fórmula: %', j;
	end if;
	if j->'snapshot'->>'itemName' is distinct from 'Flechas' then
		raise exception 'get perdeu item: %', j;
	end if;
end $$;

-- 28-29. Resume roll/feed sem duplicar (mesmo consumption_id).
insert into _res values (28, 'complete roll 1', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.complete_ammo_consumption_roll(
		'50000000-0000-0000-0000-000000000013',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', null, false, 'tiro')$q$));
select pg_temp.assert_ok(28);
insert into _res values (29, 'complete roll replay', 'permitido', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.complete_ammo_consumption_roll(
		'50000000-0000-0000-0000-000000000013',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', null, false, 'tiro')$q$));
select pg_temp.assert_ok(29);
do $$
declare a jsonb; b jsonb; rolls int;
begin
	select substr(obtido, length('permitido ')+1)::jsonb into a from _res where n = 28;
	select substr(obtido, length('permitido ')+1)::jsonb into b from _res where n = 29;
	if a->'roll'->>'id' is distinct from b->'roll'->>'id' then
		raise exception 'resume gerou outro roll: % vs %', a, b;
	end if;
	if b->>'replayed' is distinct from 'true' then
		raise exception 'segundo complete deveria replayed: %', b;
	end if;
	select count(*) into rolls from public.vtt_rolls
	where character_id = '30000000-0000-0000-0000-0000000000f1';
	if rolls is distinct from 1 then
		raise exception 'feed duplicou rolls: %', rolls;
	end if;
	if pg_temp.ammo_qty() is distinct from 2 then
		raise exception 'resume debitou de novo: %', pg_temp.ammo_qty();
	end if;
end $$;

-- 30. Helpers privados sem EXECUTE público; RPCs autenticadas; anon sem EXECUTE.
do $$
declare
	v_priv int;
	v_anon_rpc int;
	v_auth_rpc int;
	v_auth_priv int;
begin
	select count(*) into v_auth_priv
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
		and p.proname like E'\\_ammo%'
		and has_function_privilege('authenticated', p.oid, 'EXECUTE');
	if v_auth_priv <> 0 then
		raise exception 'helper _ammo_* executável por authenticated: %', v_auth_priv;
	end if;
	select count(*) into v_priv
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
		and p.proname like E'\\_ammo%'
		and has_function_privilege('anon', p.oid, 'EXECUTE');
	if v_priv <> 0 then
		raise exception 'helper _ammo_* executável por anon: %', v_priv;
	end if;
	select count(*) into v_anon_rpc
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
		and p.proname in (
			'consume_ammo', 'set_ammo_quantity',
			'get_ammo_consumption', 'complete_ammo_consumption_roll'
		)
		and has_function_privilege('anon', p.oid, 'EXECUTE');
	if v_anon_rpc <> 0 then
		raise exception 'RPC pública com EXECUTE anon: %', v_anon_rpc;
	end if;
	select count(*) into v_auth_rpc
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
		and p.proname in (
			'consume_ammo', 'set_ammo_quantity',
			'get_ammo_consumption', 'complete_ammo_consumption_roll'
		)
		and has_function_privilege('authenticated', p.oid, 'EXECUTE');
	if v_auth_rpc < 4 then
		raise exception 'RPC autenticada faltando EXECUTE: %', v_auth_rpc;
	end if;
	if has_table_privilege('authenticated', 'public._ammo_qty_write_gate', 'INSERT')
		or has_table_privilege('authenticated', 'public._ammo_qty_write_gate', 'SELECT')
		or has_table_privilege('anon', 'public.ammo_consumptions', 'INSERT')
		or has_table_privilege('authenticated', 'public.ammo_consumptions', 'INSERT')
		or has_table_privilege('authenticated', 'public.ammo_consumptions', 'UPDATE')
		or has_table_privilege('authenticated', 'public.ammo_consumptions', 'DELETE')
	then
		raise exception 'GRANT perigoso em ledger/gate';
	end if;
	if exists (
		select 1 from pg_get_functiondef('public.preserve_character_ammo_quantities'::regproc) d
		where d like '%current_setting%ammo%'
	) then
		raise exception 'trigger usa GUC custom como auth';
	end if;
	if not exists (
		select 1 from pg_trigger
		where tgrelid = 'public.characters'::regclass
			and tgname = 'characters_guard_item_links'
	) then
		raise exception 'guard_character_item_links foi removido';
	end if;
end $$;

-- 31. Entrada sem campaignItemId (type inventado pelo cliente) recusada.
select pg_temp.reset_sheet(2);
update public.characters
set data = jsonb_set(
	data, '{inventoryList}',
	data->'inventoryList' || jsonb_build_array(jsonb_build_object(
		'id', 'inv-fake', 'name', 'Fake', 'quantity', 5, 'type', 'Munição'
	))
)
where id = '30000000-0000-0000-0000-0000000000f1';
insert into _res values (31, 'sem catálogo', 'negado 22023', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000014',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-fake', '1d8')$q$));
select pg_temp.assert_denied(31, '22023');

-- 32. Authz sem login.
insert into _res values (32, 'sem jwt sub', 'negado 42501', pg_temp.as_user(
	null,
	$q$select public.consume_ammo(
		'50000000-0000-0000-0000-000000000015',
		'20000000-0000-0000-0000-0000000000a1',
		'30000000-0000-0000-0000-0000000000f1',
		'inv-ammo', '1d8')$q$));
select pg_temp.assert_denied(32, '42501');

do $$
declare n int;
begin
	select count(*) into n from _res;
	raise notice '0063: % cenários registrados, todos os asserts passaram (SQL ROLE/claims, não HTTP).', n;
end $$;

rollback;
