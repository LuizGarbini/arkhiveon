# Diretrizes de Desenvolvimento e Regras de IA — Arkhiveon (RPG Notes)

Este documento define as regras arquiteturais, de estilo e boas práticas que **DEVEM** ser seguidas por qualquer desenvolvedor ou assistente de IA (Antigravity, Cursor, OpenAI Codex, Claude Code, GitHub Copilot, etc.) ao trabalhar neste repositório.

---

## 1. 🎨 Design System & Estética (Arkhiveon UI)
- **Consulte o Design System**: Antes de criar ou alterar qualquer componente de interface, verifique as especificações e tokens definidos em [`src/routes/design-system.tsx`](file:///C:/Users/garba/OneDrive/%C3%81rea%20de%20Trabalho/projetos/arkhiveon/src/routes/design-system.tsx).
- **Uso Estrito de Tokens Globais**: Utilize sempre a paleta de tokens HSL e utilitários globais do Tailwind:
  - Cores e superfícies: `bg-background`, `bg-card`, `bg-card-elevated`, `text-primary`, `text-foreground`, `text-muted-foreground`, `border-border/70`, `border-primary/20`.
  - **PROIBIDO**: Não declare cores sólidas arbitrárias ou ad-hoc (ex: `bg-[#121212]`, `text-[#ff0000]`, `border-[#333]`).
- **Aparência Premium & Micro-interações**:
  - Aplique acabamento glassmorphism com `backdrop-blur-md` e bordas sutis.
  - Adicione estados de hover dinâmicos e transições suaves (`transition-all duration-150 ease-out active:scale-[0.98]`).
  - Garanta tipografia consistente com a fonte font-display para títulos e contadores.

---

## 2. ⚠️ Prevenção do Abuso de `useEffect` (Complexidade & Desempenho)
- **EVITE `useEffect` AO MÁXIMO**: Não utilize `useEffect` para sincronizar estados internos ou calcular dados derivados. Cada novo `useEffect` adiciona complexidade cognitiva exponencial, aumenta o risco de loops de re-renderização infinitos, stale closures e condições de corrida.
- **Substitutos Obrigatórios**:
  - **Dados Derivados**: Calcule diretamente no escopo do componente ou utilize `useMemo`.
  - **Efeitos Colaterais de Ações do Usuário**: Execute a lógica de atualização diretamente dentro de handlers de eventos (`onClick`, `onChange`, `onSubmit`).
  - **Sincronização de Estado de Store**: Atualize o estado via actions explícitas do Zustand ou loaders do TanStack Router.
  - **Buscas/Busca em Tempo Real**: Use `useDeferredValue` para reagir à digitação de busca sem forçar efeitos colaterais desnecessários.

---

## 3. ⚡ Zustand & Performance no React
- **Seletores Estáveis**: Seletores do Zustand devem retornar primitivos ou referências estáveis (`useRPGStore(state => state.characters)`).
- **Proibido Retornar Novos Objetos em Seletores**: Nunca crie novos objetos ou arrays inline dentro da função seletora (ex: `useRPGStore(state => state.items.filter(...))`), pois isso causa re-renders infinitos no React.
- **Memoização de Cálculos Pesados**: Filtros de listas e mapeamentos complexos devem ser encapsulados em `useMemo`.

---

## 4. 📱 UX & Responsividade Mobile (Mobile-First)
- **Telas Pequenas**: Toda tela, modal, wizard e módulo de ficha DEVE ser perfeitamente utilizável em dispositivos móveis (`sm:hidden`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- **Alvos de Toque (Touch Targets)**: Botões, seletores e ícones interativos devem ter no mínimo **44x44px** de área clicável em dispositivos móveis.
- **Prevenção de Transbordo**: Evite `overflow-x` indesejado e garanta que textos e números longos usem `truncate` ou quebra de linha fluida.

---

## 5. 🛡️ Qualidade de Código, Testes Ágeis & Biome
- **Tipagem Estrita sem `any`**: Sempre declare interfaces ou tipos TypeScript claros (`Character`, `SheetModuleConfig`, `Faction`, `Item`, `Npc`, `Lore`). EVITE `any` ou type assertions inseguras (`as any`).
- **Verificação com Biome**: Durante o desenvolvimento e antes de commitar, execute a checagem e formatação automatizada do Biome estritamente nos arquivos editados:
  ```bash
  npx @biomejs/biome check --write <arquivos_modificados>
  ```
- **Testes Unitários Focados**: Em iterações intermediárias, execute apenas o teste unitário específico do componente modificado (`pnpm vitest run <caminho_do_arquivo>`), evitando rodar a suíte inteira de centenas de testes desnecessariamente.
- **Build Completo no Fechamento**: O teste completo de compilação (`pnpm run build` / `tsc`) e a suíte completa de testes ficam reservados estritamente para o momento final antes de mesclar na `main` ou abrir o Pull Request final.

---

## 6. 🌿 Git, Branching & Organização Limpa do Repositório
- **Gerenciador de Pacotes**: Use **EXCLUSIVAMENTE `pnpm`** (`pnpm install`, `pnpm run dev`, `pnpm run build`). Nunca utilize `npm` ou `yarn`.
- **Convenção de Branches**:
  - Usuário **Luiz Garbini** (`garbasneto@gmail.com`): utilizar prefixo `garbini/nome-da-feature`.
  - Usuário **Gabriel Arroyo** (`gabrielarroyoc18@gmail.com`): utilizar prefixo `arroyo/nome-da-feature`.
- **Staging Explícito (Sem Lixo no Repositório)**: Adicione ao Git apenas os arquivos intencionalmente modificados (`git add <arquivo>`). **NUNCA** execute `git add .` indiscriminado e nunca commite scripts de teste locais, rascunhos temporários ou dumps.
- **Sincronização com Git (`git pull`)**: Mantenha a branch e o repositório sempre sincronizados com a origem.

---

## 7. 🚀 Validação Visual & Fluxo Ágil de Feedback
- **Validação Local ao Vivo (Padrão)**: Suba os commits de interface diretamente para a branch de trabalho do desenvolvedor (`garbini/*` ou `arroyo/*`). O desenvolvedor realiza a validação visual em tempo real no seu próprio ambiente local (`localhost:5173` via Vite HMR instantâneo). Isso evita esperas lentas de inicialização de navegadores headless e economiza o uso de tokens.
- **Capturas E2E / Playwright (Apenas sob Demanda)**: Execute scripts do Playwright ou `pnpm preview:record` SOMENTE quando o usuário solicitar explicitamente uma captura ou gravação. Não gere screenshots ou vídeos por padrão nas etapas iterativas.
- **Proteção Git**: A pasta `docs/previews/` é estritamente ignorada no `.gitignore`.

---

## 8. 🔒 Integridade de Dados & Segurança Supabase
- **Sem Correções Superficiais**: Nunca trate erros suprimindo exceções silenciosamente ou retornando fallbacks vazios sem identificar a causa raiz no fluxo de dados.
- **Políticas RLS & Supabase**: Mantenha as políticas RLS (`supabase/migrations/`) e tipos gerados sincronizados com as tabelas do banco de dados.

---

## 9. 📋 Formato Obrigatório de Pull Request
Sempre que finalizar uma tarefa ou preparar um PR, gere a descrição pronta para cópia respeitando `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## ✨ What was added

- Descrição clara e concisa do que foi adicionado/alterado em tópicos.

## 📷 Implementation preview

<!-- Anexe capturas de tela ou gravação caso solicitadas. -->
```
