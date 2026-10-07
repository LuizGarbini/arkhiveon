# Referência Drizzle para o back-end

Pasta de **referência** para o Fastify/Drizzle. Não aplica no Supabase (`pnpm db:push` continua sendo `supabase/migrations`).

## Como usar no back

1. Copia `schema/` para o back (ex.: `src/infrastructure/database/schema/`).
2. No back, aponta o `drizzle.config` para esse schema, roda `drizzle-kit generate` e commita o journal/snapshot **de lá**.
3. Não cola `supabase/migrations` na pasta do Drizzle.
4. Não usa FKs para `auth.users` — no back o `owner_user_id` / `user_id` é UUID sem Auth do Supabase.
5. Depois da `0000` gerada, aplica `0001_set_updated_at.sql` (triggers). Drizzle Kit não gera isso.

## O que não entra

- RLS / `auth.uid()`
- seeds de magias e talentos
- Storage / Realtime
