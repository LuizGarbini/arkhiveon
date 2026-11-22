-- =============================================================================
-- Migration 0083 (Plano Pro, M2): RPCs da cota
-- =============================================================================
-- Todas security definer, com search_path fixo e execute revogado de public e
-- anon. Os limites são os mesmos de supabase/functions/_shared/plan-limits.ts
-- (free 100.000.000 B, pro 10.000.000.000 B, unidades decimais); o teste
-- src/lib/storage/plan-limits.test.ts confere que SQL e TS batem.
--
-- Quem paga (pagador):
--   * upload de campanha: o dono da campanha (campaigns.owner_id), só se quem
--     sobe tem papel nela (linha em memberships, ou é o dono). Convite pendente
--     não conta.
--   * upload sem campanha (foto da mesa): o próprio usuário.
-- reserve_storage calcula o pagador por dentro e NÃO recebe owner como
-- parâmetro (decisão do Chefe, 22/11).
--
--   storage_limit(plan)              -> bigint            authenticated, service_role
--   storage_payer(campaign)          -> uuid ou null      authenticated (usa auth.uid())
--   reserve_storage(uploader, campaign, bytes, kind, key) -> jsonb   só service_role
--   confirm_storage(key, real_size)  -> jsonb             só service_role
--   release_storage(key)             -> bigint            só service_role
--   my_storage_context(campaign)     -> jsonb             authenticated (usa auth.uid())
--
-- Uso = soma de size_bytes de storage_objects (ready + pending) do pagador.
-- A reserva serializa por pagador com pg_advisory_xact_lock(hashtext(owner)).
-- Cota estourada: erro 'quota_exceeded' (P0001) com DETAIL em JSON
-- {payer_id, payer_name, used, limit, requested}.
--
-- my_storage_context lê user_plans.over_limit_since, coluna da 0084. As duas
-- migrações são da mesma fatia e se aplicam juntas (0082 -> 0086).
--
-- NÃO APLICADA em nenhum banco. Aplicar em produção só com o OK do Luiz.
-- Rollback: supabase/rollbacks/0083_storage_rpcs.down.sql
-- Teste: supabase/tests/0083_storage_rpcs.sql e 0083_reserve_storage.concurrency.mjs
--
-- Dry-run (só leitura): select public.storage_limit('free'), public.storage_limit('pro');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ── Limite por plano ────────────────────────────────────────────────────────
create or replace function public.storage_limit(p_plan text)
returns bigint
language sql
immutable
security definer
set search_path = public
as $$
	select case when p_plan = 'pro' then 10000000000::bigint else 100000000::bigint end;
$$;

revoke all on function public.storage_limit(text) from public, anon;
grant execute on function public.storage_limit(text) to authenticated, service_role;

-- ── Ajudantes internos (schema private, sem grant para cliente) ─────────────
create or replace function private.storage_resolve_payer(p_uploader uuid, p_campaign_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select case
		when p_uploader is null then null
		when p_campaign_id is null then p_uploader
		else (
			select c.owner_id
			from public.campaigns c
			where c.id = p_campaign_id
				and (
					c.owner_id = p_uploader
					or exists (
						select 1 from public.memberships m
						where m.campaign_id = c.id
							and m.user_id = p_uploader
							and m.role is not null
					)
				)
		)
	end;
$$;

create or replace function private.storage_used(p_owner uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(sum(o.size_bytes), 0)::bigint
	from public.storage_objects o
	where o.owner_id = p_owner;
$$;

create or replace function private.storage_plan(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
	select coalesce((select up.plan from public.user_plans up where up.user_id = p_user), 'free');
$$;

-- Nome para "a cota do mestre X": só o nome do perfil, nunca o e-mail.
create or replace function private.storage_display_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
	select nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
	from auth.users u
	where u.id = p_user;
$$;

revoke all on function private.storage_resolve_payer(uuid, uuid) from public, anon, authenticated;
revoke all on function private.storage_used(uuid) from public, anon, authenticated;
revoke all on function private.storage_plan(uuid) from public, anon, authenticated;
revoke all on function private.storage_display_name(uuid) from public, anon, authenticated;

-- ── Pagador visto pelo cliente ──────────────────────────────────────────────
create or replace function public.storage_payer(p_campaign_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
begin
	if v_uid is null or p_campaign_id is null then
		return null;
	end if;
	return private.storage_resolve_payer(v_uid, p_campaign_id);
end;
$$;

revoke all on function public.storage_payer(uuid) from public, anon;
grant execute on function public.storage_payer(uuid) to authenticated, service_role;

-- ── Reserva (só service_role: chamada pelas edges antes do PUT) ─────────────
create or replace function public.reserve_storage(
	p_uploader uuid,
	p_campaign_id uuid,
	p_bytes bigint,
	p_kind text,
	p_r2_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_payer uuid;
	v_used bigint;
	v_limit bigint;
	v_id uuid;
begin
	if p_uploader is null then
		raise exception 'uploader obrigatório' using errcode = '22023';
	end if;
	if p_bytes is null or p_bytes <= 0 then
		raise exception 'tamanho inválido' using errcode = '22023';
	end if;
	if p_kind is null or p_kind not in ('image', 'pdf', 'thumb') then
		raise exception 'tipo inválido' using errcode = '22023';
	end if;
	if p_r2_key is null or btrim(p_r2_key) = '' then
		raise exception 'chave inválida' using errcode = '22023';
	end if;

	v_payer := private.storage_resolve_payer(p_uploader, p_campaign_id);
	if v_payer is null then
		raise exception 'not_campaign_member' using errcode = '42501';
	end if;

	-- Serializa as reservas do mesmo pagador (mestre + convidados + abas).
	perform pg_advisory_xact_lock(hashtext(v_payer::text));

	v_used := private.storage_used(v_payer);
	v_limit := public.storage_limit(private.storage_plan(v_payer));

	if v_used + p_bytes > v_limit then
		raise exception 'quota_exceeded'
			using errcode = 'P0001',
				detail = jsonb_build_object(
					'payer_id', v_payer,
					'payer_name', private.storage_display_name(v_payer),
					'used', v_used,
					'limit', v_limit,
					'requested', p_bytes
				)::text;
	end if;

	insert into public.storage_objects (
		owner_id, campaign_id, uploaded_by, bucket, r2_key, kind, size_bytes, status
	) values (
		v_payer,
		p_campaign_id,
		p_uploader,
		case when p_kind = 'image' then 'images' else 'library' end,
		p_r2_key,
		p_kind,
		p_bytes,
		'pending'
	)
	returning id into v_id;

	return jsonb_build_object(
		'id', v_id,
		'payer_id', v_payer,
		'used', v_used + p_bytes,
		'limit', v_limit
	);
end;
$$;

revoke all on function public.reserve_storage(uuid, uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.reserve_storage(uuid, uuid, bigint, text, text) to service_role;

-- ── Confirmação: vira ready com o tamanho real (HEAD do R2) ────────────────
create or replace function public.confirm_storage(p_r2_key text, p_real_size bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_row public.storage_objects%rowtype;
begin
	if p_real_size is null or p_real_size <= 0 then
		raise exception 'tamanho inválido' using errcode = '22023';
	end if;

	update public.storage_objects
	set status = 'ready',
		size_bytes = p_real_size,
		ready_at = coalesce(ready_at, now())
	where r2_key = p_r2_key
	returning * into v_row;

	if not found then
		raise exception 'storage_object_not_found' using errcode = 'P0002';
	end if;

	return jsonb_build_object(
		'id', v_row.id,
		'payer_id', v_row.owner_id,
		'size_bytes', v_row.size_bytes,
		'status', v_row.status
	);
end;
$$;

revoke all on function public.confirm_storage(text, bigint) from public, anon, authenticated;
grant execute on function public.confirm_storage(text, bigint) to service_role;

-- ── Liberação: falha, exclusão ou limpeza soltam a cota ─────────────────────
create or replace function public.release_storage(p_r2_key text)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_size bigint;
begin
	delete from public.storage_objects
	where r2_key = p_r2_key
	returning size_bytes into v_size;
	return coalesce(v_size, 0);
end;
$$;

revoke all on function public.release_storage(text) from public, anon, authenticated;
grant execute on function public.release_storage(text) to service_role;

-- ── Contexto para a UI (card e /consumo) ────────────────────────────────────
-- label: 'pro' (meu plano é pro), 'guest_pro' (o pagador da campanha é pro e o
-- meu plano não), 'free'. by_campaign, top_files e over_limit_since só vêm
-- quando o chamador é o próprio pagador; o convidado recebe total, limite,
-- rótulo e se está acima do limite (sem a contagem de dias).
create or replace function public.my_storage_context(p_campaign_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_payer uuid;
	v_my_plan text;
	v_payer_plan text;
	v_used bigint;
	v_limit bigint;
	v_images bigint;
	v_pdfs bigint;
	v_is_payer boolean;
	v_label text;
	v_since timestamptz;
	v_by_campaign jsonb;
	v_top jsonb;
begin
	if v_uid is null then
		raise exception 'login obrigatório' using errcode = '28000';
	end if;

	v_payer := coalesce(public.storage_payer(p_campaign_id), v_uid);
	v_is_payer := v_payer = v_uid;
	v_my_plan := private.storage_plan(v_uid);
	v_payer_plan := private.storage_plan(v_payer);
	v_limit := public.storage_limit(v_payer_plan);

	select
		coalesce(sum(o.size_bytes), 0),
		coalesce(sum(o.size_bytes) filter (where o.kind = 'image'), 0),
		coalesce(sum(o.size_bytes) filter (where o.kind in ('pdf', 'thumb')), 0)
	into v_used, v_images, v_pdfs
	from public.storage_objects o
	where o.owner_id = v_payer;

	v_label := case
		when v_my_plan = 'pro' then 'pro'
		when not v_is_payer and v_payer_plan = 'pro' then 'guest_pro'
		else 'free'
	end;

	if v_is_payer then
		select up.over_limit_since into v_since
		from public.user_plans up
		where up.user_id = v_uid;

		select coalesce(jsonb_agg(row_to_json(b)::jsonb order by b.used desc), '[]'::jsonb)
		into v_by_campaign
		from (
			select
				o.campaign_id,
				c.name as campaign_name,
				sum(o.size_bytes)::bigint as used,
				coalesce(sum(o.size_bytes) filter (where o.kind = 'image'), 0)::bigint as used_images,
				coalesce(sum(o.size_bytes) filter (where o.kind in ('pdf', 'thumb')), 0)::bigint as used_pdfs
			from public.storage_objects o
			left join public.campaigns c on c.id = o.campaign_id
			where o.owner_id = v_uid
			group by o.campaign_id, c.name
		) b;

		select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.size_bytes desc), '[]'::jsonb)
		into v_top
		from (
			select o.id, o.r2_key, o.bucket, o.kind, o.size_bytes, o.status,
				o.campaign_id, o.created_at
			from public.storage_objects o
			where o.owner_id = v_uid
			order by o.size_bytes desc, o.created_at desc
			limit 20
		) t;
	end if;

	return jsonb_build_object(
		'my_plan', v_my_plan,
		'payer_id', v_payer,
		'payer_name', private.storage_display_name(v_payer),
		'payer_plan', v_payer_plan,
		'label', v_label,
		'used', v_used,
		'limit', v_limit,
		'used_images', v_images,
		'used_pdfs', v_pdfs,
		'over_limit', v_used > v_limit,
		'over_limit_since', v_since,
		'by_campaign', v_by_campaign,
		'top_files', v_top
	);
end;
$$;

revoke all on function public.my_storage_context(uuid) from public, anon;
grant execute on function public.my_storage_context(uuid) to authenticated;
