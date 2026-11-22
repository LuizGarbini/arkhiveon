-- =============================================================================
-- Migration 0086 (Plano Pro, M6): policy "Members can view campaign"
-- =============================================================================
-- O ramo de convite da policy compara i.campaign_id = i.id (o convite com ele
-- mesmo), então nunca vale. Corrigido para i.campaign_id = campaigns.id.
--
-- O ramo corrigido exige convite PENDENTE. Sem isso, a correção literal
-- abriria a campanha para convites aceitos de quem já saiu ou foi removido
-- da mesa, e para convites recusados ou expirados. Com o pendente, o
-- resultado é o mesmo da policy "Invited users can view campaign name" que já
-- existe. Ninguém ganha nem perde acesso em relação a hoje.
--
-- NÃO APLICADA em nenhum banco. Aplicar em produção só com o OK do Luiz.
-- Rollback: supabase/rollbacks/0086_fix_members_view_campaign_policy.down.sql
-- Teste: supabase/tests/0086_members_view_campaign.sql
--
-- Dry-run (só leitura, numa transação com rollback): para 3 contas reais
-- (mestre, jogador, sem vínculo), count(*) de campanhas visíveis antes/depois:
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<uuid>","email":"<email>"}', true);
--   select count(*) from public.campaigns;
--   rollback;

drop policy if exists "Members can view campaign" on public.campaigns;
create policy "Members can view campaign"
	on public.campaigns
	for select
	using (
		owner_id = auth.uid()
		or public.user_campaign_role(id) is not null
		or exists (
			select 1
			from public.invites i
			where i.campaign_id = campaigns.id
				and i.status = 'pending'
				and lower(trim(both from i.email)) = lower(trim(both from (auth.jwt() ->> 'email')))
		)
	);
