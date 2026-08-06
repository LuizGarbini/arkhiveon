alter table public.campaigns
	add column if not exists system text not null default 'dnd5e';

update public.campaigns
set system = 'dnd5e'
where system is null or btrim(system) = '';

create index if not exists campaigns_system_idx
	on public.campaigns(system);
