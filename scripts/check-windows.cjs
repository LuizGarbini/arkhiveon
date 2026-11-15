// Verificação das janelas, com o mouse de verdade:
//  - janela FECHADA bloqueia a visão (nada do outro lado é explorado);
//  - clicar de LONGE não abre; de PERTO abre, e aí o outro lado é visto;
//  - o JOGADOR não atravessa a janela, nem aberta (o token volta e aparece o aviso);
//  - o controle: a PORTA aberta ele atravessa;
//  - o MESTRE move o token para o outro lado da janela;
//  - o mestre desenha uma janela pelo painel (nasce fechada, gravada como window).
// Uso: pnpm check:windows   (sai com código 1 se alguma regra quebrar)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3123, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	const rpcs = [];
	const inserts = [];
	await context.route("**/rest/v1/**", (r) => {
		const req = r.request();
		const url = req.url();
		if (url.includes("/rpc/toggle_wall_door")) rpcs.push(JSON.parse(req.postData() || "{}"));
		if (url.includes("vtt_walls") && req.method() === "POST") inserts.push(JSON.parse(req.postData() || "[]"));
		return r.fulfill({ status: 200, contentType: "application/json", body: url.includes("/rpc/explore_scene_cells") ? "null" : url.includes("/rpc/toggle_wall_door") ? "true" : "[]" });
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3123/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const mk = (id, name, x, y, extra = {}) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 90, elevation: 0, conditions: [], auras: [], visionRange: 8, isLocked: false, isHidden: false, controlledBy: [], ...extra });
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
		// parede vertical em x=560: parede, JANELA (420..560), PORTA (560..700), parede
		st.setWalls([
			{ id: "w1", sceneId: "s1", x1: 560, y1: 210, x2: 560, y2: 420 },
			{ id: "win", sceneId: "s1", x1: 560, y1: 420, x2: 560, y2: 560, kind: "window", isOpen: false },
			{ id: "door", sceneId: "s1", x1: 560, y1: 560, x2: 560, y2: 700, kind: "door", isOpen: false },
			{ id: "w2", sceneId: "s1", x1: 560, y1: 700, x2: 560, y2: 840 },
		]);
	}, [mk("pc", "Dante", 490, 490, { characterId: "dante", controlledBy: ["preview-gm-user"] })]);
	await page.waitForTimeout(3000);

	const info = () => page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		const e = window.__explored_store__.getState();
		let beyond = 0;
		if (e.grid) for (let i = 0; i < e.grid.cols * e.grid.rows; i++) {
			if ((e.grid.bits[i >> 3] >> (i & 7)) & 1) { const cx = (i % e.grid.cols) * e.grid.cell + e.grid.cell / 2; const cy = Math.floor(i / e.grid.cols) * e.grid.cell + e.grid.cell / 2; if (cx > 600 && cy > 380 && cy < 600) beyond++; }
		}
		const w = s.walls.find((x) => x.id === "win");
		const d = s.walls.find((x) => x.id === "door");
		const pc = s.tokens.find((t) => t.id === "pc");
		return { winOpen: w?.isOpen === true, doorOpen: d?.isOpen === true, beyond, pcX: pc.x, pcY: pc.y };
	});
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const at = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	const drag = async (from, to) => {
		const a = at(from.x, from.y), b = at(to.x, to.y);
		await page.mouse.move(a.x, a.y);
		await page.mouse.down();
		await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
		await page.mouse.move(b.x, b.y, { steps: 5 });
		await page.mouse.up();
		await page.waitForTimeout(1500);
	};
	const winPt = at(560, 490), doorPt = at(560, 630);

	const closed = await info();
	console.log("1 janela fechada           ", JSON.stringify(closed));
	await page.screenshot({ path: "docs/previews/windows-final-1-closed.png" });

	// de longe: personagem a 245 px
	await page.evaluate(() => window.__vtt_store__.getState().updateToken("pc", { x: 315 }));
	await page.waitForTimeout(1500);
	await page.mouse.click(winPt.x, winPt.y);
	await page.waitForTimeout(1200);
	const far = await info();
	console.log("2 clique de longe          ", JSON.stringify(far));

	// perto: abre e o outro lado é visto
	await page.evaluate(() => window.__vtt_store__.getState().updateToken("pc", { x: 490 }));
	await page.waitForTimeout(1500);
	await page.mouse.click(winPt.x, winPt.y);
	await page.waitForTimeout(3500);
	const open = await info();
	console.log("3 aberta, de perto         ", JSON.stringify(open));
	await page.screenshot({ path: "docs/previews/windows-final-2-open.png" });

	// o jogador tenta passar pela janela ABERTA: não passa
	await drag({ x: 490, y: 490 }, { x: 700, y: 490 });
	const blocked = await info();
	const toast = await page.getByText("Movimento bloqueado").count();
	console.log("4 jogador arrasta pela janela", JSON.stringify(blocked), "aviso:", toast);

	// controle: a PORTA aberta ele atravessa
	await page.evaluate(() => window.__vtt_store__.getState().updateToken("pc", { x: 490, y: 630 }));
	await page.waitForTimeout(1500);
	await page.mouse.click(doorPt.x, doorPt.y);
	await page.waitForTimeout(2500);
	const doorOpen = await info();
	await drag({ x: 490, y: 630 }, { x: 700, y: 630 });
	const throughDoor = await info();
	console.log("5 controle: porta aberta   ", JSON.stringify({ aberta: doorOpen.doorOpen, x: throughDoor.pcX }));

	// o MESTRE move o token para o outro lado da janela
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.updateToken("pc", { x: 490, y: 490 });
		st.setIsGM(true);
		st.setActiveTool("select");
	});
	await page.waitForTimeout(1500);
	await drag({ x: 490, y: 490 }, { x: 700, y: 490 });
	const gmThrough = await info();
	console.log("6 mestre arrasta pela janela", JSON.stringify(gmThrough));
	await page.screenshot({ path: "docs/previews/windows-final-3-gm.png" });

	// o mestre desenha uma janela pelo painel da ferramenta Parede
	await page.evaluate(() => { const s = window.__vtt_store__.getState(); s.setActiveTool("wall"); });
	await page.waitForTimeout(800);
	await page.getByRole("button", { name: "Janela", exact: true }).click();
	const kind = await page.evaluate(() => window.__vtt_store__.getState().wallKind);
	const p1 = at(840, 210), p2 = at(840, 350);
	await page.mouse.click(p1.x, p1.y);
	await page.waitForTimeout(450);
	await page.mouse.click(p2.x, p2.y);
	await page.waitForTimeout(450);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(1200);
	const drawn = await page.evaluate(() => window.__vtt_store__.getState().walls.filter((w) => w.id !== "w1" && w.id !== "win" && w.id !== "door" && w.id !== "w2").map((w) => ({ kind: w.kind, isOpen: w.isOpen })));
	console.log("7 desenhada pelo painel     ", JSON.stringify({ kind, drawn, gravado: inserts.flat().map((r) => r.kind + ":" + r.is_open) }));
	console.log("RPCs:", JSON.stringify(rpcs));
	await browser.close();
	await server.close();

	const problems = [];
	if (closed.beyond !== 0) problems.push(`com a janela FECHADA o outro lado foi explorado (${closed.beyond})`);
	if (far.winOpen) problems.push("a janela abriu com o jogador LONGE dela");
	if (!open.winOpen) problems.push("a janela NÃO abriu com o jogador perto");
	if (open.beyond <= 0) problems.push("janela aberta, mas o outro lado não foi visto");
	if (blocked.pcX > 560) problems.push(`o JOGADOR atravessou a janela aberta (x=${blocked.pcX})`);
	if (toast < 1) problems.push("faltou o aviso 'Movimento bloqueado' quando o jogador tentou passar pela janela");
	if (!doorOpen.doorOpen) problems.push("a porta de controle não abriu");
	if (!(throughDoor.pcX > 600)) problems.push(`controle: o jogador deveria atravessar a PORTA aberta (x=${throughDoor.pcX})`);
	if (!(gmThrough.pcX > 600)) problems.push(`o MESTRE deveria mover o token para o outro lado da janela (x=${gmThrough.pcX})`);
	if (kind !== "window") problems.push(`o painel não escolheu Janela (wallKind=${kind})`);
	if (!(drawn.length === 1 && drawn[0].kind === "window" && drawn[0].isOpen === false)) problems.push(`desenho: esperava 1 janela fechada, veio ${JSON.stringify(drawn)}`);
	if (!inserts.flat().some((r) => r.kind === "window" && r.is_open === false)) problems.push("a janela desenhada não foi gravada como kind window");
	if (!rpcs.some((r) => r.p_wall_id === "win" && r.p_open === true)) problems.push(`o banco deveria receber a abertura da janela (veio ${JSON.stringify(rpcs)})`);
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: janela bloqueia a vista fechada, abre de perto e deixa ver; o jogador não passa; o mestre passa; a porta continua passando");
}
main().catch((e) => { console.error(e); process.exit(1); });
