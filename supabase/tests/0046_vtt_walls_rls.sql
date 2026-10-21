-- Teste da migration 0046 (paredes da mesa): só o mestre lê e escreve.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0046 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0046_vtt_walls_rls.sql
-- Saída: tabela cenário/esperado/obtido e "0046: todos os cenários passaram".

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

-- Cena ativa (o jogador vê a cena, mas não as paredes).
insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Caverna', true),
	('40000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'Torre', true);

insert into public.vtt_walls (id, scene_id, x1, y1, x2, y2) values
	('50000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 0, 0, 70, 0);

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

-- Jogador (viewer da campanha): não lê, não cria, não muda, não apaga.
insert into _res values (1, 'jogador lê paredes da cena ativa', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$select count(*)::text from public.vtt_walls having count(*) > 0$q$));
insert into _res values (2, 'jogador cria parede', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$insert into public.vtt_walls (scene_id, x1, y1, x2, y2) values ('40000000-0000-0000-0000-0000000000a1', 0, 0, 0, 70) returning 'x'$q$));
insert into _res values (3, 'jogador move parede', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_walls set x2 = 140 where id = '50000000-0000-0000-0000-0000000000a1' returning 'x'$q$));
insert into _res values (4, 'jogador apaga parede', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1',
	$q$delete from public.vtt_walls where id = '50000000-0000-0000-0000-0000000000a1' returning 'x'$q$));

-- Dono de outra campanha e anônimo: nada.
insert into _res values (5, 'dono de outra campanha lê', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000b1',
	$q$select count(*)::text from public.vtt_walls having count(*) > 0$q$));
insert into _res values (6, 'dono de outra campanha cria na cena de A', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000b1',
	$q$insert into public.vtt_walls (scene_id, x1, y1, x2, y2) values ('40000000-0000-0000-0000-0000000000a1', 0, 0, 0, 70) returning 'x'$q$));
insert into _res values (7, 'anônimo lê', 'bloqueado', pg_temp.as_user(
	null, $q$select count(*)::text from public.vtt_walls having count(*) > 0$q$));

-- Mestre (owner) e editor: leem, criam, movem, apagam.
insert into _res values (8, 'mestre lê', 'ok:1', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$select count(*)::text from public.vtt_walls$q$));
insert into _res values (9, 'mestre cria', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$insert into public.vtt_walls (scene_id, x1, y1, x2, y2) values ('40000000-0000-0000-0000-0000000000a1', 0, 0, 0, 70) returning 'x'$q$));
insert into _res values (10, 'editor move', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1',
	$q$update public.vtt_walls set x2 = 140 where id = '50000000-0000-0000-0000-0000000000a1' returning 'x'$q$));
insert into _res values (11, 'editor não leva parede para cena de outra campanha', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1',
	$q$insert into public.vtt_walls (scene_id, x1, y1, x2, y2) select id, 0, 0, 0, 70 from public.vtt_scenes where campaign_id = '20000000-0000-0000-0000-0000000000b1' returning 'x'$q$));
insert into _res values (12, 'mestre apaga', 'ok:x', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$delete from public.vtt_walls where id = '50000000-0000-0000-0000-0000000000a1' returning 'x'$q$));
insert into _res values (13, 'segmento de comprimento zero é recusado', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1',
	$q$insert into public.vtt_walls (scene_id, x1, y1, x2, y2) values ('40000000-0000-0000-0000-0000000000a1', 5, 5, 5, 5) returning 'x'$q$));

select n, cenario, esperado, obtido,
	case when esperado = obtido then 'ok' else 'FALHOU' end as resultado
from _res order by n;

do $$
declare v int;
begin
	select count(*) into v from _res where esperado <> obtido;
	if v > 0 then
		raise exception '0046: % cenário(s) falharam', v;
	end if;
	raise notice '0046: todos os cenários passaram';
end $$;

rollback;
