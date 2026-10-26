-- Teste da migration 0051 (combatentes da mesa): ordem de iniciativa.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0051 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0051_vtt_combat_rls.sql
-- Saída: tabela cenário/esperado/obtido e "0051: todos os cenários passaram".

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- GM dono de A, ED editor de A, V viewer (jogador) de A, X dono de B (fora de A).
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'gm@teste.local'),
	('00000000-0000-0000-0000-0000000000e1', 'ed@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador@teste.local'),
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
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner');

-- Cena ativa: o jogador vê a cena e só o combatente do token visível.
insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Caverna', true),
	('40000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'Torre', true);

insert into public.vtt_tokens (id, scene_id, name, layer, is_hidden) values
	('60000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 'Visível', 'token', false),
	('60000000-0000-0000-0000-0000000000a2', '40000000-0000-0000-0000-0000000000a1', 'Oculto', 'token', true),
	('60000000-0000-0000-0000-0000000000a3', '40000000-0000-0000-0000-0000000000a1', 'Camada GM', 'gm', false),
	('60000000-0000-0000-0000-0000000000a4', '40000000-0000-0000-0000-0000000000a1', 'Livre mestre', 'token', false),
	('60000000-0000-0000-0000-0000000000a5', '40000000-0000-0000-0000-0000000000a1', 'Livre editor', 'token', false),
	('60000000-0000-0000-0000-0000000000a6', '40000000-0000-0000-0000-0000000000a1', 'Livre recusa', 'token', false),
	('60000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1', 'Token B', 'token', false);

-- a1 visível, a2 oculto, a3 camada do mestre. Os três contam para o mestre.
insert into public.vtt_combatants (id, scene_id, token_id, initiative, dex, sort_key) values
	('70000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-0000000000a1', 15, 14, 1),
	('70000000-0000-0000-0000-0000000000a2', '40000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-0000000000a2', 10, 12, 2),
	('70000000-0000-0000-0000-0000000000a3', '40000000-0000-0000-0000-0000000000a1', '60000000-0000-0000-0000-0000000000a3', 20, 16, 3);

create temp table _res (n int, cenario text, esperado text, obtido text);
grant all on _res to authenticated, anon;

create function pg_temp.as_user(p_uid text, p_sql text)
returns text language plpgsql as $f$
declare v text; n bigint;
begin
	begin
		if p_uid is null then
			perform set_config('request.jwt.claims', '{"role":"anon"}', true);
			perform set_config('role', 'anon', true);
		else
			perform set_config('request.jwt.claims',
				json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
			perform set_config('role', 'authenticated', true);
		end if;
		execute p_sql into v;
		get diagnostics n = row_count;
		raise exception using errcode = 'P0099',
			message = case when n = 0 then 'bloqueado' else 'ok:' || coalesce(v, '') end;
	exception
		when sqlstate 'P0099' then
			perform set_config('role', 'postgres', true);
			return sqlerrm;
		when others then
			perform set_config('role', 'postgres', true);
			return 'bloqueado';
	end;
end $f$;

-- Mestre (owner): lê os três (visível, oculto e camada gm), cria, muda, apaga.
-- Cada cenário é isolado e desfeito (rollback da subtransação).
insert into _res values (1, 'mestre lê combatentes', 'ok:3', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select count(*)::text from public.vtt_combatants where id in (
		'70000000-0000-0000-0000-0000000000a1',
		'70000000-0000-0000-0000-0000000000a2',
		'70000000-0000-0000-0000-0000000000a3'
	)$q$));
insert into _res values (2, 'mestre cria combatente', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$insert into public.vtt_combatants (id, scene_id, token_id, sort_key)
		values (
			'70000000-0000-0000-0000-0000000000a4',
			'40000000-0000-0000-0000-0000000000a1',
			'60000000-0000-0000-0000-0000000000a4',
			4
		) returning 'x'$q$));
insert into _res values (3, 'mestre atualiza iniciativa', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$update public.vtt_combatants set initiative = 18
		where id = '70000000-0000-0000-0000-0000000000a2' returning 'x'$q$));
insert into _res values (4, 'mestre apaga combatente', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$delete from public.vtt_combatants
		where id = '70000000-0000-0000-0000-0000000000a3' returning 'x'$q$));

-- Editor escreve (cria e atualiza).
insert into _res values (5, 'editor cria combatente', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1',
	$q$insert into public.vtt_combatants (scene_id, token_id, sort_key, initiative)
		values (
			'40000000-0000-0000-0000-0000000000a1',
			'60000000-0000-0000-0000-0000000000a5',
			5,
			7
		) returning 'x'$q$));
insert into _res values (6, 'editor atualiza iniciativa', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1',
	$q$update public.vtt_combatants set initiative = 16
		where id = '70000000-0000-0000-0000-0000000000a1' returning 'x'$q$));

-- Jogador na cena ativa: só o token visível.
insert into _res values (7, 'jogador vê combatente visível na cena ativa', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$select 'x' from public.vtt_combatants
		where id = '70000000-0000-0000-0000-0000000000a1'$q$));
insert into _res values (8, 'jogador não vê combatente de token oculto', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$select 'x' from public.vtt_combatants
		where id = '70000000-0000-0000-0000-0000000000a2'$q$));
insert into _res values (9, 'jogador não vê combatente da camada do mestre', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$select 'x' from public.vtt_combatants
		where id = '70000000-0000-0000-0000-0000000000a3'$q$));
insert into _res values (10, 'jogador cria combatente', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$insert into public.vtt_combatants (scene_id, token_id, sort_key)
		values (
			'40000000-0000-0000-0000-0000000000a1',
			'60000000-0000-0000-0000-0000000000a6',
			6
		) returning 'x'$q$));
insert into _res values (11, 'jogador atualiza combatente', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_combatants set initiative = 1
		where id = '70000000-0000-0000-0000-0000000000a1' returning 'x'$q$));
insert into _res values (12, 'jogador apaga combatente', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$delete from public.vtt_combatants
		where id = '70000000-0000-0000-0000-0000000000a1' returning 'x'$q$));
insert into _res values (13, 'jogador muda rodada e vez', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_scenes
		set combat_round = 2,
			combat_turn_id = '70000000-0000-0000-0000-0000000000a1'
		where id = '40000000-0000-0000-0000-0000000000a1'
		returning 'x'$q$));
insert into _res values (14, 'mestre define rodada e vez', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$update public.vtt_scenes
		set combat_round = 1,
			combat_turn_id = '70000000-0000-0000-0000-0000000000a1'
		where id = '40000000-0000-0000-0000-0000000000a1'
		returning 'x'$q$));

-- Dono de outra campanha: nada. Mestre de A não prende token da cena de B.
insert into _res values (15, 'dono de outra campanha lê', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000b1',
	$q$select count(*)::text from public.vtt_combatants having count(*) > 0$q$));
insert into _res values (16, 'dono de outra campanha cria na cena de A', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000b1',
	$q$insert into public.vtt_combatants (scene_id, token_id, sort_key)
		values (
			'40000000-0000-0000-0000-0000000000a1',
			'60000000-0000-0000-0000-0000000000a6',
			6
		) returning 'x'$q$));
insert into _res values (17, 'mestre não prende token de outra campanha', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$insert into public.vtt_combatants (scene_id, token_id, sort_key)
		values (
			'40000000-0000-0000-0000-0000000000a1',
			'60000000-0000-0000-0000-0000000000b1',
			9
		) returning 'x'$q$));

-- Anônimo: select vazio ou sem permissão, insert recusado. Iniciativa 101 cai no check.
insert into _res values (18, 'anônimo lê', 'bloqueado', pg_temp.as_user(
	null, $q$select count(*)::text from public.vtt_combatants having count(*) > 0$q$));
insert into _res values (19, 'anônimo cria', 'bloqueado', pg_temp.as_user(
	null,
	$q$insert into public.vtt_combatants (scene_id, token_id, sort_key)
		values (
			'40000000-0000-0000-0000-0000000000a1',
			'60000000-0000-0000-0000-0000000000a6',
			6
		) returning 'x'$q$));
insert into _res values (20, 'iniciativa 101 é recusada', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$update public.vtt_combatants set initiative = 101
		where id = '70000000-0000-0000-0000-0000000000a1' returning 'x'$q$));

select n, cenario, esperado, obtido,
	case when esperado = obtido then 'ok' else 'FALHOU' end as resultado
from _res order by n;

do $$
declare v int;
begin
	select count(*) into v from _res where esperado <> obtido;
	if v > 0 then
		raise exception '0051: % cenário(s) falharam', v;
	end if;
	raise notice '0051: todos os cenários passaram';
end $$;

rollback;
