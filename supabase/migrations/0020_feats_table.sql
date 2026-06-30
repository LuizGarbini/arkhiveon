-- Create feats table
create table if not exists public.feats (
	id uuid primary key default gen_random_uuid(),
	user_id uuid default auth.uid() references auth.users(id) on delete cascade,
	system text not null default 'generic',
	name text not null,
	category text not null default 'general',
	prerequisites text not null default '',
	description text not null default '',
	ability_increase text not null default '',
	source text not null default '',
	is_homebrew boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.feats enable row level security;

-- Add updated_at trigger
create trigger feats_set_updated_at
before update on public.feats
for each row execute function public.set_updated_at();

-- RLS Policies
-- SELECT: Users can read any global feat (user_id IS NULL) OR their own homebrew feats (user_id = auth.uid())
drop policy if exists "Allow select feats" on public.feats;
create policy "Allow select feats" on public.feats
for select using (
	user_id is null or 
	user_id = auth.uid()
);

-- INSERT: Users can insert their own homebrew feats
drop policy if exists "Allow insert own feats" on public.feats;
create policy "Allow insert own feats" on public.feats
for insert with check (
	user_id = auth.uid()
);

-- UPDATE: Users can update their own homebrew feats
drop policy if exists "Allow update own feats" on public.feats;
create policy "Allow update own feats" on public.feats
for update using (
	user_id = auth.uid()
) with check (
	user_id = auth.uid()
);

-- DELETE: Users can delete their own homebrew feats
drop policy if exists "Allow delete own feats" on public.feats;
create policy "Allow delete own feats" on public.feats
for delete using (
	user_id = auth.uid()
);

-- Indexes
create index if not exists feats_system_name_idx on public.feats(system, name);
create index if not exists feats_user_id_idx on public.feats(user_id);
