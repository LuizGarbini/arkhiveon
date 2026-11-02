# Testes SQL locais

Estes arquivos rodam só em Postgres descartável. Não use `supabase db push`, `supabase link` nem o projeto remoto.

## 0058 — offset do grid e `scale_scene_geometry`

O Docker deste Mac estava pausado quando a fatia foi escrita, então o teste não foi executado aqui. Com o Supabase local no ar (migrations até a `0058` já aplicadas nesse banco, nunca no remoto):

```bash
psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0058_vtt_scene_map_scale.test.sql
```

A transação termina em `ROLLBACK`. A saída esperada é `0058: todos os cenários passaram`.

O teste usa duas contas: o owner grava `grid_offset_x/y` e chama `scale_scene_geometry` (tokens e paredes escalam). O viewer não altera o offset (RLS, 0 linhas) e a RPC devolve `42501`. `anon` não tem `EXECUTE`.
