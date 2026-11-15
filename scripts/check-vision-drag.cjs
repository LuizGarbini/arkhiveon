// Verificação: a visão só revela o mapa quando o movimento TERMINA.
// Carrega a mesa real como jogador (névoa + exploração), arrasta o personagem com
// o mouse SEM soltar e confere que a memória do mapa não cresce; ao soltar, confere
// que cresce e que o token passa a olhar para onde andou (rotation).
// Uso: pnpm check:vision-drag   (sai com código 1 se a visão acompanhar o arrasto)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3114, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: r.request().url().includes("/rpc/explore_scene_cells") ? "null" : "[]" }));
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3114/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const mk = (id, name, x, y, extra = {}) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: [], ...extra });
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.35, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: true, fogExploration: true, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate((tokens) => window.__vtt_store__.getState().setTokens(tokens), [
		mk("pc", "Dante", 350, 490, { characterId: "dante", controlledBy: ["preview-gm-user"], rotation: 0 }),
		mk("g-north", "Goblin ao norte", 350, 280),
		mk("g-east", "Goblin ao leste", 770, 490),
	]);
	await page.waitForTimeout(3000);
	const info = () => page.evaluate(() => {
		const t = window.__vtt_store__.getState().tokens.find((x) => x.id === "pc");
		const e = window.__explored_store__.getState();
		let n = 0; if (e.grid) for (const b of e.grid.bits) { let v = b; while (v) { n += v & 1; v >>= 1; } }
		return { x: t.x, y: t.y, rotation: t.rotation, explored: n, dragged: window.__vtt_store__.getState().draggedTokenIds };
	});
	const s0 = await info();
	console.log("início        ", JSON.stringify(s0));
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const toScreen = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	const from = toScreen(350, 490), to = toScreen(630, 490);
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	for (let i = 1; i <= 14; i++) { await page.mouse.move(from.x + ((to.x - from.x) * i) / 14, from.y + ((to.y - from.y) * i) / 14, { steps: 2 }); await page.waitForTimeout(40); }
	await page.waitForTimeout(2500);
	const s1 = await info();
	console.log("durante arrasto", JSON.stringify(s1));
	await page.mouse.up();
	await page.waitForTimeout(3500);
	const s2 = await info();
	console.log("depois de soltar", JSON.stringify(s2));
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();
	const problems = [];
	if (Math.abs(s1.x - s0.x) < 200) problems.push("o token não foi arrastado (o teste não exercitou o arrasto)");
	if (s1.explored !== s0.explored) problems.push(`a memória mudou DURANTE o arrasto (${s0.explored} → ${s1.explored})`);
	if (!s1.dragged.includes("pc")) problems.push("o token não estava marcado como arrastado");
	if (s2.explored <= s1.explored) problems.push(`a memória não cresceu ao soltar (${s1.explored} → ${s2.explored})`);
	if (s2.rotation < 85 || s2.rotation > 105) problems.push(`a direção ao soltar deveria ser ~96° (leste), veio ${s2.rotation}°`);
	if (s2.dragged.length !== 0) problems.push("o arrasto não foi encerrado");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: a visão só mudou ao soltar, e o token passou a olhar para onde andou");
}
main().catch((e) => { console.error(e); process.exit(1); });
