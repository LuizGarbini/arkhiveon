#!/usr/bin/env bash
# Prova local da 0080 (capa da biblioteca e o rollback).
# Falha se o Docker ou a stack arkhiveon não estiver de pé.
# Recusa host que não seja o Postgres do container local.
# Nunca usa db push, link ou projeto remoto. Não lê .env.
# Não imprime chaves, e-mails nem ids.
# Uso: bash scripts/test-0080-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

unset DATABASE_URL PGHOST PGPORT PGUSER PGPASSWORD SUPABASE_DB_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY || true

if [[ $# -gt 0 ]]; then
	echo "Este script não aceita host nem URL." >&2
	exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
	echo "Docker não está rodando. Sem Supabase local, o teste SQL não roda. Não há fallback remoto." >&2
	exit 1
fi

db=""
for container in supabase_db_arkhiveon; do
	running="$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || echo false)"
	if [[ "$running" == "true" ]]; then
		db="$container"
	fi
done
if [[ -z "$db" ]]; then
	echo "Stack local arkhiveon não está de pé (supabase_db_arkhiveon)." >&2
	echo "Suba com supabase start no clone local. Este script não liga em projeto remoto." >&2
	exit 1
fi

if ! docker exec "$db" pg_isready -q -U postgres -d postgres; then
	echo "Postgres local da stack arkhiveon não aceita conexão." >&2
	exit 1
fi

# Só o socket do container. Não lê .env e não usa DATABASE_URL.
psql_local() {
	docker exec -i "$db" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 "$@"
}

migration="supabase/migrations/0080_campaign_library_thumbnails.sql"
test_sql="supabase/tests/0080_campaign_library_thumbnails.sql"
body_file="$(mktemp)"
rollback_file="$(mktemp)"
trap 'rm -f "$body_file" "$rollback_file"' EXIT

awk '
	$0 == "begin;" { capture = 1; next }
	$0 == "commit;" { exit }
	capture { print }
' "$migration" > "$body_file"

awk '
	/^-- drop index if exists campaign_library_files_thumb_pending_idx;/ { print substr($0, 4) }
	/^-- alter table public.campaign_library_files drop constraint if exists campaign_library_files_thumb_path_check/ { print substr($0, 4) }
' "$migration" > "$rollback_file"

if [[ ! -s "$body_file" || ! -s "$rollback_file" ]]; then
	echo "FAIL: corpo ou rollback da 0080 não foi extraído." >&2
	exit 1
fi
if grep -Eq '^[[:space:]]*(grant|revoke|create policy|drop policy|alter policy)' "$body_file"; then
	echo "FAIL: o corpo da 0080 mexe em grant ou policy." >&2
	exit 1
fi

thumb_exists() {
	docker exec "$db" psql -U postgres -d postgres -tAc \
		"select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'campaign_library_files' and column_name = 'thumb_status');" \
		| tr -d '[:space:]'
}

require_line() {
	local file="$1"
	local line="$2"
	if ! grep -F -q -- "$line" "$file"; then
		echo "FAIL: saída sem: $line" >&2
		exit 1
	fi
}

camps="$(docker exec "$db" psql -U postgres -d postgres -tAc "select count(*) from public.campaigns;" | tr -d '[:space:]')"
if [[ "$camps" != "0" ]]; then
	echo "Banco local tem campanhas. Rode só em Postgres descartável. Não há fallback remoto." >&2
	exit 1
fi

if [[ "$(thumb_exists)" == "t" ]]; then
	echo "=== rollback prévio para provar linha existente ==="
	psql_local < "$rollback_file"
fi
if [[ "$(thumb_exists)" != "f" ]]; then
	echo "FAIL: a prova precisa da tabela no formato da 0079." >&2
	exit 1
fi

echo "=== prova: linhas existentes viram pending (transação descartada) ==="
proof_sql="$(mktemp)"
awk -v body="$body_file" '
	$0 == "-- <<<MIGRATE_HERE>>>" {
		print "update session_flags set proof = true;"
		while ((getline line < body) > 0) print line
		close(body)
		while ((getline line < body) > 0) print line
		close(body)
		next
	}
	{ print }
' "$test_sql" > "$proof_sql"
if grep -qx -- '-- <<<MIGRATE_HERE>>>' "$proof_sql"; then
	echo "FAIL: a marca da prova não foi trocada pelo corpo da migração." >&2
	rm -f "$proof_sql"
	exit 1
fi
if [[ "$(grep -c 'add column if not exists thumb_status' "$proof_sql")" -ne 2 ]]; then
	echo "FAIL: a prova não aplica o corpo duas vezes." >&2
	rm -f "$proof_sql"
	exit 1
fi
proof_out="$(mktemp)"
psql_local < "$proof_sql" | tee "$proof_out"
rm -f "$proof_sql"
require_line "$proof_out" "PASS linhas existentes viram pending"
require_line "$proof_out" "PASS check recusa ready sem path"
require_line "$proof_out" "PASS check recusa ready com path de outra campanha"
require_line "$proof_out" "PASS check recusa ready com path de outro arquivo"
require_line "$proof_out" "PASS check recusa pending com path"
require_line "$proof_out" "PASS check aceita ready com path correto e thumb_updated_at"
require_line "$proof_out" "PASS conta B não lê linhas da campanha A, nem thumb_*"
require_line "$proof_out" "PASS jogador não lê linhas com status pending"
require_line "$proof_out" "PASS authenticated não atualiza thumb (42501)"
require_line "$proof_out" "PASS authenticated com grant de teste não grava thumb (RLS, 0 linhas)"
require_line "$proof_out" "PASS migração repetida deixa um índice e uma constraint de cada"
rm -f "$proof_out"
if [[ "$(thumb_exists)" != "f" ]]; then
	echo "FAIL: a prova deixou coluna thumb no banco." >&2
	exit 1
fi

echo "=== aplica 0080 ==="
psql_local < "$migration"
echo "=== aplica 0080 de novo ==="
psql_local < "$migration"
if [[ "$(thumb_exists)" != "t" ]]; then
	echo "FAIL: thumb_status ausente depois de aplicar duas vezes." >&2
	exit 1
fi
echo "PASS arquivo 0080 aplicado duas vezes"

echo "=== SQL com as colunas da capa ==="
normal_out="$(mktemp)"
psql_local < "$test_sql" | tee "$normal_out"
require_line "$normal_out" "PASS linha nova nasce thumb pending"
require_line "$normal_out" "PASS check aceita ready com path correto e thumb_updated_at"
require_line "$normal_out" "PASS authenticated com grant de teste não grava thumb (RLS, 0 linhas)"
require_line "$normal_out" "PASS nenhuma policy nova"
rm -f "$normal_out"

echo "=== ROLLBACK ==="
psql_local < "$rollback_file"
psql_local < "$rollback_file"
if [[ "$(thumb_exists)" != "f" ]]; then
	echo "FAIL rollback: thumb_status ainda existe." >&2
	exit 1
fi

echo "=== SQL depois do rollback ==="
down_out="$(mktemp)"
psql_local < "$test_sql" | tee "$down_out"
require_line "$down_out" "PASS rollback: tabela como na 0079, sem colunas thumb"
require_line "$down_out" "PASS conta B não lê linhas da campanha A"
require_line "$down_out" "PASS jogador não lê linhas com status pending"
require_line "$down_out" "PASS authenticated não escreve direto (42501)"
require_line "$down_out" "PASS nenhuma policy nova"
rm -f "$down_out"

echo "=== REAPPLY ==="
psql_local < "$migration"
if [[ "$(thumb_exists)" != "t" ]]; then
	echo "FAIL reapply: thumb_status ausente." >&2
	exit 1
fi
echo "0080 aplicada no Postgres local: thumb_status, thumb_path, thumb_updated_at"
