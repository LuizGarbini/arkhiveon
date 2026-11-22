#!/usr/bin/env bash
# Testes SQL das políticas da 0066 (B1–B7 e X1–X4) SOMENTE em Postgres local
# descartável (loopback). Stub de realtime.messages e realtime.topic().
# Nunca usa supabase db push, link nem projeto remoto.
set -euo pipefail
cd "$(dirname "$0")/.."

# Binários do PG17 (initdb/pg_ctl costumam estar fora do PATH desta máquina).
if [[ -d /usr/lib/postgresql/17/bin ]]; then
	PATH="/usr/lib/postgresql/17/bin:$PATH"
	export PATH
fi

DB_NAME="${DB_NAME:-arkhiveon_0066_policies}"
PGHOST_LOOP="${PGHOST:-127.0.0.1}"
PGPORT_LOOP="${PGPORT:-5432}"

started_cluster=0
PGDATA_DIR="${PGDATA_DIR:-}"

cleanup() {
	if [[ "${started_cluster}" == "1" && -n "${PGDATA_DIR}" ]]; then
		pg_ctl -D "$PGDATA_DIR" -m fast stop >/dev/null 2>&1 || true
	fi
}
trap cleanup EXIT

if pg_isready -h "$PGHOST_LOOP" -p "$PGPORT_LOOP" >/dev/null 2>&1 && sudo -u postgres psql -X -c 'select 1' >/dev/null 2>&1; then
	PSQL=(sudo -u postgres psql -X -v ON_ERROR_STOP=1)
	echo "== usa Postgres local em ${PGHOST_LOOP}:${PGPORT_LOOP} =="
else
	# Cluster descartável (o 5432 do sistema pode estar fora do ar).
	PGDATA_DIR="${PGDATA_DIR:-/tmp/arkhiveon-0066-pg}"
	PGPORT_LOOP="${PGPORT_FALLBACK:-55433}"
	rm -rf "$PGDATA_DIR"
	if ! command -v initdb >/dev/null 2>&1; then
		echo "BLOQUEIO: Postgres local não aceita conexão e initdb não está no PATH." >&2
		exit 1
	fi
	initdb -D "$PGDATA_DIR" --auth-local=trust --auth-host=trust -U postgres >/dev/null
	# Só loopback.
	cat >> "$PGDATA_DIR/postgresql.conf" <<CONF
listen_addresses = '127.0.0.1'
port = ${PGPORT_LOOP}
unix_socket_directories = '${PGDATA_DIR}'
CONF
	echo "host all all 127.0.0.1/32 trust" >> "$PGDATA_DIR/pg_hba.conf"
	pg_ctl -D "$PGDATA_DIR" -l "$PGDATA_DIR/pg.log" -w start >/dev/null
	started_cluster=1
	export PGHOST=127.0.0.1
	export PGPORT="$PGPORT_LOOP"
	export PGUSER=postgres
	PSQL=(psql -h 127.0.0.1 -p "$PGPORT_LOOP" -U postgres -X -v ON_ERROR_STOP=1)
	echo "== subiu cluster descartável em 127.0.0.1:${PGPORT_LOOP} =="
fi

echo "== recria banco local $DB_NAME =="
"${PSQL[@]}" -q -c "DROP DATABASE IF EXISTS ${DB_NAME};" -c "CREATE DATABASE ${DB_NAME};"
echo "== bootstrap (stub realtime + réplica mínima) =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/tests/0066_local_bootstrap.sql
echo "== aplica 0066 (só neste banco local) =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/migrations/0066_vtt_realtime_private_channels.sql
echo "== testes B1–B7 e X1–X4 (ROLLBACK) =="
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/0066_policies_b1_x4.sql
echo "== rollback da 0066 e reaplicação =="
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/rollbacks/0066_vtt_realtime_private_channels.down.sql
"${PSQL[@]}" -q -d "$DB_NAME" -f supabase/migrations/0066_vtt_realtime_private_channels.sql
"${PSQL[@]}" -d "$DB_NAME" -f supabase/tests/0066_policies_b1_x4.sql
echo "== testes OK: 0066_policies_b1_x4.sql (reaplicação) =="
