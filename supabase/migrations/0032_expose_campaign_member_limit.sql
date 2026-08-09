-- Expose the campaign capacity to the authenticated application client.

DROP FUNCTION IF EXISTS public.get_user_accessible_campaigns();

CREATE FUNCTION public.get_user_accessible_campaigns()
RETURNS TABLE (
	id uuid,
	name text,
	description text,
	owner_id uuid,
	world_id uuid,
	system text,
	member_limit integer,
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
		SELECT membership.campaign_id, membership.role
		FROM public.memberships membership
		WHERE membership.user_id = auth.uid()
		UNION
		SELECT campaign.id, 'owner'::text
		FROM public.campaigns campaign
		WHERE campaign.owner_id = auth.uid()
		UNION
		SELECT invite.campaign_id, invite.role
		FROM public.invites invite
		WHERE lower(trim(invite.email)) = lower(trim(auth.jwt() ->> 'email'))
			AND invite.status = 'accepted'
	)
	SELECT
		campaign.id,
		campaign.name,
		campaign.description,
		campaign.owner_id,
		campaign.world_id,
		campaign.system,
		campaign.member_limit,
		roles.role,
		campaign.created_at,
		campaign.updated_at
	FROM public.campaigns campaign
	JOIN user_campaign_roles roles ON roles.campaign_id = campaign.id
	ORDER BY campaign.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_accessible_campaigns() TO authenticated;
