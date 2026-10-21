// 20 idas mesa -> painel -> landing (d20) -> mesa, Supabase mockado, contando contextos WebGL.
// Uso: node webgl-cycle.cjs <label> <port>   (baseado em vr-bugs/138/investigacao/cycle.cjs)
const { chromium } = require("/workspace/wt-webgl/node_modules/playwright");
const fs = require("node:fs");
const [label, port] = process.argv.slice(2);
const OUT = `/workspace/arkhiveon/previews/vr-bugs/webgl/${label}`;
fs.mkdirSync(OUT, { recursive: true });
const BASE = `http://127.0.0.1:${port}`;
const CID = "5f2c5f62-ac17-4172-8b7e-dd33740bf639";
const ROUNDS = 20;
const SHOTS = new Set([1, 10, 20]);
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.routeWebSocket("**/realtime/v1/**", (x) => x.close());
  await ctx.route("https://preview.supabase.test/**", (x) => x.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await ctx.addInitScript(() => {
    localStorage.setItem("arkhiveon_preview_auth", "true");
    const s = (window.__gl = { created: 0, appLost: 0, browserLost: 0, active: 0, maxActive: 0, byKind: {} });
    const appReleased = new WeakSet();
    const tracked = new WeakSet();
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      const gl = orig.call(this, type, ...rest);
      if (gl && /webgl/.test(String(type)) && !tracked.has(gl)) {
        tracked.add(gl);
        const canvas = this;
        s.created++; s.active++; s.maxActive = Math.max(s.maxActive, s.active);
        s.byKind[type] = (s.byKind[type] || 0) + 1;
        const getExt = gl.getExtension;
        gl.getExtension = function (name) {
          const ext = getExt.call(this, name);
          if (name === "WEBGL_lose_context" && ext && !ext.__wrapped) {
            const lose = ext.loseContext.bind(ext);
            ext.loseContext = () => { appReleased.add(canvas); lose(); };
            ext.__wrapped = true;
          }
          return ext;
        };
        canvas.addEventListener("webglcontextlost", () => {
          s.active--;
          if (appReleased.has(canvas)) s.appLost++; else s.browserLost++;
        });
      }
      return gl;
    };
  });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => consoleMsgs.push(`pageerror: ${String(e).slice(0, 300)}`));
  const nav = (to) => page.evaluate((to) => { history.pushState({}, "", to); dispatchEvent(new PopStateEvent("popstate")); }, to);
  const gl = () => page.evaluate(() => ({ ...window.__gl }));
  // canvases visíveis e se o contexto deles está vivo
  const canvases = () => page.evaluate(() => [...document.querySelectorAll("canvas")].map((c) => {
    const r = c.getBoundingClientRect();
    const where = c.closest('aside[aria-label="Comunidade Discord"]') ? "discord" : c.closest("header") ? "hero" : c.closest("main") ? "main" : "outro";
    return { where, w: Math.round(r.width), h: Math.round(r.height) };
  }));
  const warns = () => consoleMsgs.filter((m) => /Too many active WebGL contexts/i.test(m)).length;

  await page.goto(`${BASE}/campaigns/${CID}/vtt`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__rpg_store__, { timeout: 90000 });
  await page.evaluate((cid) => window.__rpg_store__.setState({ campaigns: [{ id: cid, name: "QA WebGL (teste)", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: cid, hasLoadedCampaigns: true, campaignLoadStatus: "ready" }), CID);
  await page.waitForTimeout(2000);
  const rows = [];
  const snap = async (round, stop) => { const g = await gl(); const row = { round, stop, ...g, warnings: warns(), canvases: await canvases() }; rows.push(row); console.log(label, JSON.stringify({ round, stop, active: g.active, maxActive: g.maxActive, created: g.created, appLost: g.appLost, browserLost: g.browserLost, warnings: row.warnings })); return row; };
  await snap(0, "mesa");
  for (let r = 1; r <= ROUNDS; r++) {
    await nav("/dashboard");
    await page.waitForFunction(() => document.querySelector('aside[aria-label="Comunidade Discord"] canvas') && document.querySelector("header canvas"), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(r, "dashboard");
    if (SHOTS.has(r)) await page.screenshot({ path: `${OUT}/ida-${String(r).padStart(2, "0")}-dashboard.png` });
    await nav("/");
    await page.waitForFunction(() => [...document.querySelectorAll("canvas")].some((c) => c.width > 200), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(r, "landing-d20");
    if (SHOTS.has(r)) await page.screenshot({ path: `${OUT}/ida-${String(r).padStart(2, "0")}-d20.png` });
    await nav(`/campaigns/${CID}/vtt`);
    await page.waitForTimeout(1500);
    await snap(r, "mesa");
    if (SHOTS.has(r)) await page.screenshot({ path: `${OUT}/ida-${String(r).padStart(2, "0")}-mesa.png` });
  }
  const g = await gl();
  const summary = { label, rounds: ROUNDS, created: g.created, maxActive: g.maxActive, finalActive: g.active, appLost: g.appLost, browserLost: g.browserLost, tooManyWarnings: warns(), consoleTotal: consoleMsgs.length };
  console.log(label, "SUMMARY", JSON.stringify(summary));
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 1));
  fs.writeFileSync(`${OUT}/rows.json`, JSON.stringify(rows, null, 1));
  fs.writeFileSync(`${OUT}/console.txt`, consoleMsgs.join("\n"));
  await browser.close();
})().catch((e) => { console.error(label, "FATAL", e); process.exit(1); });
