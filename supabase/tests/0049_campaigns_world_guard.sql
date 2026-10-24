-- Teste da migration 0049: campanha só entra em mundo próprio ou de co-mestre.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0049 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0049_campaigns_world_guard.sql
-- "permitido" = o comando alterou 1 linha.
--
-- Cenário espelha faerun: A é dono do mundo e de RISE OF TIAMAT; Q é editor
-- (co-mestre) de TIAMAT e dono de "QA Designer" em faerun; V é jogador (viewer)
-- de TIAMAT; B é de fora, com mundo e campanha próprios.

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'dono-faerun@teste.local'),
	('00000000-0000-0000-0000-0000000000c1', 'qa-comestre@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador@teste.local'),
	('00000000-0000-0000-0000-0000000000b1', 'de-fora@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'faerun'),
	('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Mundo do QA'),
	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'RISE OF TIAMAT', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'QA Designer (teste)', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Campanha B', '10000000-0000-0000-0000-0000000000b1', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer'),
	('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'owner'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner');

create temp table _res (n int, cenario text, esperado text, obtido text);
grant all on _res to authenticated, anon;

-- Sem RETURNING (aplicaria a policy de SELECT à linha nova).
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

-- campaigns.world_id é NOT NULL desde a 0025: null sempre cai no 23502, não no 42501.
-- Negados
insert into _res values (1, 'B (de fora): cria campanha em faerun pelo UUID', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$insert into public.campaigns (owner_id, name, world_id) values ('00000000-0000-0000-0000-0000000000b1', 'Intrusa', '10000000-0000-0000-0000-0000000000a1')$q$));
insert into _res values (2, 'B: move a própria campanha para faerun', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$update public.campaigns set world_id = '10000000-0000-0000-0000-0000000000a1' where id = '20000000-0000-0000-0000-0000000000b1'$q$));
insert into _res values (3, 'B: move a própria campanha para o mundo do QA', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$update public.campaigns set world_id = '10000000-0000-0000-0000-0000000000c1' where id = '20000000-0000-0000-0000-0000000000b1'$q$));
insert into _res values (4, 'V (jogador de TIAMAT): cria campanha em faerun', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$insert into public.campaigns (owner_id, name, world_id) values ('00000000-0000-0000-0000-0000000000f1', 'Do jogador', '10000000-0000-0000-0000-0000000000a1')$q$));
insert into _res values (5, 'Q (co-mestre de faerun): cria campanha no Mundo B', 'negado', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1',
	$q$insert into public.campaigns (owner_id, name, world_id) values ('00000000-0000-0000-0000-0000000000c1', 'Invasora', '10000000-0000-0000-0000-0000000000b1')$q$));

-- Permitidos
insert into _res values (10, 'B: cria campanha sem mundo (null): o guard deixa, o NOT NULL da 0025 barra', 'negado (23502', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$insert into public.campaigns (owner_id, name, world_id) values ('00000000-0000-0000-0000-0000000000b1', 'Sem mundo', null)$q$));
insert into _res values (11, 'B: cria campanha no próprio mundo', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$insert into public.campaigns (owner_id, name, world_id) values ('00000000-0000-0000-0000-0000000000b1', 'B2', '10000000-0000-0000-0000-0000000000b1')$q$));
insert into _res values (12, 'B: tira a própria campanha do mundo (null): o guard deixa, o NOT NULL da 0025 barra', 'negado (23502', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$update public.campaigns set world_id = null where id = '20000000-0000-0000-0000-0000000000b1'$q$));
insert into _res values (13, 'B: volta a própria campanha para o próprio mundo', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000b1',
	$q$update public.campaigns set world_id = '10000000-0000-0000-0000-0000000000b1' where id = '20000000-0000-0000-0000-0000000000b1'$q$));
insert into _res values (14, 'A (dono de faerun): cria campanha em faerun', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$insert into public.campaigns (owner_id, name, world_id) values ('00000000-0000-0000-0000-0000000000a1', 'Outra de A', '10000000-0000-0000-0000-0000000000a1')$q$));
insert into _res values (15, 'Q: renomeia QA Designer (world_id igual, em faerun)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1',
	$q$update public.campaigns set name = 'QA Designer (teste 2)' where id = '20000000-0000-0000-0000-0000000000c1'$q$));
insert into _res values (16, 'Q: grava world_id igual (faerun) na QA Designer', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1',
	$q$update public.campaigns set world_id = '10000000-0000-0000-0000-0000000000a1' where id = '20000000-0000-0000-0000-0000000000c1'$q$));
insert into _res values (17, 'Q: move QA Designer para o próprio mundo', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1',
	$q$update public.campaigns set world_id = '10000000-0000-0000-0000-0000000000c1' where id = '20000000-0000-0000-0000-0000000000c1'$q$));
insert into _res values (18, 'Q: volta QA Designer para faerun (co-mestre via TIAMAT)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1',
	$q$update public.campaigns set world_id = '10000000-0000-0000-0000-0000000000a1' where id = '20000000-0000-0000-0000-0000000000c1'$q$));
insert into _res values (19, 'Q: cria campanha nova em faerun (co-mestre)', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000c1',
	$q$insert into public.campaigns (owner_id, name, world_id) values ('00000000-0000-0000-0000-0000000000c1', 'Nova do QA', '10000000-0000-0000-0000-0000000000a1')$q$));
insert into _res values (20, 'A: renomeia RISE OF TIAMAT', 'permitido', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$update public.campaigns set name = 'RISE OF TIAMAT' where id = '20000000-0000-0000-0000-0000000000a1'$q$));

-- O guard em si aceita null (para não depender do NOT NULL).
do $$
declare ok boolean;
begin
	perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
	ok := public.can_attach_campaign_to_world(null);
	insert into _res values (22, 'helper: B com world_id null', 'permitido', case when ok then 'permitido' else 'negado' end);
	ok := public.can_attach_campaign_to_world('10000000-0000-0000-0000-0000000000a1');
	insert into _res values (23, 'helper: B com faerun', 'negado', case when ok then 'permitido' else 'negado' end);
end $$;

-- Sem auth.uid() (postgres/service_role) o trigger não interfere.
do $$
declare n bigint;
begin
	perform set_config('request.jwt.claims', '{}', true);
	update public.campaigns set world_id = '10000000-0000-0000-0000-0000000000a1' where id = '20000000-0000-0000-0000-0000000000b1';
	get diagnostics n = row_count;
	insert into _res values (21, 'postgres (sem auth.uid): move Campanha B para faerun', 'permitido', case when n = 1 then 'permitido' else 'negado' end);
end $$;

select n, cenario, esperado, obtido,
	case when obtido like esperado || '%' then 'ok' else 'FALHOU' end as status
from _res order by n;

do $$
begin
	if exists (select 1 from _res where obtido not like esperado || '%') then
		raise exception '0049: há cenário que falhou';
	end if;
	raise notice '0049: todos os cenários passaram';
end $$;

rollback;
