-- Configurable participant capacity, enforced by PostgreSQL.

ALTER TABLE public.campaigns
	ADD COLUMN IF NOT EXISTS member_limit integer NOT NULL DEFAULT 6
	CHECK (member_limit BETWEEN 1 AND 100);

CREATE OR REPLACE FUNCTION public.enforce_campaign_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_member_limit integer;
	v_occupied_slots integer;
BEGIN
	SELECT member_limit
	INTO v_member_limit
	FROM public.campaigns
	WHERE id = NEW.campaign_id
	FOR UPDATE;

	IF v_member_limit IS NULL THEN
		RAISE EXCEPTION 'Campanha não encontrada.';
	END IF;

	SELECT
		(SELECT count(*) FROM public.memberships WHERE campaign_id = NEW.campaign_id AND role <> 'owner') +
		(SELECT count(*) FROM public.invites WHERE campaign_id = NEW.campaign_id AND status = 'pending')
	INTO v_occupied_slots;

	IF TG_TABLE_NAME = 'memberships' AND NEW.role = 'owner' THEN
		RETURN NEW;
	END IF;

	IF v_occupied_slots >= v_member_limit THEN
		RAISE EXCEPTION 'Limite de participantes atingido (% jogadores).', v_member_limit
			USING ERRCODE = 'check_violation';
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_invite_member_limit ON public.invites;
CREATE TRIGGER enforce_invite_member_limit
	BEFORE INSERT ON public.invites
	FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_member_limit();

DROP TRIGGER IF EXISTS enforce_membership_member_limit ON public.memberships;
CREATE TRIGGER enforce_membership_member_limit
	BEFORE INSERT ON public.memberships
	FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_member_limit();

CREATE OR REPLACE FUNCTION public.enforce_campaign_member_limit_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_occupied_slots integer;
BEGIN
	SELECT
		(SELECT count(*) FROM public.memberships WHERE campaign_id = NEW.id AND role <> 'owner') +
		(SELECT count(*) FROM public.invites WHERE campaign_id = NEW.id AND status = 'pending')
	INTO v_occupied_slots;

	IF NEW.member_limit < v_occupied_slots THEN
		RAISE EXCEPTION 'O limite não pode ser menor que os % participantes e convites atuais.', v_occupied_slots
			USING ERRCODE = 'check_violation';
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_campaign_member_limit_update ON public.campaigns;
CREATE TRIGGER enforce_campaign_member_limit_update
	BEFORE UPDATE OF member_limit ON public.campaigns
	FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_member_limit_update();
