-- Restringe o SELECT de characters, sessions e activity_log à campanha da linha.
--
-- Causa: na 0023 a subconsulta usou `campaign_id` sem qualificar. Dentro de
-- `FROM memberships`, o Postgres resolve o nome para `memberships.campaign_id`,
-- e a condição virou `memberships.campaign_id = memberships.campaign_id`
-- (sempre verdadeira). Na prática, quem era membro de qualquer campanha passava
-- no filtro de todas.
--
-- Correção: mesma forma `EXISTS` da 0023 (que existe por causa do Realtime, que
-- descarta eventos de policies com helper customizado), agora com a coluna da
-- tabela qualificada. Semântica igual à da 0003 (`user_campaign_role(campaign_id)
-- is not null`): o helper também só consulta memberships por campaign_id + auth.uid().
--
-- Só policies de SELECT. Nomes mantidos. Sem mudança de dados.
-- Teste: supabase/tests/0043_select_policies_campaign_scope.sql

begin;

drop policy if exists "Campaign members can view characters" on public.characters;
create policy "Campaign members can view characters"
	on public.characters for select
	using (
		exists (
			select 1 from public.memberships m
			where m.campaign_id = characters.campaign_id
				and m.user_id = auth.uid()
		)
	);

drop policy if exists "Campaign members can view sessions" on public.sessions;
create policy "Campaign members can view sessions"
	on public.sessions for select
	using (
		exists (
			select 1 from public.memberships m
			where m.campaign_id = sessions.campaign_id
				and m.user_id = auth.uid()
		)
	);

drop policy if exists "Campaign members can view activity" on public.activity_log;
create policy "Campaign members can view activity"
	on public.activity_log for select
	using (
		exists (
			select 1 from public.memberships m
			where m.campaign_id = activity_log.campaign_id
				and m.user_id = auth.uid()
		)
	);

commit;
