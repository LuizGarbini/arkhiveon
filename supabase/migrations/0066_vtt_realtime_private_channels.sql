-- =============================================================================
-- 0066: Realtime privado do VTT (Broadcast + Presence) com remetente autenticado
--
-- Tópicos (tudo minúsculo; C = campaign_id, S = scene_id, U = user_id):
--   vtt:C:S:u:U    canal do usuário U. Lê: membro com acesso à cena.
--                  Escreve: só o próprio U (auth.uid()). Broadcast e Presence.
--   vtt:C:S:gm     mestre -> todos. Lê: membro com acesso à cena.
--                  Escreve: owner/editor. Só Broadcast.
--   vtt:C:S:gmonly só mestre/co-mestre. Lê e escreve: owner/editor. Só Broadcast.
--
-- Acesso à cena: owner/editor em qualquer cena da campanha; viewer só em cena
-- ativa (mesma regra do RLS de vtt_scenes).
-- Padrão da 0023: EXISTS inline, sem helper. Comparação por texto: um tópico
-- malformado nega, nunca levanta erro de cast.
-- Não aplicar no projeto real sem o Luiz.
-- =============================================================================

-- 1. Receber (Broadcast e Presence) em gm e u:*
create policy "vtt_rt_receive_scene_topics"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and (select realtime.topic()) ~ '^vtt:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(gm|u:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
  and (
    realtime.messages.extension = 'broadcast'
    or split_part((select realtime.topic()), ':', 4) = 'u'
  )
  and exists (
    select 1
    from public.memberships m
    join public.vtt_scenes s on s.campaign_id = m.campaign_id
    where m.user_id = (select auth.uid())
      and m.campaign_id::text = split_part((select realtime.topic()), ':', 2)
      and s.id::text = split_part((select realtime.topic()), ':', 3)
      and (m.role in ('owner', 'editor') or s.is_active)
  )
);

-- 2. Receber no gmonly: só owner/editor
create policy "vtt_rt_receive_gm_only"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) ~ '^vtt:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:gmonly$'
  and exists (
    select 1
    from public.memberships m
    join public.vtt_scenes s on s.campaign_id = m.campaign_id
    where m.user_id = (select auth.uid())
      and m.role in ('owner', 'editor')
      and m.campaign_id::text = split_part((select realtime.topic()), ':', 2)
      and s.id::text = split_part((select realtime.topic()), ':', 3)
  )
);

-- 3. Enviar em gm e gmonly: só owner/editor
create policy "vtt_rt_send_gm_topics"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) ~ '^vtt:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:(gm|gmonly)$'
  and exists (
    select 1
    from public.memberships m
    join public.vtt_scenes s on s.campaign_id = m.campaign_id
    where m.user_id = (select auth.uid())
      and m.role in ('owner', 'editor')
      and m.campaign_id::text = split_part((select realtime.topic()), ':', 2)
      and s.id::text = split_part((select realtime.topic()), ':', 3)
  )
);

-- 4. Enviar (Broadcast e Presence) no PRÓPRIO tópico u:<auth.uid()>
create policy "vtt_rt_send_own_user_topic"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and (select realtime.topic()) ~ '^vtt:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:u:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and split_part((select realtime.topic()), ':', 5) = (select auth.uid())::text
  and exists (
    select 1
    from public.memberships m
    join public.vtt_scenes s on s.campaign_id = m.campaign_id
    where m.user_id = (select auth.uid())
      and m.campaign_id::text = split_part((select realtime.topic()), ':', 2)
      and s.id::text = split_part((select realtime.topic()), ':', 3)
      and (m.role in ('owner', 'editor') or s.is_active)
  )
);
