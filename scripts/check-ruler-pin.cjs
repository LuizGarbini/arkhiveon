// Verificação da régua fixa, com o mouse e o teclado de verdade:
//  - mede com a régua (clique em A, clique em B), troca para Selecionar (tecla V);
//  - a medição continua no mapa, fixada, com o selo "Régua fixada" e a distância;
//  - dá para arrastar um token ao longo dela e a régua não se mexe nem some;
//  - o botão Limpar do selo apaga; medir de novo com a régua substitui a anterior.
// Uso: pnpm check:ruler-pin   (sai com código 1 se algo falhar)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3129, strictPort: true } });
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
	await page.goto("http://127.0.0.1:3129/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: false, fogExploration: false, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate(() => window.__vtt_store__.getState().setTokens([{ id: "a", sceneId: "s1", name: "Aria", layer: "token", x: 455, y: 455, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: ["preview-gm-user"] }]));
	await page.waitForTimeout(1200);
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const at = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	const ruler = () => page.evaluate(() => { const s = window.__vtt_store__.getState(); const m = s.activeMeasurement; return { tool: s.activeTool, m: m && { pinned: m.pinned, distance: m.distance, waypoints: m.waypoints }, token: s.tokens.find((t) => t.id === "a") && { x: s.tokens[0].x, y: s.tokens[0].y } }; });

	// mede: ferramenta Régua, clique em A, clique em B
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("ruler"));
	await page.waitForTimeout(500);
	const A = at(455, 455), B = at(665, 455);
	await page.mouse.click(A.x, A.y);
	await page.mouse.move(B.x, B.y, { steps: 6 });
	await page.mouse.click(B.x, B.y);
	await page.waitForTimeout(400);
	const measuring = await ruler();
	console.log("1 medindo com a régua       ", JSON.stringify(measuring));

	// troca para Selecionar (tecla V)
	await page.keyboard.press("v");
	await page.waitForTimeout(500);
	const after = await ruler();
	const chip = await page.getByText("Régua fixada").count();
	console.log("2 depois de apertar V       ", JSON.stringify(after), "selo:", chip);
	await page.screenshot({ path: "docs/previews/ruler-pin-1.png" });

	// arrasta o token ao longo do caminho medido, com a régua ainda no mapa
	const T = at(455, 455), D = at(455, 595);
	await page.mouse.move(T.x, T.y);
	await page.mouse.down();
	await page.mouse.move(T.x, (T.y + D.y) / 2, { steps: 5 });
	await page.mouse.move(D.x, D.y, { steps: 5 });
	await page.mouse.up();
	await page.waitForTimeout(900);
	const dragged = await ruler();
	console.log("3 depois de arrastar o token", JSON.stringify(dragged));

	// limpar pelo selo
	await page.getByRole("button", { name: "Limpar régua fixada" }).click();
	await page.waitForTimeout(300);
	const cleared = await ruler();
	console.log("4 depois de Limpar          ", JSON.stringify(cleared.m));

	// medir de novo substitui a anterior
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("ruler"));
	await page.mouse.click(A.x, A.y);
	await page.mouse.move(B.x, B.y, { steps: 4 });
	await page.mouse.click(B.x, B.y);
	await page.keyboard.press("v");
	await page.waitForTimeout(400);
	const first = await ruler();
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("ruler"));
	const C = at(455, 665), E = at(455, 315);
	await page.mouse.click(C.x, C.y);
	await page.mouse.move(E.x, E.y, { steps: 4 });
	await page.mouse.click(E.x, E.y);
	await page.waitForTimeout(300);
	const second = await ruler();
	console.log("5 medir de novo substitui    ", JSON.stringify([first.m?.waypoints, second.m?.waypoints]));
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();

	const problems = [];
	if (!measuring.m || measuring.m.waypoints.length < 2) problems.push("a régua não mediu (esperava 2 pontos)");
	if (!after.m) problems.push("ao trocar para Selecionar a régua SUMIU (devia ficar fixada)");
	else if (!after.m.pinned) problems.push("a régua ficou no mapa mas não fixada (continuaria esticando)");
	if (after.m && measuring.m && after.m.distance !== measuring.m.distance) problems.push(`a distância mudou ao trocar de ferramenta (${measuring.m.distance} → ${after.m.distance})`);
	if (chip < 1) problems.push("faltou o selo 'Régua fixada'");
	if (!(dragged.token.y > 500)) problems.push(`não deu para arrastar o token com a régua fixada (y=${dragged.token.y})`);
	if (!dragged.m || JSON.stringify(dragged.m.waypoints) !== JSON.stringify(after.m?.waypoints)) problems.push("a régua mudou ou sumiu ao arrastar o token");
	if (cleared.m !== null) problems.push("Limpar não apagou a régua");
	if (!first.m?.pinned) problems.push("a segunda medição não ficou fixada ao sair da régua");
	if (!(second.m && JSON.stringify(second.m.waypoints) !== JSON.stringify(first.m.waypoints))) problems.push("medir de novo não substituiu a régua anterior");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: a régua fica fixada ao trocar de ferramenta, dá para arrastar o token e limpar; medir de novo substitui");
}
main().catch((e) => { console.error(e); process.exit(1); });
