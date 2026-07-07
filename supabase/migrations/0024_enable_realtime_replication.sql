-- =============================================================================
-- Migration 0024: Enable Realtime Replication
--
-- Garante que as tabelas de entidades do RPG estão incluídas na publicação
-- `supabase_realtime`. Sem isso, o banco de dados do Supabase não envia as
-- alterações via WebSocket para nenhum cliente (mestre ou jogador).
-- =============================================================================

-- 1. Garante que a publicação padrão do Supabase Realtime existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Define a identidade de réplica para as tabelas (necessário para updates/deletes no Realtime)
ALTER TABLE public.characters REPLICA IDENTITY DEFAULT;
ALTER TABLE public.npcs REPLICA IDENTITY DEFAULT;
ALTER TABLE public.sessions REPLICA IDENTITY DEFAULT;
ALTER TABLE public.items REPLICA IDENTITY DEFAULT;
ALTER TABLE public.locations REPLICA IDENTITY DEFAULT;
ALTER TABLE public.lores REPLICA IDENTITY DEFAULT;

-- 3. Adiciona as tabelas à publicação se elas já não estiverem nela
DO $$
DECLARE
  pub_id oid;
BEGIN
  SELECT oid INTO pub_id FROM pg_publication WHERE pubname = 'supabase_realtime';
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_rel WHERE prpubid = pub_id AND prrelid = 'public.characters'::regclass) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_rel WHERE prpubid = pub_id AND prrelid = 'public.npcs'::regclass) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.npcs;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_rel WHERE prpubid = pub_id AND prrelid = 'public.sessions'::regclass) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_rel WHERE prpubid = pub_id AND prrelid = 'public.items'::regclass) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_rel WHERE prpubid = pub_id AND prrelid = 'public.locations'::regclass) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_rel WHERE prpubid = pub_id AND prrelid = 'public.lores'::regclass) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lores;
  END IF;
END $$;
