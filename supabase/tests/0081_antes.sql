-- Parte "antes" (prod sem a 0081): documenta o buraco que a 0081 fecha.
-- B (jogador) insere direto um token com nome/imagem livres, camada gm e
-- oculto, só por se pôr em controlled_by. Transação com ROLLBACK.
\set ON_ERROR_STOP on
\set QUIET on
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b1');
insert into public.campaigns (id, owner_id, world_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-000000000001');
insert into public.memberships (campaign_id, user_id, role) values
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'viewer');
insert into public.vtt_scenes (id, campaign_id, is_active) values ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1"}', true);
select set_config('role', 'authenticated', true);
insert into public.vtt_tokens (scene_id, name, avatar_url, layer, is_hidden, controlled_by)
values ('30000000-0000-0000-0000-000000000002', 'Qualquer nome', 'https://evil.example.invalid/x.png', 'gm', true, '["00000000-0000-0000-0000-0000000000b1"]');
update public.vtt_tokens set name = 'Renomeado por B', avatar_url = 'https://evil.example.invalid/y.png', vision_range = 99
where controlled_by @> '["00000000-0000-0000-0000-0000000000b1"]';
select 'ANTES da 0081: B inseriu direto (cena não publicada, camada gm, oculto, imagem própria) e depois trocou nome, imagem e visão do token — buracos confirmados' as resultado \gset
\echo :resultado
rollback;
