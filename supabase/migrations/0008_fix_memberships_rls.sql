-- Fix chicken-and-egg issue on memberships insertion.
-- Allow a user to insert a membership if they are the owner of the campaign.

DROP POLICY IF EXISTS "Owner can add members" ON public.memberships;

CREATE POLICY "Owner can add members"
    ON public.memberships FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) = 'owner'
        OR EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE id = campaign_id AND owner_id = auth.uid()
        )
    );
