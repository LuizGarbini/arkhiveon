// Verificação das portas e das paredes, com o mouse de verdade:
//  - porta FECHADA bloqueia a visão (nada do outro lado é explorado);
//  - clicar na porta de LONGE não abre; de PERTO abre, e aí o outro lado é visto;
//  - clicar de novo fecha;
//  - paredes só aparecem para o mestre na camada do mestre; escolher a ferramenta
//    Parede leva para essa camada; as portas aparecem para todos.
// Uso: pnpm check:doors   (sai com código 1 se alguma regra quebrar)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3117, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	const rpcs = [];
	await context.route("**/rest/v1/**", (r) => {
		const url = r.request().url();
		if (url.includes("/rpc/toggle_wall_door")) rpcs.push(JSON.parse(r.request().postData() || "{}"));
		return r.fulfill({ status: 200, contentType: "application/json", body: url.includes("/rpc/explore_scene_cells") ? "null" : url.includes("/rpc/toggle_wall_door") ? "true" : "[]" });
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3117/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const mk = (id, name, x, y, extra = {}) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 8, isLocked: false, isHidden: false, controlledBy: [], ...extra });
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: true, fogExploration: true, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate((tokens) => {
		const st = window.__vtt_store__.getState();
		st.setTokens(tokens);
		// parede vertical em x=560 com uma porta (fechada) no meio
		st.setWalls([
			{ id: "w1", sceneId: "s1", x1: 560, y1: 210, x2: 560, y2: 420 },
			{ id: "door", sceneId: "s1", x1: 560, y1: 420, x2: 560, y2: 560, kind: "door", isOpen: false },
			{ id: "w2", sceneId: "s1", x1: 560, y1: 560, x2: 560, y2: 770 },
		]);
	}, [
		mk("pc", "Dante", 315, 490, { characterId: "dante", controlledBy: ["preview-gm-user"], rotation: 90 }),
		mk("goblin", "Goblin atrás da porta", 735, 490),
	]);
	await page.waitForTimeout(3000);
	const info = () => page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		const e = window.__explored_store__.getState();
		// 'beyond' = células ATRÁS da parede/porta (a sombra), não o espaço aberto acima e abaixo das pontas.
		let beyond = 0, total = 0;
		if (e.grid) for (let i = 0; i < e.grid.cols * e.grid.rows; i++) {
			if ((e.grid.bits[i >> 3] >> (i & 7)) & 1) { total++; const cx = (i % e.grid.cols) * e.grid.cell + e.grid.cell / 2; const cy = Math.floor(i / e.grid.cols) * e.grid.cell + e.grid.cell / 2; if (cx > 600 && cy > 300 && cy < 700) beyond++; }
		}
		const d = s.walls.find((w) => w.id === "door");
		return { doorOpen: d.isOpen === true, beyond, total, layer: s.activeLayer, tool: s.activeTool };
	});
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const at = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	const doorPt = at(560, 490);

	const closed = await info();
	console.log("1 porta fechada      ", JSON.stringify(closed));
	await page.screenshot({ path: "docs/previews/doors-icon2-1-closed.png" });

	// de longe (Dante a 245 px da porta): não abre
	await page.mouse.click(doorPt.x, doorPt.y);
	await page.waitForTimeout(1200);
	const far = await info();
	console.log("2 clique de longe    ", JSON.stringify(far));

	// perto (70 px da porta): abre
	await page.evaluate(() => window.__vtt_store__.getState().updateToken("pc", { x: 490 }));
	await page.waitForTimeout(1500);
	await page.mouse.click(doorPt.x, doorPt.y);
	await page.waitForTimeout(3500);
	const open = await info();
	console.log("3 clique de perto    ", JSON.stringify(open));
	await page.screenshot({ path: "docs/previews/doors-icon2-2-open.png" });

	// de novo: fecha
	await page.mouse.click(doorPt.x, doorPt.y);
	await page.waitForTimeout(1500);
	const closedAgain = await info();
	console.log("4 clique de novo     ", JSON.stringify(closedAgain));

	// o ÍCONE é a única parte clicável: o vão da porta, longe do ícone, não abre
	// (a porta está fechada neste ponto; o personagem está a 70 px do vão)
	const spanPt = at(560, 440);
	await page.mouse.click(spanPt.x, spanPt.y);
	await page.waitForTimeout(1500);
	const spanClick = await info();
	console.log("4b clique no vão     ", JSON.stringify(spanClick));

	// mestre: paredes só na camada do mestre; ferramenta Parede leva para ela
	await page.evaluate(() => { const s = window.__vtt_store__.getState(); s.setIsGM(true); s.setActiveLayer("token"); s.setActiveTool("select"); });
	await page.waitForTimeout(2500);
	const clip = { x: 560, y: 150, width: 160, height: 420 };
	const gmTokenLayer = await page.screenshot({ clip });
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("wall"));
	await page.waitForTimeout(2500);
	const afterTool = await info();
	const gmWallLayer = await page.screenshot({ clip });
	await page.screenshot({ path: "docs/previews/doors-icon2-3-gm.png" });
	await page.evaluate(() => window.__vtt_store__.getState().setActiveLayer("token"));
	await page.waitForTimeout(1500);
	const backToToken = await info();

	console.log("5 ferramenta Parede  ", JSON.stringify(afterTool));
	console.log("6 voltou p/ camada   ", JSON.stringify(backToToken));
	console.log("RPCs:", JSON.stringify(rpcs));
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();

	const problems = [];
	if (closed.beyond !== 0) problems.push(`com a porta FECHADA o outro lado foi explorado (${closed.beyond} células)`);
	if (far.doorOpen) problems.push("a porta abriu com o jogador LONGE dela");
	if (rpcs.length > 2) problems.push("pedidos demais ao banco");
	if (!open.doorOpen) problems.push("a porta NÃO abriu com o jogador perto");
	if (open.beyond <= 0) problems.push("porta aberta, mas o outro lado não foi visto");
	if (closedAgain.doorOpen) problems.push("a porta não fechou no segundo clique");
	if (spanClick.doorOpen) problems.push("clicar no VÃO (longe do ícone) abriu a porta: só o ícone deve ser clicável");
	if (!rpcs.some((r) => r.p_open === true) || !rpcs.some((r) => r.p_open === false)) problems.push(`o banco deveria receber abrir e fechar (veio ${JSON.stringify(rpcs)})`);
	if (gmTokenLayer.equals(gmWallLayer)) problems.push("o mestre não vê as paredes ao ir para a camada do mestre");
	if (afterTool.layer !== "gm") problems.push(`escolher a ferramenta Parede não levou para a camada do mestre (camada: ${afterTool.layer})`);
	if (backToToken.tool !== "select") problems.push("sair da camada do mestre deveria voltar a ferramenta para Selecionar");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: porta fechada bloqueia, abre só de perto e libera a visão; paredes só na camada do mestre");
}
main().catch((e) => { console.error(e); process.exit(1); });
