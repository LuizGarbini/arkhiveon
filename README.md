# Aviso de imagem privada no seletor de entidade

Branch: garbini/aviso-imagem-privada (commit e4448e1). Prova: `proof.cjs` (Playwright + Supabase mockado),
rodado com `env.test.local` copiado para `.env.test.local` (mode test). Medições em `run.log`.

- a1: asset privado da galeria → aviso no recorte
- a2: asset público → sem aviso
- a3/a4: aplicar com aviso → cópia sobe (1 upload) e a imagem salva no NPC
