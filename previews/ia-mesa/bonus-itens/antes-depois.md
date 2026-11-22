# IA da mesa: CA e iniciativa com os itens equipados (1.6.178)

Ficha de exemplo: **Lia**, Destreza 14 (+2), CA 15 e iniciativa +2 digitadas,
deslocamento 9 m. No Corpo: **Amuleto da Prontidão** (+5 na iniciativa) e
**Anel de Proteção** (+2 na CA), os dois vinculados a Itens da campanha.

## Antes

O assistente lia só o que está digitado: **CA 15, iniciativa +2**. A ficha e o
card do personagem já mostravam CA 17 e iniciativa +7. A IA respondia
"sua CA é 15" e errava a conta de acerto e a ordem de iniciativa.

## Depois

O resumo da ficha que vai para a IA ganha `effective`: **CA 17, iniciativa +7,
deslocamento 9**, com o porquê ("CA: CA da ficha 15, Anel de Proteção +2").
O `fields` continua com o valor salvo (15 / +2), porque é a partir dele que a
IA propõe mudanças na ficha. A conta é a mesma da ficha (módulo
`supabase/functions/_shared/combat-core.ts`, usado pelos dois lados).

## Item que o jogador não lê

Os itens vêm de **uma** consulta em `items` com o login de quem pergunta.
Se o RLS esconde o Anel, ele não volta e não soma: **CA 15**, iniciativa +7.
Sem nenhum item legível, `effective` nem aparece e vale a ficha.

## Saída real do resumo (node, rodando o módulo do Deno direto)

"Antes" é o resumo sem o mapa de itens, igual ao da main (sem `effective`).

```
ANTES (main): {
 "fields": {
  "armorClass": 15,
  "initiative": 2,
  "speed": 9
 },
 "effective": "(não vem)"
}
DEPOIS: {
 "fields": {
  "armorClass": 15,
  "initiative": 2,
  "speed": 9
 },
 "effective": {
  "armorClass": 17,
  "initiative": 7,
  "speed": 9,
  "why": [
   "CA: CA da ficha 15, Anel de Proteção +2",
   "Iniciativa: Destreza +2, Amuleto da Prontidão +5"
  ]
 }
}
DEPOIS, jogador sem acesso ao Anel: {
 "fields": {
  "armorClass": 15,
  "initiative": 2,
  "speed": 9
 },
 "effective": {
  "armorClass": 15,
  "initiative": 7,
  "speed": 9,
  "why": [
   "Iniciativa: Destreza +2, Amuleto da Prontidão +5"
  ]
 }
}
```

## Testes

- `testes-antes.txt`: os 7 testes novos contra o código da main: **6 falham**
  (o único que passa é "sem item vinculado, nenhuma query em items").
- `testes-depois.txt`: os mesmos 7 com a correção: **7 passam**.
