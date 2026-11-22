-- =============================================================================
-- Migration 0084 (Plano Pro, M3): user_plans com colunas do Stripe, grants
-- fechados e storage_used_bytes derivado de storage_objects
-- =============================================================================
-- 1. Colunas novas (preenchidas pela S4/Stripe e pelo trigger abaixo):
--    stripe_customer_id, stripe_subscription_id, subscription_status,
--    current_period_end, over_limit_since.
-- 2. Grants. Hoje (conferido em prod com SELECT em 22/11/2026):
--      anon, authenticated, service_role: SELECT, INSERT, UPDATE, DELETE,
--      TRUNCATE, REFERENCES, TRIGGER (GRANT ALL).
--    Depois: anon e authenticated perdem INSERT, UPDATE, DELETE, TRUNCATE,
--    REFERENCES e TRIGGER. Fica só SELECT, filtrado pela policy. Quem escreve
--    é o service role (edges r2-upload, r2-delete e stripe-webhook) e o
--    trigger security definer abaixo. O cliente não escreve em user_plans.
-- 3. Policy "Users read own plan" reescrita explícita (to authenticated), com a
--    mesma regra: a própria linha, ou a do dono de uma campanha em que sou
--    membro (o convidado precisa do plano do mestre).
-- 4. storage_used_bytes vira cache derivado: trigger AFTER INSERT/UPDATE/DELETE
--    em storage_objects recalcula a soma (ready + pending) do owner_id. O
--    mesmo trigger liga over_limit_since quando o uso passa do limite do plano
--    (se ainda nulo) e desliga quando volta a caber. Mantém o realtime atual da
--    sidebar até a U1. Enquanto a S3 não sai, r2-upload ainda soma neste
--    campo; a próxima mudança em storage_objects do mesmo dono recalcula.
--
-- NÃO APLICADA em nenhum banco. Aplicar em produção só com o OK do Luiz.
-- Rollback: supabase/rollbacks/0084_user_plans_billing_and_grants.down.sql
-- Teste: supabase/tests/0083_storage_rpcs.sql (cobre grants e o trigger)
--
-- Dry-run (só leitura, relatório B3, nada gravado):
--   select user_id, plan, storage_used_bytes
--   from public.user_plans order by storage_used_bytes desc limit 20;
--   -- depois do backfill: soma de storage_objects por dono vs. o cache
--   select up.user_id, up.storage_used_bytes,
--     coalesce((select sum(size_bytes) from public.storage_objects o where o.owner_id = up.user_id), 0) as derivado
--   from public.user_plans up order by derivado desc limit 20;

alter table public.user_plans
	add column if not exists stripe_customer_id text,
	add column if not exists stripe_subscription_id text,
	add column if not exists subscription_status text,
	add column if not exists current_period_end timestamptz,
	add column if not exists over_limit_since timestamptz;

revoke insert, update, delete, truncate, references, trigger
	on table public.user_plans from anon, authenticated;
grant select on table public.user_plans to authenticated;
grant all on table public.user_plans to service_role;

drop policy if exists "Users read own plan" on public.user_plans;
create policy "Users read own plan"
	on public.user_plans
	for select
	to authenticated
	using (
		user_id = (select auth.uid())
		or exists (
			select 1
			from public.campaigns c
			join public.memberships m on m.campaign_id = c.id
			where c.owner_id = user_plans.user_id
				and m.user_id = (select auth.uid())
		)
	);

create or replace function private.storage_sync_user_plan(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_used bigint;
	v_limit bigint;
begin
	if p_owner is null then
		return;
	end if;
	v_used := private.storage_used(p_owner);
	v_limit := public.storage_limit(private.storage_plan(p_owner));

	insert into public.user_plans (user_id, storage_used_bytes, over_limit_since)
	values (p_owner, v_used, case when v_used > v_limit then now() end)
	on conflict (user_id) do update
	set storage_used_bytes = excluded.storage_used_bytes,
		over_limit_since = case
			when excluded.storage_used_bytes > v_limit
				then coalesce(public.user_plans.over_limit_since, now())
			else null
		end;
end;
$$;

revoke all on function private.storage_sync_user_plan(uuid) from public, anon, authenticated;

create or replace function public.storage_objects_sync_user_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if tg_op in ('INSERT', 'UPDATE') then
		perform private.storage_sync_user_plan(new.owner_id);
	end if;
	if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.owner_id is distinct from new.owner_id) then
		perform private.storage_sync_user_plan(old.owner_id);
	end if;
	return null;
end;
$$;

revoke all on function public.storage_objects_sync_user_plan() from public, anon, authenticated;

drop trigger if exists storage_objects_sync_user_plan on public.storage_objects;
create trigger storage_objects_sync_user_plan
	after insert or update or delete on public.storage_objects
	for each row execute function public.storage_objects_sync_user_plan();
