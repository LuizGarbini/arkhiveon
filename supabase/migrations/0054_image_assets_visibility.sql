-- 0054 · Hierarquia de privacidade das imagens (ALTO RISCO: mexe em RLS de image_assets).
-- GERADA, NÃO APLICADA. Aplicar só com OK do Luiz, primeiro no stg.
-- Espelho obrigatório no LuizGarbini/arkhiveon-back-end (Drizzle, journal sincronizado).
--
-- visibility:
--   public  -> mesa e mundo (como is_private = false hoje)
--   players -> todos os membros desta campanha
--   co_gm   -> mestre + co-mestres (memberships.role = 'owner') + quem subiu
--   gm_only -> só o mestre (campaigns.owner_id) + quem subiu
-- Regra de ouro: o mestre (campaigns.owner_id) SEMPRE vê tudo da campanha.
-- Jogador pode privar o que ele subiu, mas nunca esconde do mestre.
-- is_private continua existindo (clientes antigos): fica = visibility <> 'public'.
-- Teste: supabase/tests/0054_image_assets_visibility.sql

begin;

alter table public.image_assets
	add column if not exists visibility text not null default 'public';

alter table public.image_assets
	drop constraint if exists image_assets_visibility_check;
alter table public.image_assets
	add constraint image_assets_visibility_check
	check (visibility in ('public', 'players', 'co_gm', 'gm_only'));

-- Backfill (DECISÃO DO LUIZ): privada do mestre -> gm_only; privada de outra pessoa -> co_gm.
-- Efeito: co-mestres deixam de ver as privadas que o mestre subiu (hoje veem).
update public.image_assets a
set visibility = case
	when a.created_by = c.owner_id then 'gm_only'
	else 'co_gm'
end
from public.campaigns c
where c.id = a.campaign_id and a.is_private and a.visibility = 'public';

alter table public.image_assets alter column is_private set default false;

-- Mantém is_private e visibility coerentes. Cliente antigo que só manda is_private
-- continua funcionando: true vira gm_only (mestre) ou co_gm (outros).
create or replace function public.sync_image_asset_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_owner uuid;
begin
	if tg_op = 'UPDATE' and new.visibility is not distinct from old.visibility
		and new.is_private is distinct from old.is_private then
		if new.is_private then
			select owner_id into v_owner from public.campaigns where id = new.campaign_id;
			new.visibility := case when new.created_by = v_owner then 'gm_only' else 'co_gm' end;
		else
			new.visibility := 'public';
		end if;
	elsif tg_op = 'INSERT' and new.is_private and new.visibility = 'public' then
		select owner_id into v_owner from public.campaigns where id = new.campaign_id;
		new.visibility := case when new.created_by = v_owner then 'gm_only' else 'co_gm' end;
	end if;
	new.is_private := new.visibility <> 'public';
	return new;
end;
$$;

drop trigger if exists sync_image_asset_visibility on public.image_assets;
create trigger sync_image_asset_visibility
	before insert or update on public.image_assets
	for each row execute function public.sync_image_asset_visibility();

create or replace function public.can_view_image_asset_v2(
	p_campaign_id uuid,
	p_world_id uuid,
	p_visibility text,
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
		-- Mestre da campanha vê tudo, inclusive privadas de jogadores.
		when exists (
			select 1 from public.campaigns c
			where c.id = p_campaign_id and c.owner_id = auth.uid()
		) then true
		-- Quem subiu sempre vê a própria imagem.
		when p_created_by = auth.uid() then true
		when p_visibility = 'gm_only' then false
		when p_visibility = 'co_gm' then public.user_campaign_role(p_campaign_id) = 'owner'
		when p_visibility = 'players' then public.user_campaign_role(p_campaign_id) is not null
		-- public: membro da campanha ou de outra campanha do mesmo mundo.
		when public.user_campaign_role(p_campaign_id) is not null then true
		when p_world_id is not null and exists (
			select 1 from public.campaigns c
			where c.world_id = p_world_id
				and public.user_campaign_role(c.id) is not null
		) then true
		else false
	end;
$$;

revoke all on function public.can_view_image_asset_v2(uuid, uuid, text, uuid) from public;
grant execute on function public.can_view_image_asset_v2(uuid, uuid, text, uuid) to authenticated;

drop policy if exists "World members can view image assets" on public.image_assets;
create policy "World members can view image assets"
	on public.image_assets for select
	using (public.can_view_image_asset_v2(campaign_id, world_id, visibility, created_by));

-- Qualquer membro sobe imagem (jogador incluído) e escolhe a visibilidade.
drop policy if exists "Editors can create image assets" on public.image_assets;
drop policy if exists "Members can create image assets" on public.image_assets;
create policy "Members can create image assets"
	on public.image_assets for insert
	with check (
		public.user_campaign_role(campaign_id) is not null
		and created_by = auth.uid()
	);

-- Mestre edita qualquer uma; os outros só as que subiram.
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
