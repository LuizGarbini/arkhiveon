# VTT: contexto e decisões

Memória de handoff do VTT (mesa virtual) do Arkhiveon. Serve pros bots Chefe, Dev e Designer e pra qualquer outra IA que for mexer aqui.
Última atualização: 2026-11-15, pelo Dev. As seções "Estado em 2026-10-10", "Mapa de código" e "Lacunas vs Roll20" são de 10/10; o que mudou depois está em "Atualização em 2026-11-15" (leia ela primeiro).

## Objetivo

Deixar o VTT bonito e melhor de jogar que o Roll20, sem perder os diferenciais e as integrações do Arkhiveon (personagens, NPCs, sessões, missões, mundo etc.).
Definido por Luiz em 2026-10-07.

## Time e papéis

- **Luiz**: decide.
- **Chefe**: gerencia, filtra, documenta. Não implementa.
- **Dev**: executa.
- **Designer**: audita e prova visualmente. Não implementa.
- Canal de alinhamento: group chat dos três bots com o Luiz.

## Modo de trabalho atual

- Sem Cursor Cloud Agents desde 2026-10-07 (acabaram os créditos). Tudo roda local, no Mac do Luiz (`~/projects/arkhiveon`).
- Antes de mexer em UI, ler `AGENTS.md`, `.cursorrules` e `src/routes/design-system.tsx` (fonte da verdade do design system).
- pnpm only (nunca npm/yarn), Biome, sem `any`.
- Sem hex ad-hoc. Usar só tokens semânticos: `bg-background`, `bg-card`, `bg-card-elevated`, `text-primary`, `text-foreground`, `text-muted-foreground`, `border-border/70`.
- Glass com `backdrop-blur-md`.
- Alvo de toque com pelo menos 44×44px. Hover só sob `@media (hover: hover)`. Inputs mobile com pelo menos 16px.
- Motion de até 200ms. Botões com `active:scale-[0.98]`.
- Branches `garbini/*`. PR no formato `.github/PULL_REQUEST_TEMPLATE.md`.
- PRs não se empilham mais: cada PR sai da `main`. Se outro PR entrar antes, faz-se merge normal da `main` no branch (sem rebase nem force-push).
- Commits que disparam Vercel devem usar autor verificado ligado ao GitHub: `Luiz Garbini Neto <garbasneto@gmail.com>` (não usar e-mail local `*.local`).
- Validação: `pnpm run build` e `pnpm vitest run`.

## Prova obrigatória (campos fixos, não rediscutir)

| Campo | Valor fixo |
| --- | --- |
| Comando | `pnpm preview:record` |
| Artefatos | `docs/previews/latest-preview.webm` e `docs/previews/latest-preview.png` (a pasta está no `.gitignore`, não commitar) |
| No PR | arrastar o `.webm` pra descrição |

Sem before/after, não está feito.

**Revalidação pelo Designer.** O Designer não alcança o localhost do Mac. Por isso o Dev copia os previews para `/workspace/arkhiveon/previews/vtt-design/<NN-slug>/` no box (ex.: `01-selecao-token`, `02-ficha-zoom`); correções de bug vão para `/workspace/arkhiveon/previews/vtt-bugs/<NN-slug>/` (ex.: `04-cena-duplicada`):

- before e after em desktop 1440x900 e em mobile 390x844 (viewport exato, inclusive PNG e webm);
- `latest-preview.png` e `latest-preview.webm`;
- um `README.md` com commits, passos e arquivos.

Auditar a produção logada exige que o Luiz faça login do Designer pelo chat 1:1 com ele.

## Quando parar e perguntar ao Luiz

- O fix é grande ou ambíguo.
- Mexe em marca ou identidade.
- Precisa de merge ou push em `main`.
- O Designer e o Dev discordam.

Nunca alterar produção, deletar nem inventar cor ou token.

## Estado em 2026-10-10

Fonte: GitHub API, só leitura.

### Em `main`

- O HEAD é `2689223` (merge do #93, upload de mapa por arrastar e soltar — fatia 1). Antes: `8476f51` (#92). Entraram em 08/10: #84 (com o #77 dentro), #85, #86, #87 e #88; depois, #89 e #90; em 09/10, #91 e #92; em 10/10, #93.
- Cache Gradle no workflow `build-apk.yml` (#92): com cache quente, Gradle ~30–43s (antes frio ~134s); build total caiu de ~4 min pra ~2:10.
- O que já existe:
  - grid quadrado e hex;
  - cenas;
  - tokens com PV, auras e condições;
  - multiplayer com cursores e pings;
  - névoa com camada do mestre;
  - biblioteca de personagens e NPCs;
  - diário puxando sessões e missões;
  - régua com 5-10-5 e ticks de distância e moldes de magia (#77, #85);
  - painel do token do #84, com o botão Ficha (sem menu radial);
  - ficha na mesa com rolagem e modificador (#77, #85);
  - seleção de token por gestos (#86) e ficha acima do dock de zoom (#87);
  - selos "Em jogo"/"Preparação" também no celular, com a barra de cenas rolando sozinha até a cena em jogo (#88);
  - criar cena grava uma cena só, com id escolhido no cliente (#89);
  - PV máximo digitado chega à ficha e ao token; ficha nova sem PV nasce 10/10 (#90);
  - o mestre exclui cena pela barra de cenas do VTT, com confirmação (#91); a última cena fica bloqueada; excluir a cena em jogo (quando sobra outra) deixa nenhuma em jogo até o mestre mostrar outra. Só na mesa: o dashboard da campanha não lista cenas.
  - upload de mapa por arrastar e soltar na Nova cena e na Biblioteca (#93, fatia 1); prova limpa depois do merge (pasta `previews/vtt-design/07-upload-mapa/` apagada no box).
- O PV do token é uma cópia e não fica sincronizado com a ficha.
- O #78 ficou fora da `main` porque foi mergeado no branch do #77 depois que o #77 já tinha entrado no do #84; voltou pelo #85.

### Mapa de código

| Caminho | O que tem |
| --- | --- |
| `src/routes/campaigns/$campaignId/vtt.tsx` | Rota, que compõe a mesa |
| `src/components/vtt/` | canvas, toolbar, scene-bar, token-menu, grid-settings, fog-controls, roster-drawer, journal, presence-bar, zoom-controls, `vtt.css` |
| `src/lib/vtt/` | `vtt-store.ts` (Zustand), `grid-math.ts`, `fog-math.ts`, `types.ts`, `audio.ts`, `token-press.ts` (toque vs. arrasto no token), `scene-bar-scroll.ts` (rolagem da barra até a cena em jogo), `scene-create.ts` (+ teste: id no cliente / uma criação), `scene-delete.ts` (+ teste: última cena bloqueada) |
| `src/db/schema/vtt.ts`, `supabase/migrations/0035_vtt_tables.sql` | Banco |
| `scripts/test-vtt.cjs`, `scripts/test-vtt-review.cjs`, `scripts/vtt-preview-recorder.cjs` | Teste e gravação de preview (`test-vtt-review.cjs` usa cliques e toques reais; `checkSceneBadges`, `checkCreateSceneOnce`, `checkSheetMaxHp`, `checkDeleteScene`) |

### PRs

Integrados:

| PR | Branch | O que trouxe |
| --- | --- | --- |
| #93: upload de mapa por arrastar e soltar (fatia 1) | `garbini/vtt-upload-mapa` | Drag-and-drop + file picker na Nova cena e na Biblioteca; erros de tipo/tamanho/rede; loading; cancelar. Sem migração/RLS nesta fatia. Merge em `2689223` (2026-10-10). Prova do Designer ok; pacote de prova apagado pós-merge. |
| #92: cache Gradle no build-apk | `garbini/ci-gradle-cache` | Cache Gradle/wrapper no workflow Android; warm Gradle ~30–43s vs frio ~134s. Primeiro commit `cfad3ec` bloqueado pela Vercel (autor `luizgarbini@Luizs-MacBook-Pro.local`); corrigido com `db341e4` como `Luiz Garbini Neto <garbasneto@gmail.com>`. Merge em `8476f51`. |
| #84: isolamento de cenas, controles de tokens e feedback de falhas | `garbini/vtt-session-refinements` | Entrou em `main` levando o #77 (régua, moldes e ficha na mesa), que tinha sido mergeado no branch dele. Do menu do token ficou o painel do #84 com o botão Ficha; o menu radial do #77 não entrou. |
| #85: dados com modificador, ticks da régua e ajustes de toque | `garbini/rpg-64-vtt-06-regua-moldes-radial-e-ficha` | Conteúdo do #78, que tinha ficado fora da `main`. |
| #86: seleção de token por clique, duplo clique e toque (fatia 01) | `garbini/vtt-token-selection` | Gestos separados. Desktop: clique seleciona, duplo clique ou botão direito abre o painel. Celular: um toque seleciona e abre o painel. O arrasto só começa depois de 8px. O texto da Biblioteca acompanha os gestos. |
| #87: ficha na mesa acima do dock de zoom (fatia 02) | `garbini/vtt-sheet-zoom` | A ficha na mesa usa `bottom-20` para liberar o zoom. |
| #91: mestre exclui cena com confirmação (bug 06) | `garbini/vtt-bug-06-excluir-cena` | Botão "Excluir cena" na barra de cenas do VTT (só mestre), com diálogo; última cena bloqueada; excluir a em jogo deixa nenhuma live até o mestre mostrar outra. Sem migração. Merge em `7902b87`. |
| #90: PV máximo digitado chega à ficha e ao token (bug 05) | `garbini/vtt-bug-05-pv-max-zero` | `resolveSheetHealth`: PV atual vazio = máximo, máximo vazio = atual ou 10, ficha 0/0 editada começa cheia. Merge em `36b1ad4`. |
| #89: criar cena uma vez só (bug 04) | `garbini/vtt-bug-04-cena-unica` | O id da cena vem do cliente; conflito 23505 = cena já criada; uma criação por vez. Merge em `33f1b39`. |
| #88: selos de cena no celular (fatia 03) | `garbini/vtt-scene-badges-mobile` | Selos "Em jogo"/"Preparação" também no celular, mais compactos. A barra rola sozinha (só o `scrollLeft`) até a cena em jogo ao abrir e quando ela muda; selecionar cena não rola. |

### Issues abertas

- #81: canais e permissões por cena. Inclui uma possível brecha de RLS: quem pode fazer update de token.
- #82: publicação atômica e reconexão.
- #83: fichas contextuais, combate e preparação.

### Em andamento

**Auditoria de bugs (08/10) fechada.** As três correções estão em `main`: #89 (cena única), #90 (PV máx) e #91 (excluir cena). Fatia 06 encerrada.

| Bug | O quê | Estado |
| --- | --- | --- |
| 04 | Criar cena: um clique gerava duas cenas ("Smoke Audit 2026-10-08" ×2) | Feito: #89 em `main` (`33f1b39`). Prova em `/workspace/arkhiveon/previews/vtt-bugs/04-cena-duplicada/` |
| 05 | PV máx: fichas do assistente saíam 0/0 (e o token também) | Feito: #90 em `main` (`36b1ad4`). Prova em `/workspace/arkhiveon/previews/vtt-bugs/05-pv-max-zero/` |
| 06 | Apagar cena: não havia como excluir cena (sobrou cena smoke) | Feito: #91 em `main` (`7902b87`). Prova em `/workspace/arkhiveon/previews/vtt-bugs/06-excluir-cena/` |

**Upload de mapa — fatia 1 (#93) em `main` (`2689223`).** Prova limpa (pasta box `previews/vtt-design/07-upload-mapa/` apagada; Mac sem cópia desta fatia). **Galeria (`isPrivate` + toast) e redesign B continuam no gate do SQL** (migração/RLS só com OK do Luiz). Combate / rolagem → token / editar mapa seguem pausados até a próxima escolha de frente.

O Dev abriu a branch `garbini/vtt-combat` em 2026-10-07 para o item A do roadmap. Ela é só local (pode existir só no Mac), sem push, e está **pausada** (WIP em `81c77da` se ainda existir). Escopo do WIP (não iniciado nesta rodada):

- iniciativa numérica, turnos e rodadas;
- dano e cura no token;
- condições livres com duração;
- rolagem por fórmula com log compartilhado.

Fica genérico, sem regra de sistema. A migração só foi gerada: nada é aplicado no Supabase real sem autorização do Luiz.

**APK (adiado 2026-10-09):** o artefato da `main` ([run 37981621801](https://github.com/LuizGarbini/arkhiveon/actions/runs/37981621801)) instala, mas o app diz que o Supabase não está configurado — o `build-apk` não passa `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` no `pnpm build`. O Luiz adiou criar os secrets no GitHub Actions e o PR `garbini/ci-apk-supabase-env` **não foi aberto**. Prioridade volta ao VTT completo. Run warm do #92 ainda existe: [37974299607](https://github.com/LuizGarbini/arkhiveon/actions/runs/37974299607).

**CI (opcional, futuro):** warnings de depreciação no build-apk (actions em Node 20, `actions/setup-java@v4`, `ubuntu-latest` → Ubuntu 26) não bloqueiam. Fatia de CI e fix de env do APK só quando o Luiz retomar.

## Atualização em 2026-11-15 (o que entrou depois de 10/10)

Em `main` (versões do app entre parênteses). Isto **corrige** a lista de lacunas abaixo: paredes, visão dinâmica, combate, feed de rolagens e notas já existem.

- **Paredes, portas e janelas** (ferramenta Parede, `W`; só o mestre desenha, na camada do mestre; desfazer/refazer só para paredes). A porta é um ícone no meio do vão (v1.6.99) e o jogador a abre de perto (até 1,5 casa); fechada bloqueia vista e movimento. A **janela** (v1.6.101) abre e deixa ver, mas **nunca deixa o jogador passar**; só o mestre move o token para o outro lado. Código: `src/lib/vtt/walls.ts` (`blocksSight` vs `blocksMovement`), `wall-sync.ts`, `vtt-wall-controls.tsx`.
- **Visão do personagem:** cone de 120° na direção do token mais 1 casa de percepção; visão normal e **visão no escuro** na ficha; parede/porta/janela fechada barram; a visão só muda quando o token é solto (não ao arrastar). Código: `vision.ts`, `vision-sheet.ts`.
- **Memória de exploração do grupo**, salva no banco (migration 0071): o mestre vê o que o grupo explorou (barra do mestre: Explorado / Cones de todos), pode esquecer tudo ou **escurecer um trecho** com a forma Ocultar da névoa (migration 0074, v1.6.98). Código: `explored*.ts`.
- **Luz** (v1.6.100): luz padrão da cena (dia, penumbra, escuro; 0072) e **áreas de luz** em círculo/retângulo/polígono (ferramenta Luz, `L`; 0075). O alcance de visão depende da luz do lugar onde o personagem está: penumbra = metade da visão normal (visão no escuro vale inteira), escuridão = só visão no escuro (sem ela, 1 casa). Áreas sobrepostas: vale a criada por último. Código: `light-zones.ts`, `light-zone-sync.ts`, `vtt-light-controls.tsx`.
- **Setas do teclado** (v1.6.102): movem os tokens selecionados uma casa (juntos, se forem vários), com as mesmas regras do arrasto (parede/janela barram o jogador, mestre passa, travado/alheio ficam). O "confirmar movimento" é um só para arrasto e teclado (`commitTokenMoves` no canvas; regra pura em `token-step.ts`). Segurar a seta repete com limite (~7 casas/s).
- **Régua fixa** (v1.6.104): sair da ferramenta Régua congela a medição (`rulerFreeze`) em vez de apagar; ela segue no mapa, transmitida aos outros, com o selo "Régua fixada" (`vtt-pinned-ruler.tsx`) para limpar.
- **Girar token no lugar** (v1.6.105): Q/E giram 45° (Shift 15°) os selecionados, só grava a rotação (`token-rotate.ts`); o painel do token tem os dois sentidos.
- **Pings de vários tipos** (v1.6.106): atenção, perigo, a caminho, ajuda, destacar personagem (setas em volta do token, só se você o vê) e, só do mestre, "Todos aqui" (leva a câmera de todos; o receptor confere que o remetente é mestre/co-mestre em `ping-receive.ts`, senão vira ping comum). **PC:** Ctrl + segurar no mapa vazio abre a roda (`ping-wheel.ts`); Ctrl+clique rápido pinga; Ctrl + arrastar continua sendo a caixa de seleção; painel da ferramenta Ping escolhe o tipo. **Celular:** segurar o botão de Ping na barra abre a lista, arrastar escolhe (`ping-picker.ts`). Desenho em `ping-draw.ts`, tipos e tempos em `ping-kinds.ts`. Não testado em Mac real: lá o Ctrl+clique costuma virar clique direito (o app bloqueia o menu, mas vale conferir).
- **Ping preso (v1.6.103, corrigido):** o Alt/Espaço ficavam "apertados" na memória se o keyup se perdia (Alt+Tab, Cmd+Tab); agora o `altKey` do clique é a verdade e perder o foco da janela solta as teclas.
- **Setas rápidas sem travar** (v1.6.120, branch `garbini/perf-setas`): alternar cima/baixo (ou direita/esquerda) rápido dava stuttering e o token "voltava para o local antigo". Causas medidas com `pnpm check:setas-perf`: (1) a direção (`rotation`) estava na chave de redesenho, então cada seta que virava o token **reconstruía todos os tokens** (a seta de direção agora gira direto no objeto, `facingRadians` em `token-motion.ts`); (2) o **eco do Realtime** da própria gravação chegava velho e puxava o token para trás (e o passo seguinte partia da posição errada): a fila de gravação (`token-write-queue.ts`) guarda o **estado completo** (x, y, rotation) de cada gravação enviada e `remoteTokenPatch(row, dragged, ownEcho)` ignora a posição/direção de um eco só quando a linha inteira é um estado velho que ESTE cliente enviou (ou só repete o que a mesa já mostra); mudança de outro usuário nunca bate, e o eco do último estado enviado, com a fila vazia, é aplicado; (3) até uma requisição por seta, todas em voo ao mesmo tempo (podiam chegar fora de ordem): agora há **uma gravação em voo por token** (posição e também o giro Q/E, que grava só `rotation`), passos rápidos são fundidos (máx. 1 a cada 120 ms por token) e a última posição sempre é enviada; (4) o passo agora **desliza ~100 ms** (`step-tween.ts`, respeita prefers-reduced-motion) e o próximo continua de onde o desenho está; (5) o recálculo de visão/exploração espera a rajada (`useDeferredValue`); (6) a seta/arrasto fazem **um `updateTokens` na store** por confirmação. O histórico de movimentos não mudou (uma linha por movimento confirmado; movimentos fundidos compartilham o resultado da gravação que os levou). Sondas só de dev em `dev-probe.ts` (`window.__vtt_probe__`). **Limite conhecido:** o histórico (`recordMove`/`saveMove`) faz um insert em `vtt_token_moves` por movimento por token; num grupo grande isso disputa a fila de requisições com as gravações dos tokens (medido: sem os inserts, o grupo de 8 assenta em ~2,6 s em vez de ~13 s no ambiente de teste). Agrupar esses inserts é o próximo ganho. Recarregar a página logo depois de mover pode mostrar a posição de 1–2 gravações atrás (a última pendente não é enviada ao descarregar a página).
- **Fichas na mesa** sem limite de abertas/minimizadas, com doca que acha vaga livre (v1.6.97); barra do mestre com Limpar magias (v1.6.96).
- **Painéis que já existem** (veja `src/lib/vtt/`): Combate (`combat-store`, `combat-sync`), feed de rolagens (`feed-sync`), notas do mestre e privadas (`notes-sync`) e histórico de movimentos (`move-sync`).
- **Migrations aplicadas em produção:** 0071 (exploração), 0072 (visão no escuro e luz da cena), 0073 (portas), 0074 (escurecer explorado), 0075 (áreas de luz), 0076 (janelas).
- **Testes de navegador** (`pnpm check:*`, scripts em `scripts/`): `check:doors`, `check:windows`, `check:token-keys`, `check:pings`, `check:stuck-keys`, `check:ruler-pin`, `check:fog-hide`, `check:fog-drag`, `check:light-zones`, `check:vision-drag`, `check:gm-exploration`, `check:setas-perf` (rajada de setas com atraso/eco simulados do Supabase; mede salto para trás, reconstruções, renders, gravações e posição final). Servem de prova com o mouse de verdade; rodam um Vite próprio e simulam as chamadas ao servidor, então **não** substituem testar com mestre e jogador em dois navegadores.
- **Regra do movimento é do cliente:** parede, porta e janela barram o jogador na hora de soltar o token, mas o servidor não impede um cliente adulterado de mover o token (a issue #81 de permissões por cena continua relevante).

## Lacunas vs Roll20 (lista de 10/10; veja a atualização acima)

- Sem log de rolagens nem chat compartilhado na mesa (a rolagem pela ficha na mesa existe desde #77/#85, mas é local).
- Sem iniciativa.
- Sem handouts.
- Sem macros.
- Sem áudio de ambiente nem Spotify.
- Sem paredes nem visão dinâmica.
- Sem desenho nem undo.
- Upload de mapa por arquivo: fatia 1 (#93) em `main` (arrastar/soltar + picker). Pendente no gate SQL: galeria com `isPrivate` + toast e redesign B.
- Colocar personagens na mesa ainda é incompleto (biblioteca existe; o fluxo de colocar/usar na mesa é gap apontado pelo Luiz).

## Decisões tomadas

| Data | Quem | Decisão | Por quê |
| --- | --- | --- | --- |
| 2026-11-15 | Luiz | Janela: abre e deixa ver, mas ninguém passa (aberta ou fechada); só o mestre move o token para o outro lado | Algumas janelas dão para atravessar com um teste e outras não; o mestre decide caso a caso |
| 2026-11-15 | Luiz | Luz por áreas, formas círculo/retângulo/polígono, três luzes (dia, penumbra, escuridão); a luz vale para quem está dentro da área, não para o que se enxerga dentro dela | Simples e previsível; a versão "luz do que se vê" é bem mais complexa |
| 2026-11-15 | Luiz | Cobrir (Ocultar) um trecho com a névoa apaga a memória de exploração debaixo dele | O mestre não conseguia escurecer o que o grupo já tinha visto |
| 2026-11-15 | Luiz | Porta vira só um ícone (sem o traço de madeira); só o ícone é clicável | O traço de madeira poluía o mapa |
| 2026-10-10 | Luiz / Chefe | #93 (upload de mapa, fatia 1) merged em `main` (`2689223`); pacote de prova apagado pós-merge; galeria (`isPrivate`+toast) e redesign B ficam no gate do SQL | Fecha a fatia 1 sem migração; próximos passos de upload só com OK de SQL/RLS |
| 2026-10-09 | Luiz | APK + secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` no GitHub Actions ficam pra depois; PR `garbini/ci-apk-supabase-env` não iniciado; prioridade = VTT completo | O APK da main abre sem Supabase; o Luiz pediu fechar o VTT antes de retomar o mobile |
| 2026-10-09 | Luiz / Chefe | Lacunas nomeadas: upload de mapa integrado na plataforma e colocar personagens na mesa; proposta do Chefe = upload de mapa como primeira frente; sem fatia nova até o Luiz escolher (aplicar rolagem→token / editar mapa / combate / retomar `garbini/vtt-combat` / upload mapa) | Luiz: "tá faltando muita coisa"; combate segue pausado |
| 2026-10-09 | Chefe / Dev | Commits que disparam Vercel usam autor verificado `Luiz Garbini Neto <garbasneto@gmail.com>` (ligado ao GitHub); não usar e-mail `*.local` | O primeiro commit do #92 (`cfad3ec`) foi bloqueado pela Vercel; corrigido com `db341e4` |
| 2026-10-09 | Chefe | Última cena da mesa não pode ser excluída (diálogo: criar outra antes); depois de excluir a cena em jogo, nada fica em jogo até o mestre mostrar outra | Fecha a regra do #91 com a prova do Designer |
| 2026-10-08 | Luiz | Bugs antes de features: bugs 04 (cena duplicada), 05 (PV máx) e 06 (apagar cena), um PR pequeno por bug saindo da `main`; combate, rolagem → token e editar mapa pausados | Corrigir o que a auditoria de produção achou antes de abrir frentes novas |
| 2026-10-08 | Luiz | Selos "Em jogo"/"Preparação" também aparecem no celular: fatia 03 (#88, em `main` desde `5efa268`) | Fecha a pendência sobre os selos de cena no celular |
| 2026-10-08 | Chefe | Fatia 02 (#87): a ficha na mesa usa `bottom-20` para liberar o zoom | A ficha cobria o zoom; um clique em + caía em "Rolar d20" |
| 2026-10-08 | Chefe | Fatia 01 (#86): gestos separados. Desktop: clique seleciona, duplo clique ou botão direito abre o painel. Celular: um toque seleciona e abre o painel. Arrasto só depois de 8px. Texto da Biblioteca acompanha os gestos | Clique e toque não mantinham a seleção; só o botão direito abria o painel |
| 2026-10-08 | Chefe | PRs não se empilham mais: cada PR sai da `main`; se outro entrar antes, merge normal da `main`, sem rebase/force-push | O #78 ficou fora da `main` porque foi mergeado no branch do #77 depois que o #77 já tinha entrado no do #84; voltou pelo #85 |
| 2026-10-08 | Luiz | Ordem de integração: #84 (com o #77) primeiro, depois #85 (conteúdo do #78), #86 e #87 | Fecha a pendência antiga sobre a ordem de integração dos PRs |
| 2026-10-08 | Chefe | Prova: desktop 1440x900 e mobile 390x844, em `/workspace/arkhiveon/previews/vtt-design/<NN-slug>/` | Designer revalida sempre no mesmo viewport |
| 2026-10-07 | Luiz | Abrir escopo pro VTT inteiro: app logado e features novas | Meta de jogar melhor que no Roll20 |
| 2026-10-07 | Luiz | Sem Cloud Agent: trabalho local no Mac | Acabaram os créditos do Cursor |
| 2026-09-09 | Luiz | Campos de prova fixos (ver acima) | Evitar rediscutir a prova a cada PR |

## Decisões pendentes (aguardando Luiz)

1. **Próxima frente do VTT:** upload fatia 1 (#93) já em `main`. No gate do SQL: galeria (`isPrivate`+toast) e redesign B. Outras opções: aplicar rolagem→token; editar mapa; combate / retomar `garbini/vtt-combat`; colocar personagens na mesa. Sem fatia nova de produto até o Luiz escolher (e sem migração/RLS fora do ambiente de teste sem OK).
2. **Combate** (`garbini/vtt-combat`, WIP local `81c77da` se ainda existir): continua pausado; fatia 07 não aberta até a escolha acima.
3. **Menu radial** (com auditoria do Designer): frente futura; hoje o token usa o painel do #84 com o botão Ficha.
4. **APK / secrets Supabase (adiado):** criar `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` (anon) nos secrets do Actions e aí abrir `garbini/ci-apk-supabase-env` (env no build + fail se vazio + linha no README). Não iniciado.
5. **CI opcional:** subir `actions/setup-java@v5` e alinhar actions Node 20 / `ubuntu-latest` — só se o Luiz quiser (warnings não bloqueiam).

## Como atualizar este arquivo

- Toda decisão nova entra na tabela com data, quem decidiu e por quê.
- Ao fechar uma pendência, mover a decisão pra "Decisões tomadas".
- Atualizar "Estado" quando um PR entrar ou uma frente mudar.
- Manter curto: fatos e decisões, nada de log de conversa.
