# Table Top — revisão, redesign e evolução

Revisão em 10/09/2026. Base: c6d463be23e2226d992636a3089f4021ddaf10fb. Superfície: /campaigns/$campaignId/vtt e seus componentes em src/components/vtt.

## Resultado

Foi implementada uma primeira revisão do design e corrigidas falhas reproduzidas no navegador. Isso não equivale a certificar o multiplayer em produção nem a afirmar que já superamos o Roll20.

A direção proposta é uma mesa conectada à campanha: preparar um encontro a partir de personagens, NPCs, locais e missões existentes; jogar com poucas interrupções; transformar o resultado em diário. O diferencial potencial está em reduzir retrabalho entre esses momentos.

## Design language

- Audited surface: cabeçalho, ferramentas, biblioteca, canvas, grid, névoa e menu do token.
- Design sources: AGENTS.md e src/routes/design-system.tsx, confrontados com a rota e screenshots da implementação local.
- Documented decisions: superfícies semânticas background/card/card-elevated, títulos font-display, texto Inter, vidro discreto, alvos de 44px, foco visível e movimento até 200ms.
- Governing owners and consumers: src/routes/campaigns/$campaignId/vtt.tsx compõe src/components/vtt; src/styles.css resolve os tokens; Button, Input e Dialog fornecem primitivas existentes.
- Explicit exceptions: None documented.

## Findings

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Mesa e painéis usavam cores independentes do tema | AGENTS exige tokens semânticos; a rota usava bg-[#090a0f] e os painéis importados usavam bg-black/text-white. Screenshot anterior confirma a superfície. | Aplicar bg-background, bg-card/95, bg-card-elevated, text-foreground e border-border/70. Implementado. | Rota e controles do VTT | Alta |
| 2 | Ações principais tinham alvos menores que 44px | AGENTS exige 44px; toolbar usava h-10/w-10, cabeçalho h-8 e zoom h-8/w-8, todos renderizados pela rota. | Usar alvos de 44px nas ferramentas, cabeçalho, biblioteca e zoom. Implementado. | Controles principais | Alta |

## Improve first

O primeiro item elimina a ruptura visual com o restante do Arkhiveon e permite que a mesa responda ao tema. O desenho permanece discreto para o mapa ser o foco.

## Falhas reproduzidas e tratadas

1. **Tokens desapareciam ao clicar novamente na cena atual.** Comando: node scripts/test-vtt.cjs. Antes: AssertionError, 0 !== 1. O setter setActiveSceneId zerava tokens mesmo sem trocar de ID; o efeito de carga não rodava novamente. A operação agora preserva o estado quando o ID é o mesmo.
2. **Grid ausente na primeira abertura.** O mesmo teste compara o canvas inicial com o canvas após reaplicar a configuração idêntica. Antes: AssertionError. O efeito de renderização rodava antes do app.init do Pixi, sem ser reexecutado quando o renderer ficava pronto. A prontidão agora participa das dependências; cargas de mapas abandonados são ignoradas.
3. **Preview não comprovava a mesa.** O script anterior abria /dashboard, engolia esperas e cliques ausentes e continha um erro de sintaxe confirmado pelo build: TS1005, '}' expected. O script foi substituído por execução da rota do VTT com asserções, servidor e encerramento controlados. O comando usa pnpm e tsx local, sem npx.

Outras correções de robustez: deduplicação de cenas ao receber insert local + Realtime, descarte de resposta de tokens de uma cena já abandonada, mensagens de erro de carregamento/criação, preservação do formulário quando o servidor recusa uma cena e publicação sem anunciar sucesso em caso de erro HTTP. A publicação ainda usa duas operações no banco: precisa de transação para garantia concorrente.

## Redesign implementado

- Cabeçalho em duas linhas, identidade da campanha e ações nomeadas.
- Distinção explícita entre cena em jogo e preparação; navegação do jogador mostra apenas cena ativa.
- Ferramentas com seleção e foco explícitos; desenho removido da toolbar porque não havia implementação do gesto no canvas. Não foi entregue uma ferramenta de desenho nova.
- Biblioteca contextual: tokens na cena, localizar no mapa, abrir ficha em outra aba, escolher personagens/NPCs e criar figurantes com formulário.
- Diário do mestre: resumo da última sessão, gancho e missões ativas, usando os modelos existentes. Filtro de visibilidade das missões reutiliza canViewScopedContent.
- Zoom preserva o centro da câmera; ação Enquadrar mapa.
- Painéis de biblioteca, névoa e grid evitam abertura simultânea. Busca usa useDeferredValue; assinaturas Zustand selecionam valores estáveis em vez da store inteira.

## O que ainda exige trabalho funcional

Estes pontos vêm de inspeção do código e da migration 0035_vtt_tables.sql. Não foram certificados contra um Supabase de produção com várias contas.

| Prioridade | Pendência | Evidência / efeito | Critério de conclusão |
| --- | --- | --- | --- |
| P0 | Uma regra de permissão para UI, persistência e broadcast | A UI considera ownerId para mestre; SQL também autoriza editor. O pointerdown dos tokens não espelha completamente controlled_by/proprietário da ficha. | Mestre e editor administram; jogador move apenas tokens permitidos; testes com duas contas confirmam negação no servidor e feedback coerente na UI. |
| P0 | Eventos isolados por cena e autoria | Canal vtt-room usa campanha; vários eventos não carregam sceneId. Preparar outra cena pode afetar cursores/régua/névoa recebidos. | Broadcast por cena, canais privados com autorização e teste de mestre preparando B enquanto jogadores permanecem em A. |
| P0 | Persistência confiável de todas as ações | Atualizar/excluir tokens e alterar névoa/grid ainda têm caminhos otimistas sem reconciliação completa de erro. | Falha/reconexão preserva intenção, informa o que não foi salvo e reconcilia sem sobrescrever edição mais nova. |
| P0 | Publicação atômica de cena | Desativar todas e ativar uma ainda são requests separados. Há feedback e recuperação parcial, não atomicidade. | RPC/transação + unicidade da cena ativa por campanha e testes concorrentes. |
| P1 | Ficha e token com autoridade clara sobre PV | Token recebe cópia de health/healthMax; mudanças no VTT não equivalem automaticamente a salvar a ficha. | Definir PV do encontro versus PV permanente; sincronizar só por ação/contrato explícito, com histórico. |
| P1 | Multiplayer real e reconexão | Testes locais usam fixtures e HTTP interceptado. | Duas contas, cenas distintas, reload, conexão interrompida, RLS, criação/movimento de token e névoa persistida em ambiente de teste. |

## Funcionalidades recomendadas, em ordem

### 1. Combate integrado

Iniciativa, turno atual, condições com duração, aplicar dano/cura e histórico de rolagens. Reutilizar atributos/initiative da ficha e modelos existentes; DiceRollOverlay pode ser apresentação, mas a rolagem compartilhada precisa de registro/autoria/persistência próprios. Resultado esperado: conduzir um encontro sem alternar continuamente entre ficha, notas e calculadora.

### 2. Preparar encontro a partir do mundo

Escolher um local e sua mapUrl como mapa da cena; usar a galeria ImageAsset em vez de obrigar a colar URL; selecionar NPCs relacionados e associar missão. Isso reduz recadastro e dá utilidade prática ao mundo já construído. Critério: local → mapa → NPCs → cena pronta em um único fluxo, mantendo segredos.

### 3. Ficha contextual dentro da mesa

A entrega atual abre a ficha existente em outra aba. Evoluir para painel com recursos relevantes ao encontro e rolagens sem montar a ficha completa permanentemente sobre o canvas. Reutilizar o renderer de fichas, com carregamento sob demanda.

### 4. Diário pós-sessão e recompensas

Converter eventos selecionados do encontro em rascunho do resumo, vincular NPCs/locais e distribuir itens de partyLoot. O mestre revisa antes de publicar ou alterar inventários. Critério: resultado do combate ajuda a escrever a crônica sem inventar acontecimentos.

### 5. Ambientação

Reaproveitar Spotify/miniplayer como acesso rápido e presets de ambiente ligados a locais. Verificar previamente contratos e capacidades da integração; não prometer reprodução sincronizada entre contas a partir de um player local.

### 6. Ferramentas táticas avançadas

Desfazer/refazer, régua com templates de área, desenho persistido, alinhamento de mapa, paredes/portas e visão por token. Entregar uma de cada vez com persistência, permissões e teste multiplayer. Névoa manual e exploração por raio não devem ser apresentadas como iluminação dinâmica completa.

## Referência competitiva

Roll20 já documenta [camadas](https://help.roll20.net/hc/en-us/articles/360039675053-Layers), [fichas e permissões no Journal](https://help.roll20.net/hc/en-us/articles/360039675133-Journal) e [o motor Jumpgate](https://blog.roll20.net/posts/the-future-of-tabletop-gaming-jumpgate-officially-launches/). Essas capacidades são referência de base, não diferenciais por si só.

A hipótese de vantagem do Arkhiveon é integrar o conhecimento da campanha ao preparo, à sessão e à crônica. Validar com mestres e jogadores: tempo para preparar um encontro, número de saídas da mesa para consultar informação, ações perdidas após reconexão e compreensão de qual cena está publicada. Comparar as mesmas tarefas nas duas plataformas; não usar apenas preferência estética como prova de superioridade.

## Manutenção necessária para validar

O lockfile original referenciava dependências sem entradas correspondentes e a instalação não continha pg/dotenv. pnpm install --frozen-lockfile confirmou ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY; pnpm install --fix-lockfile --no-frozen-lockfile reparou o lockfile e restaurou dependências já declaradas. Nenhuma dependência de produto nova foi adicionada. O cache local .pnpm-store/ foi ignorado no Git.

## Validação

Validação final concluída:

- **pnpm run build**: passou (Vite + TypeScript). Permanecem avisos de chunks grandes e importação estática/dinâmica no dashboard.
- **pnpm exec biome check** nos arquivos alterados do VTT: passou.
- **pnpm preview:record**: passou na versão compilada; vídeo e screenshots atualizados.
- **pnpm install --frozen-lockfile --lockfile-only --offline --ignore-scripts**: passou após o reparo.
- Asserções do Playwright: grid na abertura; preservação de tokens ao selecionar a mesma cena; deduplicação; biblioteca/localizar token; diário; formulário preservado em falha HTTP; cancelamento limpa erro; alvos de 44px medidos; painel no mobile; controles de jogador.
- Capturas verificadas visualmente em 1440×900 e 390×844. Arquivos em docs/previews/latest-preview.png, latest-preview.webm, vtt-mobile.png, vtt-mobile-grid.png e vtt-journal.png.

Os testes usam fixtures locais, interceptam HTTP do banco e bloqueiam conexões Realtime externas. Não comprovam RLS implantada, multiplayer real, reconnect ou sincronização entre contas. Esses testes continuam necessários antes de considerar a mesa pronta para substituir um VTT em uma campanha ao vivo.
