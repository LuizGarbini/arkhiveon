# PR-B — token novo na próxima casa livre
Branch garbini/vtt-spawn-casa-livre · commit c8e90f2. Prova `prova.cjs`: Biblioteca → Criar → 3× "Colocar na cena" (insert mockado).
- before (main): 3 tokens em (735,455) desktop e (175,455) mobile — empilhados.
- after: (735,455), (735,385), (665,455) e no mobile (175,455), (175,385), (105,455) — 3 casas distintas, coladas. Ver *-measures.json.
Testes: grid-math.test.ts findFreeCell (livre, ocupado, 3 seguidos, 2x2, borda, sem espaço, hex pointy/flat). vitest 544/544 · tsc · biome · build ok.
