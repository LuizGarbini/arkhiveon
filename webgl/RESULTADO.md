# WebGL: contextos liberados ao desmontar (banners do painel + d20)

Builds `vite build` com Supabase mockado (`VITE_SUPABASE_URL=https://preview.supabase.test`, rede e Realtime interceptados pelo Playwright, `arkhiveon_preview_auth`).
- main `8a02e40` (origin/main, já com a #138) em :4311
- branch `garbini/webgl-contextos` em :4312

Servidores temporários derrubados no fim. Chromium headless, 1440x900, WebGL por SwiftShader. Script: `webgl-cycle.cjs`.

**Ciclo, 20 idas:** mesa → `/dashboard` (espera o canvas do banner do Discord e o do hero) → `/` (landing com o d20) → mesa. Navegação pelo router (pushState + popstate), igual ao `cycle.cjs` da #138.

**Instrumentação (addInitScript):**
- `HTMLCanvasElement.prototype.getContext` conta cada contexto `webgl`/`webgl2` novo;
- `WEBGL_lose_context.loseContext` marca a liberação pelo app;
- `webglcontextlost` desconta o contexto ("app" se o app liberou, "browser" se o Chrome derrubou o mais antigo).
- No console, conta `Too many active WebGL contexts`.

## Números (20 idas)

| | main | branch |
|---|---|---|
| Contextos criados | 198 | 198 |
| Liberados pelo app (`loseContext` / `forceContextLoss`) | 0 | 196 |
| Derrubados pelo Chrome (limite) | 50 | 0 |
| **Máx. de contextos ativos (não liberados)** | **150** (sobe ~7 por ida) | **6** |
| Ativos no fim (na mesa) | 148 | 2 |
| **"Too many active WebGL contexts"** | **50** | **0** |

Contextos ativos no painel, ida a ida:
- main: 6, 14, 24, 33, 39, 49, 58, 65, 72, 79, 86, 93, 100, 105, 113, 119, 127, 133, 140, 147
- branch: 2, 3, 3, 3, 3, 3, 3, 4, …, 4 (estável a partir da ida 8)

Na main, os avisos começam na ida 4 e chegam a 50. Os contextos não liberados vêm de três lugares:
- os testes de suporte (`isWebGLSupported`) dos dois banners e do d20, que criam um canvas com contexto a cada montagem;
- os shaders (`MeshGradient`, `Dithering`): o `dispose` da lib cancela o rAF, mas não libera o contexto;
- o `WebGLRenderer` do d20, que tinha só `dispose()`.

Na branch, os 2 contextos que sobram na mesa param de crescer na ida 8. Vêm de fora do escopo: nada dos banners nem do d20 fica vivo, e a mesa mockada não tem cena, então o Pixi não monta.

## Remontagem sem tela preta (conferido nos prints)

Branch, depois de várias idas e voltas:
- `branch/ida-10-dashboard.png` e `branch/ida-20-dashboard.png`: banner do Discord com o dither e hero com o mesh gradient roxo renderizados;
- `branch/ida-10-d20.png` e `branch/ida-20-d20.png`: d20 3D renderizado.

Na ida 1, o d20 ainda mostra o spinner, porque é o primeiro download do chunk do three.js. As idas 10 e 20 já são remontagens. Prints equivalentes da main estão em `main/`. A mesa (`ida-XX-mesa.png`) abre normal.

Console da branch: só Realtime mockado (socket fechado) e o aviso de deprecação do `THREE.Clock`, que já existe na main.

## Arquivos
- `webgl-cycle.cjs`: o script
- `main/`, `branch/`: `summary.json`, `rows.json` (contagem por parada), `console.txt`, prints das idas 1, 10 e 20 (painel, d20 e mesa)
