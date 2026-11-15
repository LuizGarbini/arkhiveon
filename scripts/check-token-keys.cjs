// Verificação das setas do teclado, com teclado de verdade:
//  - 1 token selecionado anda uma casa por seta e vira para onde andou;
//  - vários selecionados andam juntos, mantendo a formação;
//  - token travado ou que o jogador não controla fica parado;
//  - o jogador não atravessa janela nem parede (aviso, nada é gravado);
//  - o mestre atravessa;
//  - sem seleção, com outra ferramenta ou digitando num campo, a seta não move;
//  - segurar a seta repete, mas com limite (cada casa é gravada).
// Uso: pnpm check:token-keys   (sai com código 1 se alguma regra quebrar)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3125, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	let tokenWrites = 0;
	await context.route("**/rest/v1/**", (r) => {
		const req = r.request();
		if (req.url().includes("vtt_tokens") && req.method() !== "GET") tokenWrites++;
		return r.fulfill({ status: 200, contentType: "application/json", body: req.url().includes("/rpc/") ? "null" : "[]" });
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3125/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const mk = (id, name, x, y, extra = {}) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: ["preview-gm-user"], ...extra });
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: false, fogExploration: false, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate((tokens) => window.__vtt_store__.getState().setTokens(tokens), [
		mk("a", "Aria", 455, 455),
		mk("b", "Bruno", 455, 525),
		mk("c", "Cleo", 665, 455),
		mk("lock", "Trava", 665, 525, { isLocked: true }),
		mk("alheio", "Alheio", 805, 455, { controlledBy: [] }),
	]);
	await page.waitForTimeout(1500);
	const pos = () => page.evaluate(() => Object.fromEntries(window.__vtt_store__.getState().tokens.map((t) => [t.id, { x: t.x, y: t.y, r: t.rotation }])));
	const select = (ids) => page.evaluate((ids) => window.__vtt_store__.getState().setSelectedTokenIds(ids), ids);
	const press = async (key) => { await page.keyboard.press(key); await page.waitForTimeout(250); };
	// Espera as gravações pendentes do passo anterior terminarem: o reset mexe direto
	// na store (sem passar pelo contador de gravações) e uma gravação atrasada
	// reaplicaria o movimento antigo por cima dele.
	const reset = async () => {
		await page.waitForTimeout(900);
		await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.updateToken("a", { x: 455, y: 455, rotation: 0 }); st.updateToken("b", { x: 455, y: 525, rotation: 0 });
		st.updateToken("c", { x: 665, y: 455, rotation: 0 });
		st.setWalls([]); st.setIsGM(false); st.setActiveTool("select"); st.setSelectedTokenIds([]);
		});
	};

	// 1. um token, as quatro setas
	await select(["a"]);
	await press("ArrowRight"); const right = await pos();
	await press("ArrowDown"); const down = await pos();
	await press("ArrowLeft"); const left = await pos();
	await press("ArrowUp"); const up = await pos();
	console.log("1 direita/baixo/esq/cima    ", JSON.stringify([right.a, down.a, left.a, up.a]));
	const writesAfterOne = tokenWrites;

	// 2. vários andam juntos
	await reset(); await select(["a", "b", "c"]);
	await press("ArrowUp");
	const group = await pos();
	await press("ArrowRight");
	const group2 = await pos();
	console.log("2 grupo (cima, direita)     ", JSON.stringify([group.a, group.b, group.c, group2.a, group2.b, group2.c]));

	// 3. travado e alheio ficam parados, mesmo selecionados junto
	await reset(); await select(["a", "lock", "alheio"]);
	const before3 = await pos();
	await press("ArrowDown");
	const after3 = await pos();
	console.log("3 travado e alheio parados  ", JSON.stringify({ a: after3.a, lock: after3.lock, alheio: after3.alheio }));

	// 4. sem seleção / outra ferramenta / digitando: a seta não move
	await reset(); await select([]);
	await press("ArrowRight"); const none = await pos();
	await select(["a"]);
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("ruler"));
	await press("ArrowRight"); const ruler = await pos();
	await page.evaluate(() => { window.__vtt_store__.getState().setActiveTool("select"); const i = document.createElement("input"); i.id = "tmp-input"; i.type = "text"; document.body.appendChild(i); i.focus(); });
	await press("ArrowRight"); const typing = await pos();
	await page.evaluate(() => document.getElementById("tmp-input")?.remove());
	console.log("4 sem seleção/régua/digitando", JSON.stringify([none.a, ruler.a, typing.a]));

	// 5. jogador: janela aberta e parede barram; o mestre passa
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setWalls([{ id: "win", sceneId: "s1", x1: 490, y1: 300, x2: 490, y2: 600, kind: "window", isOpen: true }]));
	await select(["a"]);
	const writesBefore5 = tokenWrites;
	await press("ArrowRight"); const blocked = await pos();
	const blockedToast = await page.getByText("Movimento bloqueado").count();
	const writesAfterBlocked = tokenWrites;
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(true));
	await page.waitForTimeout(300);
	await press("ArrowRight"); const gm = await pos();
	console.log("5 jogador barrado / mestre   ", JSON.stringify({ jogador: blocked.a, aviso: blockedToast, gravouAoBarrar: writesAfterBlocked - writesBefore5, mestre: gm.a }));

	// 6. segurar a seta repete, com limite
	await reset(); await select(["a"]);
	const before6 = tokenWrites;
	for (let i = 0; i < 24; i++) { await page.keyboard.down("ArrowRight"); await page.waitForTimeout(30); }
	await page.keyboard.up("ArrowRight");
	await page.waitForTimeout(500);
	const held = await pos();
	const steps = Math.round((held.a.x - 455) / 70);
	console.log("6 segurando (~720 ms)        ", JSON.stringify({ casas: steps, gravacoes: tokenWrites - before6 }));
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();

	const problems = [];
	const eq = (p, x, y) => p.x === x && p.y === y;
	if (!eq(right.a, 525, 455) || right.a.r !== 90) problems.push(`direita: esperava (525,455) virado a 90°, veio ${JSON.stringify(right.a)}`);
	if (!eq(down.a, 525, 525) || down.a.r !== 180) problems.push(`baixo: esperava (525,525) a 180°, veio ${JSON.stringify(down.a)}`);
	if (!eq(left.a, 455, 525) || left.a.r !== 270) problems.push(`esquerda: esperava (455,525) a 270°, veio ${JSON.stringify(left.a)}`);
	if (!eq(up.a, 455, 455) || up.a.r !== 0) problems.push(`cima: esperava voltar a (455,455) a 0°, veio ${JSON.stringify(up.a)}`);
	if (writesAfterOne < 4) problems.push(`cada casa deveria ser gravada (gravações: ${writesAfterOne})`);
	if (!eq(group.a, 455, 385) || !eq(group.b, 455, 455) || !eq(group.c, 665, 385)) problems.push(`grupo para cima: ${JSON.stringify([group.a, group.b, group.c])}`);
	if (!eq(group2.a, 525, 385) || !eq(group2.b, 525, 455) || !eq(group2.c, 735, 385)) problems.push(`grupo para a direita: ${JSON.stringify([group2.a, group2.b, group2.c])}`);
	if (group2.c.x - group2.a.x !== 210 || group2.b.y - group2.a.y !== 70) problems.push("o grupo perdeu a formação");
	if (!eq(after3.a, 455, 525)) problems.push(`o token livre deveria andar mesmo com os outros parados: ${JSON.stringify(after3.a)}`);
	if (!eq(after3.lock, before3.lock.x, before3.lock.y)) problems.push("o token TRAVADO andou");
	if (!eq(after3.alheio, before3.alheio.x, before3.alheio.y)) problems.push("um token que o jogador NÃO controla andou");
	if (!eq(none.a, 455, 455)) problems.push("sem seleção a seta moveu um token");
	if (!eq(ruler.a, 455, 455)) problems.push("com a régua ativa a seta moveu o token");
	if (!eq(typing.a, 455, 455)) problems.push("digitando num campo a seta moveu o token");
	if (!eq(blocked.a, 455, 455)) problems.push(`o jogador atravessou a janela aberta com a seta: ${JSON.stringify(blocked.a)}`);
	if (blockedToast < 1) problems.push("faltou o aviso de movimento bloqueado");
	if (writesAfterBlocked !== writesBefore5) problems.push("a seta barrada gravou algo no banco");
	if (!eq(gm.a, 525, 455)) problems.push(`o mestre deveria atravessar a janela com a seta: ${JSON.stringify(gm.a)}`);
	if (steps < 3 || steps > 8) problems.push(`segurar a seta deveria andar de 3 a 8 casas em ~720 ms (andou ${steps})`);
	if (tokenWrites - before6 > 9) problems.push(`gravações demais ao segurar a seta (${tokenWrites - before6})`);
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: setas movem 1 ou vários tokens uma casa; travado/alheio ficam; janela barra o jogador; mestre passa; segurar repete com limite");
}
main().catch((e) => { console.error(e); process.exit(1); });
