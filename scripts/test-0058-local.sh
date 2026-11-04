#!/usr/bin/env bash
# Teste de negação da 0058 (duas contas: mestre A e jogador B) SÓ no Supabase local.
# Sobe o Supabase local (Docker), aplica as migrations no banco local
# (db reset --local) e roda supabase/tests/0058_vtt_scene_map_scale.test.sql.
# Nunca usa db push, link ou projeto remoto.
# Uso: bash scripts/test-0058-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
	echo "Docker não está rodando. Abra o Docker Desktop e rode de novo." >&2
	exit 1
fi

SUPABASE="pnpm dlx supabase@latest"
$SUPABASE start
$SUPABASE db reset --local --no-seed

PROJECT_ID="$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' supabase/config.toml)"
PROJECT_ID="${PROJECT_ID:-$(basename "$PWD")}"
CONTAINER="supabase_db_${PROJECT_ID}"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
	< supabase/tests/0058_vtt_scene_map_scale.test.sql
