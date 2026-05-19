create table if not exists public.user_plans (
	user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
	plan text not null default 'free' check (plan in ('free', 'pro')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

drop trigger if exists user_plans_set_updated_at on public.user_plans;
create trigger user_plans_set_updated_at
before update on public.user_plans
for each row execute function public.set_updated_at();

alter table public.user_plans enable row level security;

drop policy if exists "Users read own plan" on public.user_plans;
create policy "Users read own plan" on public.user_plans
for select using (user_id = auth.uid());
