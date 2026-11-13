# Testes SQL locais

Estes arquivos rodam só em Postgres descartável. Não use `supabase db push`, `supabase link` nem o projeto remoto.

## 0063 — consumo de munição (RPC + ledger + trigger)

Somente Postgres **local** (127.0.0.1). Não aplica no projeto remoto. O bootstrap `0063_local_bootstrap.sql` replica auth/papéis/ficha/item/roll_dice o suficiente para a migration; **não** substitui o schema de produção.

```bash
bash scripts/test-0063-local.sh
```

A transação de `0063_consume_ammo.sql` termina em `ROLLBACK`. A concorrência usa duas conexões `pg`. Prova = SQL ROLE + `request.jwt.claims`, **não** HTTP / dois browsers.

Saída esperada: `0063: N cenários registrados, todos os asserts passaram` e `0063 concurrency: 1 sucesso / 1 estoque 0`.

## 0064 — fórmula mesclada no parse/roll_dice

Somente Postgres **local** (127.0.0.1). Não aplica no projeto remoto. Reusa o bootstrap da 0063 e aplica `0064_ammo_roll_formula.sql` em banco descartável `arkhiveon_0064`.

```bash
bash scripts/test-0064-local.sh
```

Prova o parse de `2d6+3` (compat) e `1d8+1d6+3` (dois pools, sem achatar). A transação termina em `ROLLBACK`.


## 0058 — offset do grid e `scale_scene_geometry`

O Docker deste Mac estava pausado quando a fatia foi escrita, então o teste não foi executado aqui. Com o Supabase local no ar (migrations até a `0058` já aplicadas nesse banco, nunca no remoto):

```bash
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0058_vtt_scene_map_scale.test.sql
```

Ou, com o Docker aberto, tudo de uma vez (sobe o Supabase local, aplica as migrations só no banco local e roda o teste):

```bash
bash scripts/test-0058-local.sh
```

A transação termina em `ROLLBACK`. A saída esperada é `0058: todos os cenários passaram`.

O teste usa duas contas: o owner grava `grid_offset_x/y` e chama `scale_scene_geometry` (tokens e paredes escalam). O viewer não altera o offset (RLS, 0 linhas) e a RPC devolve `42501`. `anon` não tem `EXECUTE`.


## 0059 — transferir mestre (server-side)

Somente stack `arkhiveon` descartável local, porta 54322. O reset é **local** e aplica primeiramente as migrations até 0058, nunca DB remoto. Não reiniciar `arkhiveon-b2b`.

```bash
pnpx supabase@latest db reset --local --no-seed --last 1
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0059_transfer_campaign_ownership.legacy.test.sql
docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 < supabase/migrations/0059_transfer_campaign_ownership.sql
docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 < supabase/tests/0059_transfer_campaign_ownership.test.sql
docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 < supabase/tests/0059_transfer_campaign_ownership.atomic.test.sql
```

Os testes terminam em `ROLLBACK`, usam contas sintéticas UUID `00000000…` e conferem 30 comportamentos, 21 invariantes, 4 auditorias e reversão de uma falha intencional. Requerem banco descartável sem campanhas/dados reais. O auditor pré-0059 retorna `23514` para campanha sem owner, com dois owners ou mismatch; não conserta legado e não cria objetos quando recusa.

## 0066 — canal Realtime privado do VTT

Somente a stack local `arkhiveon` (Postgres em 127.0.0.1:54322, API em 127.0.0.1:54321). Não usa `supabase link`, `db push` nem projeto remoto. A migração cria quatro policies em `realtime.messages` (`vtt_rt_*`). O rollback fica em `supabase/rollbacks/` e a CLI não o aplica sozinha.

```bash
bash scripts/test-0066-local.sh
```

O script recusa host fora do loopback, falha se o Docker ou a stack local não estiver de pé, roda o SQL (N1–N14, transação em `ROLLBACK`), o WebSocket local (R1–R8, T-iso, T-presence-key) e o ciclo de rollback: tira as policies, prova que o join privado passa a ser negado, reaplica a 0066 e termina com ela aplicada. Contas sintéticas `00000000-…` e e-mails `@example.invalid`. A chave local não é impressa.
