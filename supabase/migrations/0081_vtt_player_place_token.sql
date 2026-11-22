-- 0081 · Jogador coloca token na mesa (item 5). SÓ GERADA: o Chefe revisa e
-- aplica no projeto real; o Dev nunca aplica.
--
-- Decisão do Luiz (2026-11-21) + regra de leitura do Chefe (2026-11-22):
--   * O jogador coloca QUALQUER ficha da campanha e NPCs, sem limite, mas só o
--     que ele já consegue LER: a RPC repete exatamente o SELECT de `characters`
--     ("Campaign members can view characters") e de `npcs` ("World members can
--     view npcs") como estão no prod. Ficha privada (staff / escolhidos) e NPC
--     secreto que ele não lê são negados.
--   * Só na cena publicada (is_active), sempre camada `token`, nunca oculto nem
--     travado. Nome e imagem saem do servidor (ficha ou NPC), nunca do cliente.
--   * INSERT direto de jogador (viewer) em vtt_tokens deixa de existir: só a RPC.
--   * DELETE do jogador passa a respeitar a trava (is_locked = false) e aceita
--     também o token que ele colocou (placed_by).
--   * `placed_by` não pode ser trocado por jogador (guard do UPDATE).
--
-- Padrão das RPCs da mesa: SECURITY DEFINER, `set search_path = ''` (nomes
-- totalmente qualificados), auth.uid() obrigatório, membro da campanha da cena.
-- Os predicados de leitura ficam em `private` (fora da API) para o teste SQL
-- conferir paridade com a RLS real.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1. Quem colocou o token. Mestre que insere direto também fica registrado.
alter table public.vtt_tokens
	add column if not exists placed_by uuid default auth.uid()
		references auth.users(id) on delete set null;

comment on column public.vtt_tokens.placed_by is
	'Quem colocou o token (auth.uid()). O jogador remove o que colocou, se não estiver travado.';

-- 2. Mesma regra do SELECT de characters (prod, policy "Campaign members can view characters").
create or replace function private.vtt_can_read_character(p_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
	select exists (
		select 1
		from public.characters ch
		join public.memberships m on m.campaign_id = ch.campaign_id
		join public.campaigns c on c.id = ch.campaign_id
		where ch.id = p_character_id
			and m.user_id = auth.uid()
			and (
				c.owner_id = auth.uid()
				or ch.created_by = auth.uid()
				or coalesce(ch.data ->> 'share', 'table') = 'table'
				or ((ch.data ->> 'share') = 'staff' and m.role in ('owner', 'editor'))
				or ((ch.data ->> 'share') = 'players' and m.role = 'viewer')
				or ((ch.data ->> 'share') = 'chosen' and (ch.data -> 'sharedWith') ? (auth.uid())::text)
			)
	);
$function$;

-- 3. Mesma regra do SELECT de npcs (prod, policy "World members can view npcs").
create or replace function private.vtt_can_read_npc(p_npc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
	select exists (
		select 1
		from public.npcs n
		join public.campaigns c on c.world_id = n.world_id
		join public.memberships m on m.campaign_id = c.id
		where n.id = p_npc_id
			and m.user_id = auth.uid()
			and (
				(c.owner_id = auth.uid() and (n.publication_scope = 'global' or c.id = any (n.campaign_ids)))
				or n.created_by = auth.uid()
				or (
					coalesce(n.data ->> 'share', '') = ''
					and (
						(n.visibility = 'master_secret' and m.role in ('owner', 'editor'))
						or (
							n.visibility = 'public'
							and (
								n.publication_scope = 'global'
								or (n.publication_scope = 'restricted' and c.id = any (n.campaign_ids))
							)
						)
					)
				)
				or ((n.data ->> 'share') = 'staff' and m.role in ('owner', 'editor'))
				or (
					(n.data ->> 'share') in ('table', 'players', 'chosen')
					and (
						n.publication_scope = 'global'
						or (n.publication_scope = 'restricted' and c.id = any (n.campaign_ids))
					)
					and (
						(n.data ->> 'share') = 'table'
						or ((n.data ->> 'share') = 'players' and m.role = 'viewer')
						or ((n.data ->> 'share') = 'chosen' and (n.data -> 'sharedWith') ? (auth.uid())::text)
					)
				)
			)
	);
$function$;

revoke all on function private.vtt_can_read_character(uuid) from public, anon, authenticated;
revoke all on function private.vtt_can_read_npc(uuid) from public, anon, authenticated;

-- 4. A RPC. Uma origem por chamada: p_character_id OU p_npc_id.
create or replace function public.vtt_place_token(
	p_scene_id uuid,
	p_character_id uuid default null,
	p_npc_id uuid default null,
	p_x double precision default 0,
	p_y double precision default 0
)
returns public.vtt_tokens
language plpgsql
security definer
set search_path = ''
as $function$
declare
	v_uid uuid := auth.uid();
	v_scene public.vtt_scenes%rowtype;
	v_world_id uuid;
	v_role text;
	v_name text;
	v_avatar text;
	v_hp_current integer;
	v_hp_max integer;
	v_data jsonb;
	v_system text;
	v_row public.vtt_tokens%rowtype;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para colocar tokens.' using errcode = '42501';
	end if;
	if (p_character_id is null) = (p_npc_id is null) then
		raise exception 'Escolha uma ficha ou um NPC.' using errcode = '22023';
	end if;

	select s.* into v_scene from public.vtt_scenes s where s.id = p_scene_id;
	if not found then
		raise exception 'Cena não encontrada.' using errcode = '42501';
	end if;

	select m.role into v_role
	from public.memberships m
	where m.campaign_id = v_scene.campaign_id and m.user_id = v_uid
	limit 1;
	if v_role is null then
		raise exception 'Você não participa desta campanha.' using errcode = '42501';
	end if;
	if not v_scene.is_active then
		raise exception 'Só dá para colocar tokens na cena publicada.' using errcode = '42501';
	end if;

	-- NaN é maior que qualquer número no Postgres, então cai no teto da cena.
	if p_x is null or p_y is null
		or p_x < 0 or p_y < 0 or p_x > v_scene.width or p_y > v_scene.height
	then
		raise exception 'Posição fora da cena.' using errcode = '22023';
	end if;

	if p_character_id is not null then
		select ch.data, ch.system into v_data, v_system
		from public.characters ch
		where ch.id = p_character_id and ch.campaign_id = v_scene.campaign_id;
		if not found or not private.vtt_can_read_character(p_character_id) then
			raise exception 'Ficha indisponível.' using errcode = '42501';
		end if;
		select coalesce(nullif(btrim(v_data ->> 'characterName'), ''), nullif(btrim(ch.name), ''), 'Token')
		into v_name
		from public.characters ch where ch.id = p_character_id;
		-- PV: a ficha manda, exceto nos sistemas em que o token guarda o PV
		-- (mesma regra de characterSheetOwnsHp no cliente).
		if v_system = 'ordem' then
			v_hp_current := case when (v_data ->> 'health') ~ '^-?\d{1,9}$' then (v_data ->> 'health')::integer end;
			v_hp_max := case when (v_data ->> 'healthMax') ~ '^-?\d{1,9}$' then (v_data ->> 'healthMax')::integer end;
		end if;
	else
		select n.data into v_data
		from public.npcs n
		join public.campaigns c on c.world_id = n.world_id
		where n.id = p_npc_id and c.id = v_scene.campaign_id;
		if not found or not private.vtt_can_read_npc(p_npc_id) then
			raise exception 'NPC indisponível.' using errcode = '42501';
		end if;
		select coalesce(nullif(btrim(n.name), ''), 'Token') into v_name
		from public.npcs n where n.id = p_npc_id;
	end if;

	-- Imagem: só a URL direta da origem. Imagem de acervo (imageAssetId) tem
	-- visibilidade própria; o cliente resolve na hora de desenhar.
	v_avatar := case
		when nullif(v_data ->> 'imageAssetId', '') is not null then null
		else nullif(btrim(v_data ->> 'imageUrl'), '')
	end;

	insert into public.vtt_tokens (
		scene_id, character_id, npc_id, name, avatar_url, layer, x, y,
		size_cells, hp_current, hp_max, vision_range, is_locked, is_hidden,
		controlled_by, placed_by
	) values (
		v_scene.id, p_character_id, p_npc_id, left(v_name, 120), v_avatar, 'token', p_x, p_y,
		1, v_hp_current, v_hp_max, 6, false, false,
		jsonb_build_array(v_uid::text), v_uid
	)
	returning * into v_row;

	return v_row;
end;
$function$;

revoke all on function public.vtt_place_token(uuid, uuid, uuid, double precision, double precision) from public, anon;
grant execute on function public.vtt_place_token(uuid, uuid, uuid, double precision, double precision) to authenticated;

comment on function public.vtt_place_token(uuid, uuid, uuid, double precision, double precision) is
	'Jogador (ou mestre) coloca token de ficha/NPC que já consegue ler, só na cena publicada, camada token, visível e destravado. Nome e imagem vêm do servidor.';

-- 5. INSERT direto: só mestre e co-mestre. Jogador só pela RPC.
drop policy if exists "GM or token owners can insert tokens" on public.vtt_tokens;
drop policy if exists "GM can insert tokens" on public.vtt_tokens;
create policy "GM can insert tokens" on public.vtt_tokens
for insert with check (
	public.user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

-- 6. DELETE: jogador só destravado, e se controla, é dono da ficha ou colocou.
drop policy if exists "GM or token controllers can delete tokens" on public.vtt_tokens;
create policy "GM or token controllers can delete tokens" on public.vtt_tokens
for delete using (
	public.user_scene_campaign_role(scene_id) in ('owner', 'editor')
	or (
		public.user_scene_campaign_role(scene_id) = 'viewer'
		and is_locked = false
		and (
			controlled_by @> jsonb_build_array((auth.uid())::text)
			or placed_by = auth.uid()
			or (
				character_id is not null
				and exists (
					select 1 from public.characters c
					where c.id = vtt_tokens.character_id
						and (c.user_id = auth.uid() or c.created_by = auth.uid())
				)
			)
		)
	)
);

-- 7. Guard do UPDATE do jogador: mesmo corpo do prod + placed_by.
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
		or new.placed_by is distinct from old.placed_by
	then
		raise exception 'Só o mestre pode mudar cena, ficha, controle, camada, visibilidade ou trava do token.'
			using errcode = '42501';
	end if;
	return new;
end;
$function$;

commit;
