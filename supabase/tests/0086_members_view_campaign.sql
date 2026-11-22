-- Teste da 0086: policy "Members can view campaign" com o ramo de convite
-- corrigido (i.campaign_id = campaigns.id, só convite pendente).
-- SÓ Postgres local descartável. Tudo numa transação com ROLLBACK no fim.
-- Também aplica o rollback da 0086 dentro da transação e prova que a
-- visibilidade de cada conta é a mesma antes e depois (ninguém ganha nem perde).
-- Uso: psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/0086_members_view_campaign.sql

\set ON_ERROR_STOP on
\set VERBOSITY terse
set client_min_messages = notice;

begin;
\ir plano_pro_s1a_bootstrap.sql

insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000d2', 'recusou@example.invalid');
insert into public.invites (campaign_id, email, role, status, invited_by) values
	('20000000-0000-0000-0000-0000000000a1', 'recusou@example.invalid', 'viewer', 'declined', '00000000-0000-0000-0000-0000000000a1');

create temp table visto (fase text, conta text, campanhas text);
grant insert, select on visto to authenticated;

create or replace function pg_temp.medir(p_fase text) returns void language plpgsql as $f$
declare
	r record;
	v text;
begin
	for r in select * from (values
		('A', '00000000-0000-0000-0000-0000000000a1', 'mestre-a@example.invalid'),
		('J', '00000000-0000-0000-0000-0000000000f1', 'jogador-a@example.invalid'),
		('B', '00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid'),
		('P', '00000000-0000-0000-0000-0000000000d1', 'pendente@example.invalid'),
		('R', '00000000-0000-0000-0000-0000000000c1', 'removido@example.invalid'),
		('D', '00000000-0000-0000-0000-0000000000d2', 'recusou@example.invalid'),
		('X', '00000000-0000-0000-0000-000000000099', 'fora@example.invalid')
	) t(conta, uid, email) loop
		perform pg_temp.claims(r.uid, r.email);
		set local role authenticated;
		select coalesce(string_agg(name, ',' order by name), '-') into v from public.campaigns;
		reset role;
		insert into visto values (p_fase, r.conta, v);
	end loop;
end;
$f$;

select pg_temp.medir('0086');

do $$
declare
	v_def text := (select qual from pg_policies where schemaname = 'public' and tablename = 'campaigns' and policyname = 'Members can view campaign');
begin
	if v_def not like '%i.campaign_id = campaigns.id%' or v_def not like '%pending%' or v_def like '%i.campaign_id = i.id%' then
		raise exception 'FAIL: policy sem a correção: %', v_def;
	end if;
	if (select campanhas from visto where fase = '0086' and conta = 'A') <> 'Campanha A1,Campanha A2'
		or (select campanhas from visto where fase = '0086' and conta = 'J') <> 'Campanha A1'
		or (select campanhas from visto where fase = '0086' and conta = 'P') <> 'Campanha A1' then
		raise exception 'FAIL: mestre, jogador ou convidado pendente perderam acesso';
	end if;
	raise notice 'PASS 0086 ramo corrigido (campaigns.id + pendente); mestre vê A1 e A2, jogador vê A1, convite pendente vê A1';
	if (select campanhas from visto where fase = '0086' and conta = 'B') <> 'Campanha B1' then
		raise exception 'FAIL: conta B viu campanha de A';
	end if;
	if (select campanhas from visto where fase = '0086' and conta = 'R') <> '-'
		or (select campanhas from visto where fase = '0086' and conta = 'D') <> '-'
		or (select campanhas from visto where fase = '0086' and conta = 'X') <> '-' then
		raise exception 'FAIL: removido, recusado ou sem vínculo viu campanha';
	end if;
	raise notice 'PASS 0086 NEGAÇÃO conta B não vê as campanhas de A; membro removido com convite aceito, convite recusado e sem vínculo não veem nada';
end $$;

-- Rollback da 0086 dentro da transação: mesma visibilidade para todas as contas
\ir ../rollbacks/0086_fix_members_view_campaign_policy.down.sql
select pg_temp.medir('0023');
do $$
begin
	if exists (
		select 1 from visto a join visto b on b.conta = a.conta and b.fase = '0023'
		where a.fase = '0086' and a.campanhas is distinct from b.campanhas
	) then
		raise exception 'FAIL: a 0086 mudou a visibilidade de alguma conta';
	end if;
	raise notice 'PASS 0086 rollback aplicado: visibilidade idêntica antes/depois para as 7 contas (ninguém ganha nem perde acesso)';
end $$;
\ir ../migrations/0086_fix_members_view_campaign_policy.sql

rollback;
\echo '0086: todos os casos passaram'
