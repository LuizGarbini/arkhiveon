#!/usr/bin/env bash
# Prova local da 0066 (SQL N1–N14, Realtime R1–R8/T-iso/T-presence-key e rollback).
# Falha se o Docker ou a stack arkhiveon não estiver de pé. Recusa host fora
# do loopback. Nunca usa db push, link ou projeto remoto. Não imprime chaves.
# Uso: bash scripts/test-0066-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
	echo "Docker não está rodando. Abra o Docker Desktop e rode de novo." >&2
	exit 1
fi

for container in supabase_db_arkhiveon supabase_kong_arkhiveon supabase_realtime_arkhiveon supabase_auth_arkhiveon; do
	running="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo false)"
	if [[ "$running" != "true" ]]; then
		echo "Stack local arkhiveon não está de pé (${container})." >&2
		exit 1
	fi
done

if ! docker exec supabase_db_arkhiveon pg_isready -q -U postgres -d postgres; then
	echo "Postgres local da stack arkhiveon não aceita conexão." >&2
	exit 1
fi

load_local_keys() {
	local status_out line key value
	status_out="$(pnpm exec supabase status -o env 2>/dev/null)" || {
		echo "Stack local não respondeu ao status. Sem detalhes de credencial." >&2
		exit 1
	}
	API_URL=""
	ANON_KEY=""
	SERVICE_ROLE_KEY=""
	while IFS= read -r line; do
		case "$line" in
		[A-Z0-9_]*=*)
			key="${line%%=*}"
			value="${line#*=}"
			if [[ "$value" == \"*\" ]]; then
				value="${value:1:${#value}-2}"
			fi
			case "$key" in
			API_URL|ANON_KEY|SERVICE_ROLE_KEY)
				printf -v "$key" '%s' "$value"
				;;
			esac
			;;
		esac
	done <<<"$status_out"
	unset status_out line key value
	if [[ -z "${API_URL}" || -z "${ANON_KEY}" || -z "${SERVICE_ROLE_KEY}" ]]; then
		echo "BLOQUEIO: status local não trouxe API_URL/ANON_KEY/SERVICE_ROLE_KEY." >&2
		exit 1
	fi
	export API_URL ANON_KEY SERVICE_ROLE_KEY
}

load_local_keys

python3 - <<'PY'
import os
from urllib.parse import urlparse
url = urlparse(os.environ["API_URL"])
host = url.hostname or ""
if host not in ("127.0.0.1", "localhost") or url.port != 54321:
    raise SystemExit("BLOQUEIO: API recusada (não é loopback na porta 54321).")
print("API loopback:54321")
PY

policy_count() {
	docker exec supabase_db_arkhiveon psql -U postgres -d postgres -tAc \
		"select count(*) from pg_policy where polrelid = 'realtime.messages'::regclass and polname like 'vtt_rt_%';"
}

apply_up() {
	docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
		< supabase/migrations/0066_vtt_realtime_private_channels.sql
}

count="$(policy_count | tr -d '[:space:]')"
if [[ "$count" == "0" ]]; then
	echo "=== aplica 0066 ==="
	apply_up
	count="$(policy_count | tr -d '[:space:]')"
fi
if [[ "$count" != "4" ]]; then
	echo "FAIL: esperava 4 policies vtt_rt antes dos testes (veio ${count})." >&2
	exit 1
fi

echo "=== SQL 8.1 ==="
docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
	< supabase/tests/0066_vtt_realtime_private_channels.sql

echo "=== E2E 8.2 ==="
node supabase/tests/0066_vtt_realtime_e2e.mjs full

echo "=== ROLLBACK ==="
docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
	< supabase/rollbacks/0066_vtt_realtime_private_channels.down.sql
count="$(policy_count | tr -d '[:space:]')"
echo "policies vtt_rt apos rollback: ${count}"
if [[ "$count" != "0" ]]; then
	echo "FAIL rollback: ainda ha policies vtt_rt." >&2
	exit 1
fi
node supabase/tests/0066_vtt_realtime_e2e.mjs join-denied

echo "=== REAPPLY ==="
apply_up
count="$(policy_count | tr -d '[:space:]')"
echo "policies vtt_rt apos reaplicar: ${count}"
if [[ "$count" != "4" ]]; then
	echo "FAIL reapply: esperava 4 policies (veio ${count})." >&2
	exit 1
fi
node supabase/tests/0066_vtt_realtime_e2e.mjs join-allowed
echo "=== SQL apos reaplicar ==="
docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 \
	< supabase/tests/0066_vtt_realtime_private_channels.sql
echo "0066 aplicada no local: 4 policies"
