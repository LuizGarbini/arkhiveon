-- Extra SQL that Drizzle Kit does not generate. Apply after 0000 on the backend.
-- Mirrors supabase/migrations/0001 + per-table triggers.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$$;

CREATE TRIGGER worlds_set_updated_at BEFORE UPDATE ON public.worlds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER characters_set_updated_at BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER npcs_set_updated_at BEFORE UPDATE ON public.npcs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER items_set_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER locations_set_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lores_set_updated_at BEFORE UPDATE ON public.lores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER image_assets_set_updated_at BEFORE UPDATE ON public.image_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER user_plans_set_updated_at BEFORE UPDATE ON public.user_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER custom_templates_set_updated_at BEFORE UPDATE ON public.custom_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER spells_set_updated_at BEFORE UPDATE ON public.spells FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER feats_set_updated_at BEFORE UPDATE ON public.feats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER factions_set_updated_at BEFORE UPDATE ON public.factions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER faction_reputations_set_updated_at BEFORE UPDATE ON public.faction_reputations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER world_news_set_updated_at BEFORE UPDATE ON public.world_news FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER news_comments_set_updated_at BEFORE UPDATE ON public.news_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vtt_scenes_set_updated_at BEFORE UPDATE ON public.vtt_scenes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vtt_tokens_set_updated_at BEFORE UPDATE ON public.vtt_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vtt_fog_states_set_updated_at BEFORE UPDATE ON public.vtt_fog_states FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
