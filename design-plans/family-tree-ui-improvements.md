# Padronização do Design System no Grafo da Árvore Genealógica

Written against: b846677

## Evidence chain

- Surface: `src/routes/family-tree.tsx` (`/family-tree`)
- Problem: As configurações do ReactFlow (canvas, background, mini-mapa e arestas), os containers dos elementos visuais e os controles de formulário declaram cores OKLCH/RGBA arbitrárias, opacidades ad-hoc e inputs HTML nativos sem alinhamento aos tokens globais de tema do Arkhiveon UI.
- Design evidence: `.agents/AGENTS.md` (Regras de Design System & Estética Arkhiveon UI) e `src/routes/design-system.tsx` (`/design-system`)
- Owner: `src/routes/family-tree.tsx`
- Scope and affected surfaces: `src/routes/family-tree.tsx`
- Uncertainty: Nenhuma

## Design decision

Reestruturar o canvas, as arestas, o minimapa, as superfícies de cards/painéis e os formulários da rota de Árvore Genealógica para consumir estritamente os tokens de cor CSS e classes de elevação do Arkhiveon UI (tais como `var(--primary)`, `var(--muted)`, `var(--card)`, `bg-card-elevated` e `border-border/70`), eliminando cores sólidas arbitrárias e padronizando os elementos de controle.

## Reuse

- Tokens e Variáveis CSS de Tema: `var(--primary)`, `var(--muted)`, `var(--card)`, `var(--popover)`, `var(--border)`, `bg-card-elevated`, `border-border/70`, `text-primary`, `text-muted-foreground`
- Exemplar: `src/routes/design-system.tsx` e `src/components/ui/form-tabs.tsx`

## Changes

1. `src/routes/family-tree.tsx`
   - Change: 
     a) Substituir strings de cores brutas em OKLCH (`oklch(0.68 0.13 150)`, `oklch(0.76 0.14 80)`, `oklch(0.72 0.12 310)`, `oklch(0.92 0.01 285)`, etc.) e gradientes ad-hoc no canvas/arestas por variáveis do tema CSS (ex: `var(--primary)`, `var(--muted)`, `var(--border)`, `var(--card)`).
     b) Padronizar as superfícies de containers e painéis flutuantes (`FamilyTreePage`, `FamilyCharacterNode`, `GraphSidePanel`, `ConnectionEditor`) substituindo `bg-card/95`, `bg-card/90`, `bg-card/80` por `bg-card-elevated` e bordas `border-border/70`.
     c) Refatorar o `<input type="checkbox">` nativo no `ConnectionEditor` para utilizar a estrutura visual e interativa padronizada do Arkhiveon UI.
   - Preserve: Lógica de grafo com `@dagrejs/dagre`, inclusão/remoção de relacionamentos no estado `useRPGStore`, atalhos de visualização e comportamentos de permissão de Mestre vs Jogador.
   - Verify: Renderização do grafo respeitando a paleta e tema global do projeto, sem cores OKLCH/RGBA hardcoded e com componentes de container e input alinhados ao Design System.

## Scope

- Inherit: Componentes filhos renderizados em `src/routes/family-tree.tsx` (`FamilyCharacterNode`, `GraphSidePanel`, `ConnectionEditor`)
- Verify: Renderização visual da rota `/family-tree` em modo visualização e modo edição
- Exclude: Lógica do store (`src/lib/store.ts`), backend/banco de dados e outras rotas da aplicação

## Validation

- Product: Visualização e edição de conexões na Árvore Genealógica com fidelidade visual total ao Design System
- Interface: Rota `/family-tree`, testando os modos de navegação (zoom/pan), clique em nós, clique em arestas, modo de edição de conexões e visualização com perfil de jogador/mestre
- System: Confirmar que nenhuma cor sólida ou opacidade ad-hoc substitui os tokens definidos em `design-system.tsx`
- Repository: `npx @biomejs/biome check --write src/routes/family-tree.tsx` → 0 erros de sintaxe ou linting

## Stop conditions

- Stop if a refatoração das arestas do ReactFlow exigir alteração na biblioteca `@xyflow/react` além de estilização via `style` e variáveis CSS.

## Design documentation

- After acceptance and validation: Nenhuma documentação nova necessária, apenas conformidade total com `.agents/AGENTS.md` e `src/routes/design-system.tsx`.
