-- Teste da migration 0041 (campos preenchidos por pessoa).
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0041 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0041_campaign_library_form_values_rls.sql
-- Saída esperada: linhas "ok N: ..." e "0041: todos os cenários passaram".

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- M = mestre, E = editor, V = jogador, X = não-membro
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'mestre@teste.local'),
	('00000000-0000-0000-0000-0000000000e1', 'editor@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador@teste.local'),
	('00000000-0000-0000-0000-0000000000c1', 'fora@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo L');

insert into public.campaigns (id, owner_id, name, world_id) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha L', '10000000-0000-0000-0000-0000000000a1');

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer')
on conflict do nothing;

insert into public.campaign_library_pilot_campaigns (campaign_id)
values ('20000000-0000-0000-0000-0000000000a1');

-- Linhas como service role (postgres): uma ready, uma pending.
insert into public.campaign_library_files (id, campaign_id, r2_key, title, size_bytes, status, uploaded_by) values
	('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1',
	 'library/20000000-0000-0000-0000-0000000000a1/30000000-0000-0000-0000-0000000000a1.pdf', 'Pronto', 1000, 'ready', '00000000-0000-0000-0000-0000000000a1'),
	('30000000-0000-0000-0000-0000000000a2', '20000000-0000-0000-0000-0000000000a1',
	 'library/20000000-0000-0000-0000-0000000000a1/30000000-0000-0000-0000-0000000000a2.pdf', 'Pendente', 1000, 'pending', '00000000-0000-0000-0000-0000000000a1');


set local role authenticated;

-- 1: jogador grava e lê a própria cópia
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
insert into public.campaign_library_form_values (file_id, user_id, field_values)
values ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', '{"Nome":"Elbereth"}');
do $$ begin
	if (select count(*) from public.campaign_library_form_values) <> 1 then raise exception 'falhou 1'; end if;
	raise notice 'ok 1: jogador grava e lê a própria cópia';
end $$;

-- 2: jogador não grava em nome de outra pessoa
do $$ begin
	begin
		insert into public.campaign_library_form_values (file_id, user_id, field_values)
		values ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', '{}');
		raise exception 'falhou 2: gravou como outra pessoa';
	exception when insufficient_privilege then raise notice 'ok 2: não grava como outra pessoa';
	end;
end $$;

-- 3: PDF pendente não aceita valores
do $$ begin
	begin
		insert into public.campaign_library_form_values (file_id, user_id, field_values)
		values ('30000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', '{}');
		raise exception 'falhou 3: gravou em pendente';
	exception when insufficient_privilege then raise notice 'ok 3: pendente recusado';
	end;
end $$;

-- 4: editor não vê a cópia do jogador
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
do $$ begin
	if (select count(*) from public.campaign_library_form_values) <> 0 then raise exception 'falhou 4: editor vê cópia alheia'; end if;
	raise notice 'ok 4: cópias são privadas';
end $$;

-- 5: não-membro não grava
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
	begin
		insert into public.campaign_library_form_values (file_id, user_id, field_values)
		values ('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', '{}');
		raise exception 'falhou 5: não-membro gravou';
	exception when insufficient_privilege then raise notice 'ok 5: não-membro recusado';
	end;
end $$;

-- 6: campanha saiu do piloto -> some
reset role;
delete from public.campaign_library_pilot_campaigns where campaign_id = '20000000-0000-0000-0000-0000000000a1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
do $$ begin
	if (select count(*) from public.campaign_library_form_values) <> 0 then raise exception 'falhou 6: fora do piloto ainda visível'; end if;
	raise notice 'ok 6: fora do piloto nada aparece';
end $$;

do $$ begin raise notice '0041: todos os cenários passaram'; end $$;

rollback;
