# R8 — canal da sala do VTT num módulo próprio (1.6.179)

Refactor sem mudança de comportamento. Preparação para a 0066 (transporte privado), que vem em outra PR.

## O que saiu de lugar

Tudo o que a tela da mesa (`src/routes/campaigns/$campaignId/vtt.tsx`) fazia no canal em tempo real `vtt-room:<campanha>:<cena>` agora está em `src/lib/vtt/room-channel.ts`. Esse módulo não usa React.

- **Tópico e config:** ficam em `roomTopic` e `roomChannelOptions` (presença com a chave do usuário, `broadcast.self = false`).
- **Presença:**
  - `roomDisplayName` monta o nome da mesa: nome completo, depois o começo do e-mail, depois "Aventureiro".
  - `roomPresencePayload` monta os campos do `track`.
  - `handlePresenceSync` e `handlePresenceLeave` tratam a entrada e a saída da sala.
- **Eventos recebidos:** cada um tem seu handler em `roomBroadcastHandlers`, com o mesmo corpo de antes:
  - token_drag e token_drag_batch;
  - explored_cells, explored_cleared e explored_reset;
  - cursor_move, ruler_move, ping, fog_update e template_move.
- **Registro no canal:** `attachRoomHandlers` registra tudo na mesma ordem: presença (sync, leave) e depois os 10 broadcasts.
- **Mensagens enviadas:** `roomMessages` monta o arraste, o lote de arraste, o cursor, a régua, o ping, a névoa (um caminho ou a lista), os moldes e a exploração.

O que a tela continua fazendo:
- Cria o canal no mesmo efeito, no mesmo lugar e com as mesmas dependências.
- Liga o módulo, faz o `subscribe` (initUserColor + track) e o cleanup.
- Faz o re-`track` quando a cor muda, também no mesmo efeito de antes.
- Os callbacks de envio continuam iguais, inclusive o filtro `controllableMoves` e os guards; só o objeto da mensagem vem do módulo.

## O que NÃO mudou

- **Canal e mensagens:** tópico, config, nomes de evento e payloads, tanto enviados quanto recebidos.
- **Papel de quem manda:** o papel de ping e de remoção de molde ainda vem do dono, depois das memberships carregadas, depois da presença. O papel escrito no payload continua sem ser lido.
- **Admissão de ping:** o relógio de quem mandou continua não valendo (#238). "Todos aqui" mandado por jogador vira ping comum. "Atenção" só puxa a câmera quando o ponto está fora da tela.
- **Eventos ignorados:** os que chegam de outra cena ou depois do cleanup, como antes.
- **Efeitos e renders:**
  - Nenhum `useEffect` novo e nenhum estado derivado novo.
  - O efeito do canal tem as mesmas dependências e o efeito da cor também.
  - Por isso o número de subscribes e de renders é o mesmo.
  - Os selectors do Zustand não mudaram.

## Prova de equivalência

1. Teste de caracterização: `src/lib/vtt/room-channel.characterization.test.tsx`, commit d6be0fb.
   - Foi escrito e rodado **contra a main, antes do refactor** (saída em `caracterizacao-main.txt`).
   - Ele renderiza a mesa como mestre com um Supabase falso e grava em snapshot:
     - tópico, config, quantidade de subscribes, registros `.on` e a ordem deles;
     - o `track` e cada mensagem enviada por todos os callbacks de envio;
     - o estado da store depois de cada evento recebido, incluindo os pings de lia, rui (relógio +10 min) e bea ("Todos aqui" forçado), além de névoa, exploração e moldes;
     - a troca de cor e a remoção do canal no unmount.
2. Depois do refactor, o mesmo teste passa com o **snapshot intacto**: o arquivo `.snap` não mudou (`caracterizacao-depois.txt`).
3. Testes unitários novos em `src/lib/vtt/room-channel.test.ts` (20 testes): ordem de registro, roteamento, cena errada, cleanup, presença, admissão de ping (#238, foco forçado, dono, co-mestre por membership dentro e fora da tela, fila recusando, payload inválido), névoa e moldes.

## Saídas

- `tsc.txt`: `tsc --noEmit`, exit 0.
- `biome.txt`: `biome ci` nos arquivos tocados, exit 0.
- `testes.txt`: `pnpm test`, 252 arquivos e 3182 testes passando. Os testes antigos não mudaram.
- `build.txt`: `pnpm build`, exit 0.

O smoke opcional com duas abas e Supabase falso não foi feito. A equivalência está coberta pelo snapshot.
