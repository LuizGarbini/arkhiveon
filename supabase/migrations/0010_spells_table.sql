-- Create spells table
create table if not exists public.spells (
	id uuid primary key default gen_random_uuid(),
	user_id uuid default auth.uid() references auth.users(id) on delete cascade,
	system text not null default 'generic',
	name text not null,
	level integer not null default 0,
	school text not null default '',
	casting_time text not null default '',
	range text not null default '',
	components text not null default '',
	duration text not null default '',
	description text not null default '',
	is_homebrew boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.spells enable row level security;

-- Drop existing triggers and policies if any
drop trigger if exists spells_set_updated_at on public.spells;

-- Add updated_at trigger
create trigger spells_set_updated_at
before update on public.spells
for each row execute function public.set_updated_at();

-- RLS Policies
-- SELECT: Users can read any global spell (user_id IS NULL) OR their own homebrew spells (user_id = auth.uid())
drop policy if exists "Allow select spells" on public.spells;
create policy "Allow select spells" on public.spells
for select using (
	user_id is null or 
	user_id = auth.uid()
);

-- INSERT: Users can insert their own homebrew spells
drop policy if exists "Allow insert own spells" on public.spells;
create policy "Allow insert own spells" on public.spells
for insert with check (
	user_id = auth.uid()
);

-- UPDATE: Users can update their own homebrew spells
drop policy if exists "Allow update own spells" on public.spells;
create policy "Allow update own spells" on public.spells
for update using (
	user_id = auth.uid()
) with check (
	user_id = auth.uid()
);

-- DELETE: Users can delete their own homebrew spells
drop policy if exists "Allow delete own spells" on public.spells;
create policy "Allow delete own spells" on public.spells
for delete using (
	user_id = auth.uid()
);

-- Indexes
create index if not exists spells_system_name_idx on public.spells(system, name);
create index if not exists spells_user_id_idx on public.spells(user_id);
