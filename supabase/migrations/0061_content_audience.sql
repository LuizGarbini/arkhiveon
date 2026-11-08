-- 0061 · Quem pode ver fichas, NPCs e imagens.
-- O mestre escolhe: toda a mesa, só co-mestres, só jogadores ou pessoas
-- marcadas. O mestre (campaigns.owner_id) e quem criou o registro sempre veem.
-- Co-mestre é memberships.role = editor. Jogador é viewer.
--
-- Imagens: nova coluna visible_user_ids. A função v3 também corrige o papel
-- do editor, que a 0054 tratava como jogador.
-- Fichas e NPCs: a escolha vive em data.share / data.sharedWith. Sem share,
-- a regra antiga continua (ficha para a mesa; NPC público ou segredo).

begin;

alter table public.image_assets
	add column if not exists visible_user_ids uuid[] not null default '{}';

create or replace function public.can_view_image_asset_v3(
	p_campaign_id uuid,
	p_world_id uuid,
	p_is_private boolean,
	p_visible_to_co_gms boolean,
	p_visible_to_players boolean,
	p_created_by uuid,
	p_visible_user_ids uuid[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select case
		when auth.uid() is null then false
		when exists (
			select 1 from public.campaigns c
			where c.id = p_campaign_id and c.owner_id = auth.uid()
		) then true
		when p_created_by = auth.uid() then true
		when auth.uid() = any(coalesce(p_visible_user_ids, '{}'::uuid[]))
			and public.user_campaign_role(p_campaign_id) is not null then true
		when p_is_private then case public.user_campaign_role(p_campaign_id)
			when 'owner' then p_visible_to_co_gms
			when 'editor' then p_visible_to_co_gms
			when 'viewer' then p_visible_to_players
			else false
		end
		when public.user_campaign_role(p_campaign_id) is not null then true
		when p_world_id is not null and exists (
			select 1 from public.campaigns c
			where c.world_id = p_world_id
				and public.user_campaign_role(c.id) is not null
		) then true
		else false
	end;
$$;

revoke all on function public.can_view_image_asset_v3(uuid, uuid, boolean, boolean, boolean, uuid, uuid[]) from public;
revoke all on function public.can_view_image_asset_v3(uuid, uuid, boolean, boolean, boolean, uuid, uuid[]) from anon;
grant execute on function public.can_view_image_asset_v3(uuid, uuid, boolean, boolean, boolean, uuid, uuid[]) to authenticated;

drop policy if exists "World members can view image assets" on public.image_assets;
create policy "World members can view image assets"
	on public.image_assets for select
	using (public.can_view_image_asset_v3(
		campaign_id,
		world_id,
		is_private,
		visible_to_co_gms,
		visible_to_players,
		created_by,
		visible_user_ids
	));

-- Fichas: EXISTS em memberships (o Realtime descarta policy com helper solto).
drop policy if exists "Campaign members can view characters" on public.characters;
create policy "Campaign members can view characters"
	on public.characters for select
	using (
		exists (
			select 1 from public.memberships m
			join public.campaigns c on c.id = characters.campaign_id
			where m.campaign_id = characters.campaign_id
				and m.user_id = auth.uid()
				and (
					c.owner_id = auth.uid()
					or characters.created_by = auth.uid()
					or coalesce(characters.data->>'share', 'table') = 'table'
					or (
						characters.data->>'share' = 'staff'
						and m.role in ('owner', 'editor')
					)
					or (
						characters.data->>'share' = 'players'
						and m.role = 'viewer'
					)
					or (
						characters.data->>'share' = 'chosen'
						and (characters.data->'sharedWith') ? auth.uid()::text
					)
				)
		)
	);

drop policy if exists "World members can view npcs" on public.npcs;
create policy "World members can view npcs"
	on public.npcs for select
	using (
		exists (
			select 1 from public.memberships m
			join public.campaigns c on c.id = m.campaign_id
			where c.world_id = npcs.world_id
				and m.user_id = auth.uid()
				and (
					(
						c.owner_id = auth.uid()
						and (
							npcs.publication_scope = 'global'
							or c.id = any(npcs.campaign_ids)
						)
					)
					or npcs.created_by = auth.uid()
					or (
						coalesce(npcs.data->>'share', '') = ''
						and (
							(npcs.visibility = 'master_secret' and m.role in ('owner', 'editor'))
							or (
								npcs.visibility = 'public'
								and (
									npcs.publication_scope = 'global'
									or (
										npcs.publication_scope = 'restricted'
										and c.id = any(npcs.campaign_ids)
									)
								)
							)
						)
					)
					or (
						npcs.data->>'share' = 'staff'
						and m.role in ('owner', 'editor')
					)
					or (
						npcs.data->>'share' in ('table', 'players', 'chosen')
						and (
							npcs.publication_scope = 'global'
							or (
								npcs.publication_scope = 'restricted'
								and c.id = any(npcs.campaign_ids)
							)
						)
						and (
							npcs.data->>'share' = 'table'
							or (npcs.data->>'share' = 'players' and m.role = 'viewer')
							or (
								npcs.data->>'share' = 'chosen'
								and (npcs.data->'sharedWith') ? auth.uid()::text
							)
						)
					)
				)
		)
	);

commit;
