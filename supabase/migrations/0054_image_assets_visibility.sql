-- 0054 · Quem vê cada imagem privada (ALTO RISCO: mexe em RLS de image_assets).
-- GERADA, NÃO APLICADA. Aplicar só com OK do Luiz, primeiro no stg.
-- Espelho obrigatório no LuizGarbini/arkhiveon-back-end (Drizzle, journal sincronizado).
--
-- Modelo (decisão do Luiz, 30/10): is_private + dois booleanos independentes.
--   is_private = false          -> pública: mesa e mundo (os booleanos são ignorados)
--   is_private = true           -> privada; quem vê, além do mestre e de quem subiu:
--     visible_to_co_gms = true  -> co-mestres (memberships.role = 'owner')
--     visible_to_players = true -> jogadores da mesa (memberships.role editor/viewer)
--     os dois false             -> "só o mestre"
-- Regras fixas: pública por padrão; o mestre (campaigns.owner_id) SEMPRE vê tudo;
-- quem subiu sempre vê a sua; jogador nunca esconde do mestre.
--
-- Backfill sem UPDATE: os defaults (co-mestres sim, jogadores não) reproduzem a regra
-- atual da 0036 para as privadas que já existem. Ninguém perde acesso; quem subiu ganha.
-- Cliente antigo que só manda is_private continua funcionando com esses defaults.
-- Teste: supabase/tests/0054_image_assets_visibility.sql

begin;

alter table public.image_assets
	add column if not exists visible_to_co_gms boolean not null default true,
	add column if not exists visible_to_players boolean not null default false;

alter table public.image_assets alter column is_private set default false;

create or replace function public.can_view_image_asset_v2(
	p_campaign_id uuid,
	p_world_id uuid,
	p_is_private boolean,
	p_visible_to_co_gms boolean,
	p_visible_to_players boolean,
	p_created_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select case
		when auth.uid() is null then false
		-- Regra de ouro: o mestre da campanha vê tudo.
		when exists (
			select 1 from public.campaigns c
			where c.id = p_campaign_id and c.owner_id = auth.uid()
		) then true
		-- Quem subiu sempre vê a própria imagem.
		when p_created_by = auth.uid() then true
		when p_is_private then case public.user_campaign_role(p_campaign_id)
			when 'owner' then p_visible_to_co_gms
			when 'editor' then p_visible_to_players
			when 'viewer' then p_visible_to_players
			else false
		end
		-- Pública: membro da campanha ou de outra campanha do mesmo mundo.
		when public.user_campaign_role(p_campaign_id) is not null then true
		when p_world_id is not null and exists (
			select 1 from public.campaigns c
			where c.world_id = p_world_id
				and public.user_campaign_role(c.id) is not null
		) then true
		else false
	end;
$$;

revoke all on function public.can_view_image_asset_v2(uuid, uuid, boolean, boolean, boolean, uuid) from public;
grant execute on function public.can_view_image_asset_v2(uuid, uuid, boolean, boolean, boolean, uuid) to authenticated;

drop policy if exists "World members can view image assets" on public.image_assets;
create policy "World members can view image assets"
	on public.image_assets for select
	using (public.can_view_image_asset_v2(
		campaign_id, world_id, is_private, visible_to_co_gms, visible_to_players, created_by
	));

-- Qualquer membro sobe imagem (jogador incluído) e escolhe quem vê.
drop policy if exists "Editors can create image assets" on public.image_assets;
drop policy if exists "Members can create image assets" on public.image_assets;
create policy "Members can create image assets"
	on public.image_assets for insert
	with check (
		public.user_campaign_role(campaign_id) is not null
		and created_by = auth.uid()
	);

-- Mestre/co-mestre edita qualquer uma; os outros só as que subiram.
drop policy if exists "Editors can update own public image names" on public.image_assets;
drop policy if exists "Owner or uploader can update image assets" on public.image_assets;
create policy "Owner or uploader can update image assets"
	on public.image_assets for update
	using (
		public.user_campaign_role(campaign_id) = 'owner'
		or (public.user_campaign_role(campaign_id) is not null and created_by = auth.uid())
	)
	with check (
		public.user_campaign_role(campaign_id) = 'owner'
		or (public.user_campaign_role(campaign_id) is not null and created_by = auth.uid())
	);

drop policy if exists "Owner or uploader can delete image assets" on public.image_assets;
create policy "Owner or uploader can delete image assets"
	on public.image_assets for delete
	using (
		public.user_campaign_role(campaign_id) = 'owner'
		or (public.user_campaign_role(campaign_id) is not null and created_by = auth.uid())
	);

commit;
