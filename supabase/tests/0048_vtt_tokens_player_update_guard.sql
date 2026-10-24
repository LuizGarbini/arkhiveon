-- Teste da migration 0048: o jogador só mexe no que é dele no token.
-- Policy "GM or token controllers can update tokens" da 0035 (inalterada até 0045).
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0048 aplicadas (a 0046/0047 não são necessárias).
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0048_vtt_tokens_player_update_guard.sql
-- "permitido" = o UPDATE alterou 1 linha (conferido depois como postgres).

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- GM dono de A, V viewer (jogador) de A.
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'gm@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A', '10000000-0000-0000-0000-0000000000a1', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer');

insert into public.characters (id, campaign_id, name, user_id, created_by) values
	('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1', 'Ficha do jogador',
	 '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1');

insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Caverna', true);

-- T1: controlado pelo jogador (controlled_by). T2: ficha do jogador. T3/T4: de ninguém. T5: do GM.
insert into public.vtt_tokens (id, scene_id, name, controlled_by, character_id) values
	('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-0000000000a1', 'T1 controlado', '["00000000-0000-0000-0000-0000000000f1"]', null),
	('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-0000000000a1', 'T2 ficha', '[]', '30000000-0000-0000-0000-0000000000f1'),
	('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-0000000000a1', 'T3 alheio', '[]', null),
	('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-0000000000a1', 'T4 alheio', '[]', null),
	('60000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-0000000000a1', 'T5 do GM', '[]', null);

create temp table _res (n int, cenario text, esperado text, obtido text);
grant all on _res to authenticated, anon;

-- Sem RETURNING (o RETURNING aplicaria a policy de SELECT à linha nova e mascararia o resultado).
create function pg_temp.as_user(p_uid text, p_sql text)
returns text language plpgsql as $f$
declare n bigint;
begin
	perform set_config('request.jwt.claims',
		json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	begin
		execute p_sql;
		get diagnostics n = row_count;
	exception when others then
		perform set_config('role', 'postgres', true);
		return 'negado (' || sqlstate || ': ' || sqlerrm || ')';
	end;
	perform set_config('role', 'postgres', true);
	return case when n = 0 then 'negado (0 linhas)' else 'permitido' end;
end $f$;


-- Extra: outra cena da mesma campanha (inativa), campanha B com cena, outra ficha, um NPC.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'outro@teste.local');
insert into public.worlds (id, owner_user_id, name) values ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B');
insert into public.campaigns (id, owner_id, name, world_id, member_limit) values ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Campanha B', '10000000-0000-0000-0000-0000000000b1', 20);
insert into public.memberships (campaign_id, user_id, role) values ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.vtt_scenes (id, campaign_id, name, is_active) values
 ('40000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a1', 'Cena inativa A', false),
 ('40000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'Torre B', true);
insert into public.characters (id, campaign_id, name, user_id, created_by) values
 ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Ficha do GM', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1');
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (1, 'jogador: layer=gm no próprio token (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set layer = 'gm' where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (2, 'jogador: is_hidden no próprio token (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set is_hidden = true where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (3, 'jogador: layer=gm no token da própria ficha (T2)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set layer = 'gm' where id = '60000000-0000-0000-0000-000000000002'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (4, 'jogador: layer=gm em token alheio (T3)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set layer = 'gm' where id = '60000000-0000-0000-0000-000000000003'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (5, 'jogador: is_hidden em token alheio (T3)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set is_hidden = true where id = '60000000-0000-0000-0000-000000000003'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (6, 'jogador: dá controle a outro (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set controlled_by = controlled_by || '["00000000-0000-0000-0000-0000000000b1"]'::jsonb where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (7, 'jogador: zera controlled_by (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set controlled_by = '[]'::jsonb where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (8, 'jogador: trava o próprio token (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set is_locked = true where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (9, 'jogador: leva o token para outra cena da campanha (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set scene_id = '40000000-0000-0000-0000-0000000000a2' where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (10, 'jogador: leva o token para cena de outra campanha (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set scene_id = '40000000-0000-0000-0000-0000000000b1' where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (11, 'jogador: vincula a ficha do GM (T1)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set character_id = '30000000-0000-0000-0000-0000000000a1' where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (12, 'jogador: desvincula a própria ficha (T2)', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set npc_id = null, character_id = null where id = '60000000-0000-0000-0000-000000000002'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (13, 'jogador: move o próprio token (T1)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set x = 70, y = 140 where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (14, 'jogador: PV, condições e rotação do próprio token (T1)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set hp_current = 3, hp_max = 10, conditions = '["prone"]'::jsonb, rotation = 90 where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (15, 'jogador: move o token da própria ficha (T2)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$update public.vtt_tokens set x = 35 where id = '60000000-0000-0000-0000-000000000002'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (16, 'GM: controle e trava (T1)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$update public.vtt_tokens set controlled_by = '[]'::jsonb, is_locked = true where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (17, 'GM: camada e oculto (T1)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$update public.vtt_tokens set layer = 'gm', is_hidden = true where id = '60000000-0000-0000-0000-000000000001'$q$));
update public.vtt_tokens set controlled_by='["00000000-0000-0000-0000-0000000000f1"]', is_locked=false, layer='token', is_hidden=false, scene_id='40000000-0000-0000-0000-0000000000a1', character_id=null, x=0, hp_max=null where id='60000000-0000-0000-0000-000000000001';
insert into _res values (18, 'GM: cena e ficha (T1)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$update public.vtt_tokens set scene_id = '40000000-0000-0000-0000-0000000000a2', character_id = '30000000-0000-0000-0000-0000000000a1' where id = '60000000-0000-0000-0000-000000000001'$q$));

select n, cenario, esperado, obtido,
	case when obtido like esperado || '%' then 'ok' else 'FALHOU' end as status
from _res order by n;

do $$
begin
	if exists (select 1 from _res where obtido not like esperado || '%') then
		raise exception '0048: há cenário que falhou';
	end if;
	raise notice '0048: todos os cenários passaram';
end $$;

rollback;
