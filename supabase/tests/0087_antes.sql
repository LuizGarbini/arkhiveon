-- Antes da 0087: o dono autenticado não consegue excluir a campanha.
-- SOMENTE Postgres local descartável arkhiveon_0087. Termina em ROLLBACK.
-- Pré-requisito: bootstrap com o guard da 0059, sem a 0087.

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

insert into auth.users(id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'owner-a@f87.local'),
	('00000000-0000-0000-0000-0000000000b1', 'player-b@f87.local');

insert into public.campaigns(id, owner_id, name) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A');
insert into public.memberships(campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'editor');

do $$
declare
	v_state text;
	v_msg text;
begin
	perform set_config('request.jwt.claims',
		json_build_object('sub','00000000-0000-0000-0000-0000000000a1','email','owner-a@f87.local','role','authenticated')::text,
		true);
	perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
	set local role authenticated;
	begin
		delete from public.campaigns where id = '20000000-0000-0000-0000-0000000000a1';
		raise exception 'ERRTESTASSERT: antes da 0087 o dono não deveria excluir a campanha';
	exception when others then
		reset role;
		if SQLSTATE = 'P0001' and SQLERRM like 'ERRTESTASSERT:%' then raise; end if;
		v_state := SQLSTATE;
		v_msg := SQLERRM;
	end;
	reset role;
	if v_state is distinct from '42501' or v_msg is distinct from 'transferência de mestre não permitida' then
		raise exception 'ERRTESTASSERT: antes da 0087 esperava 42501/transferência, veio %/%', v_state, v_msg;
	end if;
	if not exists (select 1 from public.campaigns where id = '20000000-0000-0000-0000-0000000000a1') then
		raise exception 'ERRTESTASSERT: a campanha não deveria ter sido apagada antes da 0087';
	end if;
	raise notice 'PASS antes: dono recebe 42501 e a campanha permanece';
end $$;

rollback;
