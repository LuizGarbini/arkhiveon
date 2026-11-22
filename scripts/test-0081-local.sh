#!/usr/bin/env bash
# Testes SQL da 0081 SOMENTE em Postgres local descartável (127.0.0.1).
# Nunca usa supabase db push, link nem projeto remoto.
set -euo pipefail
cd "$(dirname "$0")/.."
DB_NAME="${DB_NAME:-arkhiveon_0081}"
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
	echo "BLOQUEIO: Postgres local não aceita conexão em 127.0.0.1:5432." >&2
	exit 1
fi
PSQL=(sudo -u postgres psql -h 127.0.0.1 -X -v ON_ERROR_STOP=1)
if ! sudo -u postgres psql -X -c 'select 1' >/dev/null 2>&1; then
	echo "BLOQUEIO: sem acesso ao Postgres local como postgres." >&2
	exit 1
fi
PSQL=(sudo -u postgres psql -X -q -o /dev/null -v ON_ERROR_STOP=1)
echo "== recria banco local $DB_NAME =="
"${PSQL[@]}" -q -c "DROP DATABASE IF EXISTS ${DB_NAME};" -c "CREATE DATABASE ${DB_NAME};"
echo "== bootstrap (réplica mínima do prod) =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/tests/0081_local_bootstrap.sql
echo "== antes da 0081 =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/tests/0081_antes.sql
echo "== aplica 0081 (só neste banco local) =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/migrations/0081_vtt_player_place_token.sql
echo "== testes (ROLLBACK) =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/tests/0081_vtt_player_place_token.sql
echo "== rollback da 0081 e reaplicação =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/rollbacks/0081_vtt_player_place_token.down.sql
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/tests/0081_antes.sql
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/migrations/0081_vtt_player_place_token.sql
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/tests/0081_vtt_player_place_token.sql
