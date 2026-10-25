import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = "/workspace/arkhiveon/previews/dashboard-ui/fatia-4d";
const DELAY = Number(process.env.DELAY || 25000);
const ONLY = process.env.ONLY; // ex: "4-cheio-390"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UID = "00000000-0000-4000-8000-000000000001";
const T = "2026-10-20T12:00:00Z";
const mkQuests = (n) => Array.from({ length: n }, (_, k) => ({ id: `q${k}`, createdAt: Date.parse(T), title: `Missão ${k + 1}: O selo partido`, description: "Recuperar os fragmentos do selo antes da lua cheia, seguindo as pistas da cripta.", status: "active", category: k === 0 ? "main" : "side", giverNpcName: "Irmã Velha", locationName: "Valônia", reward: "100 po", notes: "", worldId: "w1", publicationScope: "global", campaignIds: ["c1"], visibility: "public" }));
const camp = { id: "c1", name: "QA Designer (teste)", description: "", owner_id: UID, world_id: "w1", system: "dnd5e", member_limit: 6, created_at: T, updated_at: T, my_role: "owner" };
const world = { id: "w1", name: "Valência", is_default: false, owner_user_id: UID, created_at: T, updated_at: T };
const ent = (id, data) => ({ id, data, created_at: T, updated_at: T, created_by: UID, world_id: "w1", publication_scope: "global", visibility: "public", campaign_ids: ["c1"], is_secret: false });
const fixtures = {
  characters: ["Aria", "Borin", "Cael", "Dara"].map((n, i) => ent(`ch${i}`, { name: n, playerName: "Jogador", class: "Guerreiro", race: "Humano", level: 3 + i, campaignId: "c1" })),
  sessions: [1, 2].map((n) => ent(`s${n}`, { title: `Sessão ${n}: A cripta`, number: n, summary: "O grupo desceu à cripta.", date: T, campaignId: "c1" })),
  npcs: ["Lorde Vex", "Irmã Mara"].map((n, i) => ent(`n${i}`, { name: n, role: "Aliado", description: "Figura da cidade." })),
  items: [], locations: [], lores: [], custom_templates: [], image_assets: [], activity_log: [], memberships: [], invites: [], worlds: [world],
  user_plans: [{ plan: "pro", storage_used_bytes: 1, user_id: UID }], campaigns: [camp],
  "rpc/get_user_accessible_campaigns": [camp], "rpc/get_user_accessible_worlds": [world],
};
import { gzipSync } from "node:zlib";
const BASE = process.env.BASE || "http://127.0.0.1:4531";
const OUTD = process.env.OUTD || OUT;
const RATE = (500 * 1024 / 8) * 0.8; // Slow 3G DevTools: 500 kbps * 0.8 = 51.2 KB/s
const MEASURE = () => {
  const hero = document.querySelector('[data-dash-section="hero"]');
  const top = (el) => (el ? Math.round((el.getBoundingClientRect().top + scrollY) * 10) / 10 : null);
  const byText = (root, re, sel = "*") => root ? [...root.querySelectorAll(sel)].find((e) => re.test(e.textContent || "") && [...e.children].every((c) => !re.test(c.textContent || ""))) : null;
  const card = (re) => { const l = byText(hero, re); let e = l; for (let i = 0; e && i < 6; i++) { if (/rounded/.test(e.className || "") && /border/.test(e.className || "")) return e; e = e.parentElement; } return l; };
  const sec = document.querySelector('[data-dash-section="active-quests"]');
  const btn = sec ? [...sec.querySelectorAll("a,button")].find((e) => /Nova Missão/.test(e.textContent || "")) : null;
  const visao = byText(hero, /Visão geral/i);
  const selos = visao?.parentElement;
  const aviso = byText(document.body, /Conexão lenta, ainda carregando/);
  const reg = byText(hero, /Registrar Sessão/, "a,button");
  const discT = byText(document.body, /Comunidade Arkhiveon/i); let disc = discT; for (let i = 0; disc && i < 8; i++) { if (/rounded/.test(disc.className || "") && /border/.test(disc.className || "")) break; disc = disc.parentElement; }
  const faixa = document.querySelector('[role="alert"][aria-label="Falha ao carregar a mesa"]') || aviso;
  const txt = document.body?.innerText || "";
  const r = sec?.getBoundingClientRect(); const b = btn?.getBoundingClientRect();
  return {
    heroTop: top(hero), discordTop: top(disc), discordH: disc ? Math.round(disc.getBoundingClientRect().height * 10) / 10 : null, faixaTop: top(faixa), heroH: hero ? Math.round(hero.getBoundingClientRect().height * 10) / 10 : null, selosTop: top(selos), selosH: selos ? Math.round(selos.getBoundingClientRect().height) : null,
    tituloTop: top(hero?.querySelector("h1")), subtituloTop: top(byText(hero, /Acompanhe os registros/)), registrarTop: top(reg),
    cardPersonagens: top(card(/^Personagens$/i)), cardSessoes: top(card(/^Sessões$/i)), cardMissoes: top(card(/^Missões$/i)), cardItens: top(card(/^Itens$/i)),
    avisoTop: top(aviso), lenta: !!aviso,
    secH: r ? Math.round(r.height * 10) / 10 : null, secY: top(sec), btnX: b ? Math.round(b.left * 10) / 10 : null, btnY: b && r ? Math.round(b.top - r.top) : null, btnH: b ? Math.round(b.height) : null,
    indisp: (txt.match(/Indisponível/g) || []).length, erro: !!document.querySelector('[role="alert"][aria-label="Falha ao carregar a mesa"]'),
    carregado: !document.querySelector(".dashboard-skeleton, [data-slot=skeleton], [data-dashboard-skeleton]") && /Fichas ativas/.test(txt) && !aviso,
    fontes: document.fonts.status, fontesProntas: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family).join(","),
  };
};
const KEYS = ["discordTop","discordH","heroH","faixaTop","heroTop","selosTop","tituloTop","subtituloTop","registrarTop","cardPersonagens","cardSessoes","cardMissoes","cardItens","avisoTop","secH","secY","btnX","btnY"];
async function run(browser, { n, cache, w, h, fail500 = false }) {
  const id = fail500 ? `controle-500-${w}` : `${n}m-${cache}-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([UID, quests, cheio, camp]) => {
    if (sessionStorage.getItem("seeded")) return; sessionStorage.setItem("seeded", "1");
    const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const user = { id: UID, aud: "authenticated", role: "authenticated", email: "qa@exemplo.invalid", app_metadata: {}, user_metadata: { name: "QA" }, created_at: "2026-01-01T00:00:00Z" };
    const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: UID, exp, role: "authenticated", aud: "authenticated" })}.x`;
    localStorage.setItem("sb-preview-bloqueado-auth-token", JSON.stringify({ access_token: token, refresh_token: "f", token_type: "bearer", expires_in: 86400, expires_at: exp, user }));
    const state = { quests };
    if (cheio) Object.assign(state, { activeCampaignId: "c1", activeWorldId: "w1", campaigns: [{ id: "c1", name: camp.name, description: "", worldId: "w1", myRole: "owner" }] });
    localStorage.setItem("arkhiveon-storage", JSON.stringify({ state, version: 2 }));
  }, [UID, mkQuests(n), cache === "cheio", camp]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: -1, uploadThroughput: -1 });
  // Banda Slow 3G para JS e CSS: fila única de 51,2 KB/s pelo tamanho gzip (transferido).
  let pipeFree = 0; const asset = { n: 0, gz: 0 };
  await page.route((u) => /\.(js|css)(\?|$)/.test(u.pathname) || u.hostname === "fonts.googleapis.com", async (route) => {
    let resp; try { resp = await route.fetch(); } catch { return route.abort(); }
    const body = await resp.body(); const gz = gzipSync(body).length; asset.n++; asset.gz += gz;
    const start = Math.max(Date.now(), pipeFree); pipeFree = start + (gz / RATE) * 1000;
    await sleep(pipeFree - Date.now());
    route.fulfill({ response: resp, body }).catch(() => {});
  });
  if (process.env.NOFONT) await page.route((u) => /\.(woff2?|ttf)(\?|$)/.test(u.pathname) || /fonts\.(googleapis|gstatic)\.com/.test(u.hostname), (r) => r.abort());
  await page.route(/\.supabase\.co\/auth\//, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: UID, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} }) }));
  await page.route(/\.supabase\.co\/(storage|realtime|functions)\//, (r) => r.abort());
  let firstRest = null;
  await page.route(/\.supabase\.co\/rest\/v1\//, async (route) => {
    if (!firstRest) firstRest = Date.now();
    if (fail500) { await sleep(1000); return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "erro simulado" }) }); }
    const wait = DELAY - (Date.now() - firstRest); if (wait > 0) await sleep(wait);
    const key = new URL(route.request().url()).pathname.replace("/rest/v1/", "");
    const rows = fixtures[key] ?? [];
    const single = (route.request().headers().accept ?? "").includes("vnd.pgrst.object");
    route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": `0-${rows.length}/*` }, body: JSON.stringify(single ? (rows[0] ?? null) : rows) }).catch(() => {});
  });
  const t0 = Date.now();
  page.goto(`${BASE}/dashboard`, { timeout: 300000 }).catch(() => {});
  const samples = []; let shotSlow = false, shotErr = false, shotLoad = false;
  while (true) {
    const el = Date.now() - t0;
    const s = await page.evaluate(MEASURE).catch(() => null);
    if (s) { s.t = el; s.restLiberado = firstRest ? Date.now() - firstRest >= DELAY : false; samples.push(s); }
    if (s?.lenta && !shotSlow) { shotSlow = true; await page.screenshot({ path: `${OUTD}/${id}-lenta.png` }); }
    if (fail500 && s?.erro && !shotErr && el > 0) { shotErr = true; await sleep(300); await page.screenshot({ path: `${OUTD}/${id}-erro.png` }); }
    if (fail500 && shotErr && samples.filter((x) => x.erro).length > 12) break;
    if (!fail500 && s?.carregado && samples.filter((x) => x.carregado).length > 12) break;
    if (el > 240000) break;
    await sleep(250);
  }
  if (!fail500) await page.screenshot({ path: `${OUTD}/${id}-carregado.png` });
  if (!fail500 && n === 3 && cache === "cheio") await page.locator("[data-dash-section=active-quests]").screenshot({ path: `${OUTD}/${id}-missoes.png`, timeout: 5000 }).catch(() => {});
  await ctx.close();
  // delta vertical: amostras com o elemento presente; "carga" = antes do fim (carregado/erro), "fim" = última amostra
  const last = samples[samples.length - 1] || {};
  const pres = (k) => samples.filter((x) => x[k] != null);
  const delta = {}; for (const k of KEYS) { const v = pres(k).map((x) => x[k]); delta[k] = v.length ? { min: Math.min(...v), max: Math.max(...v), fim: last[k] ?? null, amostras: v.length } : null; }
  const iF = samples.findIndex((x) => x.fontesProntas && x.fontes === "loaded");
  const pf = iF >= 0 ? samples.slice(iF) : [];
  const deltaPosFonte = {}; for (const k of KEYS) { const v = pf.map((x) => x[k]).filter((x) => x != null); deltaPosFonte[k] = v.length ? Math.round((Math.max(...v) - Math.min(...v)) * 10) / 10 : null; }
  const GEO = ["discordTop","discordH","heroH","heroTop","selosTop","tituloTop","subtituloTop","registrarTop","cardPersonagens","cardSessoes","cardMissoes","cardItens","secY"];
  let movimentos = 0; for (let i = 1; i < pf.length; i++) if (GEO.some((k) => pf[i][k] != null && pf[i-1][k] != null && Math.abs(pf[i][k] - pf[i-1][k]) > 0.5)) movimentos++;
  return { id, base: BASE, deltaPosFonte, movimentosPosFonte: movimentos, fonteProntaMs: iF >= 0 ? samples[iF].t : null, amostras: samples.length, assetsJsCss: { n: asset.n, gzBytes: asset.gz }, delta, indisponivelMax: Math.max(0, ...samples.map((x) => x.indisp)), erroVisto: samples.some((x) => x.erro), primeiraLentaMs: samples.find((x) => x.lenta)?.t ?? null, primeiraRenderMs: samples.find((x) => x.heroTop != null)?.t ?? null, carregadoMs: samples.find((x) => x.carregado)?.t ?? null, samples };
}
const browser = await chromium.launch();
const results = [];
const cases = [];
for (const n of [0, 3, 4]) for (const cache of ["cheio", "vazio"]) for (const [w, h] of [[1440, 900], [390, 844]]) cases.push({ n, cache, w, h });
const sel = cases.filter((c) => !ONLY || ONLY.split(",").includes(`${c.n}m-${c.cache}-${c.w}`));
const ctrl = !ONLY || ONLY.includes("controle");
const jobs = [...sel.map((c) => c), ...(ctrl ? [[1440, 900], [390, 844]].map(([w, h]) => ({ n: 3, cache: "cheio", w, h, fail500: true })) : [])];
// 4 em paralelo para não distorcer a fila de banda por CPU
for (let i = 0; i < jobs.length; i += 4) await Promise.all(jobs.slice(i, i + 4).map(async (c) => { const r = await run(browser, c); results.push(r); const d = Object.fromEntries(Object.entries(r.delta).map(([k, v]) => [k, v ? (v.max - v.min) : null])); console.log(r.id, JSON.stringify({ posFonte: r.deltaPosFonte, mov: r.movimentosPosFonte, deltas: d, indisp: r.indisponivelMax, erro: r.erroVisto, lenta: r.primeiraLentaMs, render: r.primeiraRenderMs, ok: r.carregadoMs, assets: r.assetsJsCss })); }));
writeFileSync(`${OUTD}/medicao${process.env.TAG || ""}.json`, JSON.stringify(results, null, 1));
await browser.close();
