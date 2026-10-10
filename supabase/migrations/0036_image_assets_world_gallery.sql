-- Migration 0036: Galeria de Imagens por mundo
--
-- Aplicar manualmente no SQL Editor do Supabase (Luiz). Idempotente.
--
-- 1. `image_assets.world_id` (denormalizado de `campaigns.world_id`) + backfill.
-- 2. Triggers mantêm `world_id` em dia no INSERT/troca de campanha e quando a
--    campanha muda de mundo.
-- 3. SELECT: membro de qualquer campanha do mesmo mundo vê as imagens "Mesa";
--    imagem privada só para o mestre (owner) da campanha dona.
--    Também corrige a policy de 0023, em que `campaign_id` sem qualificação
--    dentro do EXISTS apontava para `memberships.campaign_id` (sempre verdadeiro).
-- INSERT/UPDATE/DELETE continuam por campanha (0005) — sem mudança.

begin;

-- 1. Coluna + backfill + índice
alter table public.image_assets
	add column if not exists world_id uuid references public.worlds(id) on delete set null;

update public.image_assets ia
set world_id = c.world_id
from public.campaigns c
where c.id = ia.campaign_id
	and ia.world_id is distinct from c.world_id;

create index if not exists image_assets_world_updated_at_idx
	on public.image_assets(world_id, updated_at desc);

-- 2. Manter world_id sincronizado
create or replace function public.image_assets_set_world_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	select c.world_id into new.world_id
	from public.campaigns c
	where c.id = new.campaign_id;
	return new;
end;
$$;

drop trigger if exists image_assets_set_world_id on public.image_assets;
create trigger image_assets_set_world_id
before insert or update of campaign_id on public.image_assets
for each row execute function public.image_assets_set_world_id();

create or replace function public.campaigns_sync_image_assets_world_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.image_assets
	set world_id = new.world_id
	where campaign_id = new.id
		and world_id is distinct from new.world_id;
	return new;
end;
$$;

drop trigger if exists campaigns_sync_image_assets_world_id on public.campaigns;
create trigger campaigns_sync_image_assets_world_id
after update of world_id on public.campaigns
for each row
when (old.world_id is distinct from new.world_id)
execute function public.campaigns_sync_image_assets_world_id();

-- 3. Quem vê cada imagem
create or replace function public.can_view_image_asset(
	p_campaign_id uuid,
	p_world_id uuid,
	p_is_private boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select case
		-- Mestre da campanha dona vê tudo, inclusive privadas.
		when public.user_campaign_role(p_campaign_id) = 'owner' then true
		when exists (
			select 1 from public.campaigns c
			where c.id = p_campaign_id and c.owner_id = auth.uid()
		) then true
		-- Privada: só o mestre.
		when p_is_private then false
		-- Mesa: membro da campanha dona...
		when public.user_campaign_role(p_campaign_id) is not null then true
		-- ...ou de qualquer campanha do mesmo mundo.
		when p_world_id is not null and exists (
			select 1 from public.campaigns c
			where c.world_id = p_world_id
				and public.user_campaign_role(c.id) is not null
		) then true
		else false
	end;
$$;

revoke all on function public.can_view_image_asset(uuid, uuid, boolean) from public;
grant execute on function public.can_view_image_asset(uuid, uuid, boolean) to authenticated;

drop policy if exists "Campaign members can view public images" on public.image_assets;
drop policy if exists "World members can view image assets" on public.image_assets;
create policy "World members can view image assets"
	on public.image_assets for select
	using (public.can_view_image_asset(campaign_id, world_id, is_private));

commit;
