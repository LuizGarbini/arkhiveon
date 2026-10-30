-- Teste da 0054 (matriz quem vê o quê + escrita). RODAR SÓ EM POSTGRES DESCARTÁVEL.
-- Pré-requisito: migrations até a 0054 aplicadas. Tudo com ROLLBACK.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0054_image_assets_visibility.sql
begin;

do $$ begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- M mestre (campaigns.owner_id), G co-mestre (role owner), P1 (viewer) e P2 (editor) jogadores de A,
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
	('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'editor'),
	('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'owner'),
	('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000e', 'viewer'),
	('20000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', 'owner')
on conflict do nothing;

-- 15 imagens: uploader (M mestre | G co-mestre | P1 jogador) x 5 estados:
--   pub = pública; none = privada só o mestre; co = privada + co-mestres;
--   pl = privada + jogadores; copl = privada + co-mestres + jogadores.
insert into public.image_assets (campaign_id, created_by, name, url, is_private, visible_to_co_gms, visible_to_players)
select '20000000-0000-0000-0000-00000000000a', u.id, u.tag || '_' || s.st, 'https://pub.test/' || u.tag || s.st || '.webp', s.priv, s.co, s.pl
from (values ('00000000-0000-0000-0000-00000000000a'::uuid, 'M'), ('00000000-0000-0000-0000-00000000000b'::uuid, 'G'), ('00000000-0000-0000-0000-00000000000c'::uuid, 'P1')) u(id, tag),
	(values ('pub', false, false, false), ('none', true, false, false), ('co', true, true, false), ('pl', true, false, true), ('copl', true, true, true)) s(st, priv, co, pl);

-- Esperado: quem vê cada imagem (6 papéis x 15 imagens = 90 casos).
create temp table _exp (viewer text, img text, ve boolean);
insert into _exp
select vw, u || '_' || st, case
	when vw = 'M' then true                                   -- regra de ouro
	when u = vw then true                                     -- quem subiu
	when st = 'pub' then vw in ('G', 'P1', 'P2', 'W')         -- pública: mesa + mundo
	when vw = 'G' then st in ('co', 'copl')                   -- co-mestre
	when vw in ('P1', 'P2') then st in ('pl', 'copl')         -- jogadores (viewer e editor)
	else false                                                -- outra campanha / outro mundo
end
from unnest(array['M', 'G', 'P1', 'P2', 'W', 'E']) vw,
	unnest(array['M', 'G', 'P1']) u,
	unnest(array['pub', 'none', 'co', 'pl', 'copl']) st;

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
where e.ve <> (g.img is not null)
order by 1, 2;

do $$
declare n int;
begin
	select count(*) into n from _exp;
	if n <> 90 then raise exception '0054: matriz incompleta (% casos)', n; end if;
	if exists (
		select 1 from _exp e left join _got g on g.viewer = e.viewer and g.img = e.img
		where e.ve <> (g.img is not null)
	) then raise exception '0054: matriz de visibilidade FALHOU'; end if;
end $$;

-- Escrita e compatibilidade.
do $$
declare v_priv boolean; v_co boolean; v_pl boolean; n int;
begin
	perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000d', 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	-- Padrão público.
	insert into public.image_assets (campaign_id, created_by, name, url)
	values ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d', 'P2_novo', 'https://pub.test/p2.webp')
	returning is_private into v_priv;
	if v_priv then raise exception '0054: padrão não é público'; end if;
	-- Cliente antigo (só is_private) = regra atual: co-mestres sim, jogadores não.
	update public.image_assets set is_private = true where name = 'P2_novo'
	returning visible_to_co_gms, visible_to_players into v_co, v_pl;
	if not v_co or v_pl then raise exception '0054: defaults de compatibilidade errados'; end if;
	-- Jogador escolhe "só o mestre" na própria.
	update public.image_assets set visible_to_co_gms = false, visible_to_players = false where name = 'P2_novo';
	get diagnostics n = row_count;
	if n <> 1 then raise exception '0054: jogador não conseguiu privar a própria'; end if;
	-- Jogador não mexe na imagem de outra pessoa.
	update public.image_assets set is_private = false where name in ('P1_none', 'M_none', 'P1_pl');
	get diagnostics n = row_count;
	if n <> 0 then raise exception '0054: jogador alterou imagem de outra pessoa'; end if;
	perform set_config('role', 'postgres', true);

	-- Mestre continua vendo a "só o mestre" do jogador.
	perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	select count(*) into n from public.image_assets where name = 'P2_novo';
	if n <> 1 then raise exception '0054: jogador escondeu do mestre'; end if;
	perform set_config('role', 'postgres', true);

	-- Co-mestre não vê a "só o mestre" do jogador.
	perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
	perform set_config('role', 'authenticated', true);
	select count(*) into n from public.image_assets where name = 'P2_novo';
	if n <> 0 then raise exception '0054: co-mestre viu "só o mestre"'; end if;
	perform set_config('role', 'postgres', true);
end $$;

select '0054: 90 casos da matriz + escrita passaram' as resultado;
rollback;
