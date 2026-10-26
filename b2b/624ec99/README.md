# #168 — prova no head 624ec99 (sem as 7 linhas setAuth; sync-slice.ts == main; 1.6.44)
Prints em tamanho real (1440x900 / 390x844), uma sessão por arquivo (mestre / ana). Medidas em medidas.json.
- P1.1: r2-erro-rede-*, r2-ficha-mestre-largura-total-390x844, r2-pv-uma-vez-ficha-mestre-*, r2-botoes-travados-mestre-*
- P2.3: fluxo1-{antes,depois}-*-{mestre,ana}, fluxo2-{antes,depois}-*-{mestre,ana}
- P2.6: p2-6-ana-ficha-bram-sem-controle-* — **FALHOU**: a Ana vê −5/−1/+1/+5 habilitados na ficha do Bram (o servidor recusa, 42501; a UI não esconde).
- P2.7: sem arquivos ._*
Pendentes (aguardam decisão do Luiz): P1.2, P2.4, P2.5 — e agora P2.6 (código).
