# Preview do comportamento — PR #167 (B2a): PV da ficha por um caminho seguro

Esta fatia não tem tela: é uma função no banco (`set_character_hp`). Este preview mostra o que ela faz, testado de verdade.

## O que muda para o usuário
- O **jogador dono da ficha** passa a conseguir ajustar o próprio PV atual (dano/cura) — só o PV, nada mais da ficha.
- O **mestre e o editor** continuam podendo tudo e ganham um caminho que mexe só no PV atual e no máximo, sem regravar a ficha inteira.
- O PV nunca passa do máximo nem fica negativo: se alguém manda 50 numa ficha de máximo 10, fica 10.
- A tela que usa isso vem na próxima fatia (B2b). Esta PR sozinha não muda nada visível.

## Antes e depois
- **Antes (hoje, com as policies da 0003):** só mestre e editor conseguem gravar a ficha, e gravam a ficha inteira. O jogador dono **não consegue** mudar o próprio PV. Testei: o dono tentando gravar a ficha direto não altera nada (0 linhas).
- **Depois (com a 0050):** existe um caminho seguro só para o PV. O dono muda o atual; só mestre/editor mudam o máximo. Notas, nome e demais campos ficam intactos (o teste confere isso em todos os casos).

## Quem pode e quem não pode (resultado real)
Ficha de teste com PV 8 / 10.

| Quem | Pedido | Resultado | Ficha depois / mensagem |
|---|---|---|---|
| Mestre | Mudar PV atual para 5 | Pode | 5 / 10 |
| Mestre | Atual 5 e máximo 15 | Pode | 5 / 15 |
| Mestre | Atual 50 (acima do máx.) | Pode, limitado | 10 / 10 |
| Mestre | Atual −3 ou vazio | Recusado | “O PV atual tem que ser zero ou mais.” |
| Mestre | Máximo 0 | Recusado | “O PV máximo tem que ser maior que zero.” |
| Editor | Mudar PV atual para 5 | Pode | 5 / 10 |
| Editor | Atual 5 e máximo 15 | Pode | 5 / 15 |
| Editor | Atual 50 (acima do máx.) | Pode, limitado | 10 / 10 |
| Editor | Atual −3 ou vazio | Recusado | “O PV atual tem que ser zero ou mais.” |
| Dono da ficha (jogador) | Mudar PV atual para 5 (ou 0) | Pode | 5 / 10 |
| Dono da ficha (jogador) | Atual 5 e máximo 15 | Recusado | “Só o mestre pode alterar o PV máximo.” |
| Dono da ficha (jogador) | Atual 50 (acima do máx.) | Pode, limitado | 10 / 10 |
| Dono da ficha (jogador) | Atual −3 ou vazio | Recusado | “O PV atual tem que ser zero ou mais.” |
| Outro jogador da campanha | Qualquer mudança | Recusado | “Você não pode alterar os PV desta ficha.” |
| Alguém de fora / mestre de outra campanha | Qualquer mudança | Recusado | “Você não pode alterar os PV desta ficha.” |
| Logado sem identidade | Qualquer mudança | Recusado | “Entre na sua conta para alterar os PV.” |
| Visitante anônimo (anon) | Qualquer mudança | Recusado | Sem permissão para chamar a função (42501) |
| Qualquer um | Ficha que não existe | Recusado | “Ficha não encontrada.” |

Imagens: `tabela-1440.png` e `tabela-390.png`.

## Ressalva da 0001 — conferida, não se confirma
A ressalva dizia que o dono ainda edita a ficha inteira por UPDATE direto (policy da 0001). **No banco testado isso não acontece:** a policy "Users manage own characters" da 0001 foi removida na 0003, e hoje o UPDATE em `characters` só passa para mestre/editor. Teste real: dono tentando gravar PV 999 e trocar as notas por UPDATE direto → 0 linhas alteradas; outro jogador → 0 linhas. Vale o mesmo no Supabase local do b2b. Se o banco real estiver sem a 0003 aplicada, aí sim a ressalva valeria; não verifiquei produção. Fica para PR futura só se o Luiz quiser revisar isso.

## Como o Luiz aplica
- A 0050 **não foi aplicada** em nenhum Supabase real. Só o Luiz aplica, depois do merge.
- Ela só cria a função e as permissões (ninguém anônimo pode chamar). Não mexe em tabela, policy, trigger nem dado.
- Para conferir antes: rodar `supabase/tests/0050_set_character_hp.sql` num banco local descartável (tudo em transação com ROLLBACK).

## Como foi testado
- Postgres descartável (imagem supabase/postgres 17.6.1.106, container `b2a-preview-pg` no Mac), com as migrations 0001–0050 do branch `garbini/hp-ficha-rpc`, usuários de teste genéricos (gm/editor/dono/viewer/outsider@teste.local).
- `test-output.txt`: saída bruta do teste do repo, sem alteração: **18 de 18 ok**.
- `matrix.sql` / `matrix-output.txt`: casos complementares (cada papel × atual, máximo, acima do máximo, negativo, vazio, e o UPDATE direto da ressalva).
- Achado do ambiente: o Supabase local do b2b já tinha uma ficha (do teste de realtime), então o teste se recusa a rodar lá, como deveria. E na imagem do Supabase local, qualquer chamada recusada por falta de permissão de função (caso anon) derruba o Postgres (segfault, causado pela biblioteca `supautils`). Não é da PR; no descartável rodei com `supautils` desligado.
