#!/usr/bin/env bash
# Prova local da 0079 (slots novos de set_character_equipment e o rollback).
# Falha se o Docker ou a stack arkhiveon não estiver de pé.
# Recusa host que não seja o Postgres do container local.
# Nunca usa db push, link ou projeto remoto. Não imprime chaves, e-mails nem ids.
# Uso: bash scripts/test-0079-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

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

function_has_new_slots() {
	docker exec "$db" psql -U postgres -d postgres -tAc \
		"select position('earring' in pg_get_functiondef('public.set_character_equipment(uuid,jsonb)'::regprocedure)) > 0;" \
		| tr -d '[:space:]'
}

echo "=== aplica 0079 ==="
psql_local < supabase/migrations/0079_set_character_equipment_slots.sql
if [[ "$(function_has_new_slots)" != "t" ]]; then
	echo "FAIL: a função local não lista os slots novos depois da 0079." >&2
	exit 1
fi

echo "=== SQL com os slots novos ==="
psql_local < supabase/tests/0079_set_character_equipment_slots.sql

echo "=== ROLLBACK ==="
psql_local < supabase/rollbacks/0079_set_character_equipment_slots.down.sql
if [[ "$(function_has_new_slots)" != "f" ]]; then
	echo "FAIL rollback: a função ainda aceita os slots novos." >&2
	exit 1
fi

echo "=== SQL depois do rollback ==="
psql_local < supabase/tests/0079_set_character_equipment_slots.sql

echo "=== REAPPLY ==="
psql_local < supabase/migrations/0079_set_character_equipment_slots.sql
if [[ "$(function_has_new_slots)" != "t" ]]; then
	echo "FAIL reapply: a função local ficou sem os slots novos." >&2
	exit 1
fi
echo "0079 aplicada no Postgres local: 16 slots"
