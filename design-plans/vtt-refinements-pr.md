## ✨ What was added

- Corrige a entrada de jogadores em cenas recém-publicadas, inclusive quando a cena ainda não existia na lista local.
- Separa broadcasts por cena e descarta respostas atrasadas de névoa, tokens e assinaturas encerradas; evita inserir um token na cena errada.
- Alinha a interação com tokens às permissões de mestre, controlador e autoria da ficha. Exibe erros de carregamento/escrita; uma exclusão rejeitada mantém o token na mesa.
- Evita cliques duplicados no menu enquanto salva e descarta conclusões antigas de escrita do mesmo token.
- Mantém o aviso de falha acessível acima do menu do token.
- Corrige sobreposição de tamanho/elevação e melhora nomes acessíveis, estados selecionados e alvos de toque dos sliders.
- Atualiza o workflow Android para Node 22, Java 21 e pnpm exec, conforme requisitos das dependências instaladas.
- Adiciona 9 testes unitários de regressão e verificações Playwright dos controles e da persistência rejeitada.
- Pendências rastreadas: autorização de canais e RLS (#81), publicação atômica/salvamento/reconexão (#82), fichas contextuais/combate/preparação (#83). Relatório: `design-plans/vtt-reliability-followup.md`.

Validação local: `pnpm run build`, 9 testes unitários, Biome dos componentes alterados e `pnpm preview:record` passaram.

## 📷 Implementation preview

<!-- Anexar as gravações finais depois da validação. -->

Os previews usam a aplicação real com dados e respostas HTTP de teste. Não certificam autorização Realtime/RLS ou uma sessão multiplayer em produção. As salas por cena exigem recarregar clientes que ainda estão na versão anterior.
