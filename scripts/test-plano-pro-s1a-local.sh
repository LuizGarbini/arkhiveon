#!/usr/bin/env bash
# Plano Pro S1a (0082–0086): aplica as migrações, roda os testes SQL de
# negação, a corrida da reserva e o ciclo de rollback.
#
# SÓ Postgres local descartável. LOCAL_DB_URL tem de apontar para loopback e
# para um banco com o schema de produção até a 0081 (Supabase local com as
# migrações aplicadas, ou o baseline do arkhiveon-back-end + fixture) e SEM
# campanha nenhuma. Nunca use o projeto remoto, db push nem db link.
set -euo pipefail

: "${LOCAL_DB_URL:?defina LOCAL_DB_URL (Postgres local descartável)}"
host=$(node -e 'console.log(new URL(process.argv[1]).hostname)' "$LOCAL_DB_URL")
case "$host" in
	127.0.0.1|localhost|::1|\[::1\]) ;;
	*) echo "recusado: $host não é loopback" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.."
psql_run() { psql "$LOCAL_DB_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

echo "== aplica 0082–0086"
for f in supabase/migrations/008{2,3,4,5,6}_*.sql; do psql_run -f "$f" 2>/dev/null; done
echo "== reaplica (idempotência)"
for f in supabase/migrations/008{2,3,4,5,6}_*.sql; do psql_run -f "$f" 2>/dev/null; done

echo "== testes SQL"
for t in 0082_storage_objects_rls 0083_storage_rpcs 0085_library_uploaded_by_set_null 0086_members_view_campaign; do
	psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f "supabase/tests/$t.sql" 2>&1 \
		| sed -n 's/.*NOTICE:  //p; /passaram/p'
done

echo "== corrida da reserva"
LOCAL_DB_URL="$LOCAL_DB_URL" node supabase/tests/0083_reserve_storage.concurrency.mjs

echo "== ciclo de rollback (0086 -> 0082) e reaplicação"
for f in 0086_fix_members_view_campaign_policy 0085_library_uploaded_by_set_null 0084_user_plans_billing_and_grants 0083_storage_rpcs 0082_storage_objects; do
	psql_run -f "supabase/rollbacks/$f.down.sql" 2>/dev/null
done
psql "$LOCAL_DB_URL" -X -tA -v ON_ERROR_STOP=1 <<'SQL'
do $$
begin
	if to_regclass('public.storage_objects') is not null
		or to_regprocedure('public.reserve_storage(uuid, uuid, bigint, text, text)') is not null
		or exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_plans' and column_name = 'over_limit_since')
		or not has_table_privilege('authenticated', 'public.user_plans', 'UPDATE')
		or (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'campaign_library_files' and column_name = 'uploaded_by') <> 'NO'
		or (select qual from pg_policies where tablename = 'campaigns' and policyname = 'Members can view campaign') not like '%i.campaign_id = i.id%' then
		raise exception 'FAIL: rollback não voltou ao estado da 0081';
	end if;
	raise notice 'PASS rollback 0086 -> 0082: estado igual ao da 0081';
end $$;
SQL
for f in supabase/migrations/008{2,3,4,5,6}_*.sql; do psql_run -f "$f" 2>/dev/null; done
psql "$LOCAL_DB_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/0083_storage_rpcs.sql 2>&1 | sed -n '/passaram/p'
echo "S1a local: tudo passou"
