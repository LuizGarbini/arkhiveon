-- Rollback da 0081 (manual; a CLI não aplica sozinho). Volta as policies e o
-- guard do UPDATE ao estado do prod antes da 0081 (lista de proibidos: o
-- jogador volta a poder trocar nome, imagem, auras e visão do token). A coluna placed_by é mantida por
-- padrão (dados); descomente a última linha para removê-la.
begin;

drop function if exists public.vtt_place_token(uuid, uuid, uuid, double precision, double precision);
drop function if exists private.vtt_can_read_character(uuid);
drop function if exists private.vtt_can_read_npc(uuid);

drop policy if exists "GM can insert tokens" on public.vtt_tokens;
create policy "GM or token owners can insert tokens" on public.vtt_tokens
for insert with check (
	(user_scene_campaign_role(scene_id) = any (array['owner'::text, 'editor'::text]))
	or (
		(user_scene_campaign_role(scene_id) = 'viewer'::text)
		and (
			(controlled_by @> jsonb_build_array((auth.uid())::text))
			or (
				(character_id is not null)
				and (exists (select 1 from characters c
					where c.id = vtt_tokens.character_id
						and (c.user_id = auth.uid() or c.created_by = auth.uid())))
			)
		)
	)
);

drop policy if exists "GM or token controllers can delete tokens" on public.vtt_tokens;
create policy "GM or token controllers can delete tokens" on public.vtt_tokens
for delete using (
	(user_scene_campaign_role(scene_id) = any (array['owner'::text, 'editor'::text]))
	or (
		(user_scene_campaign_role(scene_id) = 'viewer'::text)
		and (
			(controlled_by @> jsonb_build_array((auth.uid())::text))
			or (
				(character_id is not null)
				and (exists (select 1 from characters c
					where c.id = vtt_tokens.character_id
						and (c.user_id = auth.uid() or c.created_by = auth.uid())))
			)
		)
	)
);

create or replace function public.vtt_tokens_player_update_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

-- alter table public.vtt_tokens drop column if exists placed_by;
commit;
