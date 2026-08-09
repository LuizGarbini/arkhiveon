-- Migration 0028: Fix invites RLS, campaign name visibility for invitees, and membership insertion

-- 1. Allow invited users (pending invites) to view the campaign name when loading pending invites
DROP POLICY IF EXISTS "Invited users can view campaign name" ON public.campaigns;
CREATE POLICY "Invited users can view campaign name"
	ON public.campaigns FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.invites i
			WHERE i.campaign_id = campaigns.id
			AND lower(trim(i.email)) = lower(trim(auth.jwt() ->> 'email'))
			AND i.status = 'pending'
		)
	);

-- 2. Allow invitees to insert their membership when accepting an invite
DROP POLICY IF EXISTS "Invitee can self insert membership" ON public.memberships;
CREATE POLICY "Invitee can self insert membership"
	ON public.memberships FOR INSERT
	WITH CHECK (
		user_id = auth.uid()
		AND EXISTS (
			SELECT 1 FROM public.invites i
			WHERE i.campaign_id = campaign_id
			AND lower(trim(i.email)) = lower(trim(auth.jwt() ->> 'email'))
		)
	);

-- 3. Robust invite acceptance trigger using session auth.uid()
CREATE OR REPLACE FUNCTION public.handle_invite_acceptance()
RETURNS TRIGGER AS $$
DECLARE
	v_user_id uuid;
BEGIN
	IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
		v_user_id := auth.uid();

		IF v_user_id IS NULL THEN
			SELECT id INTO v_user_id FROM auth.users WHERE lower(trim(email)) = lower(trim(NEW.email)) LIMIT 1;
		END IF;

		IF v_user_id IS NOT NULL THEN
			INSERT INTO public.memberships (campaign_id, user_id, role)
			VALUES (NEW.campaign_id, v_user_id, NEW.role)
			ON CONFLICT (campaign_id, user_id) DO UPDATE SET role = EXCLUDED.role;
		END IF;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Repair past accepted invites missing membership rows
INSERT INTO public.memberships (campaign_id, user_id, role)
SELECT 
	i.campaign_id, 
	u.id AS user_id, 
	i.role
FROM public.invites i
JOIN auth.users u ON lower(trim(u.email)) = lower(trim(i.email))
WHERE i.status = 'accepted'
ON CONFLICT (campaign_id, user_id) DO NOTHING;
