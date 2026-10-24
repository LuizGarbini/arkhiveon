-- =============================================================================
-- Migration 0048: jogador só mexe no que é dele no token
-- =============================================================================
-- Problema (teste local, migrations 0001-0045): o jogador (viewer) que controla
-- um token conseguia, pelo servidor, mudar controlled_by (dar ou tirar controle),
-- scene_id (levar o token para outra cena da campanha, inclusive inativa) e
-- character_id (vincular a ficha de outra pessoa). A UI nunca manda esses campos.
--
-- Correção:
--   1) Trigger BEFORE UPDATE: quem não é owner/editor da campanha não muda
--      scene_id, character_id, npc_id, controlled_by, layer, is_hidden e is_locked.
--      Mover, girar, tamanho, PV, condições, auras e elevação continuam livres.
--   2) WITH CHECK do UPDATE: o ramo do jogador passa a exigir também
--      layer != 'gm' and is_hidden = false (hoje isso só é negado porque o
--      UPDATE aplica a policy de SELECT à linha nova).
-- Sem auth.uid() (service_role, postgres, migrations) o trigger não interfere.
-- NÃO APLICADA. Merge e aplicação só pelo Luiz.

create or replace function public.vtt_tokens_player_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is null then
		return new;
	end if;
	if user_scene_campaign_role(old.scene_id) in ('owner', 'editor') then
		return new;
	end if;
	if new.scene_id is distinct from old.scene_id
		or new.character_id is distinct from old.character_id
		or new.npc_id is distinct from old.npc_id
		or new.controlled_by is distinct from old.controlled_by
		or new.layer is distinct from old.layer
		or new.is_hidden is distinct from old.is_hidden
		or new.is_locked is distinct from old.is_locked
	then
		raise exception 'Só o mestre pode mudar cena, ficha, controle, camada, visibilidade ou trava do token.'
			using errcode = '42501';
	end if;
	return new;
end;
$$;

revoke all on function public.vtt_tokens_player_update_guard() from public, anon, authenticated;

drop trigger if exists vtt_tokens_player_update_guard on public.vtt_tokens;
create trigger vtt_tokens_player_update_guard
before update on public.vtt_tokens
for each row execute function public.vtt_tokens_player_update_guard();

drop policy if exists "GM or token controllers can update tokens" on public.vtt_tokens;
create policy "GM or token controllers can update tokens" on public.vtt_tokens
for update using (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
    or (
        user_scene_campaign_role(scene_id) = 'viewer'
        and is_locked = false
        and (
            controlled_by @> jsonb_build_array(auth.uid()::text)
            or (
                character_id is not null
                and exists (
                    select 1 from characters c
                    where c.id = character_id
                    and (c.user_id = auth.uid() or c.created_by = auth.uid())
                )
            )
        )
    )
) with check (
    user_scene_campaign_role(scene_id) in ('owner', 'editor')
    or (
        user_scene_campaign_role(scene_id) = 'viewer'
        and is_locked = false
        and layer != 'gm'
        and is_hidden = false
    )
);
