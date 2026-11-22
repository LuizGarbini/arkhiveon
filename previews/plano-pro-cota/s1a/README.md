# Plano Pro S1a: prova

**Nada foi aplicado em Supabase nenhum.** As migrações 0082–0086 só rodaram num Postgres 17 local descartável (127.0.0.1:55432). Ele foi montado com o baseline de produção do `arkhiveon-back-end` mais o espelho 0054–0081, sem a 0066, igual a prod.

## O que muda, em palavras simples

- **0082 `storage_objects`:** uma linha por arquivo no R2, com quem paga (o dono da campanha), quem subiu, o tipo (imagem, PDF ou capa) e o tamanho. Cada um só lê as linhas que paga ou que subiu. Nenhuma conta escreve direto na tabela.
- **0083 RPCs:**
  - `reserve_storage` reserva o espaço antes do upload. Ela mesma descobre quem paga, sem parâmetro de dono, e soma o uso do mestre em todas as campanhas. Com um lock por pagador, dois uploads ao mesmo tempo não passam do limite. Se passar, responde `quota_exceeded` com o nome do mestre, sem e-mail.
  - `confirm_storage` e `release_storage` fecham o ciclo da reserva.
  - `my_storage_context` alimenta a tela de cota. O convidado vê só o total e o limite; o detalhe por campanha e os maiores arquivos ficam para quem paga.
  - `storage_limit` guarda os limites: free 100 MB e Pro 10 GB, em bytes decimais. É o mesmo número de `supabase/functions/_shared/plan-limits.ts`, e um teste vitest confere os dois.
- **0084 `user_plans`:**
  - Ganha as colunas do Stripe e `over_limit_since`, a data em que passou do limite, que serve ao aviso de 60 dias só no app.
  - Perde a escrita pelo cliente. Hoje anon e authenticated têm GRANT ALL, e só as edges com service role escrevem.
  - Um trigger mantém `storage_used_bytes` igual à soma de `storage_objects`.
- **0085:** o PDF da biblioteca não some quando a conta de quem subiu é apagada. `uploaded_by` vira nulo.
- **0086:** corrige o ramo morto da policy "Members can view campaign" (`i.campaign_id = i.id`). Ver a nota sobre M6 no corpo da PR.

## Arquivos

- `testes-sql.txt`: saída de `scripts/test-plano-pro-s1a-local.sh`:
  - aplica e reaplica 0082–0086;
  - 34 casos SQL, 17 deles de negação (conta B, outra campanha, convite pendente, membro removido, anon);
  - a corrida de 10 reservas paralelas, em que entram exatamente 4;
  - o ciclo de rollback 0086 → 0082, que volta ao estado da 0081 e reaplica tudo.
- `tsc.txt`, `biome.txt`, `pnpm-test.txt` e `build.txt`: front sem erro, com 251 arquivos e 3163 testes.
