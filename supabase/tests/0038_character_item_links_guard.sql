-- Teste da migration 0038 (trigger de vínculo ficha ↔ item), com a regra
-- atual (0039/0056): editor da campanha também vincula em ficha alheia.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL (supabase db start, container ou
-- PGlite). NUNCA no projeto de produção. Tudo roda numa transação com ROLLBACK.
--
-- Pré-requisito: schema do Supabase com as migrations até a 0038 aplicadas
-- (auth.uid(), worlds, campaigns, memberships, items, characters).
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0038_character_item_links_guard.sql
-- Saída esperada: 10 linhas "ok N: ..." e, no fim, "0038: todos os cenários passaram".

begin;

-- Trava de segurança: banco com fichas reais = não é descartável.
do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- Usuários: M = mestre, E = co-mestre (editor), V = jogador (viewer)
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-00000000000a', 'mestre@teste.local'),
	('00000000-0000-0000-0000-00000000000e', 'editor@teste.local'),
	('00000000-0000-0000-0000-00000000000f', 'viewer@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Mundo 1'),
	('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Mundo 2');

insert into public.campaigns (id, owner_id, name, world_id) values
	('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Campanha 1', '10000000-0000-0000-0000-000000000001'),
	('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Campanha 2', '10000000-0000-0000-0000-000000000002');

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'owner'),
	('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'editor'),
	('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'viewer')
on conflict do nothing;

-- Itens: espada (mundo 1), anel secreto (mundo 1), machado (mundo 2)
insert into public.items (id, user_id, created_by, campaign_id, world_id, name, visibility) values
	('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Espada longa +1', 'public'),
	('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Anel secreto', 'master_secret'),
	('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Machado do outro mundo', 'public');

-- Fichas: F_M criada pelo mestre; F_E criada pelo editor
insert into public.characters (id, user_id, created_by, campaign_id, name, data) values
	('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'Ficha do mestre',
		'{"health": 10, "inventoryList": [{"id": "corda", "name": "Corda", "location": "backpack"}]}'),
	('40000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000001', 'Ficha do editor',
		'{"health": 10, "inventoryList": []}');

create or replace function pg_temp.as_user(p_uid text) returns void language sql as $$
	select set_config('request.jwt.claims', case when p_uid is null then '' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
	select set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
$$;

create or replace function pg_temp.sword(p_entry text, p_loc text default 'equipped') returns jsonb language sql as $$
	select jsonb_build_object('id', p_entry, 'name', 'Espada longa +1', 'quantity', 1, 'location', p_loc,
		'category', 'weapon', 'campaignItemId', '30000000-0000-0000-0000-000000000001', 'proficient', true);
$$;

-- 1. Mestre vincula na ficha de outro (do editor) → passa
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
	update public.characters
		set data = jsonb_set(data, '{inventoryList}', (data->'inventoryList') || pg_temp.sword('m1'))
		where id = '40000000-0000-0000-0000-00000000000e';
	raise notice 'ok 1: mestre vincula em ficha alheia';
end $$;

-- 2. Editor vincula na própria ficha → passa
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
	update public.characters
		set data = jsonb_set(data, '{inventoryList}', (data->'inventoryList') || pg_temp.sword('e1'))
		where id = '40000000-0000-0000-0000-00000000000e';
	raise notice 'ok 2: editor vincula na própria ficha';
end $$;

-- 3. Editor vincula na ficha do mestre → passa (0039/#112: editor liberado)
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
	update public.characters
		set data = jsonb_set(data, '{inventoryList}', (data->'inventoryList') || pg_temp.sword('x'))
		where id = '40000000-0000-0000-0000-00000000000a';
	raise notice 'ok 3: editor vincula em ficha alheia';
end $$;

-- 4. Item de outro mundo → recusado (mesmo para o mestre)
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
	begin
		update public.characters
			set data = jsonb_set(data, '{inventoryList}', (data->'inventoryList') || jsonb_build_object(
				'id', 'axe', 'name', 'Machado', 'location', 'equipped',
				'campaignItemId', '30000000-0000-0000-0000-000000000003'))
			where id = '40000000-0000-0000-0000-00000000000a';
		raise exception 'FALHOU 4: item de outro mundo foi aceito';
	exception when insufficient_privilege then
		raise notice 'ok 4: item de outro mundo recusado';
	end;
end $$;

-- 5. Editor muda PV da ficha do editor que tem vínculo do mestre, e o mestre
--    muda PV da ficha alheia sem tocar vínculo → passa (resto da ficha livre)
do $$ begin
	-- dá um vínculo à ficha do mestre (como mestre)
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
	update public.characters
		set data = jsonb_set(data, '{inventoryList}', (data->'inventoryList') || pg_temp.sword('m2'))
		where id = '40000000-0000-0000-0000-00000000000a';
	-- editor (não é o criador) muda só o PV
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
	update public.characters
		set data = jsonb_set(data, '{health}', '3'::jsonb)
		where id = '40000000-0000-0000-0000-00000000000a';
	if (select data->>'health' from public.characters where id = '40000000-0000-0000-0000-00000000000a') <> '3' then
		raise exception 'FALHOU 5: PV não salvou';
	end if;
	raise notice 'ok 5: editor muda PV de ficha alheia sem tocar vínculo';
end $$;

-- 6. Jogador (viewer) tenta desvincular na ficha alheia → recusado
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
	begin
		update public.characters
			set data = jsonb_set(data, '{inventoryList}', '[]'::jsonb)
			where id = '40000000-0000-0000-0000-00000000000a';
		raise exception 'FALHOU 6: jogador desvinculou em ficha alheia';
	exception when insufficient_privilege then
		raise notice 'ok 6: jogador não desvincula em ficha alheia';
	end;
end $$;

-- 7. Jogador tenta "assumir" a ficha (created_by) e vincular no mesmo update → recusado
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
	begin
		update public.characters
			set created_by = '00000000-0000-0000-0000-00000000000f',
				data = jsonb_set(data, '{inventoryList}', (data->'inventoryList') || pg_temp.sword('y'))
			where id = '40000000-0000-0000-0000-00000000000a';
		raise exception 'FALHOU 7: troca de created_by liberou o vínculo';
	exception when insufficient_privilege then
		raise notice 'ok 7: created_by antigo é o que vale';
	end;
end $$;

-- 8. Editor tenta vincular item secreto na própria ficha → recusado
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
	begin
		update public.characters
			set data = jsonb_set(data, '{inventoryList}', (data->'inventoryList') || jsonb_build_object(
				'id', 'ring', 'name', 'Anel', 'location', 'equipped',
				'campaignItemId', '30000000-0000-0000-0000-000000000002'))
			where id = '40000000-0000-0000-0000-00000000000e';
		raise exception 'FALHOU 8: item secreto aceito para editor';
	exception when insufficient_privilege then
		raise notice 'ok 8: item secreto só o mestre vincula';
	end;
end $$;

-- 9. Editor troca o local do vínculo na própria ficha → passa
do $$ begin
	perform pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
	update public.characters
		set data = jsonb_set(data, '{inventoryList}', (
			select jsonb_agg(case when e->>'id' = 'e1' then jsonb_set(e, '{location}', '"backpack"') else e end)
			from jsonb_array_elements(data->'inventoryList') e))
		where id = '40000000-0000-0000-0000-00000000000e';
	raise notice 'ok 9: editor muda local do vínculo na própria ficha';
end $$;

-- 10. Sem usuário (service role / Edge Function) → passa
do $$ begin
	perform pg_temp.as_user(null);
	update public.characters
		set data = jsonb_set(data, '{inventoryList}', '[]'::jsonb)
		where id = '40000000-0000-0000-0000-00000000000a';
	raise notice 'ok 10: service role passa';
end $$;

do $$ begin raise notice '0038: todos os cenários passaram'; end $$;

rollback;
