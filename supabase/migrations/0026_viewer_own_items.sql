-- Allow campaign viewers to create/edit/delete their own items (campaign-owned
-- content), while world staff retain full manage rights. Viewers cannot create
-- or escalate to master_secret.

DROP POLICY IF EXISTS "World staff can insert items" ON public.items;
DROP POLICY IF EXISTS "World staff can update items" ON public.items;
DROP POLICY IF EXISTS "World staff can delete items" ON public.items;
DROP POLICY IF EXISTS "World members can insert own items" ON public.items;
DROP POLICY IF EXISTS "World members can update own or staff items" ON public.items;
DROP POLICY IF EXISTS "World members can delete own or staff items" ON public.items;

CREATE POLICY "World members can insert own items"
	ON public.items FOR INSERT
	WITH CHECK (
		created_by = auth.uid()
		AND EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
		)
		AND (
			visibility = 'public'
			OR EXISTS (
				SELECT 1 FROM public.memberships m
				JOIN public.campaigns c ON c.id = m.campaign_id
				WHERE c.world_id = items.world_id
					AND m.user_id = auth.uid()
					AND m.role IN ('owner', 'editor')
			)
		)
	);

CREATE POLICY "World members can update own or staff items"
	ON public.items FOR UPDATE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
				AND (
					m.role IN ('owner', 'editor')
					OR items.created_by = auth.uid()
				)
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
				AND (
					m.role IN ('owner', 'editor')
					OR (
						items.created_by = auth.uid()
						AND visibility = 'public'
					)
				)
		)
	);

CREATE POLICY "World members can delete own or staff items"
	ON public.items FOR DELETE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
				AND (
					m.role IN ('owner', 'editor')
					OR items.created_by = auth.uid()
				)
		)
	);
