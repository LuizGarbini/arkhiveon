-- Migration: 0009_alter_fk_campaign_cascade
-- Description: Alter campaigns foreign keys to ON DELETE CASCADE to allow deleting campaigns containing entities.

ALTER TABLE public.characters DROP CONSTRAINT IF EXISTS characters_campaign_id_fkey;
ALTER TABLE public.npcs DROP CONSTRAINT IF EXISTS npcs_campaign_id_fkey;
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_campaign_id_fkey;
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_campaign_id_fkey;
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_campaign_id_fkey;
ALTER TABLE public.lores DROP CONSTRAINT IF EXISTS lores_campaign_id_fkey;
ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_campaign_id_fkey;

ALTER TABLE public.characters ADD CONSTRAINT characters_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.npcs ADD CONSTRAINT npcs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.items ADD CONSTRAINT items_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.locations ADD CONSTRAINT locations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.lores ADD CONSTRAINT lores_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;
