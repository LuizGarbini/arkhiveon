-- =============================================================================
-- Migration 0003: Campanhas Colaborativas (Multi-Tenant)
--
-- Transforma a arquitetura de "cada usuário possui seus dados" para
-- "campanhas colaborativas com múltiplos usuários".
--
-- GARANTIAS:
--   • Nenhum dado existente é perdido
--   • Entidades sem campaign_id são associadas à primeira campanha do dono
--   • Cada dono de campanha recebe automaticamente membership 'owner'
--   • Policies antigas são substituídas por novas baseadas em memberships
-- =============================================================================

-- =====================================================
-- FASE 1: Alterar tabela campaigns
-- =====================================================

-- Renomear user_id → owner_id (semântica multi-tenant)
ALTER TABLE public.campaigns RENAME COLUMN user_id TO owner_id;

-- Recriar index com novo nome
DROP INDEX IF EXISTS campaigns_user_id_idx;
CREATE INDEX IF NOT EXISTS campaigns_owner_id_idx ON public.campaigns(owner_id);


-- =====================================================
-- FASE 2: Criar tabela memberships
-- =====================================================

CREATE TABLE IF NOT EXISTS public.memberships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at  timestamptz NOT NULL DEFAULT now(),

    UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS memberships_user_id_idx
    ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_campaign_id_idx
    ON public.memberships(campaign_id);
CREATE INDEX IF NOT EXISTS memberships_campaign_user_role_idx
    ON public.memberships(campaign_id, user_id, role);


-- =====================================================
-- FASE 3: Criar tabela invites
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    email       text NOT NULL,
    role        text NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('editor', 'viewer')),
    status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    invited_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial unique: não duplicar convites pendentes para o mesmo email na mesma campanha
CREATE UNIQUE INDEX IF NOT EXISTS invites_campaign_email_pending_idx
    ON public.invites(campaign_id, email) WHERE (status = 'pending');
CREATE INDEX IF NOT EXISTS invites_email_status_idx
    ON public.invites(email, status);
CREATE INDEX IF NOT EXISTS invites_campaign_id_idx
    ON public.invites(campaign_id);


-- =====================================================
-- FASE 4: Adicionar created_by em todas as entidades
-- =====================================================

ALTER TABLE public.characters   ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.npcs         ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.sessions     ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.items        ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.locations    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lores        ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migrar dados existentes: created_by = user_id (dono original)
UPDATE public.characters   SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.npcs         SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.sessions     SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.items        SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.locations    SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.lores        SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.activity_log SET created_by = user_id WHERE created_by IS NULL;

-- Tornar NOT NULL e definir default para novos registros
ALTER TABLE public.characters   ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.npcs         ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.sessions     ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.items        ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.locations    ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.lores        ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.activity_log ALTER COLUMN created_by SET NOT NULL, ALTER COLUMN created_by SET DEFAULT auth.uid();


-- =====================================================
-- FASE 5: Tornar campaign_id NOT NULL
-- =====================================================

-- Associar entidades órfãs (sem campaign_id) à primeira campanha do dono

-- Primeiro, garante que todos os usuários que têm alguma entidade tenham pelo menos uma campanha
INSERT INTO public.campaigns (owner_id, title, description)
SELECT DISTINCT user_id, 'Campanha Automática', 'Criada automaticamente para recuperar seus itens.'
FROM (
    SELECT user_id FROM public.characters WHERE campaign_id IS NULL
    UNION SELECT user_id FROM public.npcs WHERE campaign_id IS NULL
    UNION SELECT user_id FROM public.sessions WHERE campaign_id IS NULL
    UNION SELECT user_id FROM public.items WHERE campaign_id IS NULL
    UNION SELECT user_id FROM public.locations WHERE campaign_id IS NULL
    UNION SELECT user_id FROM public.lores WHERE campaign_id IS NULL
) as orphan_users
WHERE user_id NOT IN (SELECT owner_id FROM public.campaigns);

UPDATE public.characters c
    SET campaign_id = (
        SELECT id FROM public.campaigns
        WHERE owner_id = c.user_id
        ORDER BY created_at LIMIT 1
    )
    WHERE c.campaign_id IS NULL;

UPDATE public.npcs n
    SET campaign_id = (
        SELECT id FROM public.campaigns
        WHERE owner_id = n.user_id
        ORDER BY created_at LIMIT 1
    )
    WHERE n.campaign_id IS NULL;

UPDATE public.sessions s
    SET campaign_id = (
        SELECT id FROM public.campaigns
        WHERE owner_id = s.user_id
        ORDER BY created_at LIMIT 1
    )
    WHERE s.campaign_id IS NULL;

UPDATE public.items i
    SET campaign_id = (
        SELECT id FROM public.campaigns
        WHERE owner_id = i.user_id
        ORDER BY created_at LIMIT 1
    )
    WHERE i.campaign_id IS NULL;

UPDATE public.locations l
    SET campaign_id = (
        SELECT id FROM public.campaigns
        WHERE owner_id = l.user_id
        ORDER BY created_at LIMIT 1
    )
    WHERE l.campaign_id IS NULL;

UPDATE public.lores l
    SET campaign_id = (
        SELECT id FROM public.campaigns
        WHERE owner_id = l.user_id
        ORDER BY created_at LIMIT 1
    )
    WHERE l.campaign_id IS NULL;

UPDATE public.activity_log a
    SET campaign_id = (
        SELECT id FROM public.campaigns
        WHERE owner_id = a.user_id
        ORDER BY created_at LIMIT 1
    )
    WHERE a.campaign_id IS NULL;

-- Agora sim, tornar NOT NULL
ALTER TABLE public.characters   ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE public.npcs         ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE public.sessions     ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE public.items        ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE public.locations    ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE public.lores        ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE public.activity_log ALTER COLUMN campaign_id SET NOT NULL;


-- =====================================================
-- FASE 6: Criar memberships para owners existentes
-- =====================================================

INSERT INTO public.memberships (campaign_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.campaigns
ON CONFLICT (campaign_id, user_id) DO NOTHING;


-- =====================================================
-- FASE 7: Função helper de RLS
-- =====================================================

-- Retorna o role do usuário logado numa campanha, ou NULL se não for membro.
-- SECURITY DEFINER para evitar recursão de RLS na tabela memberships.
CREATE OR REPLACE FUNCTION public.user_campaign_role(p_campaign_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM memberships
    WHERE campaign_id = p_campaign_id
    AND user_id = auth.uid()
    LIMIT 1;
$$;


-- =====================================================
-- FASE 8: Refatorar TODAS as RLS policies
-- =====================================================

-- -----------------------------------------------------
-- campaigns
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own campaigns" ON public.campaigns;

CREATE POLICY "Members can view campaign"
    ON public.campaigns FOR SELECT
    USING (user_campaign_role(id) IS NOT NULL);

CREATE POLICY "Authenticated users can create campaigns"
    ON public.campaigns FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Owner can update campaign"
    ON public.campaigns FOR UPDATE
    USING (user_campaign_role(id) = 'owner')
    WITH CHECK (user_campaign_role(id) = 'owner');

CREATE POLICY "Owner can delete campaign"
    ON public.campaigns FOR DELETE
    USING (user_campaign_role(id) = 'owner');

-- -----------------------------------------------------
-- memberships
-- -----------------------------------------------------
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view memberships"
    ON public.memberships FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Owner can add members"
    ON public.memberships FOR INSERT
    WITH CHECK (user_campaign_role(campaign_id) = 'owner');

CREATE POLICY "Owner can update member roles"
    ON public.memberships FOR UPDATE
    USING (user_campaign_role(campaign_id) = 'owner')
    WITH CHECK (user_campaign_role(campaign_id) = 'owner');

CREATE POLICY "Owner can remove members or self-leave"
    ON public.memberships FOR DELETE
    USING (
        user_campaign_role(campaign_id) = 'owner'
        OR user_id = auth.uid()
    );

-- -----------------------------------------------------
-- invites
-- -----------------------------------------------------
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members or invitee can view invites"
    ON public.invites FOR SELECT
    USING (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Owner can create invites"
    ON public.invites FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) = 'owner'
        AND invited_by = auth.uid()
    );

CREATE POLICY "Owner or invitee can update invite"
    ON public.invites FOR UPDATE
    USING (
        user_campaign_role(campaign_id) = 'owner'
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Owner can delete invites"
    ON public.invites FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');

-- -----------------------------------------------------
-- characters
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own characters" ON public.characters;

CREATE POLICY "Campaign members can view characters"
    ON public.characters FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Editors can create characters"
    ON public.characters FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        AND created_by = auth.uid()
    );

CREATE POLICY "Editors can update characters"
    ON public.characters FOR UPDATE
    USING (user_campaign_role(campaign_id) IN ('owner', 'editor'))
    WITH CHECK (user_campaign_role(campaign_id) IN ('owner', 'editor'));

CREATE POLICY "Owner can delete characters"
    ON public.characters FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');

-- -----------------------------------------------------
-- npcs
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own npcs" ON public.npcs;

CREATE POLICY "Campaign members can view npcs"
    ON public.npcs FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Editors can create npcs"
    ON public.npcs FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        AND created_by = auth.uid()
    );

CREATE POLICY "Editors can update npcs"
    ON public.npcs FOR UPDATE
    USING (user_campaign_role(campaign_id) IN ('owner', 'editor'))
    WITH CHECK (user_campaign_role(campaign_id) IN ('owner', 'editor'));

CREATE POLICY "Owner can delete npcs"
    ON public.npcs FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');

-- -----------------------------------------------------
-- sessions
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own sessions" ON public.sessions;

CREATE POLICY "Campaign members can view sessions"
    ON public.sessions FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Editors can create sessions"
    ON public.sessions FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        AND created_by = auth.uid()
    );

CREATE POLICY "Editors can update sessions"
    ON public.sessions FOR UPDATE
    USING (user_campaign_role(campaign_id) IN ('owner', 'editor'))
    WITH CHECK (user_campaign_role(campaign_id) IN ('owner', 'editor'));

CREATE POLICY "Owner can delete sessions"
    ON public.sessions FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');

-- -----------------------------------------------------
-- items
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own items" ON public.items;

CREATE POLICY "Campaign members can view items"
    ON public.items FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Editors can create items"
    ON public.items FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        AND created_by = auth.uid()
    );

CREATE POLICY "Editors can update items"
    ON public.items FOR UPDATE
    USING (user_campaign_role(campaign_id) IN ('owner', 'editor'))
    WITH CHECK (user_campaign_role(campaign_id) IN ('owner', 'editor'));

CREATE POLICY "Owner can delete items"
    ON public.items FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');

-- -----------------------------------------------------
-- locations
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own locations" ON public.locations;

CREATE POLICY "Campaign members can view locations"
    ON public.locations FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Editors can create locations"
    ON public.locations FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        AND created_by = auth.uid()
    );

CREATE POLICY "Editors can update locations"
    ON public.locations FOR UPDATE
    USING (user_campaign_role(campaign_id) IN ('owner', 'editor'))
    WITH CHECK (user_campaign_role(campaign_id) IN ('owner', 'editor'));

CREATE POLICY "Owner can delete locations"
    ON public.locations FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');

-- -----------------------------------------------------
-- lores
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own lores" ON public.lores;

CREATE POLICY "Campaign members can view lores"
    ON public.lores FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Editors can create lores"
    ON public.lores FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        AND created_by = auth.uid()
    );

CREATE POLICY "Editors can update lores"
    ON public.lores FOR UPDATE
    USING (user_campaign_role(campaign_id) IN ('owner', 'editor'))
    WITH CHECK (user_campaign_role(campaign_id) IN ('owner', 'editor'));

CREATE POLICY "Owner can delete lores"
    ON public.lores FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');

-- -----------------------------------------------------
-- activity_log
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users manage own activity" ON public.activity_log;

CREATE POLICY "Campaign members can view activity"
    ON public.activity_log FOR SELECT
    USING (user_campaign_role(campaign_id) IS NOT NULL);

CREATE POLICY "Editors can log activity"
    ON public.activity_log FOR INSERT
    WITH CHECK (
        user_campaign_role(campaign_id) IN ('owner', 'editor')
        AND created_by = auth.uid()
    );

-- Logs são imutáveis — sem UPDATE policy

CREATE POLICY "Owner can delete activity"
    ON public.activity_log FOR DELETE
    USING (user_campaign_role(campaign_id) = 'owner');
