-- Bootstrap dos testes da S1a do Plano Pro (0082–0086).
-- Incluído por \ir de dentro de uma transação que termina em ROLLBACK.
-- SÓ Postgres local descartável: recusa conexão fora do loopback e banco
-- com campanha real. Contas sintéticas 00000000-…, e-mails @example.invalid.
--
-- Contas:
--   A  mestre Pro, campanhas A1 e A2          ...a1
--   E  co-mestre (editor) em A1               ...e1
--   J  jogador (viewer) em A1, plano free     ...f1
--   B  mestre free da campanha B1 (conta B)   ...b1
--   P  convite PENDENTE em A1, sem papel      ...d1
--   R  convite ACEITO em A1, mas removido     ...c1
--   X  sem vínculo nenhum                     ...99

do $$
declare
	v_addr inet := inet_server_addr();
begin
	if v_addr is not null and host(v_addr) not in ('127.0.0.1', '::1') then
		raise exception 'conexão recusada: não é socket local nem loopback';
	end if;
	if exists (select 1 from public.campaigns) then
		raise exception 'Banco tem campanha: rode só em Postgres local descartável.';
	end if;
	if to_regclass('public.storage_objects') is null then
		raise exception 'storage_objects não existe: aplique 0082–0086 no banco local antes';
	end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
	('00000000-0000-0000-0000-0000000000a1', 'mestre-a@example.invalid', '{"full_name":"Mestre A"}'),
	('00000000-0000-0000-0000-0000000000e1', 'editor-a@example.invalid', '{}'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador-a@example.invalid', '{}'),
	('00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid', '{"full_name":"Mestre B"}'),
	('00000000-0000-0000-0000-0000000000d1', 'pendente@example.invalid', '{}'),
	('00000000-0000-0000-0000-0000000000c1', 'removido@example.invalid', '{}'),
	('00000000-0000-0000-0000-000000000099', 'fora@example.invalid', '{}');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),
	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B');

-- O trigger da 0059 cria a membership owner de cada campanha.
insert into public.campaigns (id, owner_id, world_id, name) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Campanha A1'),
	('20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'Campanha A2'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b1', 'Campanha B1');

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer');

insert into public.invites (campaign_id, email, role, status, invited_by) values
	('20000000-0000-0000-0000-0000000000a1', 'pendente@example.invalid', 'viewer', 'pending', '00000000-0000-0000-0000-0000000000a1'),
	('20000000-0000-0000-0000-0000000000a1', 'removido@example.invalid', 'viewer', 'accepted', '00000000-0000-0000-0000-0000000000a1');

insert into public.user_plans (user_id, plan) values
	('00000000-0000-0000-0000-0000000000a1', 'pro');

-- Entra como a conta (authenticated + claims) ou volta a postgres.
create or replace function pg_temp.claims(p_user text, p_email text)
returns void language sql as $$
	select set_config('request.jwt.claims', json_build_object('sub', p_user, 'email', p_email, 'role', 'authenticated')::text, true);
	select set_config('request.jwt.claim.sub', p_user, true);
$$;
