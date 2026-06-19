-- Seeding campaign invite acceptance trigger and updated RLS policies for lore and plan visibility
-- 1. Create function and trigger for automatic membership creation on invite acceptance
CREATE OR REPLACE FUNCTION public.handle_invite_acceptance()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Find the user ID matching the invite email (case-insensitive)
        SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(NEW.email);
        
        IF v_user_id IS NOT NULL THEN
            -- Insert the membership row
            INSERT INTO public.memberships (campaign_id, user_id, role)
            VALUES (NEW.campaign_id, v_user_id, NEW.role)
            ON CONFLICT (campaign_id, user_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invite_accepted ON public.invites;
CREATE TRIGGER on_invite_accepted
    AFTER UPDATE OF status ON public.invites
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_invite_acceptance();

-- 2. Update user_plans select policy to allow campaign members to see their GM's plan
DROP POLICY IF EXISTS "Users read own plan" ON public.user_plans;
CREATE POLICY "Users read own plan" ON public.user_plans
FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.campaigns c
        JOIN public.memberships m ON m.campaign_id = c.id
        WHERE c.owner_id = user_plans.user_id AND m.user_id = auth.uid()
    )
);

-- 3. Update lores select policy to hide secret lore from viewer role (players)
DROP POLICY IF EXISTS "Campaign members can view lores" ON public.lores;
CREATE POLICY "Campaign members can view lores" ON public.lores
FOR SELECT USING (
    user_campaign_role(campaign_id) IN ('owner', 'editor')
    OR (user_campaign_role(campaign_id) = 'viewer' AND NOT is_secret)
);

-- 4. Create function to retrieve emails of campaign members securely
CREATE OR REPLACE FUNCTION public.get_campaign_members(p_campaign_id uuid)
RETURNS TABLE (
    membership_id uuid,
    user_id uuid,
    email text,
    role text,
    created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Verify the calling user is a member of the campaign
    IF EXISTS (
        SELECT 1 FROM memberships 
        WHERE campaign_id = p_campaign_id AND user_id = auth.uid()
    ) THEN
        RETURN QUERY
        SELECT 
            m.id as membership_id,
            m.user_id,
            u.email::text,
            m.role,
            m.created_at
        FROM memberships m
        JOIN auth.users u ON u.id = m.user_id
        WHERE m.campaign_id = p_campaign_id;
    END IF;
END;
$$;
