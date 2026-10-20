# PR-C — Cobrir/Revelar Tudo ativam a névoa; pincel em diâmetro
Branch garbini/vtt-nevoa-cobrir · commit 75ee0f5. Prova `prova.cjs` (névoa inativa, pincel M, clicar "Cobrir Tudo").
- before: fogEnabled continua false, nada muda; botão "M (40px)" × cabeçalho "80PX".
- after: fogEnabled true, toast "Névoa ativada e mapa coberto", camada de névoa visível ao GM; botões P 40px / M 80px / G 160px, cabeçalho 80PX. after-jogador-desktop.png: visão de jogador (mock) com o mapa coberto.
Testes: vtt-fog-controls.test.tsx (7). vitest 543/543 · tsc · biome · build ok.
