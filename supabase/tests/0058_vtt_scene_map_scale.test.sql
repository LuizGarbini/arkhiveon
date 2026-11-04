-- Teste da migration 0058: offset do grid e scale_scene_geometry.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Não aponta para nenhum Supabase remoto. Não usar supabase db push / db link.
-- Pré-requisito: migrations até a 0058 aplicadas no Postgres local
-- (inclui vtt_scenes, vtt_tokens, vtt_walls e user_campaign_role).
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0058_vtt_scene_map_scale.test.sql
-- Saída esperada: notices "OK N" e "0058: todos os cenários passaram".
--
-- Duas contas: owner (mestre) e viewer (jogador).
-- O owner grava grid_offset e chama a RPC (tokens e paredes escalam).
-- O jogador não altera grid_offset (RLS, 0 linhas) e a RPC levanta 42501.
-- anon não tem EXECUTE.
-- Offset igual à célula ou negativo viola vtt_scenes_grid_offset_range (23514).

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

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

insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Salão', true);

insert into public.vtt_tokens (id, scene_id, name, x, y) values
	('60000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 'Lyra', 100, 40);

insert into public.vtt_walls (id, scene_id, x1, y1, x2, y2) values
	('70000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', 10, 20, 30, 50);

create function pg_temp.as_user(p_uid text, p_sql text)
returns text language plpgsql as $f$
declare
	n bigint;
begin
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_uid, 'role', 'authenticated')::text,
		true
	);
	perform set_config('request.jwt.claim.sub', p_uid, true);
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

-- 1. Owner grava o offset. A policy 0035 deixa passar.
do $$
declare
	v_result text;
	v_x double precision;
	v_y double precision;
begin
	v_result := pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$update public.vtt_scenes
			set grid_offset_x = 12, grid_offset_y = 7
			where id = '40000000-0000-0000-0000-0000000000a1'$q$
	);
	if v_result is distinct from 'permitido' then
		raise exception 'falhou 1: owner update %', v_result;
	end if;
	select grid_offset_x, grid_offset_y into v_x, v_y
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a1';
	if v_x is distinct from 12 or v_y is distinct from 7 then
		raise exception 'falhou 1: offset ficou % / %', v_x, v_y;
	end if;
	raise notice 'OK 1: owner grava grid_offset 12/7';
end $$;

-- 2. Owner chama a RPC. Token e parede dobram; map_scale vai a 2. Atômico.
do $$
declare
	v_result text;
	v_tx double precision;
	v_ty double precision;
	v_x1 double precision;
	v_y1 double precision;
	v_x2 double precision;
	v_y2 double precision;
	v_scale double precision;
begin
	v_result := pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.scale_scene_geometry(
			'40000000-0000-0000-0000-0000000000a1',
			2
		)$q$
	);
	if v_result is distinct from 'permitido' then
		raise exception 'falhou 2: owner RPC %', v_result;
	end if;
	select x, y into v_tx, v_ty
	from public.vtt_tokens
	where id = '60000000-0000-0000-0000-0000000000a1';
	select x1, y1, x2, y2 into v_x1, v_y1, v_x2, v_y2
	from public.vtt_walls
	where id = '70000000-0000-0000-0000-0000000000a1';
	select map_scale into v_scale
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a1';
	if v_tx is distinct from 200 or v_ty is distinct from 80
		or v_x1 is distinct from 20 or v_y1 is distinct from 40
		or v_x2 is distinct from 60 or v_y2 is distinct from 100
		or v_scale is distinct from 2
	then
		raise exception 'falhou 2: token %,% parede %,%-% ,% escala %',
			v_tx, v_ty, v_x1, v_y1, v_x2, v_y2, v_scale;
	end if;
	raise notice 'OK 2: owner escala tokens e paredes e grava map_scale 2';
end $$;

-- 3. Jogador (viewer) não atualiza grid_offset: RLS devolve 0 linhas.
do $$
declare
	v_result text;
	v_x double precision;
	v_y double precision;
begin
	v_result := pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000f1',
		$q$update public.vtt_scenes
			set grid_offset_x = 99, grid_offset_y = 99
			where id = '40000000-0000-0000-0000-0000000000a1'$q$
	);
	if v_result is distinct from 'negado (0 linhas)' then
		raise exception 'falhou 3: jogador update %', v_result;
	end if;
	select grid_offset_x, grid_offset_y into v_x, v_y
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a1';
	if v_x is distinct from 12 or v_y is distinct from 7 then
		raise exception 'falhou 3: offset mudou para % / %', v_x, v_y;
	end if;
	raise notice 'OK 3: jogador não grava grid_offset (0 linhas, RLS)';
end $$;

-- 4. Jogador chama a RPC e leva 42501. Geometria intacta.
do $$
declare
	v_result text;
	v_tx double precision;
	v_scale double precision;
begin
	v_result := pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.scale_scene_geometry(
			'40000000-0000-0000-0000-0000000000a1',
			2
		)$q$
	);
	if v_result is distinct from 'negado (42501: sem permissão)' then
		raise exception 'falhou 4: jogador RPC %', v_result;
	end if;
	select x into v_tx
	from public.vtt_tokens
	where id = '60000000-0000-0000-0000-0000000000a1';
	select map_scale into v_scale
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a1';
	if v_tx is distinct from 200 or v_scale is distinct from 2 then
		raise exception 'falhou 4: geometria mudou token % escala %', v_tx, v_scale;
	end if;
	raise notice 'OK 4: jogador na RPC leva 42501 e nada escala';
end $$;

-- 5. Fator que estouraria map_scale (2 * 5 = 10) não grava nada.
do $$
declare
	v_result text;
	v_scale double precision;
	v_tx double precision;
begin
	v_result := pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.scale_scene_geometry(
			'40000000-0000-0000-0000-0000000000a1',
			5
		)$q$
	);
	if v_result is distinct from 'negado (22023: fator inválido)' then
		raise exception 'falhou 5: fator 5 %', v_result;
	end if;
	select map_scale into v_scale
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a1';
	select x into v_tx
	from public.vtt_tokens
	where id = '60000000-0000-0000-0000-0000000000a1';
	if v_scale is distinct from 2 or v_tx is distinct from 200 then
		raise exception 'falhou 5: mudou escala % token %', v_scale, v_tx;
	end if;
	raise notice 'OK 5: fator que passaria de 8 não altera a cena';
end $$;

-- 6. anon sem EXECUTE. A chamada nem entra na função (42501 de privilégio).
do $$
declare
	v_sig text := 'public.scale_scene_geometry(uuid, double precision)';
begin
	if has_function_privilege('anon', v_sig, 'execute') then
		raise exception 'falhou 6: anon tem EXECUTE';
	end if;
	if has_function_privilege('public', v_sig, 'execute') then
		raise exception 'falhou 6: public tem EXECUTE';
	end if;
	if not has_function_privilege('authenticated', v_sig, 'execute') then
		raise exception 'falhou 6: authenticated sem EXECUTE';
	end if;
end $$;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
	begin
		perform public.scale_scene_geometry(
			'40000000-0000-0000-0000-0000000000a1',
			2
		);
		raise exception 'falhou 6: anon executou scale_scene_geometry';
	exception
		when insufficient_privilege then
			if sqlstate is distinct from '42501' then
				raise exception 'falhou 6: sqlstate %', sqlstate;
			end if;
	end;
end $$;

reset role;

do $$
declare
	v_scale double precision;
begin
	select map_scale into v_scale
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a1';
	if v_scale is distinct from 2 then
		raise exception 'falhou 6: anon mudou a escala para %', v_scale;
	end if;
	raise notice 'OK 6: anon sem EXECUTE e a chamada leva 42501';
end $$;

-- 7. Offset fora de [0, grid_size) viola o CHECK e não grava.
do $$
declare
	v_size double precision;
	v_x double precision;
	v_y double precision;
	v_result text;
	v_attempt text;
begin
	v_result := pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$update public.vtt_scenes
			set grid_size = 50
			where id = '40000000-0000-0000-0000-0000000000a1'$q$
	);
	if v_result is distinct from 'permitido' then
		raise exception 'falhou 7: owner não ajustou a célula %', v_result;
	end if;

	foreach v_attempt in array array[
		'grid_offset_x = 50',
		'grid_offset_x = -0.01',
		'grid_offset_y = 50',
		'grid_offset_y = -1'
	]
	loop
		v_result := pg_temp.as_user(
			'00000000-0000-0000-0000-0000000000a1',
			format(
				'update public.vtt_scenes set %s where id = %L',
				v_attempt,
				'40000000-0000-0000-0000-0000000000a1'
			)
		);
		if v_result not like 'negado (23514:%vtt_scenes_grid_offset_range%' then
			raise exception 'falhou 7: % devolveu %', v_attempt, v_result;
		end if;
	end loop;

	select grid_size, grid_offset_x, grid_offset_y
	into v_size, v_x, v_y
	from public.vtt_scenes
	where id = '40000000-0000-0000-0000-0000000000a1';
	if v_size is distinct from 50 or v_x is distinct from 12 or v_y is distinct from 7 then
		raise exception 'falhou 7: cena mudou para célula % offset % / %', v_size, v_x, v_y;
	end if;
	raise notice 'OK 7: offset igual à célula ou negativo viola o CHECK';
end $$;

do $$
begin
	raise notice '0058: todos os cenários passaram';
end $$;

rollback;
