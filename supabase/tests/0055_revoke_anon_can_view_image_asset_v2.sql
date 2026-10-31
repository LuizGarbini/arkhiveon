-- Teste da 0055 (anon sem EXECUTE; visibilidade da 0054 intacta). RODAR SÓ EM POSTGRES DESCARTÁVEL.
-- Pré-requisito: migrations até a 0055 aplicadas. Tudo com ROLLBACK.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0055_revoke_anon_can_view_image_asset_v2.sql
begin;

do $$ begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

do $$
declare
	v_sig text := 'public.can_view_image_asset_v2(uuid,uuid,boolean,boolean,boolean,uuid)';
	v_co text;
	v_pl text;
begin
	if to_regprocedure(v_sig) is null then
		raise exception '0055: função can_view_image_asset_v2 não existe';
	end if;

	if has_function_privilege('anon', v_sig, 'EXECUTE') then
		raise exception '0055: anon ainda tem EXECUTE em can_view_image_asset_v2';
	end if;
	if not has_function_privilege('authenticated', v_sig, 'EXECUTE') then
		raise exception '0055: authenticated não tem EXECUTE em can_view_image_asset_v2';
	end if;

	select pg_get_expr(d.adbin, d.adrelid) into v_co
	from pg_attribute a
	join pg_class c on c.oid = a.attrelid
	join pg_namespace n on n.oid = c.relnamespace
	join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
	where n.nspname = 'public'
		and c.relname = 'image_assets'
		and a.attname = 'visible_to_co_gms'
		and not a.attisdropped;

	select pg_get_expr(d.adbin, d.adrelid) into v_pl
	from pg_attribute a
	join pg_class c on c.oid = a.attrelid
	join pg_namespace n on n.oid = c.relnamespace
	join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
	where n.nspname = 'public'
		and c.relname = 'image_assets'
		and a.attname = 'visible_to_players'
		and not a.attisdropped;

	if v_co is distinct from 'true' then
		raise exception '0055: visible_to_co_gms deveria existir com default true (obteve %)', coalesce(v_co, 'ausente');
	end if;
	if v_pl is distinct from 'false' then
		raise exception '0055: visible_to_players deveria existir com default false (obteve %)', coalesce(v_pl, 'ausente');
	end if;
end $$;

-- Mestre (campaigns.owner_id) e jogador (viewer) na campanha A. Setup mínimo do 0054.
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-00000000000a', 'm@t.local'),
	('00000000-0000-0000-0000-00000000000c', 'p1@t.local');
insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Mundo');
insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'A', '10000000-0000-0000-0000-00000000000a', 20);
insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'owner'),
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'viewer')
on conflict do nothing;

-- Privada, visible_to_players = false: mestre vê, jogador não (caso "none" da 0054).
insert into public.image_assets (campaign_id, created_by, name, url, is_private, visible_to_co_gms, visible_to_players)
values (
	'20000000-0000-0000-0000-00000000000a',
	'00000000-0000-0000-0000-00000000000a',
	'M_none',
	'https://pub.test/Mnone.webp',
	true,
	false,
	false
);

do $$
declare n int;
begin
	-- set local role authenticated + request.jwt.claims (mesmo mecanismo do 0054).
	perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	select count(*) into n from public.image_assets where name = 'M_none';
	if n <> 1 then raise exception '0055: mestre não vê a imagem privada'; end if;
	perform set_config('role', 'postgres', true);

	perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000c', 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	select count(*) into n from public.image_assets where name = 'M_none';
	if n <> 0 then raise exception '0055: jogador viu imagem com visible_to_players=false'; end if;
	perform set_config('role', 'postgres', true);
end $$;

select '0055: anon sem EXECUTE, authenticated com EXECUTE, visibilidade da 0054 intacta' as resultado;
rollback;
