-- =============================================================================
-- Migration 0062: Suporte a Vida Temporária para tokens no VTT
-- =============================================================================
-- Permite que tokens no VTT (inclusive figurantes, monstros e NPCs criados
-- diretamente para a cena sem ficha vinculada) tenham vida temporária armazenada
-- e sincronizada entre os jogadores da mesa.

alter table public.vtt_tokens
    add column if not exists temp_hp integer default 0;
