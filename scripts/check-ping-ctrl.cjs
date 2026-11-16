// Verificação do gesto Ctrl + apertar + arrastar da roda de pings, igual no Windows e no Mac.
// O Luiz espera: segurar Ctrl, apertar o botão no mapa vazio e ARRASTAR abre a roda em volta do
// ponto apertado; mover até um tipo e soltar pinga o tipo; soltar no centro usa o tipo escolhido;
// Esc cancela. Ctrl+clique sem arrastar é o ping rápido; Ctrl+clique em TOKEN soma à seleção; a
// caixa de seleção aditiva é Shift+arrastar (Ctrl+arrastar virou a roda).
// Emula o Windows (botão 0 com Ctrl, sem contextmenu, com tremida do mouse e escala de tela de
// 125%/150%) e o Mac (o mesmo, mais o contextmenu do Ctrl+clique, que continua bloqueado).
// Uso: pnpm check:ping-ctrl   (sai com código 1 se algo falhar)
const { chromium } = require("playwright");

async function runSuite(browser, base, label, deviceScaleFactor) {
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	await context.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: r.request().url().includes("/rpc/") ? "null" : "[]" }));
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto(`${base}/campaigns/demo/vtt`, { waitUntil: "domcontentloaded", timeout: 90000 });
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
	// a: dentro de onde a caixa de seleção cairia; b: um token do lado, para o Ctrl+clique
	await page.evaluate((t) => window.__vtt_store__.getState().setTokens(t), [mk("a", "Aria", 420, 430), mk("b", "Bruno", 665, 455)]);
	await page.waitForTimeout(1200);
	// Sonda de tempo dentro da página: quando o aperto aconteceu e quando o mouse passou de 6 px.
	// Serve para o teste provar que a emulação do arrasto foi RÁPIDA (como no Windows), e não
	// lenta por causa da latência do Playwright.
	await page.evaluate(() => {
		window.__probe = { down: null, gap: null, wheelAt: null };
		window.addEventListener("pointerdown", (e) => { window.__probe = { down: { t: performance.now(), x: e.clientX, y: e.clientY }, gap: null, wheelAt: null }; }, true);
		// quando a roda aparece na tela (primeira vez depois do aperto)
		new MutationObserver(() => {
			const p = window.__probe;
			if (p.down && p.wheelAt === null && document.querySelector("[data-ping-wheel]")) p.wheelAt = performance.now() - p.down.t;
		}).observe(document.body, { childList: true, subtree: true });
		window.addEventListener("pointermove", (e) => {
			const p = window.__probe;
			if (p.down && p.gap === null && Math.hypot(e.clientX - p.down.x, e.clientY - p.down.y) > 6) p.gap = performance.now() - p.down.t;
		}, true);
	});
	const probeGap = () => page.evaluate(() => window.__probe.gap);
	const probeWheelAt = () => page.evaluate(() => window.__probe.wheelAt);
	// O arrasto "logo" tem de ser rápido de verdade (< 200 ms entre apertar e passar de 6 px, menos
	// que os 220 ms do timer antigo). Em máquina lenta tenta de novo, até 5 vezes.
	const fast = async (scenario) => {
		let out;
		for (let i = 0; i < 5; i++) {
			out = await scenario();
			if (out.gap !== null && out.gap < 200) return out;
		}
		return out;
	};
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const at = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	const worldOf = (p) => ({ x: (p.x - box.x - vp.x) / vp.scale, y: (p.y - box.y - vp.y) / vp.scale });
	const snap = () => page.evaluate(() => { const s = window.__vtt_store__.getState(); return { sel: s.selectedTokenIds, pings: s.activePings.map((p) => ({ kind: p.kind ?? null, x: Math.round(p.x), y: Math.round(p.y) })), wheel: s.pingWheel ? { hover: s.pingWheel.hover } : null, wheelDom: !!document.querySelector("[data-ping-wheel]") }; });
	const reset = async () => {
		await page.waitForTimeout(250);
		await page.evaluate((v) => { const s = window.__vtt_store__.getState(); s.activePings.forEach((p) => s.removePing(p.id)); s.setPingKind("attention"); s.setActiveTool("select"); s.setSelectedTokenIds([]); s.setViewport(v); s.closePingWheel(); }, vp);
	};
	const offset = (i, n, r = 84) => ({ x: Math.sin((i * 2 * Math.PI) / n) * r, y: -Math.cos((i * 2 * Math.PI) / n) * r });
	const P = at(400, 400); // o ponto apertado; o 'a' fica dentro da caixa que um arrasto para baixo/direita desenharia
	const seg = (i) => offset(i, 5); // 0 atenção, 1 perigo, 2 a caminho, 3 ajuda, 4 destacar
	const jitter = async () => { for (const [dx, dy] of [[2, 1], [-1, 3], [3, -2], [0, 2], [-2, -1]]) await page.mouse.move(P.x + dx, P.y + dy); };
	const macContextMenu = () => page.evaluate(([x, y]) => { const c = document.querySelector("canvas"); const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y, ctrlKey: true, button: 2 }); c.dispatchEvent(ev); return ev.defaultPrevented; }, [P.x, P.y]);
	const R = {}; // resultados por cenário

	// W1) estilo Windows: Ctrl, aperta e JÁ arrasta (com a tremida), sem esperar, sem contextmenu.
	// A tremida e o arrasto saem num estouro só de eventos, como a mão faz.
	const near = seg(2); // 'A caminho': para baixo e à direita, por cima do 'a'
	const w1 = await fast(async () => {
		await reset();
		await page.keyboard.down("Control");
		await page.mouse.move(P.x, P.y);
		await page.mouse.down();
		await Promise.all([
			...[[2, 1], [-1, 3], [3, -2], [0, 2], [-2, -1]].map(([dx, dy]) => page.mouse.move(P.x + dx, P.y + dy)),
			page.mouse.move(P.x + near.x, P.y + near.y),
		]);
		const gap = await probeGap();
		const during = await snap();
		await page.mouse.up();
		await page.keyboard.up("Control");
		await page.waitForTimeout(250);
		return { gap, during, after: await snap() };
	});
	R.w1Gap = w1.gap; R.w1During = w1.during; R.w1After = w1.after;

	// W2) estilo Mac: o mesmo, mais o contextmenu do Ctrl+clique (tem de continuar bloqueado).
	// O contextmenu vai no mesmo estouro de eventos, logo depois do aperto, como no Mac.
	const w2 = await fast(async () => {
		await reset();
		await page.keyboard.down("Control");
		await page.mouse.move(P.x, P.y);
		await page.mouse.down();
		const [prevented] = await Promise.all([macContextMenu(), page.mouse.move(P.x + 5, P.y + 4), page.mouse.move(P.x + near.x, P.y + near.y)]);
		const gap = await probeGap();
		const during = await snap();
		await page.mouse.up();
		await page.keyboard.up("Control");
		await page.waitForTimeout(250);
		return { gap, prevented, during, after: await snap() };
	});
	R.macPrevented = w2.prevented; R.w2Gap = w2.gap; R.w2During = w2.during; R.w2After = w2.after;

	// W3) o jeito de antes (Mac): aperta, segura um instante e só então arrasta: continua valendo
	await reset();
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.waitForTimeout(450);
	R.w3Wheel = await snap();
	const dng = seg(1);
	await page.mouse.move(P.x + dng.x, P.y + dng.y, { steps: 5 });
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(250);
	R.w3After = await snap();

	// W4) arrasto comprido e lento (mais de 200 px passando por tudo) e solta num tipo
	await reset();
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	for (let i = 1; i <= 12; i++) { await page.mouse.move(P.x + i * 15, P.y + i * 4); await page.waitForTimeout(25); }
	const far = await snap();
	const hlp = seg(3);
	await page.mouse.move(P.x + hlp.x, P.y + hlp.y, { steps: 6 });
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(250);
	R.w4Far = far;
	R.w4After = await snap();

	// C1) Ctrl+clique rápido, sem arrastar: ping do tipo escolhido, sem a roda aparecer
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setPingKind("help"));
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.mouse.up();
	R.quickWheelAt = await probeWheelAt();
	R.quickRightAfter = await snap();
	await page.keyboard.up("Control");
	await page.waitForTimeout(250);
	R.quickAfter = await snap();

	// C2) arrastou até um tipo e VOLTOU ao centro: solta usando o tipo escolhido
	await reset();
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	const out = seg(1);
	await page.mouse.move(P.x + out.x, P.y + out.y, { steps: 4 });
	await page.mouse.move(P.x + 4, P.y + 3, { steps: 4 });
	R.c2During = await snap();
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(250);
	R.c2After = await snap();

	// E) Esc cancela: nenhum ping, a roda fecha
	await reset();
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.mouse.move(P.x + dng.x, P.y + dng.y, { steps: 4 });
	await page.keyboard.press("Escape");
	R.escDuring = await snap();
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(250);
	R.escAfter = await snap();

	// T) Ctrl+clique em TOKEN continua somando à seleção (e não abre a roda nem pinga)
	await reset();
	const A = at(420, 430), B = at(665, 455);
	await page.mouse.click(A.x, A.y);
	await page.waitForTimeout(200);
	await page.keyboard.down("Control");
	await page.mouse.click(B.x, B.y);
	await page.keyboard.up("Control");
	await page.waitForTimeout(300);
	R.tokenCtrl = await snap();

	// S) Shift + arrastar continua sendo a caixa de seleção aditiva; arrastar sem tecla troca a seleção
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedTokenIds(["b"]));
	const m1 = at(360, 370), m2 = at(480, 490);
	await page.keyboard.down("Shift");
	await page.mouse.move(m1.x, m1.y);
	await page.mouse.down();
	await page.mouse.move(m2.x, m2.y, { steps: 6 });
	await page.mouse.up();
	await page.keyboard.up("Shift");
	await page.waitForTimeout(300);
	R.shiftBox = await snap();
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedTokenIds(["b"]));
	await page.mouse.move(m1.x, m1.y);
	await page.mouse.down();
	await page.mouse.move(m2.x, m2.y, { steps: 6 });
	await page.mouse.up();
	await page.waitForTimeout(300);
	R.plainBox = await snap();
	R.errors = errors;
	await context.close();

	// ---- confere ----
	const wp = worldOf(P);
	const at400 = (p) => Math.abs(p.x - wp.x) < 3 && Math.abs(p.y - wp.y) < 3;
	const problems = [];
	const bad = (msg) => problems.push(`[${label}] ${msg}`);
	const only = (s, kind) => s.pings.length === 1 && s.pings[0].kind === kind && at400(s.pings[0]);
	// a emulação do arrasto tem de ter sido rápida (menos de 200 ms entre apertar e passar de 6 px)
	if (!(R.w1Gap !== null && R.w1Gap < 200)) bad(`teste inválido: o arrasto emulado demorou ${R.w1Gap} ms (precisa ser < 200 ms, menos que os 220 ms do timer antigo, para valer como "arrastar logo")`);
	if (!(R.w2Gap !== null && R.w2Gap < 200)) bad(`teste inválido: o arrasto emulado do Mac demorou ${R.w2Gap} ms`);
	// Windows
	if (!R.w1During.wheel) bad("Ctrl + apertar + arrastar logo (estilo Windows, sem contextmenu, com tremida) NÃO abriu a roda");
	else if (R.w1During.wheel.hover !== "going") bad(`a roda abriu mas o tipo sob o mouse não é 'A caminho' (${R.w1During.wheel.hover})`);
	if (R.w1During.sel.length !== 0) bad(`Ctrl + arrastar virou caixa de seleção (selecionou ${JSON.stringify(R.w1During.sel)}); a caixa aditiva agora é só Shift`);
	if (!only(R.w1After, "going")) bad(`soltar sobre 'A caminho' deveria mandar esse ping no ponto apertado (${JSON.stringify(R.w1After.pings)})`);
	if (R.w1After.sel.length !== 0) bad(`o gesto da roda não pode mexer na seleção (${JSON.stringify(R.w1After.sel)})`);
	if (R.w1After.wheel !== null) bad("a roda não fechou ao soltar");
	// Mac
	if (R.macPrevented !== true) bad("o menu nativo (contextmenu do Ctrl+clique) não está bloqueado");
	if (!R.w2During.wheel || R.w2During.wheel.hover !== "going") bad(`estilo Mac (com contextmenu): a roda deveria abrir com 'A caminho' sob o mouse (${JSON.stringify(R.w2During.wheel)})`);
	if (!only(R.w2After, "going")) bad(`estilo Mac: soltar sobre 'A caminho' deveria pingar esse tipo (${JSON.stringify(R.w2After.pings)})`);
	// o jeito de antes continua valendo
	if (!R.w3Wheel.wheel || !R.w3Wheel.wheelDom) bad("apertar e segurar 450 ms deveria mostrar a roda");
	if (!only(R.w3After, "danger")) bad(`segurar e depois arrastar até Perigo deveria pingar perigo (${JSON.stringify(R.w3After.pings)})`);
	// arrasto comprido
	if (!R.w4Far.wheel) bad("arrasto lento e comprido: a roda deveria estar aberta");
	if (!only(R.w4After, "help")) bad(`arrasto comprido terminando em Ajuda deveria pingar ajuda (${JSON.stringify(R.w4After.pings)})`);
	// Ctrl+clique rápido
	if (R.quickRightAfter.wheelDom) bad("Ctrl+clique rápido não pode deixar a roda na tela");
	// a roda só pode ser desenhada ~120 ms depois do aperto (ou ao arrastar): num clique rápido
	// ela nunca aparece; se aparecer, tem de ser tarde, não no primeiro instante
	if (R.quickWheelAt !== null && R.quickWheelAt < 100) bad(`Ctrl+clique rápido piscou a roda na tela (apareceu ${Math.round(R.quickWheelAt)} ms depois do aperto; o certo é nunca ou só depois de ~120 ms)`);
	if (!only(R.quickAfter, "help")) bad(`Ctrl+clique rápido deveria pingar o tipo escolhido, 'ajuda' (${JSON.stringify(R.quickAfter.pings)})`);
	// voltou ao centro
	if (!R.c2During.wheel || R.c2During.wheel.hover !== null) bad(`de volta ao centro nenhuma opção deveria estar sob o mouse (${JSON.stringify(R.c2During.wheel)})`);
	if (!only(R.c2After, "attention")) bad(`soltar no centro deveria usar o tipo escolhido, atenção (${JSON.stringify(R.c2After.pings)})`);
	// Esc
	if (R.escDuring.wheel !== null) bad("Esc deveria fechar a roda");
	if (R.escAfter.pings.length !== 0) bad(`Esc deveria cancelar: nenhum ping (${JSON.stringify(R.escAfter.pings)})`);
	// token e Shift
	if (JSON.stringify([...R.tokenCtrl.sel].sort()) !== JSON.stringify(["a", "b"])) bad(`Ctrl+clique em token deveria somar à seleção (a, b), ficou ${JSON.stringify(R.tokenCtrl.sel)}`);
	if (R.tokenCtrl.pings.length !== 0 || R.tokenCtrl.wheel) bad("Ctrl+clique em token não pode pingar nem abrir a roda");
	if (JSON.stringify([...R.shiftBox.sel].sort()) !== JSON.stringify(["a", "b"])) bad(`Shift + arrastar deveria fazer caixa aditiva (a + b), ficou ${JSON.stringify(R.shiftBox.sel)}`);
	if (R.shiftBox.wheel || R.shiftBox.pings.length) bad("Shift + arrastar não pode abrir a roda nem pingar");
	if (JSON.stringify(R.plainBox.sel) !== JSON.stringify(["a"])) bad(`arrastar sem tecla deveria trocar a seleção para só 'a', ficou ${JSON.stringify(R.plainBox.sel)}`);
	if (R.errors.length) bad(`erros de página: ${R.errors[0]}`);
	return { R, problems };
}

async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3201, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const base = "http://127.0.0.1:3201";
	const all = [];
	for (const [label, dsf] of [["escala 100%", 1], ["escala 150%", 1.5]]) {
		const { R, problems } = await runSuite(browser, base, label, dsf);
		console.log(`--- ${label}`);
		console.log("W1 Windows (arrasta logo, tremida)", JSON.stringify({ msAteMexer: Math.round(R.w1Gap), durante: { roda: R.w1During.wheel, selecao: R.w1During.sel }, depois: { pings: R.w1After.pings, selecao: R.w1After.sel } }));
		console.log("W2 Mac (com contextmenu)          ", JSON.stringify({ menuBloqueado: R.macPrevented, roda: R.w2During.wheel, pings: R.w2After.pings }));
		console.log("W3 segurar e depois arrastar      ", JSON.stringify({ roda: !!R.w3Wheel.wheelDom, pings: R.w3After.pings.map((p) => p.kind) }));
		console.log("W4 arrasto comprido e lento       ", JSON.stringify({ roda: !!R.w4Far.wheel, pings: R.w4After.pings.map((p) => p.kind) }));
		console.log("C1 Ctrl+clique rápido             ", JSON.stringify({ rodaVisivel: R.quickRightAfter.wheelDom, pings: R.quickAfter.pings.map((p) => p.kind) }));
		console.log("C2 volta ao centro                ", JSON.stringify({ hover: R.c2During.wheel?.hover, pings: R.c2After.pings.map((p) => p.kind) }));
		console.log("E  Esc cancela                    ", JSON.stringify({ rodaAberta: R.escDuring.wheel !== null, pings: R.escAfter.pings.length }));
		console.log("T  Ctrl+clique em token           ", JSON.stringify(R.tokenCtrl.sel));
		console.log("S  Shift+arrastar / arrastar      ", JSON.stringify([R.shiftBox.sel, R.plainBox.sel]));
		all.push(...problems);
	}
	await browser.close();
	await server.close();
	if (all.length) {
		console.error("FALHOU:\n - " + all.join("\n - "));
		process.exit(1);
	}
	console.log("OK: Ctrl + apertar + arrastar abre a roda igual no Windows e no Mac (com tremida e em tela com escala); Esc cancela; Ctrl+clique rápido pinga; Ctrl+clique em token soma; Shift+arrastar faz caixa aditiva");
}
main().catch((e) => { console.error(e); process.exit(1); });
