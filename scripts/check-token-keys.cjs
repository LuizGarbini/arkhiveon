// Verificação das setas do teclado, com teclado de verdade:
//  - 1 token selecionado anda uma casa por seta e vira para onde andou;
//  - vários selecionados andam juntos, mantendo a formação;
//  - token travado ou que o jogador não controla fica parado;
//  - o jogador não atravessa janela nem parede (aviso, nada é gravado);
//  - o mestre atravessa;
//  - sem seleção, com outra ferramenta ou digitando num campo, a seta não move;
//  - segurar a seta repete, mas com limite (a última casa sempre é gravada; passos
//    muito rápidos são fundidos numa gravação só, veja check:setas-perf);
//  - Q/E giram os selecionados no mesmo lugar (45°; Shift 15°), com as mesmas regras.
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
	let lastBodyOfA = null;
	await context.route("**/rest/v1/**", (r) => {
		const req = r.request();
		if (req.url().includes("vtt_tokens") && req.method() !== "GET") {
			tokenWrites++;
			if (req.url().includes("eq.a")) lastBodyOfA = JSON.parse(req.postData() || "{}");
		}
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
	// As gravações do servidor falso chegam com atraso sob carga: espera o contador
	// alcançar o mínimo esperado (até 3 s) antes de conferir.
	// As gravações saem em fila (uma em voo por token, passos rápidos fundidos): espera o
	// contador do servidor falso ficar parado por 600 ms (até 8 s).
	const settleWrites = async () => {
		let last = -1;
		let stableSince = Date.now();
		for (let i = 0; i < 80; i++) {
			if (tokenWrites !== last) { last = tokenWrites; stableSince = Date.now(); }
			else if (Date.now() - stableSince >= 600) break;
			await page.waitForTimeout(100);
		}
	};
	const pos = () => page.evaluate(() => Object.fromEntries(window.__vtt_store__.getState().tokens.map((t) => [t.id, { x: t.x, y: t.y, r: t.rotation }])));
	const select = (ids) => page.evaluate((ids) => window.__vtt_store__.getState().setSelectedTokenIds(ids), ids);
	const press = async (key) => { await page.keyboard.press(key); await page.waitForTimeout(250); };
	// Espera as gravações pendentes do passo anterior terminarem: o reset mexe direto
	// na store (sem passar pelo contador de gravações) e uma gravação atrasada
	// reaplicaria o movimento antigo por cima dele.
	const reset = async () => {
		// Espera as gravações pendentes acabarem de verdade: o contador do servidor
		// falso fica parado por 600 ms (até 8 s). Um tempo fixo falha sob carga.
		let last = -1;
		let stableSince = Date.now();
		for (let i = 0; i < 80; i++) {
			if (tokenWrites !== last) { last = tokenWrites; stableSince = Date.now(); }
			else if (Date.now() - stableSince >= 600) break;
			await page.waitForTimeout(100);
		}
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
	await settleWrites();
	const writesAfterOne = tokenWrites;
	const lastWriteAfterOne = lastBodyOfA;

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
	const t0 = Date.now();
	for (let i = 0; i < 24; i++) { await page.keyboard.down("ArrowRight"); await page.waitForTimeout(30); }
	const heldMs = Date.now() - t0;
	await page.keyboard.up("ArrowRight");
	await page.waitForTimeout(500);
	const held = await pos();
	const steps = Math.round((held.a.x - 455) / 70);
	const writes6 = tokenWrites - before6;
	console.log("6 segurando (~720 ms)        ", JSON.stringify({ casas: steps, gravacoes: writes6, segurouMs: heldMs }));

	// 7. girar no mesmo lugar: E (direita), Q (esquerda), Shift (15°), grupo, travado/alheio, digitando
	await reset(); await select(["a", "b"]);
	const w7 = tokenWrites;
	await press("e"); const turnE = await pos();
	await press("e"); const turnE2 = await pos();
	await press("q"); await press("q"); await press("q"); const turnQ = await pos();
	await press("Shift+E"); const turnFine = await pos();
	await reset(); await select(["a", "lock", "alheio"]);
	await press("e"); const turnLocked = await pos();
	await reset(); await select(["a"]);
	await page.evaluate(() => { const i = document.createElement("input"); i.id = "tmp-input2"; i.type = "text"; document.body.appendChild(i); i.focus(); });
	await press("e"); const turnTyping = await pos();
	await page.evaluate(() => document.getElementById("tmp-input2")?.remove());
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("ruler"));
	await press("e"); const turnRuler = await pos();
	await settleWrites();
	console.log("7 girar E, EE, QQQ, Shift+E  ", JSON.stringify([turnE.a.r, turnE2.a.r, turnQ.a.r, turnFine.a.r]), "posição:", JSON.stringify([turnE.a.x, turnE.a.y]), "grupo b:", JSON.stringify(turnE.b.r), "gravações:", tokenWrites - w7);
	console.log("   travado/alheio/digitando/régua", JSON.stringify([turnLocked.a.r, turnLocked.lock.r, turnLocked.alheio.r, turnTyping.a.r, turnRuler.a.r]));
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();

	const problems = [];
	const eq = (p, x, y) => p.x === x && p.y === y;
	if (!eq(right.a, 525, 455) || right.a.r !== 90) problems.push(`direita: esperava (525,455) virado a 90°, veio ${JSON.stringify(right.a)}`);
	if (!eq(down.a, 525, 525) || down.a.r !== 180) problems.push(`baixo: esperava (525,525) a 180°, veio ${JSON.stringify(down.a)}`);
	if (!eq(left.a, 455, 525) || left.a.r !== 270) problems.push(`esquerda: esperava (455,525) a 270°, veio ${JSON.stringify(left.a)}`);
	if (!eq(up.a, 455, 455) || up.a.r !== 0) problems.push(`cima: esperava voltar a (455,455) a 0°, veio ${JSON.stringify(up.a)}`);
	if (writesAfterOne < 2) problems.push(`as casas deveriam ser gravadas (gravações: ${writesAfterOne})`);
	if (!lastWriteAfterOne || lastWriteAfterOne.x !== 455 || lastWriteAfterOne.y !== 455 || lastWriteAfterOne.rotation !== 0) problems.push(`a ÚLTIMA casa (cima, de volta a 455,455) deveria ser a última gravação: ${JSON.stringify(lastWriteAfterOne)}`);
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
	// O limite é de uma casa a cada 140 ms de RELÓGIO: compara com o tempo que a tecla
	// ficou mesmo apertada (a máquina pode estar lenta), não com um número fixo.
	const maxSteps = Math.floor(heldMs / 140) + 2;
	if (steps > maxSteps) problems.push(`segurar a seta andou ${steps} casas em ${heldMs} ms (o limite permite no máximo ${maxSteps})`);
	if (steps < 2) problems.push(`segurar a seta deveria repetir (andou ${steps} casa)`);
	if (steps >= 24) problems.push("segurar a seta andou uma casa por repetição: o limite não funcionou");
	if (writes6 > maxSteps + 1) problems.push(`gravações demais ao segurar a seta (${writes6}; limite ${maxSteps + 1})`);
	if (turnE.a.r !== 45 || turnE.b.r !== 45) problems.push(`E deveria girar a e b para 45° (a=${turnE.a.r}, b=${turnE.b.r})`);
	if (turnE.a.x !== 455 || turnE.a.y !== 455 || turnE.b.x !== 455 || turnE.b.y !== 525) problems.push("girar mexeu na posição do token");
	if (turnE2.a.r !== 90) problems.push(`E de novo deveria dar 90° (veio ${turnE2.a.r})`);
	if (turnQ.a.r !== 315) problems.push(`QQQ a partir de 90° deveria dar 315° (veio ${turnQ.a.r})`);
	if (turnFine.a.r !== 330) problems.push(`Shift+E deveria girar só 15° (315 → 330, veio ${turnFine.a.r})`);
	if (tokenWrites - w7 < 3) problems.push(`os giros deveriam ser gravados (gravações: ${tokenWrites - w7})`);
	if (turnLocked.a.r !== 45) problems.push("o token livre deveria girar mesmo com travado e alheio selecionados");
	if (turnLocked.lock.r !== 0) problems.push("o token TRAVADO girou");
	if (turnLocked.alheio.r !== 0) problems.push("um token que o jogador NÃO controla girou");
	if (turnTyping.a.r !== 0) problems.push("digitando num campo a tecla E girou o token");
	if (turnRuler.a.r !== 0) problems.push("com a régua ativa a tecla E girou o token");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: setas movem 1 ou vários tokens uma casa; Q/E giram no lugar; travado/alheio ficam; janela barra o jogador; mestre passa; segurar repete com limite");
}
main().catch((e) => { console.error(e); process.exit(1); });
