-- Teste da 0083 (RPCs da cota) e da 0084 (user_plans: grants, policy e trigger).
-- SÓ Postgres local descartável. Tudo numa transação com ROLLBACK no fim.
-- Não usa supabase db push, link, nem projeto remoto.
-- Uso: psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/0083_storage_rpcs.sql
-- Saída: uma linha "PASS ..." por caso. Falha = RAISE (o psql para).

\set ON_ERROR_STOP on
\set VERBOSITY terse
set client_min_messages = notice;

begin;
\ir plano_pro_s1a_bootstrap.sql

-- ── Limites e grants ─────────────────────────────────────────────────────
do $$
begin
	if public.storage_limit('free') <> 100000000 or public.storage_limit('pro') <> 10000000000
		or public.storage_limit(null) <> 100000000 then
		raise exception 'FAIL: storage_limit';
	end if;
	raise notice 'PASS 0083 storage_limit: free 100.000.000, pro 10.000.000.000, desconhecido = free';

	if has_function_privilege('authenticated', 'public.reserve_storage(uuid, uuid, bigint, text, text)', 'EXECUTE')
		or has_function_privilege('authenticated', 'public.confirm_storage(text, bigint)', 'EXECUTE')
		or has_function_privilege('authenticated', 'public.release_storage(text)', 'EXECUTE')
		or has_function_privilege('anon', 'public.reserve_storage(uuid, uuid, bigint, text, text)', 'EXECUTE')
		or has_function_privilege('anon', 'public.my_storage_context(uuid)', 'EXECUTE')
		or has_function_privilege('anon', 'public.storage_payer(uuid)', 'EXECUTE')
		or not has_function_privilege('service_role', 'public.reserve_storage(uuid, uuid, bigint, text, text)', 'EXECUTE')
		or not has_function_privilege('authenticated', 'public.my_storage_context(uuid)', 'EXECUTE') then
		raise exception 'FAIL: grants das RPCs';
	end if;
	if exists (
		select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname in ('public', 'private')
			and p.proname in ('storage_limit', 'storage_payer', 'reserve_storage', 'confirm_storage',
				'release_storage', 'my_storage_context', 'storage_resolve_payer', 'storage_used',
				'storage_plan', 'storage_display_name', 'storage_sync_user_plan', 'storage_objects_sync_user_plan')
			and (not p.prosecdef or not exists (
				select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
	) then
		raise exception 'FAIL: RPC sem security definer ou sem search_path fixo';
	end if;
	raise notice 'PASS 0083 reserve/confirm/release só service_role; contexto e pagador sem anon; todas security definer com search_path';
end $$;

-- Conta B chamando reserve/confirm/release direto: permission denied
select pg_temp.claims('00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid');
set local role authenticated;
do $$
begin
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000b1', null, 1, 'image', 'b/x');
		raise exception 'FAIL: B executou reserve_storage';
	exception when insufficient_privilege then null; end;
	begin
		perform public.confirm_storage('b/x', 1);
		raise exception 'FAIL: B executou confirm_storage';
	exception when insufficient_privilege then null; end;
	begin
		perform public.release_storage('b/x');
		raise exception 'FAIL: B executou release_storage';
	exception when insufficient_privilege then null; end;
	raise notice 'PASS 0083 NEGAÇÃO conta B não executa reserve/confirm/release (permission denied)';
end $$;
reset role;

-- ── storage_payer ────────────────────────────────────────────────────────
select pg_temp.claims('00000000-0000-0000-0000-0000000000f1', 'jogador-a@example.invalid');
set local role authenticated;
do $$
begin
	if public.storage_payer('20000000-0000-0000-0000-0000000000a1') is distinct from '00000000-0000-0000-0000-0000000000a1'::uuid then
		raise exception 'FAIL: jogador de A1 deveria ter A como pagador';
	end if;
	if public.storage_payer('20000000-0000-0000-0000-0000000000b1') is not null then
		raise exception 'FAIL: jogador de A1 recebeu pagador de B1';
	end if;
	raise notice 'PASS 0083 storage_payer: jogador vê o mestre da própria mesa; outra campanha = null';
end $$;
reset role;

select pg_temp.claims('00000000-0000-0000-0000-0000000000d1', 'pendente@example.invalid');
set local role authenticated;
do $$
begin
	if public.storage_payer('20000000-0000-0000-0000-0000000000a1') is not null then
		raise exception 'FAIL: convite pendente recebeu pagador';
	end if;
	raise notice 'PASS 0083 NEGAÇÃO convite pendente não tem pagador (não gasta a cota do mestre)';
end $$;
reset role;

select pg_temp.claims('00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid');
set local role authenticated;
do $$
begin
	if public.storage_payer('20000000-0000-0000-0000-0000000000a1') is not null then
		raise exception 'FAIL: conta B recebeu o pagador de A1';
	end if;
	raise notice 'PASS 0083 NEGAÇÃO conta B não descobre o pagador da campanha de A';
end $$;
reset role;

-- ── reserve / confirm / release (como service_role, igual às edges) ─────
set local role service_role;
do $$
declare
	v jsonb;
	v_state text;
	v_detail text;
begin
	-- CA1: jogador em A1 e mestre em A2 somam no mesmo uso de A
	v := public.reserve_storage('00000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1', 3000, 'image', 'a1/j1.webp');
	if v->>'payer_id' <> '00000000-0000-0000-0000-0000000000a1' or (v->>'used')::bigint <> 3000 then
		raise exception 'FAIL: reserva do jogador não debitou de A: %', v;
	end if;
	v := public.reserve_storage('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2', 4000, 'pdf', 'library/a2/p1.pdf');
	if (v->>'used')::bigint <> 7000 then
		raise exception 'FAIL: CA1 uso agregado esperado 7000: %', v;
	end if;
	raise notice 'PASS 0083 CA1 uploads em A1 (jogador) e A2 (mestre) somam no mesmo uso de A (7000)';

	-- capa conta na cota (decisão do Luiz)
	v := public.reserve_storage('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2', 500, 'thumb', 'library/a2/p1.thumb.webp');
	if (v->>'used')::bigint <> 7500 then
		raise exception 'FAIL: capa não contou: %', v;
	end if;
	raise notice 'PASS 0083 a capa do PDF (thumb) conta na cota';

	-- sem campanha: o próprio usuário paga (foto da mesa)
	v := public.reserve_storage('00000000-0000-0000-0000-000000000099', null, 100, 'image', 'x/table-photo.webp');
	if v->>'payer_id' <> '00000000-0000-0000-0000-000000000099' then
		raise exception 'FAIL: upload sem campanha deveria ser pago pelo uploader';
	end if;
	raise notice 'PASS 0083 upload sem campanha é pago pelo próprio usuário';

	-- negação: convite pendente, removido e conta B não reservam na A1
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000d1', '20000000-0000-0000-0000-0000000000a1', 1, 'image', 'a1/pend.webp');
		raise exception 'FAIL: convite pendente reservou';
	exception when insufficient_privilege then null; end;
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-0000000000a1', 1, 'image', 'a1/rem.webp');
		raise exception 'FAIL: membro removido reservou';
	exception when insufficient_privilege then null; end;
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000a1', 1, 'image', 'a1/b.webp');
		raise exception 'FAIL: conta B reservou na campanha de A';
	exception when insufficient_privilege then null; end;
	raise notice 'PASS 0083 NEGAÇÃO convite pendente, membro removido e conta B não reservam na campanha de A (42501)';

	-- validação de entrada
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000a1', null, 0, 'image', 'a/zero');
		raise exception 'FAIL: tamanho 0 aceito';
	exception when invalid_parameter_value then null; end;
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000a1', null, 1, 'svg', 'a/svg');
		raise exception 'FAIL: tipo inválido aceito';
	exception when invalid_parameter_value then null; end;
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 1, 'image', 'a1/j1.webp');
		raise exception 'FAIL: chave repetida aceita';
	exception when unique_violation then null; end;
	raise notice 'PASS 0083 reserva recusa tamanho 0, tipo inválido e chave repetida';

	-- CA2 (free): B com 99.999.000 B; 2.000 estoura, 1.000 cabe (fica em 100.000.000)
	insert into public.storage_objects (owner_id, campaign_id, uploaded_by, bucket, r2_key, kind, size_bytes, status, ready_at)
	values ('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'library', 'library/b1/base.pdf', 'pdf', 99999000, 'ready', now());
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 2000, 'image', 'b1/2000.webp');
		raise exception 'FAIL: CA2 free 2000 deveria estourar';
	exception when raise_exception then
		get stacked diagnostics v_state = message_text, v_detail = pg_exception_detail;
		if v_state <> 'quota_exceeded' or (v_detail::jsonb)->>'payer_name' <> 'Mestre B'
			or ((v_detail::jsonb)->>'limit')::bigint <> 100000000 then
			raise exception 'FAIL: erro de cota sem os dados: % %', v_state, v_detail;
		end if;
	end;
	v := public.reserve_storage('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 1000, 'image', 'b1/1000.webp');
	if (v->>'used')::bigint <> 100000000 then
		raise exception 'FAIL: CA2 free 1000 deveria caber: %', v;
	end if;
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 1, 'image', 'b1/1.webp');
		raise exception 'FAIL: cota cheia aceitou 1 byte';
	exception when raise_exception then null; end;
	raise notice 'PASS 0083 CA2 free: 99.999.000 + 2.000 = quota_exceeded (com nome do mestre); + 1.000 cabe; cheio recusa 1 B';

	-- CA2 (pro): A com uso 7.500 completado até 9.999.999.000; 2.000 estoura, 1.000 cabe
	insert into public.storage_objects (owner_id, campaign_id, uploaded_by, bucket, r2_key, kind, size_bytes, status, ready_at)
	values ('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'library', 'library/a2/big.pdf', 'pdf', 9999999000 - 7500, 'ready', now());
	begin
		perform public.reserve_storage('00000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 2000, 'image', 'a1/2000.webp');
		raise exception 'FAIL: CA2 pro 2000 deveria estourar';
	exception when raise_exception then null; end;
	v := public.reserve_storage('00000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000a1', 1000, 'image', 'a1/1000.webp');
	if (v->>'used')::bigint <> 10000000000 then
		raise exception 'FAIL: CA2 pro 1000 deveria caber: %', v;
	end if;
	raise notice 'PASS 0083 CA2 pro: mesmo limite exato em 10.000.000.000 (co-mestre debita do mestre)';

	-- confirm e release
	v := public.confirm_storage('a1/j1.webp', 2500);
	if v->>'status' <> 'ready' or (v->>'size_bytes')::bigint <> 2500 then
		raise exception 'FAIL: confirm: %', v;
	end if;
	if (select ready_at from public.storage_objects where r2_key = 'a1/j1.webp') is null then
		raise exception 'FAIL: confirm sem ready_at';
	end if;
	begin
		perform public.confirm_storage('nao/existe', 10);
		raise exception 'FAIL: confirm de chave inexistente';
	exception when no_data_found then null; end;
	if public.release_storage('a1/1000.webp') <> 1000 or public.release_storage('nao/existe') <> 0 then
		raise exception 'FAIL: release';
	end if;
	raise notice 'PASS 0083 confirm vira ready com o tamanho real; chave inexistente = P0002; release solta e devolve os bytes';
end $$;
reset role;

-- ── 0084: cache derivado e over_limit_since ─────────────────────────────
do $$
declare
	v_sum bigint;
begin
	select coalesce(sum(size_bytes), 0) into v_sum from public.storage_objects where owner_id = '00000000-0000-0000-0000-0000000000a1';
	if (select storage_used_bytes from public.user_plans where user_id = '00000000-0000-0000-0000-0000000000a1') <> v_sum then
		raise exception 'FAIL: storage_used_bytes de A não bate com storage_objects';
	end if;
	if (select storage_used_bytes from public.user_plans where user_id = '00000000-0000-0000-0000-000000000099') <> 100 then
		raise exception 'FAIL: trigger não criou a linha de user_plans do usuário sem plano';
	end if;
	if (select over_limit_since from public.user_plans where user_id = '00000000-0000-0000-0000-0000000000a1') is not null then
		raise exception 'FAIL: A dentro do limite com over_limit_since';
	end if;

	-- downgrade simulado: A vira free e o próximo movimento liga o aviso
	update public.user_plans set plan = 'free' where user_id = '00000000-0000-0000-0000-0000000000a1';
	update public.storage_objects set size_bytes = size_bytes where r2_key = 'a1/j1.webp';
	if (select over_limit_since from public.user_plans where user_id = '00000000-0000-0000-0000-0000000000a1') is null then
		raise exception 'FAIL: over_limit_since não ligou acima do limite';
	end if;
	delete from public.storage_objects where r2_key = 'library/a2/big.pdf';
	if (select over_limit_since from public.user_plans where user_id = '00000000-0000-0000-0000-0000000000a1') is not null then
		raise exception 'FAIL: over_limit_since não desligou ao voltar a caber';
	end if;
	update public.user_plans set plan = 'pro' where user_id = '00000000-0000-0000-0000-0000000000a1';
	raise notice 'PASS 0084 storage_used_bytes = soma de storage_objects; over_limit_since liga acima do limite e desliga ao caber';

	if has_table_privilege('authenticated', 'public.user_plans', 'INSERT')
		or has_table_privilege('authenticated', 'public.user_plans', 'UPDATE')
		or has_table_privilege('authenticated', 'public.user_plans', 'DELETE')
		or has_table_privilege('authenticated', 'public.user_plans', 'TRUNCATE')
		or has_table_privilege('anon', 'public.user_plans', 'INSERT')
		or has_table_privilege('anon', 'public.user_plans', 'UPDATE')
		or not has_table_privilege('service_role', 'public.user_plans', 'UPDATE') then
		raise exception 'FAIL: grants de user_plans';
	end if;
	raise notice 'PASS 0084 user_plans sem INSERT/UPDATE/DELETE/TRUNCATE para anon e authenticated';
end $$;

select pg_temp.claims('00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid');
set local role authenticated;
do $$
begin
	begin
		update public.user_plans set plan = 'pro' where user_id = '00000000-0000-0000-0000-0000000000b1';
		raise exception 'FAIL: B virou pro sozinho';
	exception when insufficient_privilege then null; end;
	begin
		insert into public.user_plans (user_id, plan) values ('00000000-0000-0000-0000-0000000000b1', 'pro');
		raise exception 'FAIL: B inseriu plano';
	exception when insufficient_privilege then null; end;
	begin
		delete from public.user_plans;
		raise exception 'FAIL: B apagou planos';
	exception when insufficient_privilege then null; end;
	if exists (select 1 from public.user_plans where user_id = '00000000-0000-0000-0000-0000000000a1') then
		raise exception 'FAIL: B leu o plano de A sem ser membro';
	end if;
	raise notice 'PASS 0084 NEGAÇÃO conta B não escreve em user_plans (nem a própria linha) e não lê o plano de A';
end $$;
reset role;

select pg_temp.claims('00000000-0000-0000-0000-0000000000f1', 'jogador-a@example.invalid');
set local role authenticated;
do $$
begin
	if (select plan from public.user_plans where user_id = '00000000-0000-0000-0000-0000000000a1') is distinct from 'pro' then
		raise exception 'FAIL: jogador da mesa deveria ler o plano do mestre (policy mantida)';
	end if;
	raise notice 'PASS 0084 policy mantida: jogador da mesa lê o plano do mestre';
end $$;
reset role;

-- ── my_storage_context ──────────────────────────────────────────────────
select pg_temp.claims('00000000-0000-0000-0000-0000000000a1', 'mestre-a@example.invalid');
set local role authenticated;
do $$
declare
	v jsonb := public.my_storage_context('20000000-0000-0000-0000-0000000000a1');
begin
	if v->>'label' <> 'pro' or v->>'payer_id' <> '00000000-0000-0000-0000-0000000000a1'
		or jsonb_array_length(v->'by_campaign') <> 2 or jsonb_array_length(v->'top_files') < 1
		or (v->>'used_images')::bigint + (v->>'used_pdfs')::bigint <> (v->>'used')::bigint then
		raise exception 'FAIL: contexto do pagador: %', v;
	end if;
	raise notice 'PASS 0083 contexto do pagador A: Pro, by_campaign (2 campanhas), top_files e imagens + PDFs = total';
end $$;
reset role;

select pg_temp.claims('00000000-0000-0000-0000-0000000000f1', 'jogador-a@example.invalid');
set local role authenticated;
do $$
declare
	v jsonb := public.my_storage_context('20000000-0000-0000-0000-0000000000a1');
	v_own jsonb := public.my_storage_context(null);
begin
	if v->>'label' <> 'guest_pro' or v->>'payer_id' <> '00000000-0000-0000-0000-0000000000a1'
		or v->>'payer_name' <> 'Mestre A'
		or (v->'by_campaign') <> 'null'::jsonb or (v->'top_files') <> 'null'::jsonb
		or (v->'over_limit_since') <> 'null'::jsonb then
		raise exception 'FAIL: convidado recebeu detalhe do pagador: %', v;
	end if;
	if v_own->>'label' <> 'free' or v_own->>'payer_id' <> '00000000-0000-0000-0000-0000000000f1' then
		raise exception 'FAIL: contexto sem campanha do jogador: %', v_own;
	end if;
	raise notice 'PASS 0083 NEGAÇÃO convidado J na mesa de A: Convidado Pro com total e limite, sem by_campaign, top_files nem dias; fora dela, Free';
end $$;
reset role;

select pg_temp.claims('00000000-0000-0000-0000-0000000000b1', 'mestre-b@example.invalid');
set local role authenticated;
do $$
declare
	v jsonb := public.my_storage_context('20000000-0000-0000-0000-0000000000a1');
begin
	if v->>'payer_id' <> '00000000-0000-0000-0000-0000000000b1'
		or v::text like '%20000000-0000-0000-0000-0000000000a%'
		or v::text like '%Campanha A%' then
		raise exception 'FAIL: conta B viu dados de A pelo contexto: %', v;
	end if;
	raise notice 'PASS 0083 NEGAÇÃO conta B pedindo o contexto da campanha de A recebe só o dela, sem nada de A';
end $$;
reset role;

set local role anon;
do $$
begin
	begin
		perform public.my_storage_context(null);
		raise exception 'FAIL: anon executou my_storage_context';
	exception when insufficient_privilege then null; end;
	raise notice 'PASS 0083 NEGAÇÃO anon não executa my_storage_context';
end $$;
reset role;

rollback;
\echo '0083/0084: todos os casos passaram'
