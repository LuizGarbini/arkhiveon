-- Teste da migration 0043 (SELECT de characters, sessions e activity_log por campanha).
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0043 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0043_select_policies_campaign_scope.sql
-- Saída esperada: linhas "ok N: ..." e "0043: todos os cenários passaram".
-- Antes da 0043 o cenário 2 falha (membro de B vê as linhas de A).

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- A = membro só da campanha A, B = membro só da campanha B
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-00000000aaa1', 'a@teste.local'),
	('00000000-0000-0000-0000-00000000bbb1', 'b@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', 'Mundo A'),
	('10000000-0000-0000-0000-00000000bbb1', '00000000-0000-0000-0000-00000000bbb1', 'Mundo B');

insert into public.campaigns (id, owner_id, name, world_id) values
	('20000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', 'Campanha A', '10000000-0000-0000-0000-00000000aaa1'),
	('20000000-0000-0000-0000-00000000bbb1', '00000000-0000-0000-0000-00000000bbb1', 'Campanha B', '10000000-0000-0000-0000-00000000bbb1');

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', 'owner'),
	('20000000-0000-0000-0000-00000000bbb1', '00000000-0000-0000-0000-00000000bbb1', 'owner')
on conflict do nothing;

-- Linhas só na campanha A (como postgres, sem RLS).
insert into public.characters (campaign_id, user_id, created_by, name)
values ('20000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', 'Ficha A');
insert into public.sessions (campaign_id, user_id, created_by, title)
values ('20000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', 'Sessão A');
insert into public.activity_log (campaign_id, user_id, created_by, action, entity_kind, entity_id)
values ('20000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-00000000aaa1', 'create', 'character', gen_random_uuid());

create temp table _rls_counts (cenario text, quem text, characters int, sessions int, activity_log int);
grant all on _rls_counts to authenticated, anon;

-- membro de A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000aaa1","role":"authenticated"}';
insert into _rls_counts select '1', 'membro de A',
	(select count(*) from public.characters), (select count(*) from public.sessions), (select count(*) from public.activity_log);

-- membro de B
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000bbb1","role":"authenticated"}';
insert into _rls_counts select '2', 'membro de B',
	(select count(*) from public.characters), (select count(*) from public.sessions), (select count(*) from public.activity_log);

-- anon
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
insert into _rls_counts select '3', 'anon',
	(select count(*) from public.characters), (select count(*) from public.sessions), (select count(*) from public.activity_log);
reset role;

select cenario, quem, characters, sessions, activity_log from _rls_counts order by cenario;

do $$
declare r record;
begin
	select * into r from _rls_counts where cenario = '1';
	if (r.characters, r.sessions, r.activity_log) <> (1, 1, 1) then
		raise exception 'falhou 1: membro de A deveria ver 1/1/1, viu %/%/%', r.characters, r.sessions, r.activity_log;
	end if;
	raise notice 'ok 1: membro de A vê as linhas da própria campanha';

	select * into r from _rls_counts where cenario = '2';
	if (r.characters, r.sessions, r.activity_log) <> (0, 0, 0) then
		raise exception 'falhou 2: membro de B vê linhas da campanha A (%/%/%)', r.characters, r.sessions, r.activity_log;
	end if;
	raise notice 'ok 2: membro de B não vê nada da campanha A';

	select * into r from _rls_counts where cenario = '3';
	if (r.characters, r.sessions, r.activity_log) <> (0, 0, 0) then
		raise exception 'falhou 3: anon vê linhas (%/%/%)', r.characters, r.sessions, r.activity_log;
	end if;
	raise notice 'ok 3: anon não vê nada';
	raise notice '0043: todos os cenários passaram';
end $$;

rollback;
