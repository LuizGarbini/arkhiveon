# Revisão do VTT — 14/09/2026

A PR #80 já foi mesclada em `ee69b2f`. Esta revisão parte dessa base e separa correções verificáveis de requisitos ainda não validados em sessões reais.

## Comportamento

- Publicação: o jogador não tinha a cena de preparação na lista; um UPDATE não a inseria. O evento agora faz upsert e a store seleciona a cena publicada, limpando os dados anteriores.
- Isolamento: salas de broadcast passam a ser por campanha e cena. Respostas tardias de névoa e tokens são descartadas; inserções de tokens de outra cena são ignoradas. Isso evita mistura acidental; não substitui autorização de canais no servidor.
- Permissões: owner/editor são mestres, conforme SQL. O cliente usa controlled_by e autoria da ficha consultada no servidor para permitir interação. Tokens sem permissão não oferecem arraste/menu. Escritas rejeitadas de token exibem erro e recarregam os dados; exclusão só remove após confirmação do servidor.
- Falha no carregamento de tokens aparece na mesa com ação de tentar novamente.
- Cinco regressões da store falharam antes da correção; as mesmas cinco passaram depois. Quatro testes adicionais cobrem controle de tokens.

## Padrões e acessibilidade

- Corrigida sobreposição dos tamanhos de token com os controles de elevação.
- Sliders do grid têm nome acessível e área de interação de 44px, com trilha fina.
- Botões de fechar e elevação têm nomes; tamanho, condição e cores anunciam seleção.
- Preview inclui verificação de dimensões e ausência de sobreposição dos controles.

## CI Android

O pipeline usava Node 20, mas o Capacitor instalado exige Node >=22. O Gradle gerado usa Java 21, mas o pipeline selecionava Java 17. Ajustados ambos, e o comando do Capacitor passa a usar pnpm exec. A compilação Android completa deve ser confirmada pelo CI remoto.

## Limites de aprovação

As correções são verificadas localmente, mas os testes usam dados e respostas HTTP controlados. Não certificam RLS, reconexão e autorização do Realtime em produção. Uma sessão com duas contas reais (mestre preparando B e jogador em A) continua necessária antes de declarar o VTT pronto para uso multiplayer sem ressalvas.

## Próximas entregas

1. Autorizar canais privados no servidor e restringir políticas de escrita/leitura por cena e papel.
2. Publicação atômica, salvamento ordenado de grid/névoa/tokens e recuperação após reconexão.
3. Combate e preparação integrados às fichas, NPCs, mapas e missões existentes, em incrementos independentes.

## Validação final — 15/09/2026

Build, 9 testes unitários e preview Playwright de desktop/celular passaram. O teste de exclusão rejeitada também detectou um aviso encoberto pelo menu; a sobreposição foi corrigida e o fluxo passou na repetição.

Acompanhamento: #81 (autorização), #82 (persistência e reconexão), #83 (fichas e combate).
