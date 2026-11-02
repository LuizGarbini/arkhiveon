-- Migration 0057: limite diário do assistente da mesa
--
-- Aplicar manualmente no SQL Editor do Supabase (Luiz). Idempotente.
--
-- Uma linha por campanha por dia (America/Sao_Paulo). O incremento é atômico
-- em `ia_mesa_consume_daily_request`: se o contador já está no limite, a
-- linha não muda e a função devolve false.
-- `ia_mesa_refund_daily_request` devolve 1 pedido desse mesmo dia quando a
-- chamada ao modelo falha. O decremento é atômico e não fica negativo: sem
-- linha, ou com o contador já em zero, a função não muda nada (pode repetir).
--
-- RLS ligada e sem policies. anon e authenticated não leem nem escrevem.
-- EXECUTE só para service_role (a Edge Function). As funções são SECURITY
-- DEFINER com search_path fixo; o cliente não as chama.

begin;

create table if not exists public.ia_mesa_daily_usage (
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	usage_day date not null,
	request_count integer not null default 0,
	constraint ia_mesa_daily_usage_count_nonnegative check (request_count >= 0),
	constraint ia_mesa_daily_usage_pkey primary key (campaign_id, usage_day)
);

alter table public.ia_mesa_daily_usage enable row level security;

revoke all on table public.ia_mesa_daily_usage from public, anon, authenticated;

create or replace function public.ia_mesa_consume_daily_request(
	p_campaign_id uuid,
	p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_day date := (timezone('America/Sao_Paulo', now()))::date;
	v_used integer;
begin
	if p_campaign_id is null or p_limit is null or p_limit < 1 then
		return false;
	end if;

	with upsert as (
		insert into public.ia_mesa_daily_usage as usage (campaign_id, usage_day, request_count)
		values (p_campaign_id, v_day, 1)
		on conflict (campaign_id, usage_day)
		do update
			set request_count = usage.request_count + 1
			where usage.request_count < p_limit
		returning request_count
	)
	select upsert.request_count into v_used from upsert;

	return v_used is not null;
end;
$$;

revoke all on function public.ia_mesa_consume_daily_request(uuid, integer) from public, anon, authenticated;

do $$
begin
	if exists (select 1 from pg_roles where rolname = 'service_role') then
		grant execute on function public.ia_mesa_consume_daily_request(uuid, integer) to service_role;
	end if;
end $$;

-- Estorno de 1 pedido do dia corrente (America/Sao_Paulo). Idempotente:
-- create or replace, e o UPDATE não altera a linha se o contador já é zero.
create or replace function public.ia_mesa_refund_daily_request(
	p_campaign_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_day date := (timezone('America/Sao_Paulo', now()))::date;
	v_count integer;
begin
	if p_campaign_id is null then
		return false;
	end if;

	update public.ia_mesa_daily_usage
	set request_count = request_count - 1
	where campaign_id = p_campaign_id
		and usage_day = v_day
		and request_count > 0
	returning request_count into v_count;

	return v_count is not null;
end;
$$;

revoke all on function public.ia_mesa_refund_daily_request(uuid) from public, anon, authenticated;

do $$
begin
	if exists (select 1 from pg_roles where rolname = 'service_role') then
		grant execute on function public.ia_mesa_refund_daily_request(uuid) to service_role;
	end if;
end $$;

commit;
