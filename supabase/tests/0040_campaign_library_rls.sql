-- Teste da migration 0040 (metadados da Biblioteca + piloto).
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0040 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0040_campaign_library_rls.sql
-- Saída esperada: linhas "ok N: ..." e "0040: todos os cenários passaram".

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

-- 1: chave fora do padrão é recusada
do $$
begin
	begin
		insert into public.campaign_library_files (campaign_id, r2_key, title, size_bytes, uploaded_by)
		values ('20000000-0000-0000-0000-0000000000a1', 'outra/coisa.pdf', 'x', 10, '00000000-0000-0000-0000-0000000000a1');
		raise exception 'falhou 1: chave fora do padrão aceita';
	exception when check_violation then raise notice 'ok 1: chave fora do padrão recusada';
	end;
end $$;

-- 2: > 200 MB recusado (limite da 0042)
do $$
declare v_id uuid := gen_random_uuid();
begin
	begin
		insert into public.campaign_library_files (id, campaign_id, r2_key, title, size_bytes, uploaded_by)
		values (v_id, '20000000-0000-0000-0000-0000000000a1',
			'library/20000000-0000-0000-0000-0000000000a1/' || v_id || '.pdf', 'x', 209715201, '00000000-0000-0000-0000-0000000000a1');
		raise exception 'falhou 2: >200MB aceito';
	exception when check_violation then raise notice 'ok 2: >200 MB recusado';
	end;
end $$;

set local role authenticated;

-- 3: não-membro não vê nada
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
	if (select count(*) from public.campaign_library_files) <> 0 then raise exception 'falhou 3: não-membro vê arquivos'; end if;
	raise notice 'ok 3: não-membro vê 0 arquivos';
end $$;

-- 4: jogador vê só ready e não escreve
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';
do $$ begin
	if (select count(*) from public.campaign_library_files) <> 1 then raise exception 'falhou 4: jogador deveria ver só 1 (ready)'; end if;
	raise notice 'ok 4: jogador vê só o arquivo pronto';
end $$;
do $$ begin
	begin
		delete from public.campaign_library_files;
		raise exception 'falhou 5: jogador apagou';
	exception when insufficient_privilege then raise notice 'ok 5: jogador não apaga';
	end;
end $$;

-- 6: editor vê ready+pending mas também não escreve direto (só a função)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
do $$ begin
	if (select count(*) from public.campaign_library_files) <> 2 then raise exception 'falhou 6: editor deveria ver 2'; end if;
	raise notice 'ok 6: editor vê pronto + pendente';
end $$;
do $$ begin
	begin
		update public.campaign_library_files set status = 'ready';
		raise exception 'falhou 7: editor escreveu direto';
	exception when insufficient_privilege then raise notice 'ok 7: escrita direta bloqueada (só Edge Function)';
	end;
end $$;

-- 8: piloto visível para membro, invisível para não-membro
do $$ begin
	if (select count(*) from public.campaign_library_pilot_campaigns) <> 1 then raise exception 'falhou 8a'; end if;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$ begin
	if (select count(*) from public.campaign_library_pilot_campaigns) <> 0 then raise exception 'falhou 8b: não-membro vê piloto'; end if;
	raise notice 'ok 8: piloto só visível para membros';
end $$;

do $$ begin raise notice '0040: todos os cenários passaram'; end $$;

rollback;
