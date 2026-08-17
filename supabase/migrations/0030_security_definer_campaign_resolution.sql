-- Migration 0030: Security Definer RPC functions for rock-solid campaign & world access

-- 1. Function to retrieve all accessible campaigns for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_accessible_campaigns()
RETURNS TABLE (
	id uuid,
	name text,
	description text,
	owner_id uuid,
	world_id uuid,
	system text,
	my_role text,
	created_at timestamptz,
	updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	RETURN QUERY
	WITH user_campaign_roles AS (
		-- A. Direct memberships (owner, editor, viewer)
		SELECT m.campaign_id, m.role
		FROM public.memberships m
		WHERE m.user_id = auth.uid()

		UNION

		-- B. Campaigns owned by current user
		SELECT c.id AS campaign_id, 'owner'::text AS role
		FROM public.campaigns c
		WHERE c.owner_id = auth.uid()

		UNION

		-- C. Campaigns with accepted invites for user's email
		SELECT i.campaign_id, i.role
		FROM public.invites i
		WHERE lower(trim(i.email)) = lower(trim(auth.jwt() ->> 'email'))
		AND i.status = 'accepted'
	)
	SELECT
		c.id,
		c.name,
		c.description,
		c.owner_id,
		c.world_id,
		c.system,
		ucr.role AS my_role,
		c.created_at,
		c.updated_at
	FROM public.campaigns c
	JOIN user_campaign_roles ucr ON ucr.campaign_id = c.id
	ORDER BY c.created_at ASC;
END;
$$;

-- 2. Function to retrieve all accessible worlds for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_accessible_worlds()
RETURNS TABLE (
	id uuid,
	name text,
	is_default boolean,
	owner_user_id uuid,
	created_at timestamptz,
	updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	RETURN QUERY
	SELECT DISTINCT
		w.id,
		w.name,
		w.is_default,
		w.owner_user_id,
		w.created_at,
		w.updated_at
	FROM public.worlds w
	WHERE w.owner_user_id = auth.uid()
	OR EXISTS (
		SELECT 1 FROM public.campaigns c
		JOIN public.memberships m ON m.campaign_id = c.id
		WHERE c.world_id = w.id AND m.user_id = auth.uid()
	)
	OR EXISTS (
		SELECT 1 FROM public.campaigns c
		JOIN public.invites i ON i.campaign_id = c.id
		WHERE c.world_id = w.id
		AND lower(trim(i.email)) = lower(trim(auth.jwt() ->> 'email'))
		AND i.status = 'accepted'
	)
	ORDER BY w.created_at ASC;
END;
$$;

-- 3. Update RLS policies to be fully permissive for members & invitees
DROP POLICY IF EXISTS "Members can view campaign" ON public.campaigns;
CREATE POLICY "Members can view campaign"
	ON public.campaigns FOR SELECT
	USING (
		owner_id = auth.uid()
		OR user_campaign_role(id) IS NOT NULL
		OR EXISTS (
			SELECT 1 FROM public.invites i
			WHERE i.campaign_id = id
			AND lower(trim(i.email)) = lower(trim(auth.jwt() ->> 'email'))
		)
	);

DROP POLICY IF EXISTS "Members can view memberships" ON public.memberships;
CREATE POLICY "Members can view memberships"
	ON public.memberships FOR SELECT
	USING (
		user_id = auth.uid()
		OR user_campaign_role(campaign_id) IS NOT NULL
		OR EXISTS (
			SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.owner_id = auth.uid()
		)
	);

-- 4. Auto-repair missing memberships for ALL accepted invites and owned campaigns right now
INSERT INTO public.memberships (campaign_id, user_id, role)
SELECT
	i.campaign_id,
	u.id AS user_id,
	i.role
FROM public.invites i
JOIN auth.users u ON lower(trim(u.email)) = lower(trim(i.email))
WHERE i.status = 'accepted'
ON CONFLICT (campaign_id, user_id) DO NOTHING;

INSERT INTO public.memberships (campaign_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.campaigns
ON CONFLICT (campaign_id, user_id) DO NOTHING;
