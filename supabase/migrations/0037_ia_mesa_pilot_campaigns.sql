-- Migration 0037: Allowlist do assistente da mesa (piloto IA)
--
-- Aplicar manualmente no SQL Editor do Supabase (Luiz). Idempotente.
--
-- Quais campanhas podem usar o assistente da mesa (`ia-mesa-chat`).
-- Ligar uma mesa:     insert into public.ia_mesa_pilot_campaigns (campaign_id) values ('<uuid>');
-- Desligar uma mesa:  delete from public.ia_mesa_pilot_campaigns where campaign_id = '<uuid>';
--
-- - SELECT: usuário autenticado só enxerga as linhas de campanhas que ele já
--   consegue ver (RLS de `campaigns`: dono ou membro). Basta para o cliente
--   decidir se mostra o botão e para a Edge Function validar com o JWT dele.
-- - Sem INSERT/UPDATE/DELETE para `authenticated`: escrita só pelo SQL Editor
--   ou service role.

begin;

create table if not exists public.ia_mesa_pilot_campaigns (
	campaign_id uuid primary key references public.campaigns(id) on delete cascade,
	created_at timestamptz not null default now()
);

alter table public.ia_mesa_pilot_campaigns enable row level security;

revoke all on table public.ia_mesa_pilot_campaigns from anon, authenticated;
grant select on table public.ia_mesa_pilot_campaigns to authenticated;

drop policy if exists "Campaign members can view ia mesa pilot" on public.ia_mesa_pilot_campaigns;
create policy "Campaign members can view ia mesa pilot"
	on public.ia_mesa_pilot_campaigns for select
	to authenticated
	using (
		exists (
			select 1 from public.campaigns c
			where c.id = ia_mesa_pilot_campaigns.campaign_id
		)
	);

-- Piloto inicial: Rise of Tiamat.
insert into public.ia_mesa_pilot_campaigns (campaign_id)
select c.id from public.campaigns c
where c.id = '3e9555fc-085e-43dd-a063-bcd02847032d'
on conflict (campaign_id) do nothing;

commit;
