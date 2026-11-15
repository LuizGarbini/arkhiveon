// Verificação do bug "o ping fica preso": o app guardava 'Alt apertado' e
// 'Espaço apertado' em variáveis ligadas pelo keydown e desligadas pelo keyup.
// Se o keyup se perde (Alt+Tab, Cmd+Tab, menu do navegador), a variável fica
// ligada e TODO clique vira ping (ou arrasto de câmera), sem dar para selecionar
// token, até o F5. Aqui o keyup nunca chega e o clique tem de continuar normal.
// Uso: pnpm check:stuck-keys   (sai com código 1 se algo ficar preso)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3127, strictPort: true } });
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
	await page.goto("http://127.0.0.1:3127/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const mk = (id, name, x, y) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: ["preview-gm-user"] });
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: false, fogExploration: false, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate((t) => window.__vtt_store__.getState().setTokens(t), [mk("a", "Aria", 455, 455), mk("b", "Bruno", 665, 455)]);
	await page.waitForTimeout(1500);
	const box = await page.locator("canvas").first().boundingBox();
	const vp0 = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	console.log("   câmera inicial:", JSON.stringify(vp0));
	const at = (x, y) => ({ x: box.x + vp0.x + x * vp0.scale, y: box.y + vp0.y + y * vp0.scale });
	const state = () => page.evaluate((vp0) => { const s = window.__vtt_store__.getState(); return { sel: s.selectedTokenIds, pings: s.activePings.length, vp: { x: s.viewport.x - vp0.x, y: s.viewport.y - vp0.y } }; }, vp0);
	const clean = () => page.evaluate((vp) => { const s = window.__vtt_store__.getState(); s.setSelectedTokenIds([]); s.setViewport(vp); }, vp0);
	const fireKey = (type, code, key, extra = {}) => page.evaluate(([type, code, key, extra]) => window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, ...extra })), [type, code, key, extra]);

	// A) o keyup do Alt se perde: o clique no token tem de selecionar, não pingar
	await clean();
	await fireKey("keydown", "AltLeft", "Alt", { altKey: true });
	const pa = at(455, 455);
	await page.mouse.click(pa.x, pa.y);
	await page.waitForTimeout(700);
	const altStuck = await state();
	console.log("A Alt preso + clique no token     ", JSON.stringify(altStuck));
	await fireKey("keyup", "AltLeft", "Alt");

	// B) o keyup do Espaço se perde e a janela perde o foco: o clique não pode arrastar a câmera
	await clean();
	await fireKey("keydown", "Space", " ");
	await page.evaluate(() => window.dispatchEvent(new Event("blur")));
	await page.waitForTimeout(200);
	const pb = at(665, 455);
	await page.mouse.move(pb.x, pb.y);
	await page.mouse.down();
	await page.mouse.move(pb.x + 120, pb.y + 60, { steps: 5 });
	await page.mouse.up();
	await page.waitForTimeout(600);
	const spaceStuck = await state();
	console.log("B Espaço preso + perdeu o foco    ", JSON.stringify(spaceStuck));
	await fireKey("keyup", "Space", " ");

	// C) Alt de verdade apertado continua pingando (o comportamento certo)
	await clean();
	const before = (await state()).pings;
	await page.keyboard.down("Alt");
	const pc = at(900, 600);
	await page.mouse.click(pc.x, pc.y);
	await page.keyboard.up("Alt");
	await page.waitForTimeout(500);
	const realAlt = await state();
	console.log("C Alt de verdade + clique (ping)  ", JSON.stringify(realAlt), "antes:", before);

	// D) depois de tudo, um clique normal seleciona o token
	await clean();
	await page.mouse.click(pa.x, pa.y);
	await page.waitForTimeout(600);
	const normal = await state();
	console.log("D clique normal no token          ", JSON.stringify(normal));
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();

	const problems = [];
	if (!altStuck.sel.includes("a")) problems.push("com o keyup do Alt perdido, o clique no token NÃO o selecionou");
	if (altStuck.pings > 0) problems.push(`com o keyup do Alt perdido, o clique virou ping (${altStuck.pings})`);
	if (Math.abs(spaceStuck.vp.x) > 1 || Math.abs(spaceStuck.vp.y) > 1) problems.push(`com o keyup do Espaço perdido e a janela sem foco, o arrasto moveu a câmera (${JSON.stringify(spaceStuck.vp)})`);
	if (!(realAlt.pings > before)) problems.push("Alt de verdade + clique deveria continuar criando um ping");
	if (!normal.sel.includes("a")) problems.push("um clique normal no token não o selecionou");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: nada fica preso: Alt/Espaço perdidos não viram ping nem arrasto de câmera, e o Alt de verdade continua pingando");
}
main().catch((e) => { console.error(e); process.exit(1); });
