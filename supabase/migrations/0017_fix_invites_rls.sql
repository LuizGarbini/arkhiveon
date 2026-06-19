-- Drop and recreate public.invites RLS policies to use auth.jwt() ->> 'email'
-- instead of querying auth.users directly (which throws permission denied for normal users).

DROP POLICY IF EXISTS "Campaign members or invitee can view invites" ON public.invites;
CREATE POLICY "Campaign members or invitee can view invites"
    ON public.invites FOR SELECT
    USING (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        OR lower(email) = lower(auth.jwt() ->> 'email')
    );

DROP POLICY IF EXISTS "Owner or invitee can update invite" ON public.invites;
CREATE POLICY "Owner or invitee can update invite"
    ON public.invites FOR UPDATE
    USING (
        user_campaign_role(campaign_id) = 'owner'
        OR lower(email) = lower(auth.jwt() ->> 'email')
    );
