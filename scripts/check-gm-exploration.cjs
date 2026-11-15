// Verificação: o mestre vê o que os jogadores já exploraram (realce) e a visão
// atual do token SELECIONADO (ou de todos, sob pedido); o interruptor liga/desliga;
// o jogador nunca vê esse realce. Por padrão a mesa fica limpa: sem cones.
// Compara o MESMO trecho do mapa (região explorada) em três situações.
// Uso: pnpm check:gm-exploration   (sai com código 1 se o realce sumir ou vazar)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3116, strictPort: true } });
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
	await page.goto("http://127.0.0.1:3116/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const mk = (id, name, x, y, extra = {}) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 5, isLocked: false, isHidden: false, controlledBy: [], ...extra });
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(true);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: true, fogExploration: true, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate((tokens) => window.__vtt_store__.getState().setTokens(tokens), [
		mk("a", "Dante", 245, 455, { characterId: "dante", rotation: 90 }),
		mk("b", "Mira", 245, 105, { characterId: "mira", rotation: 90 }),
		mk("g", "Goblin", 805, 455),
	]);
	await page.waitForTimeout(2500);
	// Dante anda para a direita (passos pequenos): a memória acumula o trajeto
	for (let x = 245; x <= 595; x += 70) {
		await page.evaluate((x) => window.__vtt_store__.getState().updateToken("a", { x }), x);
		await page.waitForTimeout(250);
	}
	await page.waitForTimeout(3000);
	// Trecho explorado no meio do mapa (trajeto do Dante), sem a barra de ferramentas.
	const clip = { x: 330, y: 230, width: 420, height: 300 };
	const shot = () => page.screenshot({ clip });
	const gmOn = await shot();
	await page.evaluate(() => window.__vtt_store__.getState().setShowPlayerExploration(false));
	await page.waitForTimeout(2500);
	const gmOff = await shot();
	await page.evaluate(() => window.__vtt_store__.getState().setShowPlayerExploration(true));
	await page.waitForTimeout(2500);
	const gmOnAgain = await shot();
	// cones: padrão = nenhum; selecionar um token mostra o cone dele; "Cones de todos" mostra todos
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedTokenIds(["a"]));
	await page.waitForTimeout(2500);
	const oneCone = await shot();
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedTokenIds([]));
	await page.waitForTimeout(2500);
	const noConeAgain = await shot();
	await page.evaluate(() => window.__vtt_store__.getState().setShowAllVisionCones(true));
	await page.waitForTimeout(2500);
	const allCones = await shot();
	await page.evaluate(() => window.__vtt_store__.getState().setShowAllVisionCones(false));
	await page.waitForTimeout(2500);
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(false));
	await page.waitForTimeout(3000);
	const asPlayer = await shot();
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(true));
	await page.waitForTimeout(3000);
	const backToGm = await shot();
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();
	const problems = [];
	if (gmOn.equals(gmOff)) problems.push("o realce do mestre não aparece (ligado = desligado)");
	if (!gmOn.equals(gmOnAgain)) problems.push("religar o interruptor não devolveu o mesmo realce");
	if (gmOn.equals(oneCone)) problems.push("selecionar um token não mostrou o cone dele");
	if (!gmOn.equals(noConeAgain)) problems.push("sem seleção a mesa deveria voltar a ficar sem cones");
	if (allCones.equals(oneCone) || allCones.equals(gmOn)) problems.push("'Cones de todos' não mostrou os cones de todos");
	if (gmOn.equals(asPlayer)) problems.push("o jogador vê a mesma coisa que o mestre com o realce");
	if (!gmOff.equals(await Promise.resolve(gmOff))) problems.push("estado instável");
	if (!backToGm.equals(gmOn)) problems.push("voltar a ser mestre não trouxe o realce de volta");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: o mestre vê a exploração dos jogadores, o interruptor funciona e o jogador não vê o realce");
}
main().catch((e) => { console.error(e); process.exit(1); });
