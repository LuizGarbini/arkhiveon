-- Teste da migration 0044 (entrada em campanha: link, convite e memberships).
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0044 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0044_memberships_join_and_invite_guard.sql
-- Saída: tabela cenário/esperado/obtido e "0044: todos os cenários passaram".
-- Antes da 0044 vários cenários saem com obtido diferente do esperado.

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- OA dono de A, OB dono de B, P convite pending A (viewer), E convite pending A
-- (viewer, usado no link), D convite recusado de B, R convite já aceito em A,
-- N sem convite.
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'oa@teste.local'),
	('00000000-0000-0000-0000-0000000000b1', 'ob@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'p@teste.local'),
	('00000000-0000-0000-0000-0000000000e1', 'e@teste.local'),
	('00000000-0000-0000-0000-0000000000d1', 'd@teste.local'),
	('00000000-0000-0000-0000-0000000000c1', 'r@teste.local'),
	('00000000-0000-0000-0000-000000000001', 'n@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),
	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Campanha B', '10000000-0000-0000-0000-0000000000b1', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'viewer')
on conflict do nothing;

insert into public.invites (id, campaign_id, email, role, status, invited_by) values
	('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1', 'p@teste.local', 'viewer', 'pending', '00000000-0000-0000-0000-0000000000a1'),
	('30000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000a1', 'e@teste.local', 'viewer', 'pending', '00000000-0000-0000-0000-0000000000a1'),
	('30000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000b1', 'd@teste.local', 'viewer', 'declined', '00000000-0000-0000-0000-0000000000b1'),
	('30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000a1', 'r@teste.local', 'viewer', 'accepted', '00000000-0000-0000-0000-0000000000a1');

create temp table _res (n int, cenario text, esperado text, obtido text);
grant all on _res to authenticated, anon;

-- Roda `p_sql` como o usuário dado e devolve 'ok:<resultado>' ou 'bloqueado'
-- (erro ou 0 linhas). Cada cenário é desfeito no fim (isolado dos outros).
create function pg_temp.as_user(p_uid text, p_email text, p_sql text)
returns text language plpgsql as $f$
declare v text; n bigint;
begin
	begin
		if p_uid is null then
			perform set_config('request.jwt.claims', '{"role":"anon"}', true);
			perform set_config('role', 'anon', true);
		else
			perform set_config('request.jwt.claims',
				json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text, true);
			perform set_config('role', 'authenticated', true);
		end if;
		execute p_sql into v;
		get diagnostics n = row_count;
		raise exception using errcode = 'P0099',
			message = case when n = 0 then 'bloqueado' else 'ok:' || coalesce(v, '') end;
	exception
		when sqlstate 'P0099' then
			perform set_config('role', 'postgres', true);
			return sqlerrm;
		when others then
			perform set_config('role', 'postgres', true);
			return 'bloqueado';
	end;
end $f$;

insert into _res values
(1, 'convite recusado de B insere owner em A', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000d1', 'd@teste.local',
	$q$insert into public.memberships (campaign_id, user_id, role) values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 'owner') returning role$q$));

insert into _res values
(2, 'convite pending A (viewer) insere owner em A', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1', 'p@teste.local',
	$q$insert into public.memberships (campaign_id, user_id, role) values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'owner') returning role$q$));

insert into _res values
(3, 'convite pending A (viewer) insere viewer em A', 'ok:viewer', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000f1', 'p@teste.local',
	$q$insert into public.memberships (campaign_id, user_id, role) values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer') returning role$q$));

insert into _res values
(4, 'reusar convite aceito: reabrir como pending', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000c1', 'r@teste.local',
	$q$update public.invites set status = 'pending' where id = '30000000-0000-0000-0000-0000000000c1' returning status$q$));

insert into _res values
(5, 'reusar convite aceito: virar editor', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000c1', 'r@teste.local',
	$q$update public.invites set role = 'editor', status = 'accepted' where id = '30000000-0000-0000-0000-0000000000c1' returning role$q$));

insert into _res values
(6, 'convidado move o convite para a campanha B', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1', 'e@teste.local',
	$q$update public.invites set campaign_id = '20000000-0000-0000-0000-0000000000b1' where id = '30000000-0000-0000-0000-0000000000e1' returning campaign_id::text$q$));

insert into _res values
(7, 'RPC de join sem convite (sem link valido)', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-000000000001', 'n@teste.local',
	$q$select role from public.join_campaign_via_link('20000000-0000-0000-0000-0000000000a1')$q$));

insert into _res values
(8, 'RPC de join com link (convite pending)', 'ok:viewer', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1', 'e@teste.local',
	$q$select role from public.join_campaign_via_link('20000000-0000-0000-0000-0000000000a1')$q$));

insert into _res values
(9, 'RPC de join chamada pelo owner', 'ok:owner', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1', 'oa@teste.local',
	$q$select role from public.join_campaign_via_link('20000000-0000-0000-0000-0000000000a1')$q$));

insert into _res values
(10, 'anon chama a RPC', 'bloqueado', pg_temp.as_user(
	null, null,
	$q$select role from public.join_campaign_via_link('20000000-0000-0000-0000-0000000000a1')$q$));

insert into _res values
(11, 'insert direto em memberships sem convite', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-000000000001', 'n@teste.local',
	$q$insert into public.memberships (campaign_id, user_id, role) values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'viewer') returning role$q$));

insert into _res values
(12, 'viewer atualiza o próprio papel para owner', 'bloqueado', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000c1', 'r@teste.local',
	$q$update public.memberships set role = 'owner' where user_id = '00000000-0000-0000-0000-0000000000c1' and campaign_id = '20000000-0000-0000-0000-0000000000a1' returning role$q$));

-- Fluxo legítimo de aceitar: convidado marca o próprio convite como accepted
-- (o trigger on_invite_accepted cria o membership com o papel do convite).
insert into _res values
(13, 'aceitar convite pending (update status)', 'ok:accepted', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000e1', 'e@teste.local',
	$q$update public.invites set status = 'accepted' where id = '30000000-0000-0000-0000-0000000000e1' returning status$q$));

insert into _res values
(14, 'owner troca papel de membro', 'ok:editor', pg_temp.as_user(
	'00000000-0000-0000-0000-0000000000a1', 'oa@teste.local',
	$q$update public.memberships set role = 'editor' where user_id = '00000000-0000-0000-0000-0000000000c1' and campaign_id = '20000000-0000-0000-0000-0000000000a1' returning role$q$));

select n, cenario, esperado, obtido,
	case when esperado = obtido then 'ok' else 'FALHOU' end as resultado
from _res order by n;

do $$
declare v int;
begin
	select count(*) into v from _res where esperado <> obtido;
	if v > 0 then
		raise exception '0044: % cenário(s) falharam', v;
	end if;
	raise notice '0044: todos os cenários passaram';
end $$;

rollback;
