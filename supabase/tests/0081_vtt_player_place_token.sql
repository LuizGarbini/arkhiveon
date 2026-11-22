-- Teste SQL da 0081 (jogador coloca token). SÓ Postgres local descartável.
-- Rodar com scripts/test-0081-local.sh: bootstrap → parte "antes" → 0081 →
-- este arquivo. Tudo em transação com ROLLBACK no fim. Contas sintéticas.
--
-- Contas: A = mestre (owner C1), B = jogador (viewer C1), P = outro jogador
-- (viewer C1), E = co-mestre (editor C1), O = de fora (owner de C2, mundo W2).
\set ON_ERROR_STOP on
\set QUIET on
begin;

-- Identidades e “login” por claims, como o PostgREST faz.
create or replace function pg_temp.login(p_sub text) returns void language plpgsql as $$
begin
	perform set_config('role', 'none', true);
	if p_sub is null then
		perform set_config('request.jwt.claims', '', true);
		perform set_config('role', 'anon', true);
	else
		perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
		perform set_config('role', 'authenticated', true);
	end if;
end $$;

insert into auth.users (id) values
	('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b1'),
	('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000e1'),
	('00000000-0000-0000-0000-0000000000f1');

insert into public.campaigns (id, owner_id, name, world_id) values
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'C1', '20000000-0000-0000-0000-000000000001'),
	('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'C1b (mesmo mundo)', '20000000-0000-0000-0000-000000000001'),
	('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f1', 'C2', '20000000-0000-0000-0000-000000000002');

insert into public.memberships (campaign_id, user_id, role) values
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'viewer'),
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'viewer'),
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f1', 'owner');

insert into public.vtt_scenes (id, campaign_id, name, width, height, is_active) values
	('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Publicada', 2000, 1500, true),
	('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Rascunho', 2000, 1500, false),
	('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Outra campanha', 2000, 1500, true);

-- Fichas de C1 (de P, salvo indicação) e uma de C2.
insert into public.characters (id, user_id, created_by, campaign_id, name, system, data) values
	('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'Lyra', 'dnd5e',
		'{"characterName":"Lyra","share":"table","imageUrl":"https://cdn.example.invalid/lyra.png","health":20,"healthMax":24}'),
	('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'Privada staff', 'dnd5e',
		'{"characterName":"Privada staff","share":"staff"}'),
	('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'Escolhida para E', 'dnd5e',
		'{"characterName":"Escolhida para E","share":"chosen","sharedWith":["00000000-0000-0000-0000-0000000000e1"]}'),
	('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'Escolhida para B', 'dnd5e',
		'{"characterName":"Escolhida para B","share":"chosen","sharedWith":["00000000-0000-0000-0000-0000000000b1"],"imageAssetId":"asset-1","imageUrl":"https://cdn.example.invalid/vaza.png"}'),
	('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-000000000001', 'Para jogadores', 'ordem',
		'{"characterName":"Para jogadores","share":"players","health":9,"healthMax":12}'),
	('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-000000000001', 'Do B (staff)', 'dnd5e',
		'{"characterName":"Do B","share":"staff"}'),
	('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-000000000003', 'De C2', 'dnd5e',
		'{"characterName":"De C2","share":"table"}');

-- NPCs do mundo W1 (e um de W2).
insert into public.npcs (id, user_id, created_by, campaign_id, world_id, name, publication_scope, visibility, campaign_ids, data) values
	('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
		'Taverneiro', 'restricted', 'public', '{10000000-0000-0000-0000-000000000001}', '{"imageUrl":"https://cdn.example.invalid/taverneiro.png"}'),
	('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
		'Vilão secreto', 'restricted', 'master_secret', '{10000000-0000-0000-0000-000000000001}', '{}'),
	('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
		'Só staff', 'restricted', 'public', '{10000000-0000-0000-0000-000000000001}', '{"share":"staff"}'),
	('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
		'Só da C1b', 'restricted', 'public', '{10000000-0000-0000-0000-000000000002}', '{}'),
	('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
		'Outro mundo', 'global', 'public', '{}', '{}'),
	('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
		'Escolhido para B', 'restricted', 'public', '{10000000-0000-0000-0000-000000000001}', '{"share":"chosen","sharedWith":["00000000-0000-0000-0000-0000000000b1"]}');

-- Espera uma recusa com o SQLSTATE dado.
create or replace function pg_temp.expect_error(p_label text, p_sql text, p_code text) returns void language plpgsql as $$
begin
	begin
		execute p_sql;
	exception when others then
		if sqlstate = p_code then
			raise notice 'OK  negado  %  (%: %)', p_label, sqlstate, sqlerrm;
			return;
		end if;
		raise exception 'FALHOU %: esperava %, veio % (%)', p_label, p_code, sqlstate, sqlerrm;
	end;
	raise exception 'FALHOU %: era para negar (%), mas passou', p_label, p_code;
end $$;

-- Chama a RPC e devolve a linha.
create or replace function pg_temp.place(p_scene text, p_char text, p_npc text, p_x double precision default 100, p_y double precision default 100)
returns public.vtt_tokens language sql as $$
	select * from public.vtt_place_token(p_scene::uuid, p_char::uuid, p_npc::uuid, p_x, p_y);
$$;

------------------------------------------------------------------------------
-- N. Negações da conta B (jogador) e de quem não é da mesa
------------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error('N1 B · ficha privada só staff', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',null)$q$, '42501');
select pg_temp.expect_error('N2 B · ficha escolhida só para E', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003',null)$q$, '42501');
select pg_temp.expect_error('N3 B · NPC secreto (master_secret)', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001',null,'50000000-0000-0000-0000-000000000002')$q$, '42501');
select pg_temp.expect_error('N4 B · NPC share staff', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001',null,'50000000-0000-0000-0000-000000000003')$q$, '42501');
select pg_temp.expect_error('N5 B · NPC publicado só em outra campanha (C1b)', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001',null,'50000000-0000-0000-0000-000000000004')$q$, '42501');
select pg_temp.expect_error('N6 B · NPC de outro mundo', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001',null,'50000000-0000-0000-0000-000000000005')$q$, '42501');
select pg_temp.expect_error('N7 B · ficha de outra campanha', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000007',null)$q$, '42501');
select pg_temp.expect_error('N8 B · cena não publicada', $q$select pg_temp.place('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001',null)$q$, '42501');
select pg_temp.expect_error('N9 B · cena de campanha em que não está', $q$select pg_temp.place('30000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000007',null)$q$, '42501');
select pg_temp.expect_error('N10 B · ficha e NPC juntos', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001')$q$, '22023');
select pg_temp.expect_error('N11 B · sem origem', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001',null,null)$q$, '22023');
select pg_temp.expect_error('N12 B · fora da cena (x > largura)', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',null,5000,10)$q$, '22023');
select pg_temp.expect_error('N13 B · x = NaN', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',null,'NaN'::float8,10)$q$, '22023');
select pg_temp.expect_error('N14 B · nome/imagem do cliente (assinatura não aceita)', $q$select public.vtt_place_token(p_scene_id => '30000000-0000-0000-0000-000000000001', p_character_id => '40000000-0000-0000-0000-000000000001', p_name => 'Falso')$q$, '42883');
select pg_temp.expect_error('N15 B · INSERT direto em vtt_tokens (só a RPC)', $q$insert into public.vtt_tokens (scene_id, name, layer, controlled_by) values ('30000000-0000-0000-0000-000000000001','Atalho','token','["00000000-0000-0000-0000-0000000000b1"]')$q$, '42501');
select pg_temp.expect_error('N16 B · INSERT direto da própria ficha', $q$insert into public.vtt_tokens (scene_id, character_id, name, layer) values ('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000006','Do B','gm')$q$, '42501');

select pg_temp.login('00000000-0000-0000-0000-0000000000f1');
select pg_temp.expect_error('N17 O (de fora) · cena publicada da C1', $q$select pg_temp.place('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',null)$q$, '42501');
select pg_temp.expect_error('N18 O (de fora) · INSERT direto na C1', $q$insert into public.vtt_tokens (scene_id, name, controlled_by) values ('30000000-0000-0000-0000-000000000001','X','["00000000-0000-0000-0000-0000000000f1"]')$q$, '42501');

select pg_temp.login(null);
select pg_temp.expect_error('N19 anon · sem EXECUTE na RPC', $q$select public.vtt_place_token('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',null,1,1)$q$, '42501');
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error('N20 B · não chama os predicados internos', $q$select private.vtt_can_read_character('40000000-0000-0000-0000-000000000002')$q$, '42501');

------------------------------------------------------------------------------
-- P. O que a conta B consegue
------------------------------------------------------------------------------
do $$
declare t public.vtt_tokens;
begin
	-- P1: ficha compartilhada com a mesa (de outro jogador): nome e imagem do servidor.
	t := pg_temp.place('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', null, 140, 210);
	if t.name <> 'Lyra' or t.avatar_url is distinct from 'https://cdn.example.invalid/lyra.png'
		or t.layer <> 'token' or t.is_hidden or t.is_locked
		or t.placed_by <> '00000000-0000-0000-0000-0000000000b1'
		or t.controlled_by <> '["00000000-0000-0000-0000-0000000000b1"]'::jsonb
		or t.hp_current is not null or t.x <> 140 or t.y <> 210 then
		raise exception 'FALHOU P1: %', row_to_json(t);
	end if;
	raise notice 'OK  passou  P1 B · ficha compartilhada (table) → token %', row_to_json(t)::jsonb - 'id' - 'created_at' - 'updated_at';

	-- P2: ficha "chosen" para B com imagem de acervo: avatar fica nulo (sem vazar a URL).
	t := pg_temp.place('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', null);
	if t.name <> 'Escolhida para B' or t.avatar_url is not null then
		raise exception 'FALHOU P2: %', row_to_json(t);
	end if;
	raise notice 'OK  passou  P2 B · ficha escolhida para B; imagem de acervo não vira avatar_url';

	-- P3: ficha "players" num sistema em que o token guarda o PV (ordem).
	t := pg_temp.place('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', null);
	if t.hp_current <> 9 or t.hp_max <> 12 then
		raise exception 'FALHOU P3: %', row_to_json(t);
	end if;
	raise notice 'OK  passou  P3 B · ficha share players (ordem): PV 9/12 vindo da ficha';

	-- P4: a própria ficha, mesmo privada.
	t := pg_temp.place('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000006', null);
	raise notice 'OK  passou  P4 B · a própria ficha (share staff, criada por B)';

	-- P5: NPC público da campanha e NPC escolhido para B.
	t := pg_temp.place('30000000-0000-0000-0000-000000000001', null, '50000000-0000-0000-0000-000000000001');
	if t.name <> 'Taverneiro' or t.avatar_url <> 'https://cdn.example.invalid/taverneiro.png' or t.npc_id is null then
		raise exception 'FALHOU P5: %', row_to_json(t);
	end if;
	t := pg_temp.place('30000000-0000-0000-0000-000000000001', null, '50000000-0000-0000-0000-000000000006');
	raise notice 'OK  passou  P5 B · NPC público da campanha e NPC escolhido para B';
end $$;

-- Os tokens de B aparecem para o mestre e para o outro jogador (SELECT/Realtime).
do $$
declare n int;
begin
	perform pg_temp.login('00000000-0000-0000-0000-0000000000c1');
	select count(*) into n from public.vtt_tokens where placed_by = '00000000-0000-0000-0000-0000000000b1';
	if n <> 6 then raise exception 'FALHOU P6: P vê % tokens de B', n; end if;
	raise notice 'OK  passou  P6 o outro jogador vê os 6 tokens que B colocou';
end $$;

------------------------------------------------------------------------------
-- D/U. Remover e mexer: trava, placed_by e tokens dos outros
------------------------------------------------------------------------------
do $$
declare v_tok uuid; v_other uuid; n int;
begin
	-- Token colocado por P (de P), para B tentar apagar.
	perform pg_temp.login('00000000-0000-0000-0000-0000000000c1');
	select id into v_other from pg_temp.place('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', null, 300, 300);

	perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
	delete from public.vtt_tokens where id = v_other;
	get diagnostics n = row_count;
	if n <> 0 then raise exception 'FALHOU D1: B apagou token colocado por P'; end if;
	raise notice 'OK  negado  D1 B · apagar token que P colocou (0 linhas)';

	select id into v_tok from public.vtt_tokens where placed_by = '00000000-0000-0000-0000-0000000000b1' and npc_id = '50000000-0000-0000-0000-000000000001';
	begin
		update public.vtt_tokens set placed_by = '00000000-0000-0000-0000-0000000000c1' where id = v_tok;
		raise exception 'FALHOU U1: B trocou placed_by';
	exception when insufficient_privilege then
		raise notice 'OK  negado  U1 B · trocar placed_by (guard 42501)';
	end;
	begin
		update public.vtt_tokens set is_hidden = true where id = v_tok;
		raise exception 'FALHOU U2: B ocultou o token';
	exception when insufficient_privilege or check_violation then
		raise notice 'OK  negado  U2 B · ocultar o token que colocou';
	end;
	update public.vtt_tokens set x = 500 where id = v_tok;
	get diagnostics n = row_count;
	if n <> 1 then raise exception 'FALHOU U3: B não moveu o próprio token'; end if;
	raise notice 'OK  passou  U3 B · move o token que colocou';

	-- Mestre trava; B não apaga mais.
	perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
	update public.vtt_tokens set is_locked = true where id = v_tok;
	perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
	delete from public.vtt_tokens where id = v_tok;
	get diagnostics n = row_count;
	if n <> 0 then raise exception 'FALHOU D2: B apagou token travado'; end if;
	raise notice 'OK  negado  D2 B · apagar token travado pelo mestre (0 linhas)';

	-- Mestre destrava; B apaga o que colocou.
	perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
	update public.vtt_tokens set is_locked = false where id = v_tok;
	perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
	delete from public.vtt_tokens where id = v_tok;
	get diagnostics n = row_count;
	if n <> 1 then raise exception 'FALHOU D3: B não apagou o próprio token destravado'; end if;
	raise notice 'OK  passou  D3 B · apaga o token que colocou (destravado)';

	-- Mestre e co-mestre continuam inserindo direto.
	perform pg_temp.login('00000000-0000-0000-0000-0000000000e1');
	insert into public.vtt_tokens (scene_id, name, layer, is_hidden) values ('30000000-0000-0000-0000-000000000002', 'Emboscada', 'gm', true);
	perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
	insert into public.vtt_tokens (scene_id, name) values ('30000000-0000-0000-0000-000000000002', 'Goblin') returning placed_by into v_other;
	if v_other <> '00000000-0000-0000-0000-0000000000a1' then raise exception 'FALHOU G1: placed_by do mestre'; end if;
	raise notice 'OK  passou  G1 mestre e co-mestre inserem direto (rascunho, camada gm); placed_by = quem inseriu';

	-- Mestre também passa pela RPC, que vê o NPC secreto.
	perform pg_temp.place('30000000-0000-0000-0000-000000000001', null, '50000000-0000-0000-0000-000000000002');
	raise notice 'OK  passou  G2 mestre coloca o NPC secreto pela RPC';
end $$;

------------------------------------------------------------------------------
-- T. Guard do UPDATE: o jogador só move/gira e ajusta PV, tamanho, condições
------------------------------------------------------------------------------
do $$
declare v_tok uuid; n int; v_case record;
begin
	perform pg_temp.login('00000000-0000-0000-0000-0000000000b1');
	select id into v_tok from pg_temp.place('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', null, 700, 700);

	for v_case in
		select * from (values
			('T1 nome', $s$name = 'Outro nome'$s$),
			('T2 imagem', $s$avatar_url = 'https://evil.example.invalid/z.png'$s$),
			('T3 imagem apagada', $s$avatar_url = null$s$),
			('T4 visão', $s$vision_range = 60$s$),
			('T5 auras', $s$auras = '[{"radius":9}]'$s$),
			('T6 created_at', $s$created_at = now() - interval '1 day'$s$),
			('T7 camada', $s$layer = 'gm'$s$),
			('T8 controle', $s$controlled_by = '[]'$s$),
			('T9 placed_by', $s$placed_by = null$s$)
		) as t(label, set_clause)
	loop
		begin
			execute format('update public.vtt_tokens set %s where id = %L', v_case.set_clause, v_tok);
			raise exception 'FALHOU %: B conseguiu', v_case.label;
		exception when insufficient_privilege or check_violation then
			raise notice 'OK  negado  % · B não troca (%)', v_case.label, v_case.set_clause;
		end;
	end loop;

	update public.vtt_tokens set x = 770, y = 840 where id = v_tok;
	get diagnostics n = row_count;
	if n <> 1 then raise exception 'FALHOU T10: B não moveu'; end if;
	update public.vtt_tokens set rotation = 90 where id = v_tok;
	update public.vtt_tokens set elevation = 3 where id = v_tok;
	if (select rotation from public.vtt_tokens where id = v_tok) <> 90 then raise exception 'FALHOU T10: não girou'; end if;
	raise notice 'OK  passou  T10 B · move (x, y), gira (rotation) e muda elevação';
	update public.vtt_tokens set hp_current = 5, hp_max = 24, temp_hp = 2, conditions = '["prone"]', size_cells = 2 where id = v_tok;
	get diagnostics n = row_count;
	if n <> 1 then raise exception 'FALHOU T11: B não ajustou PV/condição/tamanho'; end if;
	raise notice 'OK  passou  T11 B · PV, PV temp., condições e tamanho (o que a UI do jogador já grava)';
	if (select name from public.vtt_tokens where id = v_tok) <> 'Lyra' then raise exception 'FALHOU T12: nome mudou'; end if;
	raise notice 'OK  passou  T12 nome e imagem seguem os do servidor depois de tudo';

	perform pg_temp.login('00000000-0000-0000-0000-0000000000a1');
	update public.vtt_tokens set name = 'Lyra (mestre)', avatar_url = 'https://cdn.example.invalid/m.png', vision_range = 12 where id = v_tok;
	get diagnostics n = row_count;
	if n <> 1 then raise exception 'FALHOU T13: mestre não trocou nome/imagem'; end if;
	perform pg_temp.login('00000000-0000-0000-0000-0000000000e1');
	update public.vtt_tokens set name = 'Lyra (co-mestre)', avatar_url = 'https://cdn.example.invalid/e.png', auras = '[]' where id = v_tok;
	get diagnostics n = row_count;
	if n <> 1 then raise exception 'FALHOU T13: co-mestre não trocou nome/imagem'; end if;
	raise notice 'OK  passou  T13 mestre e co-mestre trocam nome, imagem, visão e auras';
end $$;

------------------------------------------------------------------------------
-- R. Paridade: o predicado da RPC = o SELECT com RLS, para cada conta
------------------------------------------------------------------------------
do $$
declare
	v_user text;
	v_id uuid;
	v_rls boolean;
	v_rpc boolean;
	v_checked int := 0;
begin
	foreach v_user in array array[
		'00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
		'00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1',
		'00000000-0000-0000-0000-0000000000f1'
	] loop
		perform set_config('role', 'none', true);
		for v_id in select id from public.characters union all select id from public.npcs loop
			perform pg_temp.login(v_user);
			v_rls := exists (select 1 from public.characters where id = v_id)
				or exists (select 1 from public.npcs where id = v_id);
			perform set_config('role', 'none', true);
			v_rpc := private.vtt_can_read_character(v_id) or private.vtt_can_read_npc(v_id);
			if v_rls <> v_rpc then
				raise exception 'FALHOU R: conta % / origem % → RLS %, RPC %', v_user, v_id, v_rls, v_rpc;
			end if;
			v_checked := v_checked + 1;
		end loop;
	end loop;
	raise notice 'OK  paridade  R1 % pares conta×origem: predicado da RPC = SELECT com RLS', v_checked;
end $$;

select set_config('role', 'none', true);
select '0081: todos os cenários passaram' as resultado \gset
\echo :resultado
rollback;
