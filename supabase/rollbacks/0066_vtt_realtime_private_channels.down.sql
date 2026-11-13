-- Rollback da 0066. Reverter o cliente ANTES (senão o VTT perde cursor, ping,
-- régua, presença, moldes e névoa em tempo real; a persistência no banco segue).
drop policy if exists "vtt_rt_send_own_user_topic" on realtime.messages;
drop policy if exists "vtt_rt_send_gm_topics"      on realtime.messages;
drop policy if exists "vtt_rt_receive_gm_only"     on realtime.messages;
drop policy if exists "vtt_rt_receive_scene_topics" on realtime.messages;
