-- =============================================================================
-- Migration 0027: Security & Limits Hardening
-- Protects against IDOR, Free Plan Bypass, and Invite Email Casing Vulnerabilities
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Function to check user plan (defaults to 'free' if no record exists)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_plan_type(p_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_plan text;
BEGIN
    SELECT plan INTO v_plan FROM public.user_plans WHERE user_id = p_user_id;
    RETURN COALESCE(v_plan, 'free');
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Enforce World Creation Limits (Free Plan = 1 World max)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_world_plan_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_plan text;
    v_count integer;
BEGIN
    -- Determine user plan
    v_plan := public.get_user_plan_type(NEW.owner_user_id);

    IF v_plan = 'free' THEN
        SELECT COUNT(*) INTO v_count
        FROM public.worlds
        WHERE owner_user_id = NEW.owner_user_id;

        IF v_count >= 1 THEN
            RAISE EXCEPTION 'Limite do plano gratuito atingido (1 mundo). Faça upgrade para o plano Pro para criar mais mundos.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_world_plan_limit ON public.worlds;
CREATE TRIGGER trg_enforce_world_plan_limit
    BEFORE INSERT ON public.worlds
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_world_plan_limit();

-- ---------------------------------------------------------------------------
-- 3. Enforce Campaign Creation Limits (Free Plan = 1 Campaign max)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_campaign_plan_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_plan text;
    v_count integer;
BEGIN
    -- Determine user plan
    v_plan := public.get_user_plan_type(NEW.owner_id);

    IF v_plan = 'free' THEN
        SELECT COUNT(*) INTO v_count
        FROM public.campaigns
        WHERE owner_id = NEW.owner_id;

        IF v_count >= 1 THEN
            RAISE EXCEPTION 'Limite do plano gratuito atingido (1 campanha). Faça upgrade para o plano Pro para criar mais campanhas.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_campaign_plan_limit ON public.campaigns;
CREATE TRIGGER trg_enforce_campaign_plan_limit
    BEFORE INSERT ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_campaign_plan_limit();

-- ---------------------------------------------------------------------------
-- 4. Prevent IDOR: Campaigns assigned to foreign worlds
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_campaign_world_ownership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.world_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.worlds
            WHERE id = NEW.world_id AND owner_user_id = NEW.owner_id
        ) THEN
            RAISE EXCEPTION 'Não é permitido vincular uma campanha a um mundo de outro usuário.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_campaign_world_ownership ON public.campaigns;
CREATE TRIGGER trg_enforce_campaign_world_ownership
    BEFORE INSERT OR UPDATE OF world_id ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_campaign_world_ownership();

-- ---------------------------------------------------------------------------
-- 5. Email Case-Insensitive Matching for Invites
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invites_email_lower ON public.invites (lower(email));

CREATE OR REPLACE FUNCTION public.handle_invite_acceptance()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Find user ID by lower-cased email match
        SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(NEW.email);
        
        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.memberships (campaign_id, user_id, role)
            VALUES (NEW.campaign_id, v_user_id, NEW.role)
            ON CONFLICT (campaign_id, user_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 6. Memberships RLS: Ensure campaign owners can insert initial owner membership
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner can add members" ON public.memberships;
CREATE POLICY "Owner can add members"
    ON public.memberships FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR user_campaign_role(campaign_id) = 'owner'
        OR EXISTS (
            SELECT 1 FROM public.campaigns
            WHERE id = campaign_id AND owner_id = auth.uid()
        )
    );
