-- Teste da 0054 (matriz quem vê o quê + escrita). RODAR SÓ EM POSTGRES DESCARTÁVEL.
-- Pré-requisito: migrations até a 0054 aplicadas. Tudo com ROLLBACK.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0054_image_assets_visibility.sql
begin;

do $$ begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- M mestre (campaigns.owner_id), G co-mestre (role owner), P1/P2 jogadores de A,
-- W jogador da campanha B no mesmo mundo, E jogador de outro mundo.
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-00000000000a', 'm@t.local'),
	('00000000-0000-0000-0000-00000000000b', 'g@t.local'),
	('00000000-0000-0000-0000-00000000000c', 'p1@t.local'),
	('00000000-0000-0000-0000-00000000000d', 'p2@t.local'),
	('00000000-0000-0000-0000-00000000000e', 'w@t.local'),
	('00000000-0000-0000-0000-00000000000f', 'e@t.local');
insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Mundo'),
	('10000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', 'Outro');
insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'A', '10000000-0000-0000-0000-00000000000a', 20),
	('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'B', '10000000-0000-0000-0000-00000000000a', 20),
	('20000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', 'F', '10000000-0000-0000-0000-00000000000f', 20);
insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'owner'),
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'owner'),
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'viewer'),
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'viewer'),
	('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'owner'),
	('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000e', 'viewer'),
	('20000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', 'owner')
on conflict do nothing;

-- 8 imagens: (mestre | jogador P1) x (public | players | co_gm | gm_only).
insert into public.image_assets (campaign_id, created_by, name, url, visibility)
select '20000000-0000-0000-0000-00000000000a', u.id, u.tag || '_' || v, 'https://pub.test/' || u.tag || v || '.webp', v
from (values ('00000000-0000-0000-0000-00000000000a'::uuid, 'M'), ('00000000-0000-0000-0000-00000000000c'::uuid, 'P1')) u(id, tag),
	unnest(array['public', 'players', 'co_gm', 'gm_only']) v;

-- Esperado: quem vê cada imagem.
create temp table _exp (viewer text, img text, ve boolean);
insert into _exp
select vw, img, case
	when vw = 'M' then true                                   -- regra de ouro
	when split_part(img, '_', 1) = vw then true               -- quem subiu
	when img like '%gm_only' then false
	when img like '%co_gm' then vw = 'G'
	when img like '%players' then vw in ('G', 'P1', 'P2')
	else vw in ('G', 'P1', 'P2', 'W')                         -- public: mesa + mundo
end
from unnest(array['M', 'G', 'P1', 'P2', 'W', 'E']) vw,
	unnest(array['M_public', 'M_players', 'M_co_gm', 'M_gm_only', 'P1_public', 'P1_players', 'P1_co_gm', 'P1_gm_only']) img;

create temp table _got (viewer text, img text);
grant all on _got to authenticated;

create function pg_temp.collect(p_tag text, p_uid text) returns void language plpgsql as $f$
begin
	perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	insert into _got select p_tag, name from public.image_assets;
	perform set_config('role', 'postgres', true);
end $f$;

select pg_temp.collect('M', '00000000-0000-0000-0000-00000000000a');
select pg_temp.collect('G', '00000000-0000-0000-0000-00000000000b');
select pg_temp.collect('P1', '00000000-0000-0000-0000-00000000000c');
select pg_temp.collect('P2', '00000000-0000-0000-0000-00000000000d');
select pg_temp.collect('W', '00000000-0000-0000-0000-00000000000e');
select pg_temp.collect('E', '00000000-0000-0000-0000-00000000000f');

select e.viewer, e.img, e.ve as esperado, (g.img is not null) as obtido
from _exp e left join _got g on g.viewer = e.viewer and g.img = e.img
order by 1, 2;

do $$ begin
	if exists (
		select 1 from _exp e left join _got g on g.viewer = e.viewer and g.img = e.img
		where e.ve <> (g.img is not null)
	) then raise exception '0054: matriz de visibilidade FALHOU'; end if;
end $$;

-- Escrita: jogador sobe e priva a própria; não mexe na dos outros; is_private acompanha.
do $$
declare v_vis text; v_priv boolean; n int;
begin
	perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000d', 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	insert into public.image_assets (campaign_id, created_by, name, url)
	values ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'P2_novo', 'https://pub.test/p2.webp')
	returning visibility, is_private into v_vis, v_priv;
	if v_vis <> 'public' or v_priv then raise exception '0054: padrão não é público'; end if;
	update public.image_assets set visibility = 'co_gm' where name = 'P2_novo' returning is_private into v_priv;
	if not v_priv then raise exception '0054: is_private não acompanhou visibility'; end if;
	update public.image_assets set visibility = 'public' where name = 'P1_public';
	get diagnostics n = row_count;
	if n <> 0 then raise exception '0054: jogador alterou imagem de outro jogador'; end if;
	-- Cliente antigo (só is_private) vira co_gm para jogador.
	update public.image_assets set is_private = false where name = 'P2_novo';
	update public.image_assets set is_private = true where name = 'P2_novo' returning visibility into v_vis;
	if v_vis <> 'co_gm' then raise exception '0054: compat is_private falhou (%)', v_vis; end if;
	perform set_config('role', 'postgres', true);
end $$;

select '0054: todos os cenários passaram' as resultado;
rollback;
