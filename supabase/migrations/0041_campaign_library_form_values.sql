-- Migration 0041: Biblioteca de PDFs (Fatia 2) — campos preenchidos por pessoa
--
-- Aplicar manualmente no SQL Editor do Supabase (Luiz). Idempotente.
-- Depende da 0040.
--
-- Decisão: o PDF original no R2 NUNCA é sobrescrito. Cada pessoa tem a sua
-- cópia dos valores dos campos (AcroForm) de cada PDF, guardada aqui como
-- jsonb { "<nome do campo>": "<valor>" }. O viewer aplica esses valores por
-- cima do original ao abrir; "Exportar" gera o PDF preenchido no aparelho.
-- Assim um jogador não estraga a ficha do outro nem o arquivo do mestre, e
-- não há nova ação de escrita no R2.
--
-- RLS: só a própria linha (user_id = auth.uid()), só de PDF `ready` de
-- campanha do piloto em que a pessoa é membro ou dona. Vale para todos os
-- papéis (mestre, editor e jogador preenchem a sua própria cópia).

begin;

create table if not exists public.campaign_library_form_values (
	file_id uuid not null references public.campaign_library_files(id) on delete cascade,
	user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
	field_values jsonb not null default '{}'::jsonb
		check (jsonb_typeof(field_values) = 'object' and pg_column_size(field_values) <= 262144),
	updated_at timestamptz not null default now(),
	primary key (file_id, user_id)
);

alter table public.campaign_library_form_values enable row level security;

revoke all on table public.campaign_library_form_values from anon, authenticated;
grant select, insert, update, delete on table public.campaign_library_form_values to authenticated;

create or replace function public.can_fill_library_file(p_file_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.campaign_library_files f
		join public.campaign_library_pilot_campaigns p on p.campaign_id = f.campaign_id
		where f.id = p_file_id
			and f.status = 'ready'
			and (
				public.user_campaign_role(f.campaign_id) is not null
				or exists (
					select 1 from public.campaigns c
					where c.id = f.campaign_id and c.owner_id = auth.uid()
				)
			)
	);
$$;

revoke all on function public.can_fill_library_file(uuid) from public, anon;
grant execute on function public.can_fill_library_file(uuid) to authenticated;

drop policy if exists "Own library form values select" on public.campaign_library_form_values;
create policy "Own library form values select"
	on public.campaign_library_form_values for select
	to authenticated
	using (user_id = auth.uid() and public.can_fill_library_file(file_id));

drop policy if exists "Own library form values insert" on public.campaign_library_form_values;
create policy "Own library form values insert"
	on public.campaign_library_form_values for insert
	to authenticated
	with check (user_id = auth.uid() and public.can_fill_library_file(file_id));

drop policy if exists "Own library form values update" on public.campaign_library_form_values;
create policy "Own library form values update"
	on public.campaign_library_form_values for update
	to authenticated
	using (user_id = auth.uid() and public.can_fill_library_file(file_id))
	with check (user_id = auth.uid() and public.can_fill_library_file(file_id));

drop policy if exists "Own library form values delete" on public.campaign_library_form_values;
create policy "Own library form values delete"
	on public.campaign_library_form_values for delete
	to authenticated
	using (user_id = auth.uid());

-- updated_at sempre do servidor
create or replace function public.touch_library_form_values()
returns trigger language plpgsql set search_path = public as $$
begin
	new.updated_at := now();
	return new;
end $$;

drop trigger if exists touch_library_form_values on public.campaign_library_form_values;
create trigger touch_library_form_values
	before insert or update on public.campaign_library_form_values
	for each row execute function public.touch_library_form_values();

commit;
