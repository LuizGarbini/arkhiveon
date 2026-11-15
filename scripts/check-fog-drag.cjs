// Verificação: arrastar um token NÃO pode refazer a textura da névoa.
// Carrega a mesa real num navegador, liga névoa e exploração, simula ~1,2 s de
// arrasto (o mesmo updateToken do mouse) e conta os redesenhos da névoa.
// Uso: pnpm check:fog-drag   (sai com código 1 se a névoa for refeita no arrasto)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3109, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "ordem" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3109/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const results = [];
	const scenarios = [["fog desligada", false, false], ["fog ligada", true, false], ["fog + exploração (visão do jogador)", true, true]];
	for (const [label, fog, explore] of scenarios) {
		const r = await page.evaluate(async ({ fog, explore }) => {
			const st = window.__vtt_store__.getState();
			st.setIsGM(false);
			const scene = { id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.15, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 4000, height: 3000, fogEnabled: fog, fogExploration: explore, isActive: true, orderIndex: 0 };
			st.setScenes([scene]); st.setActiveSceneId("s1");
			const tokens = [{ id: "pc", sceneId: "s1", name: "Dante", characterId: "dante", layer: "token", x: 700, y: 700, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: [] }];
			for (let i = 0; i < 12; i++) tokens.push({ id: "n" + i, sceneId: "s1", name: "NPC" + i, layer: "token", x: 300 + i * 150, y: 1400, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: [] });
			window.__vtt_store__.getState().setTokens(tokens);
			// mapa com bastante névoa pintada (como uma sessão real)
			for (let i = 0; i < 25; i++) window.__vtt_store__.getState().addFogPath({ id: "p" + i + "-" + Math.random(), type: "circle", mode: "reveal", x: 400 + i * 120, y: 700 + (i % 5) * 200, radius: 220 });
			await new Promise((r) => setTimeout(r, 900));
			const before = window.__fog_renders__ ?? 0;
			let frames = 0; let raf = true;
			const tick = () => { frames++; if (raf) requestAnimationFrame(tick); };
			requestAnimationFrame(tick);
			const t0 = performance.now();
			const MOVES = 150; // ~ 1,2 s de arrasto a 125 Hz
			for (let i = 0; i < MOVES; i++) {
				window.__vtt_store__.getState().updateToken("pc", { x: 700 + i * 4, y: 700 + Math.sin(i / 10) * 40 });
				await new Promise((r) => setTimeout(r, 8));
			}
			const elapsed = performance.now() - t0;
			raf = false;
			return { fogRenders: (window.__fog_renders__ ?? 0) - before, moves: MOVES, elapsedMs: Math.round(elapsed), fps: Math.round((frames / elapsed) * 1000) };
		}, { fog, explore });
		console.log(label.padEnd(40), JSON.stringify(r));
		results.push([label, r]);
	}
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	const bad = results.filter(([, r]) => r.fogRenders > 0);
	await browser.close();
	await server.close();
	if (bad.length || errors.length) {
		console.error("FALHOU: a névoa foi refeita durante o arrasto (ou houve erro de página):", bad.map(([l]) => l).join(", "));
		process.exit(1);
	}
	console.log("OK: nenhum redesenho da névoa durante o arrasto");
	return;
}
main().catch((e) => { console.error(e); process.exit(1); });
