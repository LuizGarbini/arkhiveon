# Regras do Projeto RPG Notes

- **Prefixo de Branch**: O prefixo de branch depende do usuário configurado no Git:
  - Se o usuário for **Luiz Garbini** (e-mail: `garbasneto@gmail.com`), utilize sempre o prefixo `garbini/` (exemplo: `garbini/feature-nome-da-tarefa`).
  - Se o usuário for **Gabriel Arroyo** (e-mail: `gabrielarroyoc18@gmail.com`), utilize sempre o prefixo `arroyo/` (exemplo: `arroyo/feature-nome-da-tarefa`).

- **Gerenciador de Pacotes**: Utilize sempre o **`pnpm`** para gerenciar dependências ou executar scripts de build/testes. Nunca use `npm` ou `yarn`.

- **Qualidade e Estilo de Código (Biome)**: Antes de concluir qualquer tarefa ou comitar, execute sempre a verificação e formatação automatizada do Biome nos arquivos modificados:
  - Comando: `npx @biomejs/biome check --write <arquivos_modificados>`

- **Design System & Estética (Arkhiveon UI)**:
  - Todo novo componente ou tela deve seguir rigorosamente as cores, tipografia e espaçamentos definidos no Design System (`src/routes/design-system.tsx`).
  - Utilize os tokens globais estabelecidos (como `bg-card-elevated`, `bg-background`, `text-primary` e `border-border/70`). Evite declarar cores sólidas ou ad-hoc arbitrárias.
  - Sempre incorpore micro-animações, estados de hover dinâmicos e transições suaves (ex: dropdowns, modais, revelação de painéis) para garantir a sensação de interface viva e premium.
