# Decisão do Protótipo da Árvore Genealógica

- **Variante Escolhida**: Variante B (Split Lineage Inspector)
- **Data da Decisão**: 23/07/2026

## Justificativa e Recursos Promovidos para Produção

1. **Layout Split-Screen (65% Grafo / 35% Diretório Lateral)**:
   - Mantém o grafo interativo do ReactFlow à esquerda com zoom, pan, destaque de laços ao passar o mouse e edição visual.
   - Oferece um diretório lateral persistente com busca em tempo real por nome/raça/classe e acesso direto às fichas de cada personagem.

2. **Aderência ao Design System Arkhiveon UI**:
   - Container externo padronizado com `max-w-7xl`, `rounded-[1.75rem]`, bordas `border-border/70` e superfícies elevadas `bg-card-elevated`.
   - Modos escuro e controles tokenizados (`colorMode="dark"`, `family-flow-controls`, `family-flow-minimap`).
   - Grade de pontinhos luminosos roxos no fundo (`<Background color="var(--primary)" />`) e painel guia de navegação.

3. **Limpeza do Protótipo**:
   - Alternador flutuante (`PrototypeSwitcher`), parâmetro `?variant=` e as variantes A e C foram removidos da base de código final.
