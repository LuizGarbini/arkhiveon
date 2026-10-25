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
async function run(browser, { n, cache, w, h, fail500 = false, shot = true }) {
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
  // Slow 3G (preset do DevTools): 400ms RTT, ~500kbps down, ~500kbps up
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: -1, uploadThroughput: -1 });
  await page.route(/\.supabase\.co\/auth\//, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: UID, aud: "authenticated", role: "authenticated", email: "qa@exemplo.invalid", app_metadata: {}, user_metadata: {} }) }));
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
  page.goto("http://127.0.0.1:4531/dashboard", { timeout: 180000 }).catch(() => {});
  const samples = []; let shotSlow = false, shotErr = false;
  const end = fail500 ? 15000 : null;
  while (true) {
    const el = Date.now() - t0;
    const s = await page.evaluate(() => {
      const sec = document.querySelector('[data-dash-section="active-quests"]');
      const r = sec?.getBoundingClientRect();
      const btn = sec ? [...sec.querySelectorAll("a,button")].find((e) => /Nova Missão/.test(e.textContent || "")) : null;
      const b = btn?.getBoundingClientRect();
      const txt = document.body?.innerText || "";
      return { secH: r ? Math.round(r.height * 10) / 10 : null, secY: r ? Math.round(r.top + scrollY) : null, btnX: b ? Math.round(b.left) : null, btnY: b ? Math.round(b.top + scrollY - (r.top + scrollY)) : null, btnH: b ? Math.round(b.height) : null,
        indisp: (txt.match(/Indisponível/g) || []).length, erro: !!document.querySelector('[role="alert"][aria-label="Falha ao carregar a mesa"]'), lenta: /Conexão lenta, ainda carregando/.test(txt), carregado: !document.querySelector(".dashboard-skeleton, [data-slot=skeleton]") && /Fichas ativas/.test(txt) && !/Conexão lenta/.test(txt) };
    }).catch(() => null);
    if (s) { s.t = el; s.restLiberado = firstRest ? Date.now() - firstRest >= DELAY : false; samples.push(s); }
    if (shot && s?.lenta && !shotSlow) { shotSlow = true; await page.screenshot({ path: `${OUT}/${id}-lenta.png` }); }
    if (fail500 && s?.erro && !shotErr) { shotErr = true; await sleep(300); await page.screenshot({ path: `${OUT}/${id}-erro.png`, fullPage: true }); }
    if (fail500 && (shotErr || el > 70000)) break;
    if (!fail500 && s?.carregado && samples.filter((x) => x.carregado).length > 12) break;
    if (el > 150000) break;
    await sleep(250);
  }
  if (shot && !fail500) await page.screenshot({ path: `${OUT}/${id}-carregado.png` });
  if (shot && !fail500) await page.locator("[data-dash-section=active-quests]").screenshot({ path: `${OUT}/${id}-missoes.png`, timeout: 5000 }).catch((e) => console.log("secshot", e.message.split("\n")[0]));
  await ctx.close();
  const withSec = samples.filter((x) => x.secH != null);
  const rng = (k) => { const v = withSec.map((x) => x[k]).filter((x) => x != null); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  return { id, amostras: samples.length, comSecao: withSec.length, alturaSecao: rng("secH"), botaoXRelVp: rng("btnX"), botaoYRelSecao: rng("btnY"), botaoAltura: rng("btnH"), indisponivelMax: Math.max(0, ...samples.map((x) => x.indisp)), erroVisto: samples.some((x) => x.erro), lentaVista: samples.some((x) => x.lenta), primeiraLentaMs: samples.find((x) => x.lenta)?.t ?? null, carregadoMs: samples.find((x) => x.carregado)?.t ?? null, samples };
}
const browser = await chromium.launch();
const results = [];
const cases = [];
for (const n of [0, 3, 4]) for (const cache of ["cheio", "vazio"]) for (const [w, h] of [[1440, 900], [390, 844]]) cases.push({ n, cache, w, h });
const sel = ONLY === "controle" ? [] : cases.filter((c) => !ONLY || `${c.n}m-${c.cache}-${c.w}` === ONLY);
await Promise.all(sel.map(async (c) => { const r = await run(browser, c); results.push(r); console.log(r.id, JSON.stringify({ ...r, samples: undefined })); }));
if (!ONLY || ONLY === "controle") for (const [w, h] of [[1440, 900], [390, 844]]) { const r = await run(browser, { n: 3, cache: "cheio", w, h, fail500: true }); results.push(r); console.log(r.id, JSON.stringify({ ...r, samples: undefined })); }
writeFileSync(`${OUT}/medicao${ONLY ? "-" + ONLY : ""}.json`, JSON.stringify(results, null, 1));
await browser.close();
