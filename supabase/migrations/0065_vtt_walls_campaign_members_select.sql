-- 0063: permite que todos os participantes da campanha (jogadores e co-mestres)
-- leiam as paredes da cena para bloqueio de colisão de movimento e linha de visão,
-- mantendo a criação, edição e exclusão de paredes exclusivas para o mestre e co-mestre (owner, editor).
-- Também adiciona a tabela vtt_walls à publicação supabase_realtime.

drop policy if exists "GM can view walls" on public.vtt_walls;
drop policy if exists "Campaign participants can view walls" on public.vtt_walls;

create policy "Campaign participants can view walls" on public.vtt_walls
for select using (
    user_scene_campaign_role(scene_id) is not null
);

do $$
declare
    pub_id oid;
begin
    select oid into pub_id from pg_publication where pubname = 'supabase_realtime';
    if pub_id is not null then
        if not exists (
            select 1 from pg_publication_rel pr
            join pg_class c on c.oid = pr.prrelid
            join pg_namespace n on n.oid = c.relnamespace
            where pr.prpubid = pub_id
              and n.nspname = 'public'
              and c.relname = 'vtt_walls'
        ) then
            alter publication supabase_realtime add table public.vtt_walls;
        end if;
    end if;
end;
$$;
