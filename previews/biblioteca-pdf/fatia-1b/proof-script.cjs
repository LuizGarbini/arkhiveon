const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const PILOT = "3e9555fc-085e-43dd-a063-bcd02847032d";
const OTHER = "11111111-2222-4333-8444-555555555555";
const OUT = path.resolve(".proof-1b/shots");
fs.mkdirSync(OUT, { recursive: true });
const files = [
  { id: "aaaaaaaa-0000-4000-8000-000000000001", title: "Rise of Tiamat — Livro da Aventura", size_bytes: 31876321, created_at: "2026-10-12T19:00:00Z" },
  { id: "aaaaaaaa-0000-4000-8000-000000000002", title: "Mapa de Waterdeep", size_bytes: 4200000, created_at: "2026-10-11T15:00:00Z" },
  { id: "aaaaaaaa-0000-4000-8000-000000000003", title: "Ficha de personagem 5e (preenchível)", size_bytes: 612000, created_at: "2026-10-10T12:00:00Z" },
];
const campaign = (id, name) => ({ id, name, ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" });

async function main() {
  const { createServer } = await import("vite");
  const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3108, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const tag = `${w}x${h}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.routeWebSocket("**/realtime/v1/**", (r) => r.close());
    await ctx.route("https://preview.supabase.test/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await ctx.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await ctx.route("**/rest/v1/campaign_library_pilot_campaigns*", (r) => {
      const ok = r.request().url().includes(PILOT);
      r.fulfill({ status: ok ? 200 : 406, contentType: "application/json", body: ok ? JSON.stringify({ campaign_id: PILOT }) : JSON.stringify({ code: "PGRST116" }) });
    });
    let list = files.slice();
    await ctx.route("**/rest/v1/campaign_library_files*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(list) }));
    let releasePut;
    await ctx.route("**/functions/v1/library-r2", async (r) => {
      if (r.request().method() === "OPTIONS") return r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
      const body = JSON.parse(r.request().postData() || "{}");
      if (body.action === "request-upload") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fileId: "bbbbbbbb-0000-4000-8000-000000000009", uploadUrl: "https://fake-r2.example/pending/x.pdf?sig=1", headers: { "Content-Type": "application/pdf", "Content-Length": String(body.size) } }) });
      if (body.action === "confirm-upload") { list = [{ id: "bbbbbbbb-0000-4000-8000-000000000009", title: "Guia de Tiamat", size_bytes: 300000, created_at: "2026-10-13T13:00:00Z" }, ...list]; }
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    });
    await ctx.route("https://fake-r2.example/**", async (r) => {
      if (r.request().method() === "OPTIONS") return r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "*" } });
      await new Promise((res) => { releasePut = res; });
      r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" } });
    });
    await ctx.addInitScript(() => localStorage.setItem("arkhiveon_preview_auth", "true"));
    const page = await ctx.newPage();
    const go = async (to) => { await page.evaluate((to) => { window.history.pushState({}, "", to); window.dispatchEvent(new PopStateEvent("popstate")); }, to); await page.waitForTimeout(800); };
    const setCampaign = async (id, name) => {
      await page.waitForFunction(() => window.__rpg_store__, { timeout: 60000 });
      await page.evaluate(([id, name, c]) => window.__rpg_store__.setState({ campaigns: [c], activeCampaignId: id, hasLoadedCampaigns: true, campaignLoadStatus: "ready" }), [id, name, campaign(id, name)]);
      await page.waitForTimeout(1200);
    };
    const openSidebar = async () => { if (w < 768) { const b = page.getByRole("button", { name: "Abrir menu lateral" }); if (await b.count()) { await b.first().click(); await page.waitForTimeout(500); } } };
    const shot = async (n) => page.screenshot({ path: path.join(OUT, `${n}-${tag}.png`) });

    // Piloto
    await page.goto(`http://127.0.0.1:3108/campaigns/${PILOT}/vtt`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await setCampaign(PILOT, "Rise of Tiamat");
    await go("/dashboard");
    await openSidebar();
    page.on("request", (r) => { if (r.url().includes("pilot")) console.log("REQ", r.url().slice(0,160)); });
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0,200)); });
    await page.waitForTimeout(2000);
    
    console.log("URL", page.url(), await page.evaluate(() => window.__rpg_store__.getState().activeCampaignId));
    await page.getByRole("link", { name: /Biblioteca/ }).first().waitFor({ timeout: 10000 });
    await shot("1-piloto-sidebar");
    await page.getByRole("link", { name: /Biblioteca/ }).first().click();
    await page.getByText("Mapa de Waterdeep").waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    await shot("2-piloto-biblioteca");
    // Upload
    const pdf = Buffer.from("%PDF-1.7\n" + "x".repeat(300000));
    await page.locator('input[type="file"]').setInputFiles({ name: "Guia de Tiamat.pdf", mimeType: "application/pdf", buffer: pdf });
    await page.getByText(/Enviando Guia de Tiamat/).waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    await shot("3-upload-progresso");
    releasePut();
    await page.getByRole("button", { name: "Apagar Guia de Tiamat" }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await shot("4-upload-concluido");
    await page.getByRole("button", { name: "Apagar Guia de Tiamat" }).click();
    await page.getByText("Apagar PDF?").waitFor();
    await shot("5-apagar-confirmacao");
    await page.keyboard.press("Escape");

    // Fora do piloto
    await go("/dashboard");
    await setCampaign(OTHER, "Outra campanha");
    await openSidebar();
    await page.getByRole("link", { name: /Lore/ }).first().waitFor();
    const libCount = await page.getByRole("link", { name: /Biblioteca/ }).count();
    await shot("6-fora-piloto-sidebar");
    await go("/library");
    await page.waitForTimeout(2500);
    const finalUrl = new URL(page.url()).pathname;
    results.push({ tag, nonPilotBibliotecaLinks: libCount, directVisitEndedAt: finalUrl });
    await ctx.close();
  }
  console.log(JSON.stringify(results));
  await browser.close();
  await server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
