-- =============================================================================
-- Migration 0023: Fix Realtime RLS Policies
--
-- Substitui o uso da função helper customizada `user_campaign_role()` nas
-- políticas de SELECT por subconsultas `EXISTS` diretas.
-- Isso é necessário porque o mecanismo do Supabase Realtime (Walrus) tem
-- limitações severas de suporte a funções PostgreSQL customizadas nas políticas RLS,
-- resultando em eventos em tempo real sendo descartados silenciosamente para jogadores.
-- =============================================================================

-- 1. campaigns
DROP POLICY IF EXISTS "Members can view campaign" ON public.campaigns;
CREATE POLICY "Members can view campaign"
    ON public.campaigns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = id
            AND memberships.user_id = auth.uid()
        )
        OR owner_id = auth.uid()
    );

-- 2. characters
DROP POLICY IF EXISTS "Campaign members can view characters" ON public.characters;
CREATE POLICY "Campaign members can view characters"
    ON public.characters FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 3. npcs
DROP POLICY IF EXISTS "Campaign members can view npcs" ON public.npcs;
CREATE POLICY "Campaign members can view npcs"
    ON public.npcs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 4. sessions
DROP POLICY IF EXISTS "Campaign members can view sessions" ON public.sessions;
CREATE POLICY "Campaign members can view sessions"
    ON public.sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 5. items
DROP POLICY IF EXISTS "Campaign members can view items" ON public.items;
CREATE POLICY "Campaign members can view items"
    ON public.items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 6. locations
DROP POLICY IF EXISTS "Campaign members can view locations" ON public.locations;
CREATE POLICY "Campaign members can view locations"
    ON public.locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 7. lores
DROP POLICY IF EXISTS "Campaign members can view lores" ON public.lores;
CREATE POLICY "Campaign members can view lores"
    ON public.lores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 8. activity_log
DROP POLICY IF EXISTS "Campaign members can view activity" ON public.activity_log;
CREATE POLICY "Campaign members can view activity"
    ON public.activity_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
    );

-- 9. image_assets
DROP POLICY IF EXISTS "Campaign members can view public images" ON public.image_assets;
CREATE POLICY "Campaign members can view public images"
    ON public.image_assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships
            WHERE memberships.campaign_id = campaign_id
            AND memberships.user_id = auth.uid()
        )
        AND (
            is_private = false
            OR EXISTS (
                SELECT 1 FROM public.memberships
                WHERE memberships.campaign_id = campaign_id
                AND memberships.user_id = auth.uid()
                AND memberships.role = 'owner'
            )
        )
    );
