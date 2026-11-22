-- Rollback 0084: tira o trigger, as colunas novas e volta grants e policy ao
-- estado anterior (conferido em prod em 22/11/2026: GRANT ALL para anon,
-- authenticated e service_role; policy sem "to", ou seja, para public).
drop trigger if exists storage_objects_sync_user_plan on public.storage_objects;
drop function if exists public.storage_objects_sync_user_plan();
drop function if exists private.storage_sync_user_plan(uuid);

alter table public.user_plans
	drop column if exists over_limit_since,
	drop column if exists current_period_end,
	drop column if exists subscription_status,
	drop column if exists stripe_subscription_id,
	drop column if exists stripe_customer_id;

grant all on table public.user_plans to anon, authenticated, service_role;

drop policy if exists "Users read own plan" on public.user_plans;
create policy "Users read own plan"
	on public.user_plans
	for select
	using (
		user_id = auth.uid()
		or exists (
			select 1
			from public.campaigns c
			join public.memberships m on m.campaign_id = c.id
			where c.owner_id = user_plans.user_id
				and m.user_id = auth.uid()
		)
	);
