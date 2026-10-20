# PR-A — mesa abre pelo painel sem casca quebrada
Base main df1c511 · branch garbini/vtt-entrada-dashboard · commit f6c0c13
Repro (`repro.cjs`, preview com mocks, campanha mock "QA Designer (teste)", chunk da mesa atrasado 3 s para simular rede/box lento):
- before: 800 ms após clicar "Mesa Virtual (VTT)": router `status: pending`, `location=/vtt`, `resolvedLocation=/dashboard`, matches ainda `/dashboard`, pendingMatches `/vtt: pending` → layout já em modo mesa (sem sidebar) mostrando o dashboard. Fica assim enquanto o chunk não chega; não é trava permanente (com o chunk falhando aparece o erro "Encontro inesperado", não o dashboard).
- after: mesmo instante, casca com sidebar + dashboard; ao terminar, mesa em tela cheia.
| CA | Evidência | Resultado |
|---|---|---|
| Transição não mostra dashboard sem sidebar | before-transicao-*.png × after-transicao-*.png | passou |
| Mesa abre sem recarregar | after-desktop.png, after-mobile.png | passou |
| Lógica de escolha da casca | src/lib/layout-pathname.test.ts (4) | passou |
Comandos: tsc ok · biome ok · vitest 540/540 (Node 22) · pnpm build ok.
