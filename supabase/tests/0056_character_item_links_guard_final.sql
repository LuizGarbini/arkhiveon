-- Teste da migration 0056 (vínculo ficha ↔ item, regra final + não-membro).
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo em transação com ROLLBACK.
-- Testa o gatilho direto (como postgres, sem RLS).
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0056_character_item_links_guard_final.sql
begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1','m@t.local'),('00000000-0000-0000-0000-0000000000c1','cogm@t.local'),
 ('00000000-0000-0000-0000-0000000000e1','ed@t.local'),('00000000-0000-0000-0000-0000000000f1','v@t.local'),
 ('00000000-0000-0000-0000-0000000000d1','dono@t.local'),('00000000-0000-0000-0000-0000000000b1','fora@t.local');
insert into public.worlds (id, owner_user_id, name) values ('11000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','W');
insert into public.campaigns (id, owner_id, name, world_id) values ('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','C','11000000-0000-0000-0000-000000000001');
insert into public.memberships (campaign_id,user_id,role) values
 ('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','owner'),
 ('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','owner'),
 ('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000e1','editor'),
 ('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000f1','viewer'),
 ('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1','viewer') on conflict do nothing;
insert into public.items (id,user_id,created_by,campaign_id,world_id,name,visibility) values
 ('31000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Espada','public'),
 ('31000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Anel secreto','master_secret');
insert into public.characters (id,user_id,created_by,campaign_id,name,data) values
 ('41000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d1','21000000-0000-0000-0000-000000000001','Ficha do jogador','{"inventoryList":[]}'),
 ('41000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000e1','21000000-0000-0000-0000-000000000001','Ficha do editor','{"inventoryList":[]}');
create function pg_temp.try(p_uid text, p_char uuid, p_item uuid, p_label text, p_expect boolean) returns void language plpgsql as $$
declare ok boolean := true; msg text := '';
begin
	perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
	perform set_config('request.jwt.claim.sub', p_uid, true);
	begin
		update public.characters
			set data = jsonb_build_object('inventoryList', jsonb_build_array(jsonb_build_object(
				'id', md5(p_label), 'campaignItemId', p_item, 'location', 'backpack')))
			where id = p_char;
	exception when insufficient_privilege then ok := false; msg := sqlerrm;
	end;
	if ok <> p_expect then
		raise exception 'FALHOU: % (esperado %, veio %) %', p_label,
			case when p_expect then 'passa' else 'recusa' end, case when ok then 'passa' else 'recusa' end, msg;
	end if;
	raise notice 'ok: % => %', p_label, case when ok then 'passa' else 'recusado' end;
	update public.characters set data = '{"inventoryList":[]}' where id = p_char and false;
end $$;

-- E = editor, D = jogador dono da ficha, A = mestre (dono da campanha), C = co-mestre, F = jogador, B = não-membro
select pg_temp.try('00000000-0000-0000-0000-0000000000e1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000001','editor vincula em ficha alheia', true);
select pg_temp.try('00000000-0000-0000-0000-0000000000e1','41000000-0000-0000-0000-0000000000e1','31000000-0000-0000-0000-000000000001','editor vincula na própria', true);
select pg_temp.try('00000000-0000-0000-0000-0000000000d1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000001','jogador dono vincula na própria', true);
select pg_temp.try('00000000-0000-0000-0000-0000000000a1','41000000-0000-0000-0000-0000000000e1','31000000-0000-0000-0000-000000000001','mestre (dono da campanha) vincula em ficha alheia', true);
select pg_temp.try('00000000-0000-0000-0000-0000000000c1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000001','co-mestre (owner) vincula em ficha alheia', true);
select pg_temp.try('00000000-0000-0000-0000-0000000000f1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000001','jogador vincula em ficha alheia', false);
select pg_temp.try('00000000-0000-0000-0000-0000000000b1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000001','não-membro vincula', false);
select pg_temp.try('00000000-0000-0000-0000-0000000000e1','41000000-0000-0000-0000-0000000000e1','31000000-0000-0000-0000-000000000002','editor vincula item secreto', false);
select pg_temp.try('00000000-0000-0000-0000-0000000000d1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000002','jogador vincula item secreto na própria', false);
select pg_temp.try('00000000-0000-0000-0000-0000000000b1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000002','não-membro vincula item secreto', false);
select pg_temp.try('00000000-0000-0000-0000-0000000000c1','41000000-0000-0000-0000-0000000000d1','31000000-0000-0000-0000-000000000002','co-mestre vincula item secreto', true);

do $$ begin raise notice '0056: todos os cenários passaram'; end $$;

rollback;
