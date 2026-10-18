// Prova visual da Biblioteca 1b-multi (vários PDFs) (Supabase, função e R2 mockados).
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const PILOT = "3e9555fc-085e-43dd-a063-bcd02847032d";
const OTHER = "11111111-2222-4333-8444-555555555555";
const OUT = path.resolve(process.env.OUT || ".proof-multi/shots");
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
  for (const [w, h] of [[1440, 900], [390, 844]]) {
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
    let mode = "list";
    let list = files.slice();
    await ctx.route("**/rest/v1/campaign_library_files*", async (x) => {
      if (mode === "error") return x.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "boom" }) });
      x.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(list) });
    });
    const calls = [];
    let holdGuia = true;
    let releaseGuia = null;
    await ctx.route("**/functions/v1/library-r2", async (x) => {
      if (x.request().method() === "OPTIONS") return x.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
      const body = JSON.parse(x.request().postData() || "{}");
      calls.push(body.action + ":" + (body.title || body.fileId));
      if (body.action === "request-upload") {
        if (body.title === "Ficha do Grupo") return x.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) });
        const slug = body.title === "Mapa de Phandalin" ? "mapa" : "guia";
        if (body.title !== "Mapa de Phandalin" && body.title !== "Guia de Tiamat") return x.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fileId: "cccccccc-0000-4000-8000-00000000000" + (body.title.length % 10), uploadUrl: "https://fake-r2.example/pending/ok-" + body.title.length + ".pdf?sig=1", headers: { "Content-Type": "application/pdf" } }) });
        return x.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fileId: `bbbbbbbb-0000-4000-8000-00000000000${slug === "mapa" ? 1 : 2}`, uploadUrl: `https://fake-r2.example/pending/${slug}.pdf?sig=1`, headers: { "Content-Type": "application/pdf", "Content-Length": String(body.size) } }) });
      }
      if (body.action === "confirm-upload") list = [{ id: body.fileId, title: body.fileId.startsWith("ccc") ? "Livro extra " + body.fileId.slice(-1) : "Guia de Tiamat", size_bytes: 300000, created_at: "2026-10-18T15:00:00Z" }, ...list];
      return x.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await ctx.route("https://fake-r2.example/**", async (x) => {
      if (x.request().method() === "OPTIONS") return x.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "*" } });
      if (x.request().url().includes("mapa")) await new Promise(() => {}); // fica enviando
      if (holdGuia && x.request().url().includes("guia")) await new Promise((res) => { releaseGuia = res; });
      x.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" } });
    });
    await ctx.addInitScript(() => {
      localStorage.setItem("arkhiveon_preview_auth", "true");
      window.__xhrs = {};
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (m, u, ...rest) { if (String(u).includes("fake-r2")) window.__xhrs[String(u).includes("mapa") ? "mapa" : "guia"] = this; return open.call(this, m, u, ...rest); };
    });
    const page = await ctx.newPage();
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
    const uploadBtn = () => page.getByRole("button", { name: "Enviar PDF" }).filter({ visible: true }).first();

    await page.goto(`http://127.0.0.1:${PORT}/campaigns/${PILOT}/vtt`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await setCampaign(PILOT, "Rise of Tiamat");
    await go("/dashboard");
    await page.waitForTimeout(1500);

    // 1. Erro ao carregar: botão de enviar desligado
    mode = "error";
    await reloadLibrary();
    await page.getByText("Não deu pra carregar a Biblioteca.").waitFor({ timeout: 15000 });
    r.uploadDisabledOnError = await uploadBtn().isDisabled();
    await shot("1-erro-enviar-desligado");
    mode = "list";
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await page.getByText("Mapa de Waterdeep").waitFor({ timeout: 15000 });
    r.uploadEnabledWhenReady = await uploadBtn().isEnabled();

    // 2. Três PDFs + um PNG de uma vez
    const pdf = (n) => ({ name: n, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n" + "x".repeat(300000)) });
    await page.locator('input[type="file"]').setInputFiles([pdf("Mapa de Phandalin.pdf"), pdf("Guia de Tiamat.pdf"), pdf("Ficha do Grupo.pdf"), { name: "retrato-elbereth.png", mimeType: "image/png", buffer: Buffer.from("png") }]);
    await page.getByText("Na fila", { exact: true }).waitFor({ timeout: 10000 });
    await page.waitForFunction(() => window.__xhrs.mapa && window.__xhrs.guia);
    await page.evaluate((total) => { window.__xhrs.mapa.upload.dispatchEvent(new ProgressEvent("progress", { lengthComputable: true, loaded: Math.round(total * 0.62), total })); window.__xhrs.guia.upload.dispatchEvent(new ProgressEvent("progress", { lengthComputable: true, loaded: Math.round(total * 0.3), total })); }, 300009);
    await page.getByText("30%", { exact: true }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    r.concurrencySummary = await page.getByLabel("Envios").locator("span").first().textContent();
    r.uploadRequestsWhileTwoSending = calls.filter((c) => c.startsWith("request-upload")).length;
    await shot("2-fila-2-enviando-1-na-fila");
    holdGuia = false; releaseGuia();
    try { await page.getByText(/arquivo ignorado/).first().waitFor({ timeout: 5000 }); } catch (e) { await shot("debug"); throw e; }
    await page.getByRole("button", { name: /Tentar de novo: Ficha/ }).waitFor({ timeout: 15000 });
    await page.getByText("Enviado", { exact: true }).waitFor({ timeout: 15000 });
    await page.waitForFunction(() => window.__xhrs.mapa);
    await page.evaluate((total) => { window.__xhrs.mapa.upload.dispatchEvent(new ProgressEvent("progress", { lengthComputable: true, loaded: Math.round(total * 0.62), total })); }, 300009);
    await page.getByText("62%").waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    r.mixedSummary = await page.getByLabel("Envios").locator("span").first().textContent();
    await shot("3-fila-aviso-png");
    await page.waitForTimeout(6000); // toast some
    await shot("4-fila-enviando-ok-erro");
    r.listHasNewFile = await page.getByRole("button", { name: "Apagar Guia de Tiamat" }).count();
    r.calls = calls.slice();

    // 4. Tentar de novo: volta pra fila e chama request-upload outra vez
    const before = calls.filter((c) => c === "request-upload:Ficha do Grupo").length;
    await page.getByRole("button", { name: /Tentar de novo: Ficha/ }).click();
    await page.waitForTimeout(800);
    r.retryCalledAgain = calls.filter((c) => c === "request-upload:Ficha do Grupo").length === before + 1;

    // 5. Fila terminada: dois PDFs que dão certo
    await reloadLibrary();
    await page.getByText("Mapa de Waterdeep").waitFor({ timeout: 15000 });
    await page.locator('input[type="file"]').setInputFiles([pdf("Livro do Jogador.pdf"), pdf("Bestiario.pdf")]);
    await page.getByRole("button", { name: "Limpar" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    r.doneSummary = await page.getByLabel("Envios").locator("span").first().textContent();
    await shot("5-fila-terminada");
    await page.getByRole("button", { name: "Limpar" }).click();
    await page.waitForTimeout(300);
    r.panelGoneAfterLimpar = (await page.getByLabel("Envios").count()) === 0;

    // 6. Fora do piloto
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
