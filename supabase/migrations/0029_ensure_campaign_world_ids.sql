-- Migration 0029: Ensure all campaigns have a world_id and update worlds RLS for co-masters/members

-- 1. Ensure any campaign missing a world_id is assigned its owner's default world
DO $$
DECLARE
	r RECORD;
	v_world_id UUID;
BEGIN
	FOR r IN SELECT id, owner_id FROM public.campaigns WHERE world_id IS NULL LOOP
		SELECT id INTO v_world_id FROM public.worlds
		WHERE owner_user_id = r.owner_id AND is_default = true
		LIMIT 1;

		IF v_world_id IS NULL THEN
			v_world_id := gen_random_uuid();
			INSERT INTO public.worlds (id, name, is_default, owner_user_id)
			VALUES (v_world_id, 'Mundo Padrão', true, r.owner_id);
		END IF;

		UPDATE public.campaigns SET world_id = v_world_id WHERE id = r.id;
	END LOOP;
END $$;

-- 2. Update RLS on worlds table so members and co-masters always see the world of their campaigns
DROP POLICY IF EXISTS "World members can view worlds" ON public.worlds;
CREATE POLICY "World members can view worlds"
	ON public.worlds FOR SELECT
	USING (
		owner_user_id = auth.uid()
		OR EXISTS (
			SELECT 1 FROM public.campaigns c
			JOIN public.memberships m ON m.campaign_id = c.id
			WHERE c.world_id = worlds.id AND m.user_id = auth.uid()
		)
	);
