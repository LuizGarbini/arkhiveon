-- Fix get_campaign_members function ambiguity error by qualifying columns and adding variable conflict directive

CREATE OR REPLACE FUNCTION public.get_campaign_members(p_campaign_id uuid)
RETURNS TABLE (
    membership_id uuid,
    user_id uuid,
    email text,
    role text,
    created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
    -- Verify the calling user is a member of the campaign
    IF EXISTS (
        SELECT 1 FROM public.memberships ms
        WHERE ms.campaign_id = p_campaign_id AND ms.user_id = auth.uid()
    ) THEN
        RETURN QUERY
        SELECT 
            m.id as membership_id,
            m.user_id,
            u.email::text,
            m.role,
            m.created_at
        FROM public.memberships m
        JOIN auth.users u ON u.id = m.user_id
        WHERE m.campaign_id = p_campaign_id;
    END IF;
END;
$$;
