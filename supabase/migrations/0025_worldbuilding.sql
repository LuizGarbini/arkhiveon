-- =============================================================================
-- Migration 0025: Worldbuilding — mundos, escopo de publicação, facções, mural
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Worlds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worlds (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	name text NOT NULL DEFAULT 'Mundo Padrão',
	is_default boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS worlds_owner_user_id_idx ON public.worlds(owner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS worlds_one_default_per_owner_idx
	ON public.worlds(owner_user_id)
	WHERE is_default = true;

DROP TRIGGER IF EXISTS worlds_set_updated_at ON public.worlds;
CREATE TRIGGER worlds_set_updated_at
BEFORE UPDATE ON public.worlds
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Campaigns → world
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaigns
	ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES public.worlds(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3. World entity columns (npcs, items, locations, lores)
-- ---------------------------------------------------------------------------
ALTER TABLE public.npcs
	ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS publication_scope text NOT NULL DEFAULT 'restricted'
		CHECK (publication_scope IN ('global', 'restricted')),
	ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
		CHECK (visibility IN ('public', 'master_secret')),
	ADD COLUMN IF NOT EXISTS campaign_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.items
	ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS publication_scope text NOT NULL DEFAULT 'restricted'
		CHECK (publication_scope IN ('global', 'restricted')),
	ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
		CHECK (visibility IN ('public', 'master_secret')),
	ADD COLUMN IF NOT EXISTS campaign_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.locations
	ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS publication_scope text NOT NULL DEFAULT 'restricted'
		CHECK (publication_scope IN ('global', 'restricted')),
	ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
		CHECK (visibility IN ('public', 'master_secret')),
	ADD COLUMN IF NOT EXISTS campaign_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.lores
	ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS publication_scope text NOT NULL DEFAULT 'restricted'
		CHECK (publication_scope IN ('global', 'restricted')),
	ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
		CHECK (visibility IN ('public', 'master_secret')),
	ADD COLUMN IF NOT EXISTS campaign_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS npcs_world_id_idx ON public.npcs(world_id);
CREATE INDEX IF NOT EXISTS items_world_id_idx ON public.items(world_id);
CREATE INDEX IF NOT EXISTS locations_world_id_idx ON public.locations(world_id);
CREATE INDEX IF NOT EXISTS lores_world_id_idx ON public.lores(world_id);

-- World entities survive campaign deletion (origin campaign_id nullable)
ALTER TABLE public.npcs DROP CONSTRAINT IF EXISTS npcs_campaign_id_fkey;
ALTER TABLE public.npcs ADD CONSTRAINT npcs_campaign_id_fkey
	FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_campaign_id_fkey;
ALTER TABLE public.items ADD CONSTRAINT items_campaign_id_fkey
	FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_campaign_id_fkey;
ALTER TABLE public.locations ADD CONSTRAINT locations_campaign_id_fkey
	FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.lores DROP CONSTRAINT IF EXISTS lores_campaign_id_fkey;
ALTER TABLE public.lores ADD CONSTRAINT lores_campaign_id_fkey
	FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. Factions + reputations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.factions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
	name text NOT NULL DEFAULT '',
	leader text NOT NULL DEFAULT '',
	seat text NOT NULL DEFAULT '',
	goals text NOT NULL DEFAULT '',
	alignment text NOT NULL DEFAULT '',
	influence text NOT NULL DEFAULT '',
	description text NOT NULL DEFAULT '',
	image_url text NOT NULL DEFAULT '',
	data jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS factions_world_id_idx ON public.factions(world_id);

DROP TRIGGER IF EXISTS factions_set_updated_at ON public.factions;
CREATE TRIGGER factions_set_updated_at
BEFORE UPDATE ON public.factions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.faction_reputations (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	faction_id uuid NOT NULL REFERENCES public.factions(id) ON DELETE CASCADE,
	campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
	status text NOT NULL DEFAULT 'neutral'
		CHECK (status IN ('ally', 'neutral', 'hostile', 'unfriendly')),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (faction_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS faction_reputations_campaign_id_idx
	ON public.faction_reputations(campaign_id);

DROP TRIGGER IF EXISTS faction_reputations_set_updated_at ON public.faction_reputations;
CREATE TRIGGER faction_reputations_set_updated_at
BEFORE UPDATE ON public.faction_reputations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. World news + comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_news (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
	author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	title text NOT NULL DEFAULT '',
	body text NOT NULL DEFAULT '',
	category text NOT NULL DEFAULT '',
	audience text NOT NULL DEFAULT 'global'
		CHECK (audience IN ('global', 'restricted')),
	campaign_ids uuid[] NOT NULL DEFAULT '{}',
	visibility text NOT NULL DEFAULT 'public'
		CHECK (visibility IN ('public', 'master_secret')),
	comments_locked boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS world_news_world_id_idx ON public.world_news(world_id);

DROP TRIGGER IF EXISTS world_news_set_updated_at ON public.world_news;
CREATE TRIGGER world_news_set_updated_at
BEFORE UPDATE ON public.world_news
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.news_comments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	news_id uuid NOT NULL REFERENCES public.world_news(id) ON DELETE CASCADE,
	author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
	parent_id uuid REFERENCES public.news_comments(id) ON DELETE CASCADE,
	body text NOT NULL DEFAULT '',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_comments_news_id_idx ON public.news_comments(news_id);
CREATE INDEX IF NOT EXISTS news_comments_parent_id_idx ON public.news_comments(parent_id);

DROP TRIGGER IF EXISTS news_comments_set_updated_at ON public.news_comments;
CREATE TRIGGER news_comments_set_updated_at
BEFORE UPDATE ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Data migration — default world per owner + backfill entities
-- ---------------------------------------------------------------------------
DO $$
DECLARE
	owner_rec RECORD;
	new_world_id uuid;
	camp_rec RECORD;
BEGIN
	FOR owner_rec IN
		SELECT DISTINCT owner_id AS owner_user_id FROM public.campaigns WHERE owner_id IS NOT NULL
	LOOP
		INSERT INTO public.worlds (owner_user_id, name, is_default)
		VALUES (owner_rec.owner_user_id, 'Mundo Padrão', true);

		SELECT id INTO new_world_id
		FROM public.worlds
		WHERE owner_user_id = owner_rec.owner_user_id AND is_default = true
		LIMIT 1;

		IF new_world_id IS NULL THEN
			INSERT INTO public.worlds (owner_user_id, name, is_default)
			VALUES (owner_rec.owner_user_id, 'Mundo Padrão', true)
			RETURNING id INTO new_world_id;
		END IF;

		UPDATE public.campaigns
		SET world_id = new_world_id
		WHERE owner_id = owner_rec.owner_user_id AND world_id IS NULL;
	END LOOP;

	-- Backfill world entities from legacy campaign_id
	UPDATE public.npcs n
	SET
		world_id = c.world_id,
		publication_scope = 'restricted',
		campaign_ids = ARRAY[n.campaign_id],
		visibility = 'public'
	FROM public.campaigns c
	WHERE n.campaign_id = c.id AND n.world_id IS NULL;

	UPDATE public.items i
	SET
		world_id = c.world_id,
		publication_scope = 'restricted',
		campaign_ids = ARRAY[i.campaign_id],
		visibility = 'public'
	FROM public.campaigns c
	WHERE i.campaign_id = c.id AND i.world_id IS NULL;

	UPDATE public.locations l
	SET
		world_id = c.world_id,
		publication_scope = 'restricted',
		campaign_ids = ARRAY[l.campaign_id],
		visibility = 'public'
	FROM public.campaigns c
	WHERE l.campaign_id = c.id AND l.world_id IS NULL;

	UPDATE public.lores lo
	SET
		world_id = c.world_id,
		publication_scope = 'restricted',
		campaign_ids = ARRAY[lo.campaign_id],
		visibility = CASE WHEN lo.is_secret THEN 'master_secret' ELSE 'public' END
	FROM public.campaigns c
	WHERE lo.campaign_id = c.id AND lo.world_id IS NULL;
END $$;

ALTER TABLE public.campaigns ALTER COLUMN world_id SET NOT NULL;
ALTER TABLE public.npcs ALTER COLUMN world_id SET NOT NULL;
ALTER TABLE public.items ALTER COLUMN world_id SET NOT NULL;
ALTER TABLE public.locations ALTER COLUMN world_id SET NOT NULL;
ALTER TABLE public.lores ALTER COLUMN world_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Campaign delete — promote orphan restricted scopes + reputations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_orphan_restricted_scopes(
	p_world_id uuid,
	p_campaign_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
	UPDATE public.npcs
	SET
		campaign_ids = array_remove(campaign_ids, p_campaign_id),
		publication_scope = CASE
			WHEN publication_scope = 'restricted'
				AND cardinality(array_remove(campaign_ids, p_campaign_id)) = 0
			THEN 'global'
			ELSE publication_scope
		END
	WHERE world_id = p_world_id
		AND publication_scope = 'restricted'
		AND p_campaign_id = ANY(campaign_ids);

	UPDATE public.items
	SET
		campaign_ids = array_remove(campaign_ids, p_campaign_id),
		publication_scope = CASE
			WHEN publication_scope = 'restricted'
				AND cardinality(array_remove(campaign_ids, p_campaign_id)) = 0
			THEN 'global'
			ELSE publication_scope
		END
	WHERE world_id = p_world_id
		AND publication_scope = 'restricted'
		AND p_campaign_id = ANY(campaign_ids);

	UPDATE public.locations
	SET
		campaign_ids = array_remove(campaign_ids, p_campaign_id),
		publication_scope = CASE
			WHEN publication_scope = 'restricted'
				AND cardinality(array_remove(campaign_ids, p_campaign_id)) = 0
			THEN 'global'
			ELSE publication_scope
		END
	WHERE world_id = p_world_id
		AND publication_scope = 'restricted'
		AND p_campaign_id = ANY(campaign_ids);

	UPDATE public.lores
	SET
		campaign_ids = array_remove(campaign_ids, p_campaign_id),
		publication_scope = CASE
			WHEN publication_scope = 'restricted'
				AND cardinality(array_remove(campaign_ids, p_campaign_id)) = 0
			THEN 'global'
			ELSE publication_scope
		END
	WHERE world_id = p_world_id
		AND publication_scope = 'restricted'
		AND p_campaign_id = ANY(campaign_ids);

	UPDATE public.world_news
	SET
		campaign_ids = array_remove(campaign_ids, p_campaign_id),
		audience = CASE
			WHEN audience = 'restricted'
				AND cardinality(array_remove(campaign_ids, p_campaign_id)) = 0
			THEN 'global'
			ELSE audience
		END
	WHERE world_id = p_world_id
		AND audience = 'restricted'
		AND p_campaign_id = ANY(campaign_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_campaign_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF OLD.world_id IS NOT NULL THEN
		PERFORM public.promote_orphan_restricted_scopes(OLD.world_id, OLD.id);
	END IF;
	DELETE FROM public.faction_reputations WHERE campaign_id = OLD.id;
	RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS before_campaign_delete ON public.campaigns;
CREATE TRIGGER before_campaign_delete
BEFORE DELETE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.handle_campaign_delete();

-- Neutral reputations when faction or campaign is created
CREATE OR REPLACE FUNCTION public.seed_faction_reputations_for_faction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	INSERT INTO public.faction_reputations (faction_id, campaign_id, status)
	SELECT NEW.id, c.id, 'neutral'
	FROM public.campaigns c
	WHERE c.world_id = NEW.world_id
	ON CONFLICT (faction_id, campaign_id) DO NOTHING;
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_faction_insert ON public.factions;
CREATE TRIGGER after_faction_insert
AFTER INSERT ON public.factions
FOR EACH ROW EXECUTE FUNCTION public.seed_faction_reputations_for_faction();

CREATE OR REPLACE FUNCTION public.seed_faction_reputations_for_campaign()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.world_id IS NULL THEN
		RETURN NEW;
	END IF;
	INSERT INTO public.faction_reputations (faction_id, campaign_id, status)
	SELECT f.id, NEW.id, 'neutral'
	FROM public.factions f
	WHERE f.world_id = NEW.world_id
	ON CONFLICT (faction_id, campaign_id) DO NOTHING;
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_campaign_insert_reputations ON public.campaigns;
CREATE TRIGGER after_campaign_insert_reputations
AFTER INSERT ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.seed_faction_reputations_for_campaign();

-- ---------------------------------------------------------------------------
-- 8. RLS — inline EXISTS (realtime-safe per migration 0023)
-- ---------------------------------------------------------------------------
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faction_reputations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

-- Worlds: members of any campaign in the world
DROP POLICY IF EXISTS "World members can view worlds" ON public.worlds;
CREATE POLICY "World members can view worlds"
	ON public.worlds FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = worlds.id AND m.user_id = auth.uid()
		)
		OR owner_user_id = auth.uid()
	);

DROP POLICY IF EXISTS "Owners can manage worlds" ON public.worlds;
CREATE POLICY "Owners can manage worlds"
	ON public.worlds FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = worlds.id
				AND m.user_id = auth.uid()
				AND m.role = 'owner'
		)
		OR owner_user_id = auth.uid()
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = worlds.id
				AND m.user_id = auth.uid()
				AND m.role = 'owner'
		)
		OR owner_user_id = auth.uid()
	);

-- Factions: all world members read; staff write
DROP POLICY IF EXISTS "World members can view factions" ON public.factions;
CREATE POLICY "World members can view factions"
	ON public.factions FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = factions.world_id AND m.user_id = auth.uid()
		)
	);

DROP POLICY IF EXISTS "World staff can manage factions" ON public.factions;
CREATE POLICY "World staff can manage factions"
	ON public.factions FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = factions.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = factions.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- Faction reputations
DROP POLICY IF EXISTS "Campaign members can view reputations" ON public.faction_reputations;
CREATE POLICY "Campaign members can view reputations"
	ON public.faction_reputations FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			WHERE m.campaign_id = faction_reputations.campaign_id
				AND m.user_id = auth.uid()
		)
	);

DROP POLICY IF EXISTS "World staff can manage reputations" ON public.faction_reputations;
CREATE POLICY "World staff can manage reputations"
	ON public.faction_reputations FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM public.factions f
			JOIN public.campaigns c ON c.world_id = f.world_id
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE f.id = faction_reputations.faction_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.factions f
			JOIN public.campaigns c ON c.world_id = f.world_id
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE f.id = faction_reputations.faction_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- World news visibility (audience ≡ publicationScope)
DROP POLICY IF EXISTS "World members can view news" ON public.world_news;
CREATE POLICY "World members can view news"
	ON public.world_news FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = world_news.world_id
				AND m.user_id = auth.uid()
				AND (
					(world_news.visibility = 'master_secret' AND m.role IN ('owner', 'editor'))
					OR (
						world_news.visibility = 'public'
						AND (
							world_news.audience = 'global'
							OR (world_news.audience = 'restricted' AND c.id = ANY(world_news.campaign_ids))
						)
					)
				)
		)
	);

DROP POLICY IF EXISTS "World staff can manage news" ON public.world_news;
CREATE POLICY "World staff can manage news"
	ON public.world_news FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = world_news.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = world_news.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- News comments inherit parent news visibility
DROP POLICY IF EXISTS "News viewers can read comments" ON public.news_comments;
CREATE POLICY "News viewers can read comments"
	ON public.news_comments FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.world_news wn
			JOIN public.memberships m ON true
			JOIN public.campaigns c ON c.id = m.campaign_id AND c.world_id = wn.world_id
			WHERE wn.id = news_comments.news_id
				AND m.user_id = auth.uid()
				AND (
					(wn.visibility = 'master_secret' AND m.role IN ('owner', 'editor'))
					OR (
						wn.visibility = 'public'
						AND (
							wn.audience = 'global'
							OR (wn.audience = 'restricted' AND c.id = ANY(wn.campaign_ids))
						)
					)
				)
		)
	);

DROP POLICY IF EXISTS "News viewers can comment" ON public.news_comments;
CREATE POLICY "News viewers can comment"
	ON public.news_comments FOR INSERT
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.world_news wn
			JOIN public.memberships m ON true
			JOIN public.campaigns c ON c.id = m.campaign_id AND c.world_id = wn.world_id
			WHERE wn.id = news_comments.news_id
				AND m.user_id = auth.uid()
				AND (
					(wn.visibility = 'master_secret' AND m.role IN ('owner', 'editor'))
					OR (
						wn.visibility = 'public'
						AND (
							wn.audience = 'global'
							OR (wn.audience = 'restricted' AND c.id = ANY(wn.campaign_ids))
						)
					)
				)
				AND (
					wn.comments_locked = false
					OR m.role IN ('owner', 'editor')
				)
		)
		AND author_id = auth.uid()
	);

DROP POLICY IF EXISTS "Authors and staff can update comments" ON public.news_comments;
CREATE POLICY "Authors and staff can update comments"
	ON public.news_comments FOR UPDATE
	USING (
		author_id = auth.uid()
		OR EXISTS (
			SELECT 1 FROM public.world_news wn
			JOIN public.campaigns c ON c.world_id = wn.world_id
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE wn.id = news_comments.news_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

DROP POLICY IF EXISTS "Authors and staff can delete comments" ON public.news_comments;
CREATE POLICY "Authors and staff can delete comments"
	ON public.news_comments FOR DELETE
	USING (
		author_id = auth.uid()
		OR EXISTS (
			SELECT 1 FROM public.world_news wn
			JOIN public.campaigns c ON c.world_id = wn.world_id
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE wn.id = news_comments.news_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- Replace world entity RLS policies
DROP POLICY IF EXISTS "Campaign members can view npcs" ON public.npcs;
DROP POLICY IF EXISTS "Editors can create npcs" ON public.npcs;
DROP POLICY IF EXISTS "Editors can update npcs" ON public.npcs;
DROP POLICY IF EXISTS "Owner can delete npcs" ON public.npcs;

CREATE POLICY "World members can view npcs"
	ON public.npcs FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = npcs.world_id
				AND m.user_id = auth.uid()
				AND (
					(npcs.visibility = 'master_secret' AND m.role IN ('owner', 'editor'))
					OR (
						npcs.visibility = 'public'
						AND (
							npcs.publication_scope = 'global'
							OR (npcs.publication_scope = 'restricted' AND c.id = ANY(npcs.campaign_ids))
						)
					)
				)
		)
	);

CREATE POLICY "World staff can insert npcs"
	ON public.npcs FOR INSERT
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = npcs.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
		AND created_by = auth.uid()
	);

CREATE POLICY "World staff can update npcs"
	ON public.npcs FOR UPDATE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = npcs.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

CREATE POLICY "World staff can delete npcs"
	ON public.npcs FOR DELETE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = npcs.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- items
DROP POLICY IF EXISTS "Campaign members can view items" ON public.items;
DROP POLICY IF EXISTS "Editors can create items" ON public.items;
DROP POLICY IF EXISTS "Editors can update items" ON public.items;
DROP POLICY IF EXISTS "Owner can delete items" ON public.items;

CREATE POLICY "World members can view items"
	ON public.items FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
				AND (
					(items.visibility = 'master_secret' AND m.role IN ('owner', 'editor'))
					OR (
						items.visibility = 'public'
						AND (
							items.publication_scope = 'global'
							OR (items.publication_scope = 'restricted' AND c.id = ANY(items.campaign_ids))
						)
					)
				)
		)
	);

CREATE POLICY "World staff can insert items"
	ON public.items FOR INSERT
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
		AND created_by = auth.uid()
	);

CREATE POLICY "World staff can update items"
	ON public.items FOR UPDATE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

CREATE POLICY "World staff can delete items"
	ON public.items FOR DELETE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = items.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- locations
DROP POLICY IF EXISTS "Campaign members can view locations" ON public.locations;
DROP POLICY IF EXISTS "Editors can create locations" ON public.locations;
DROP POLICY IF EXISTS "Editors can update locations" ON public.locations;
DROP POLICY IF EXISTS "Owner can delete locations" ON public.locations;

CREATE POLICY "World members can view locations"
	ON public.locations FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = locations.world_id
				AND m.user_id = auth.uid()
				AND (
					(locations.visibility = 'master_secret' AND m.role IN ('owner', 'editor'))
					OR (
						locations.visibility = 'public'
						AND (
							locations.publication_scope = 'global'
							OR (locations.publication_scope = 'restricted' AND c.id = ANY(locations.campaign_ids))
						)
					)
				)
		)
	);

CREATE POLICY "World staff can insert locations"
	ON public.locations FOR INSERT
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = locations.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
		AND created_by = auth.uid()
	);

CREATE POLICY "World staff can update locations"
	ON public.locations FOR UPDATE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = locations.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

CREATE POLICY "World staff can delete locations"
	ON public.locations FOR DELETE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = locations.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- lores (visibility + is_secret mirror)
DROP POLICY IF EXISTS "Campaign members can view lores" ON public.lores;
DROP POLICY IF EXISTS "Editors can create lores" ON public.lores;
DROP POLICY IF EXISTS "Editors can update lores" ON public.lores;
DROP POLICY IF EXISTS "Owner can delete lores" ON public.lores;

CREATE POLICY "World members can view lores"
	ON public.lores FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = lores.world_id
				AND m.user_id = auth.uid()
				AND (
					(lores.visibility = 'master_secret' AND m.role IN ('owner', 'editor'))
					OR (
						lores.visibility = 'public'
						AND (
							lores.publication_scope = 'global'
							OR (lores.publication_scope = 'restricted' AND c.id = ANY(lores.campaign_ids))
						)
					)
				)
		)
	);

CREATE POLICY "World staff can insert lores"
	ON public.lores FOR INSERT
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = lores.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
		AND created_by = auth.uid()
	);

CREATE POLICY "World staff can update lores"
	ON public.lores FOR UPDATE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = lores.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

CREATE POLICY "World staff can delete lores"
	ON public.lores FOR DELETE
	USING (
		EXISTS (
			SELECT 1 FROM public.memberships m
			JOIN public.campaigns c ON c.id = m.campaign_id
			WHERE c.world_id = lores.world_id
				AND m.user_id = auth.uid()
				AND m.role IN ('owner', 'editor')
		)
	);

-- Realtime replication for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.factions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faction_reputations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_news;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_comments;
