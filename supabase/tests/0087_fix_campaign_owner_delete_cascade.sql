-- 0087: o dono exclui a campanha; self-leave do owner vivo continua 42501;
-- transferência de mestre continua passando; a conta B não exclui a campanha
-- nem a membership owner.
--
-- SOMENTE Postgres local descartável arkhiveon_0087. Transação termina em ROLLBACK.
-- Pré-requisito: bootstrap + migration 0087. Não aponta para staging/produção.
--
-- Uso: bash scripts/test-0087-local.sh
--   ou psql ... -d arkhiveon_0087 -v ON_ERROR_STOP=1 -f supabase/tests/0087_fix_campaign_owner_delete_cascade.sql

\set ON_ERROR_STOP on
\set VERBOSITY terse
set client_min_messages = warning;

begin;

do $$
begin
	if coalesce(inet_server_addr(), '127.0.0.1'::inet) <> '127.0.0.1'::inet
		or inet_server_port() <> 5432
		or current_database() <> 'arkhiveon_0087'
	then
		raise exception '0087: teste exige Postgres local e o banco arkhiveon_0087; remoto recusado';
	end if;
end $$;

do $$
begin
	if exists (select 1 from auth.users where id::text like '00000000-0000-0000-0000-0000000000%') then
		raise exception 'IDs sintéticos repetidos: use banco local vazio';
	end if;
end $$;

insert into auth.users(id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'owner-a@f87.local'),
	('00000000-0000-0000-0000-0000000000b1', 'player-b@f87.local'),
	('00000000-0000-0000-0000-0000000000e1', 'editor-e@f87.local');

-- C1: owner A + editor B (exclusão com membros + negação da conta B)
-- C2: owner A + editor E (transferência A → E)
-- C3: só owner A (caso 14, self-leave com campanha viva, e exclusão solo)
insert into public.campaigns(id, owner_id, name) values
	('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'Campanha com membros'),
	('20000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'Campanha transferência'),
	('20000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 'Campanha solo');

insert into public.memberships(campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'editor'),
	('20000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1', 'owner');

-- Sonda: no CASCADE, a linha de campaigns já não é visível no BEFORE DELETE
-- de memberships. Trigger com nome anterior ao guard para rodar primeiro.
create table pg_temp.cascade_probe (
	membership_role text not null,
	campaign_visible boolean not null
);

create function pg_temp.probe_campaign_visible()
returns trigger
language plpgsql
as $f$
begin
	insert into pg_temp.cascade_probe(membership_role, campaign_visible)
	values (
		old.role,
		exists (select 1 from public.campaigns c where c.id = old.campaign_id)
	);
	return old;
end;
$f$;

create trigger aaaa_0087_probe_campaign_visible
	before delete on public.memberships
	for each row execute function pg_temp.probe_campaign_visible();

grant insert, select on table pg_temp.cascade_probe to authenticated;
grant execute on function pg_temp.probe_campaign_visible() to authenticated;

create temp table _expect (
	n integer primary key,
	description text,
	allowed boolean,
	expected_state text,
	expected_message text
);
create temp table _actual (
	n integer primary key,
	state text,
	message text,
	value text,
	db_role text,
	jwt_uid uuid
);

insert into _expect(n, description, allowed, expected_state, expected_message) values
	(1, 'Conta B não exclui a campanha', true, '00000', null),
	(2, 'Conta B não exclui a membership owner', true, '00000', null),
	(3, 'Caso 14: owner não self-leave com a campanha viva', false, '42501', 'transferência de mestre não permitida'),
	(4, 'Transferência de mestre A para E continua passando', true, '00000', null),
	(5, 'Owner exclui campanha com membros', true, '00000', null),
	(6, 'Owner exclui campanha solo', true, '00000', null);

-- 1 e 2 são "allowed" no helper porque o DELETE autenticado da conta B
-- passa pela RLS e devolve 0 linhas (sem exceção). A recusa é assertada
-- depois, pelo que permaneceu no banco.

create function pg_temp.request(p_n integer, p_uid text, p_email text, p_sql text)
returns void
language plpgsql
security invoker
as $f$
declare
	value text;
	expected_allowed boolean;
	actual_role text;
	actual_uid uuid;
	target_role text;
	target_claims text;
begin
	select e.allowed into expected_allowed from _expect e where e.n = p_n;
	target_role := 'authenticated';
	target_claims := json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text;
	perform set_config('request.jwt.claims', target_claims, true);
	perform set_config('request.jwt.claim.sub', p_uid, true);
	execute format('set local role %I', target_role);
	begin
		actual_role := current_user;
		actual_uid := auth.uid();
		if actual_uid::text is distinct from p_uid or actual_role <> target_role then
			raise exception 'ERRTESTASSERT: wrong JWT/role for %', p_n;
		end if;
		execute p_sql into value;
		reset role;
		if not expected_allowed then
			raise exception 'ERRTESTASSERT: case % should deny', p_n;
		end if;
		insert into _actual values (p_n, '00000', null, coalesce(value, '∅'), actual_role, actual_uid);
	exception when others then
		reset role;
		if SQLSTATE = 'P0001' and SQLERRM like 'ERRTESTASSERT:%' then raise; end if;
		if expected_allowed then
			raise exception 'ERRTESTASSERT: case % allowed failed: %/%', p_n, SQLSTATE, SQLERRM;
		end if;
		insert into _actual values (p_n, SQLSTATE, SQLERRM, coalesce(value, '∅'), actual_role, actual_uid);
	end;
	reset role;
end;
$f$;

-- 1-2: conta B (jogador/editor) não apaga a campanha nem a membership owner.
select pg_temp.request(
	1,
	'00000000-0000-0000-0000-0000000000b1',
	'player-b@f87.local',
	$q$delete from public.campaigns where id='20000000-0000-0000-0000-0000000000c1' returning id::text$q$
);
select pg_temp.request(
	2,
	'00000000-0000-0000-0000-0000000000b1',
	'player-b@f87.local',
	$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c1' and role='owner' returning id::text$q$
);

-- 3: caso 14 da 0059, com a campanha ainda viva.
select pg_temp.request(
	3,
	'00000000-0000-0000-0000-0000000000a1',
	'owner-a@f87.local',
	$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c3' and user_id='00000000-0000-0000-0000-0000000000a1' returning id::text$q$
);

-- 4: transferência de mestre continua passando.
select pg_temp.request(
	4,
	'00000000-0000-0000-0000-0000000000a1',
	'owner-a@f87.local',
	$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000e1')$q$
);

-- Limpa a sonda do caso 14 (campanha ainda visível no self-leave recusado).
-- A prova do CASCADE vale só para os DELETE da campanha, casos 5 e 6.
delete from pg_temp.cascade_probe;

-- 5-6: o dono exclui campanha com membros e campanha solo.
select pg_temp.request(
	5,
	'00000000-0000-0000-0000-0000000000a1',
	'owner-a@f87.local',
	$q$delete from public.campaigns where id='20000000-0000-0000-0000-0000000000c1' returning id::text$q$
);
select pg_temp.request(
	6,
	'00000000-0000-0000-0000-0000000000a1',
	'owner-a@f87.local',
	$q$delete from public.campaigns where id='20000000-0000-0000-0000-0000000000c3' returning id::text$q$
);

do $$
begin
	if exists (
		select 1 from _expect e full join _actual a using (n)
		where e.n is null or a.n is null
			or a.state is distinct from e.expected_state
			or coalesce(a.message, '') is distinct from coalesce(e.expected_message, '')
	) then
		raise exception 'ERRTESTASSERT: SQLSTATE/message divergiu';
	end if;
end $$;

do $$
begin
	-- 1 e 2: RLS da conta B devolve 0 linhas; nada foi apagado (ainda, antes do caso 5).
	-- Revalidamos o efeito residual depois dos deletes do dono, pelo que sobrou.
	if exists (select 1 from public.campaigns where id = '20000000-0000-0000-0000-0000000000c1') then
		raise exception 'ERRTESTASSERT: o dono não excluiu a campanha com membros';
	end if;
	if exists (select 1 from public.memberships where campaign_id = '20000000-0000-0000-0000-0000000000c1') then
		raise exception 'ERRTESTASSERT: memberships da campanha com membros não saíram no CASCADE';
	end if;
	if exists (select 1 from public.campaigns where id = '20000000-0000-0000-0000-0000000000c3')
		or exists (select 1 from public.memberships where campaign_id = '20000000-0000-0000-0000-0000000000c3')
	then
		raise exception 'ERRTESTASSERT: o dono não excluiu a campanha solo';
	end if;

	-- Caso 14 não apagou C3 antes do delete do dono; o request 3 falhou com 42501.
	-- Transferência: E é owner, A ficou editor, campaigns.owner_id = E.
	if (select owner_id from public.campaigns where id = '20000000-0000-0000-0000-0000000000c2')
		is distinct from '00000000-0000-0000-0000-0000000000e1'
		or (select role from public.memberships where campaign_id = '20000000-0000-0000-0000-0000000000c2' and user_id = '00000000-0000-0000-0000-0000000000e1') <> 'owner'
		or (select role from public.memberships where campaign_id = '20000000-0000-0000-0000-0000000000c2' and user_id = '00000000-0000-0000-0000-0000000000a1') <> 'editor'
		or (select count(*) from public.memberships where campaign_id = '20000000-0000-0000-0000-0000000000c2' and role = 'owner') <> 1
	then
		raise exception 'ERRTESTASSERT: transferência de mestre não manteve o invariante';
	end if;

	-- Negação da conta B: requests 1 e 2 devolveram ∅ (0 linhas), e a campanha
	-- só saiu depois do delete do dono (caso 5). Sem isso, o caso 5 não teria o que apagar.
	if (select value from _actual where n = 1) is distinct from '∅'
		or (select value from _actual where n = 2) is distinct from '∅'
	then
		raise exception 'ERRTESTASSERT: a conta B não deveria ter apagado linha alguma';
	end if;

	-- Sonda do CASCADE: em toda membership apagada junto com a campanha,
	-- a linha de campaigns já não era visível.
	if exists (select 1 from pg_temp.cascade_probe where campaign_visible) then
		raise exception 'ERRTESTASSERT: no CASCADE a campanha ainda era visível no BEFORE DELETE de memberships';
	end if;
	if not exists (select 1 from pg_temp.cascade_probe where membership_role = 'owner' and not campaign_visible)
		or not exists (select 1 from pg_temp.cascade_probe where membership_role = 'editor' and not campaign_visible)
	then
		raise exception 'ERRTESTASSERT: sonda do CASCADE não viu owner e editor com campanha ausente';
	end if;

	-- Função continua SECURITY DEFINER com search_path vazio.
	if not exists (
		select 1 from pg_proc
		where oid = 'private.guard_campaign_owner_membership()'::regprocedure
			and prosecdef
			and proconfig = array['search_path=""']
	) then
		raise exception 'ERRTESTASSERT: a função perdeu SECURITY DEFINER ou search_path = ''''';
	end if;
end $$;

select e.n, e.description, a.state, a.message, a.value,
	case
		when a.state = e.expected_state
			and (a.state = '00000' or e.expected_message = a.message)
		then 'ok' else 'FALHOU'
	end as exact_denial
from _expect e
join _actual a using (n)
order by e.n;

select membership_role, campaign_visible, count(*) as n
from pg_temp.cascade_probe
group by 1, 2
order by 1, 2;

do $$ begin
	raise notice 'PASS 0087: dono exclui; caso 14 segue 42501; transferência passa; conta B recusada; CASCADE sem campanha visível';
end $$;

rollback;
