-- Fix chicken-and-egg deadlock on campaigns SELECT RLS policy.
-- Allow owners to select their campaigns even if they do not have a membership record yet.

DROP POLICY IF EXISTS "Members can view campaign" ON public.campaigns;

CREATE POLICY "Members can view campaign"
    ON public.campaigns FOR SELECT
    USING (
        user_campaign_role(id) IS NOT NULL
        OR owner_id = auth.uid()
    );
