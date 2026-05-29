create table if not exists public.image_assets (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	created_by uuid not null default auth.uid() references auth.users(id) on delete set null,
	name text not null default 'Imagem sem nome',
	url text not null,
	storage_key text,
	mime_type text not null default 'image/webp',
	size_bytes bigint not null default 0,
	width integer,
	height integer,
	is_private boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists image_assets_campaign_updated_at_idx
	on public.image_assets(campaign_id, updated_at desc);

create index if not exists image_assets_campaign_private_idx
	on public.image_assets(campaign_id, is_private);

drop trigger if exists image_assets_set_updated_at on public.image_assets;
create trigger image_assets_set_updated_at
before update on public.image_assets
for each row execute function public.set_updated_at();

alter table public.image_assets enable row level security;

drop policy if exists "Campaign members can view public images" on public.image_assets;
create policy "Campaign members can view public images"
	on public.image_assets for select
	using (
		user_campaign_role(campaign_id) is not null
		and (
			is_private = false
			or user_campaign_role(campaign_id) = 'owner'
		)
	);

drop policy if exists "Editors can create image assets" on public.image_assets;
create policy "Editors can create image assets"
	on public.image_assets for insert
	with check (
		user_campaign_role(campaign_id) in ('owner', 'editor')
		and created_by = auth.uid()
		and (
			is_private = false
			or user_campaign_role(campaign_id) = 'owner'
		)
	);

drop policy if exists "Editors can update own public image names" on public.image_assets;
create policy "Editors can update own public image names"
	on public.image_assets for update
	using (
		user_campaign_role(campaign_id) in ('owner', 'editor')
		and (
			user_campaign_role(campaign_id) = 'owner'
			or (created_by = auth.uid() and is_private = false)
		)
	)
	with check (
		user_campaign_role(campaign_id) in ('owner', 'editor')
		and (
			user_campaign_role(campaign_id) = 'owner'
			or (created_by = auth.uid() and is_private = false)
		)
	);

drop policy if exists "Owner or uploader can delete image assets" on public.image_assets;
create policy "Owner or uploader can delete image assets"
	on public.image_assets for delete
	using (
		user_campaign_role(campaign_id) = 'owner'
		or (
			user_campaign_role(campaign_id) = 'editor'
			and created_by = auth.uid()
			and is_private = false
		)
	);
