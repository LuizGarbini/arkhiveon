#!/usr/bin/env bash
# Testes SQL da 0064 SOMENTE em Postgres local descartável.
# Nunca usa supabase db push, link, projeto remoto ou preflight de produção.
set -euo pipefail
cd "$(dirname "$0")/.."

export LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://ubuntu:postgres@127.0.0.1:5432/arkhiveon_0064}"

HOST="$(python3 -c 'import os; from urllib.parse import urlparse; print(urlparse(os.environ["LOCAL_DB_URL"]).hostname or "")')"
if [[ "$HOST" != "127.0.0.1" && "$HOST" != "localhost" ]]; then
	echo "BLOQUEIO: LOCAL_DB_URL não é loopback ($HOST). Recusado." >&2
	exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
	echo "BLOQUEIO: psql não está no PATH. Postgres local não executável." >&2
	exit 1
fi
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
	echo "BLOQUEIO: Postgres local não aceita conexão em 127.0.0.1:5432." >&2
	exit 1
fi

DB_NAME="$(python3 -c 'import os; from urllib.parse import urlparse; print((urlparse(os.environ["LOCAL_DB_URL"]).path or "/arkhiveon_0064").lstrip("/") or "arkhiveon_0064")')"

echo "== recria banco local $DB_NAME =="
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ubuntu;"

echo "== bootstrap 0063 + migrations 0063/0064 =="
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0063_local_bootstrap.sql
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0063_consume_ammo.sql
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0064_ammo_roll_formula.sql

echo "== parse 0064 =="
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0064_ammo_roll_formula.sql

echo "0064 local: parse GREEN (não é prova HTTP / produção)"
