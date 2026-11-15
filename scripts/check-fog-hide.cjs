// Verificação: o mestre consegue ESCURECER de novo uma área que os jogadores já
// exploraram (pincel/forma de cobrir da névoa). Antes, a memória de exploração
// "furava" a névoa por cima e a área continuava visível.
// Como jogador: explora uma área, o mestre cobre parte dela, e esse trecho tem de
// ficar escuro (imagem diferente) e a memória dessas células tem de ser apagada.
// Uso: pnpm check:fog-hide   (sai com código 1 se a área explorada não escurecer)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3119, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: r.request().url().includes("/rpc/") ? "null" : "[]" }));
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3119/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: true, fogExploration: true, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate(() => window.__vtt_store__.getState().setTokens([{ id: "pc", sceneId: "s1", name: "Dante", characterId: "dante", layer: "token", x: 420, y: 455, sizeCells: 1, rotation: 90, elevation: 0, conditions: [], auras: [], visionRange: 3, isLocked: false, isHidden: false, controlledBy: [] }]));
	await page.waitForTimeout(3000);
	// anda para a direita: o rastro fica na memória do grupo (penumbra)
	for (let x = 420; x <= 840; x += 70) {
		await page.evaluate((x) => window.__vtt_store__.getState().updateToken("pc", { x }), x);
		await page.waitForTimeout(250);
	}
	await page.waitForTimeout(2500);
	const explored = () => page.evaluate(() => {
		const e = window.__explored_store__.getState();
		let inArea = 0, total = 0;
		if (e.grid) for (let i = 0; i < e.grid.cols * e.grid.rows; i++) {
			if ((e.grid.bits[i >> 3] >> (i & 7)) & 1) {
				total++;
				const cx = (i % e.grid.cols) * e.grid.cell + e.grid.cell / 2;
				const cy = Math.floor(i / e.grid.cols) * e.grid.cell + e.grid.cell / 2;
				if (Math.hypot(cx - 490, cy - 455) <= 70) inArea++;
			}
		}
		return { inArea, total };
	});
	// trecho já explorado e FORA da visão atual (o personagem está 280 px adiante,
	// com visão de 210 px), onde o mestre vai cobrir
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const clip = { x: box.x + vp.x + 420, y: box.y + vp.y + 385, width: 140, height: 140 };
	const before = await explored();
	const shotBefore = await page.screenshot({ clip });
	console.log("antes de cobrir  ", JSON.stringify(before));
	// O mestre cobre o círculo (centro 490,455, raio 70) com a ferramenta de névoa:
	// forma círculo + ação "ocultar", arrastando o mouse de verdade no canvas.
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(true);
		st.setActiveFogTool("circle");
		st.setActiveFogMode("hide");
		st.setActiveTool("fog");
	});
	await page.waitForTimeout(1500);
	const at = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	const center = at(490, 455);
	const edge = at(560, 455);
	await page.mouse.move(center.x, center.y);
	await page.mouse.down();
	await page.mouse.move((center.x + edge.x) / 2, center.y, { steps: 4 });
	await page.mouse.move(edge.x, edge.y, { steps: 4 });
	await page.mouse.up();
	await page.waitForTimeout(1200);
	// volta a ser jogador para ver o resultado como ele veria
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setActiveTool("select");
		st.setIsGM(false);
	});
	await page.waitForTimeout(3000);
	const after = await explored();
	const shotAfter = await page.screenshot({ clip });
	console.log("depois de cobrir ", JSON.stringify(after));
	await browser.close();
	await server.close();
	const problems = [];
	if (before.inArea < 10) problems.push(`o teste não explorou a área a cobrir (${before.inArea} células)`);
	if (shotBefore.equals(shotAfter)) problems.push("a área explorada NÃO escureceu depois de o mestre cobri-la");
	if (after.inArea !== 0) problems.push(`a memória das células cobertas não foi apagada (${after.inArea} restam)`);
	if (after.total >= before.total && before.inArea > 0) problems.push("a memória total não diminuiu");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: a área explorada escureceu quando o mestre a cobriu");
}
main().catch((e) => { console.error(e); process.exit(1); });
