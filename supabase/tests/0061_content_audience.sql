-- Teste da 0061. RODAR SÓ EM POSTGRES DESCARTÁVEL. Tudo com ROLLBACK.
-- Pré-requisito: migrations até a 0061.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0061_content_audience.sql
begin;

do $$ begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'gm@t.local'),
	('00000000-0000-0000-0000-0000000000a2', 'co@t.local'),
	('00000000-0000-0000-0000-0000000000a3', 'p1@t.local'),
	('00000000-0000-0000-0000-0000000000a4', 'p2@t.local');
insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo');
insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mesa', '10000000-0000-0000-0000-0000000000a1', 20);
insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3', 'viewer'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a4', 'viewer')
on conflict do nothing;

insert into public.characters (id, user_id, campaign_id, name, created_by, data) values
	('30000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'mesa', '00000000-0000-0000-0000-0000000000a1', '{"share":"table"}'),
	('30000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a1', '{"share":"staff"}'),
	('30000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'players', '00000000-0000-0000-0000-0000000000a1', '{"share":"players"}'),
	('30000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'chosen', '00000000-0000-0000-0000-0000000000a1', '{"share":"chosen","sharedWith":["00000000-0000-0000-0000-0000000000a3"]}');

insert into public.npcs (id, user_id, campaign_id, world_id, name, created_by, visibility, publication_scope, campaign_ids, data) values
	('40000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'npc-staff', '00000000-0000-0000-0000-0000000000a1', 'master_secret', 'restricted', array['20000000-0000-0000-0000-0000000000a1']::uuid[], '{"share":"staff"}'),
	('40000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'npc-one', '00000000-0000-0000-0000-0000000000a1', 'master_secret', 'restricted', array['20000000-0000-0000-0000-0000000000a1']::uuid[], '{"share":"chosen","sharedWith":["00000000-0000-0000-0000-0000000000a3"]}');

insert into public.image_assets (campaign_id, created_by, name, url, is_private, visible_to_co_gms, visible_to_players, visible_user_ids) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'img-one', 'https://pub.test/one.webp', true, false, false, array['00000000-0000-0000-0000-0000000000a3']::uuid[]),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'img-co', 'https://pub.test/co.webp', true, true, false, '{}'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'img-pl', 'https://pub.test/pl.webp', true, false, true, '{}');

create temp table _exp (viewer text, kind text, name text, ve boolean);
insert into _exp (viewer, kind, name, ve) values
	('GM', 'character', 'mesa', true),
	('GM', 'character', 'staff', true),
	('GM', 'character', 'players', true),
	('GM', 'character', 'chosen', true),
	('CO', 'character', 'mesa', true),
	('CO', 'character', 'staff', true),
	('CO', 'character', 'players', false),
	('CO', 'character', 'chosen', false),
	('P1', 'character', 'mesa', true),
	('P1', 'character', 'staff', false),
	('P1', 'character', 'players', true),
	('P1', 'character', 'chosen', true),
	('P2', 'character', 'players', true),
	('P2', 'character', 'chosen', false),
	('GM', 'npc', 'npc-staff', true),
	('CO', 'npc', 'npc-staff', true),
	('P1', 'npc', 'npc-staff', false),
	('P1', 'npc', 'npc-one', true),
	('P2', 'npc', 'npc-one', false),
	('CO', 'npc', 'npc-one', false),
	('P1', 'image', 'img-one', true),
	('P2', 'image', 'img-one', false),
	('CO', 'image', 'img-one', false),
	('GM', 'image', 'img-one', true),
	('CO', 'image', 'img-co', true),
	('P1', 'image', 'img-co', false),
	('P1', 'image', 'img-pl', true),
	('CO', 'image', 'img-pl', false);

create temp table _got (viewer text, kind text, name text);
grant all on _got to authenticated;

create function pg_temp.collect(p_tag text, p_uid text) returns void language plpgsql as $f$
begin
	perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	insert into _got select p_tag, 'character', name from public.characters;
	insert into _got select p_tag, 'npc', name from public.npcs;
	insert into _got select p_tag, 'image', name from public.image_assets;
	perform set_config('role', 'postgres', true);
end $f$;

select pg_temp.collect('GM', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.collect('CO', '00000000-0000-0000-0000-0000000000a2');
select pg_temp.collect('P1', '00000000-0000-0000-0000-0000000000a3');
select pg_temp.collect('P2', '00000000-0000-0000-0000-0000000000a4');

do $$
declare
	r record;
begin
	for r in
		select e.viewer, e.kind, e.name, e.ve, (g.name is not null) as got
		from _exp e
		left join _got g on g.viewer = e.viewer and g.kind = e.kind and g.name = e.name
		where e.ve is distinct from (g.name is not null)
	loop
		raise exception '0061 falhou: % % % esperado % obteve %', r.viewer, r.kind, r.name, r.ve, r.got;
	end loop;
end $$;

rollback;
