// Prova visual do acabamento da Biblioteca 1b (Supabase, função e R2 mockados).
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const PILOT = "3e9555fc-085e-43dd-a063-bcd02847032d";
const OTHER = "11111111-2222-4333-8444-555555555555";
const OUT = path.resolve(process.env.OUT || ".proof-acab/shots");
const PORT = Number(process.env.PORT || 3112);
fs.mkdirSync(OUT, { recursive: true });
const files = [
  { id: "aaaaaaaa-0000-4000-8000-000000000001", title: "Rise of Tiamat — Livro da Aventura", size_bytes: 31876321, created_at: "2026-10-12T19:00:00Z" },
  { id: "aaaaaaaa-0000-4000-8000-000000000002", title: "Mapa de Waterdeep", size_bytes: 4200000, created_at: "2026-10-11T15:00:00Z" },
  { id: "aaaaaaaa-0000-4000-8000-000000000003", title: "Ficha de personagem 5e (preenchível)", size_bytes: 612000, created_at: "2026-10-10T12:00:00Z" },
];
const campaign = (id, name) => ({ id, name, ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" });
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;

async function main() {
  const { createServer } = await import("vite");
  const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: PORT, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const viewports = [[1440, 900], [390, 844]].filter(([w]) => !only || only.includes(String(w)));
  for (const [w, h] of viewports) {
    const tag = `${w}x${h}`;
    const r = { tag };
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.routeWebSocket("**/realtime/v1/**", (x) => x.close());
    await ctx.route("https://preview.supabase.test/**", (x) => x.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await ctx.route("**/rest/v1/**", (x) => x.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await ctx.route("**/rest/v1/campaign_library_pilot_campaigns*", (x) => {
      const ok = x.request().url().includes(PILOT);
      x.fulfill({ status: ok ? 200 : 406, contentType: "application/json", body: ok ? JSON.stringify({ campaign_id: PILOT }) : JSON.stringify({ code: "PGRST116" }) });
    });
    // mode: list | empty | error | hold
    let mode = "list";
    let list = files.slice();
    let releaseList = null;
    await ctx.route("**/rest/v1/campaign_library_files*", async (x) => {
      if (mode === "hold") await new Promise((res) => { releaseList = res; });
      if (mode === "error") return x.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "boom" }) });
      x.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mode === "empty" ? [] : list) });
    });
    let releasePut;
    await ctx.route("**/functions/v1/library-r2", async (x) => {
      if (x.request().method() === "OPTIONS") return x.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
      const body = JSON.parse(x.request().postData() || "{}");
      if (body.action === "request-upload") return x.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fileId: "bbbbbbbb-0000-4000-8000-000000000009", uploadUrl: "https://fake-r2.example/pending/x.pdf?sig=1", headers: { "Content-Type": "application/pdf", "Content-Length": String(body.size) } }) });
      if (body.action === "confirm-upload") list = [{ id: "bbbbbbbb-0000-4000-8000-000000000009", title: "Guia de Tiamat", size_bytes: 300000, created_at: "2026-10-13T13:00:00Z" }, ...list];
      return x.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await ctx.route("https://fake-r2.example/**", async (x) => {
      if (x.request().method() === "OPTIONS") return x.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "*" } });
      await new Promise((res) => { releasePut = res; });
      x.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" } });
    });
    await ctx.addInitScript(() => {
      localStorage.setItem("arkhiveon_preview_auth", "true");
      // Guarda o XHR do PUT pro R2 para emitir progresso real (upload.onprogress).
      const send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function (b) { window.__lastXhr = this; return send.call(this, b); };
    });
    const page = await ctx.newPage();
    page.on("request", (q) => { if (q.url().includes("pilot")) console.log("REQ", q.url().slice(0, 140)); });
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 200)); });
    page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
    const go = async (to) => { await page.evaluate((to) => { window.history.pushState({}, "", to); window.dispatchEvent(new PopStateEvent("popstate")); }, to); await page.waitForTimeout(800); };
    const setCampaign = async (id, name) => {
      await page.waitForFunction(() => window.__rpg_store__, { timeout: 60000 });
      await page.evaluate(([id, c]) => window.__rpg_store__.setState({ campaigns: [c], activeCampaignId: id, hasLoadedCampaigns: true, campaignLoadStatus: "ready" }), [id, campaign(id, name)]);
      await page.waitForTimeout(1200);
    };
    const openSidebar = async () => { const b = page.getByRole("button", { name: "Abrir menu lateral" }); if (await b.count()) { await b.first().click(); await page.waitForTimeout(500); } };
    const closeSidebar = async () => { const b = page.getByRole("button", { name: "Fechar menu lateral" }); if (await b.count()) { await b.first().click({ position: { x: w - 10, y: h / 2 } }); await page.waitForTimeout(400); } };
    const shot = async (n) => page.screenshot({ path: path.join(OUT, `${n}-${tag}.png`) });
    const reloadLibrary = async () => { await go("/dashboard"); await go("/library"); };

    await page.goto(`http://127.0.0.1:${PORT}/campaigns/${PILOT}/vtt`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await setCampaign(PILOT, "Rise of Tiamat");
    await go("/dashboard");
    await page.waitForTimeout(1500);

    // 0. Drawer (mobile): Biblioteca alcançável?
    if (w < 768) {
      await openSidebar();
      const link = page.getByRole("link", { name: /Biblioteca/ }).first();
      try { await link.waitFor({ state: "attached", timeout: 10000 }); } catch (e) { await shot("debug"); console.log("LINKS", JSON.stringify(await page.locator("aside a").evaluateAll((els) => els.map((e) => e.textContent.trim())))); throw e; }
      const footer = page.getByRole("link", { name: /Fazer Upgrade|Pro ativo/ }).first();
      const vis = async () => {
        const lb = await link.boundingBox();
        const nav = await link.evaluate((el) => { const s = el.closest(".overflow-y-auto"); const rr = s.getBoundingClientRect(); return { top: rr.top, bottom: rr.bottom, scrollH: s.scrollHeight, clientH: s.clientHeight }; });
        return { linkTop: lb && lb.y, linkBottom: lb && lb.y + lb.height, ...nav, fullyVisible: !!lb && lb.y >= nav.top && lb.y + lb.height <= nav.bottom };
      };
      r.drawerBefore = await vis();
      await shot("0a-drawer-topo");
      // Rola o nav com toque/roda do mouse, como o usuário faria.
      const navBox = await page.locator("aside .overflow-y-auto").first().boundingBox();
      await page.mouse.move(navBox.x + navBox.width / 2, navBox.y + navBox.height / 2);
      for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(120); }
      await page.mouse.move(w - 5, 5);
      await page.waitForTimeout(400);
      r.drawerAfterScroll = await vis();
      r.footerVisible = await footer.isVisible();
      await shot("0b-drawer-biblioteca");
      await closeSidebar();
    }

    // 1. Carregando (skeleton)
    mode = "hold";
    await reloadLibrary();
    await page.locator('[aria-busy="true"]').first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    await shot("1-carregando");
    mode = "list";
    releaseList && releaseList();
    await page.waitForTimeout(500);

    // 2. Erro
    mode = "error";
    await reloadLibrary();
    await page.getByText("Não deu pra carregar a Biblioteca.").waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    await shot("2-erro");

    // 3. Vazio
    mode = "empty";
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await page.getByText("Nenhum PDF ainda").waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    await shot("3-vazio");

    // 4. Arrastar (overlay "Solte o PDF aqui")
    const dt = await page.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(["%PDF-1.7"], "Guia.pdf", { type: "application/pdf" })); return d; });
    await page.getByText("Nenhum PDF ainda").dispatchEvent("dragover", { dataTransfer: dt });
    await page.waitForTimeout(400);
    await shot("4-arrastar");
    await page.getByText("Nenhum PDF ainda").dispatchEvent("dragleave", { dataTransfer: dt });

    // 5. Lista
    mode = "list";
    await reloadLibrary();
    await page.getByText("Mapa de Waterdeep").waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    await shot("5-lista");

    // 6. Envio no meio (progresso real do XHR, ~45%)
    const pdf = Buffer.from("%PDF-1.7\n" + "x".repeat(300000));
    await page.locator('input[type="file"]').setInputFiles({ name: "Guia de Tiamat.pdf", mimeType: "application/pdf", buffer: pdf });
    await page.getByText(/Enviando Guia de Tiamat/).waitFor({ timeout: 10000 });
    await page.waitForFunction(() => window.__lastXhr && String(window.__lastXhr.responseURL || "") === "" );
    await page.evaluate((total) => { window.__lastXhr.upload.dispatchEvent(new ProgressEvent("progress", { lengthComputable: true, loaded: Math.round(total * 0.45), total })); }, pdf.length);
    await page.getByText("45%").waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    await shot("6-envio-45");
    releasePut();
    await page.getByRole("button", { name: "Apagar Guia de Tiamat" }).waitFor({ timeout: 10000 });
    r.uploadCompleted = true;

    // 7. Fora do piloto: nada aparece
    await go("/dashboard");
    await setCampaign(OTHER, "Outra campanha");
    if (w < 768) await openSidebar();
    await page.getByRole("link", { name: /Lore/ }).first().waitFor({ state: "attached" });
    r.nonPilotBibliotecaLinks = await page.getByRole("link", { name: /Biblioteca/ }).count();
    if (w < 768) await closeSidebar();
    await go("/library");
    await page.waitForTimeout(2500);
    r.nonPilotDirectVisitEndedAt = new URL(page.url()).pathname;
    results.push(r);
    await ctx.close();
  }
  console.log("RESULTS " + JSON.stringify(results, null, 1));
  await browser.close();
  await server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
