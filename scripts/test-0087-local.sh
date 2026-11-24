#!/usr/bin/env bash
# Testes SQL da 0087 SOMENTE em Postgres local descartável (127.0.0.1).
# Nunca usa supabase db push, link nem projeto remoto. Não lê .env.
# Não imprime chaves, e-mails nem ids de produção.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-arkhiveon_0087}"
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
	echo "BLOQUEIO: Postgres local não aceita conexão em 127.0.0.1:5432." >&2
	exit 1
fi
if ! sudo -u postgres psql -X -c 'select 1' >/dev/null 2>&1; then
	echo "BLOQUEIO: sem acesso ao Postgres local como postgres." >&2
	exit 1
fi

PSQL=(sudo -u postgres psql -X -v ON_ERROR_STOP=1)
echo "== recria banco local $DB_NAME =="
"${PSQL[@]}" -q -c "DROP DATABASE IF EXISTS ${DB_NAME};" -c "CREATE DATABASE ${DB_NAME};"

echo "== bootstrap (réplica mínima, guard da 0059) =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/tests/0087_local_bootstrap.sql

echo "== antes da 0087 (o dono ainda não exclui) =="
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/0087_antes.sql

echo "== aplica 0087 (só neste banco local) =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/migrations/0087_fix_campaign_owner_delete_cascade.sql

echo "== testes depois da 0087 (ROLLBACK) =="
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/0087_fix_campaign_owner_delete_cascade.sql

echo "== rollback da 0087 e o dono volta a ser recusado =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/rollbacks/0087_fix_campaign_owner_delete_cascade.down.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/0087_antes.sql

echo "== reaplicação da 0087 e testes de novo =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/migrations/0087_fix_campaign_owner_delete_cascade.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/0087_fix_campaign_owner_delete_cascade.sql

echo "0087 local: tudo passou"
