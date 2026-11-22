-- Rollback 0086: recria a policy como estava (0023; conferida em prod em 22/11/2026).
drop policy if exists "Members can view campaign" on public.campaigns;
create policy "Members can view campaign"
	on public.campaigns
	for select
	using (
		owner_id = auth.uid()
		or user_campaign_role(id) is not null
		or exists (
			select 1
			from public.invites i
			where i.campaign_id = i.id
				and lower(trim(both from i.email)) = lower(trim(both from (auth.jwt() ->> 'email')))
		)
	);
