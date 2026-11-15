// Verificação dos pings, com mouse e teclado de verdade:
//  - Ctrl + segurar no mapa abre a roda (5 tipos; 6 para o mestre); escolher e soltar manda o ping do tipo;
//  - soltar no miolo manda o tipo escolhido; Ctrl+clique rápido manda o ping do tipo escolhido;
//  - Ctrl + arrastar rápido continua sendo a caixa de seleção (não abre a roda);
//  - Destacar põe setas no personagem selecionado ou apontado; sem personagem avisa;
//  - "Todos aqui" é só do mestre (jogador que tenta vira ping comum) e não mexe na câmera de quem manda;
//  - o painel da ferramenta Ping escolhe o tipo; segurar o botão de Ping abre a lista e arrastar escolhe.
// Uso: pnpm check:pings   (sai com código 1 se alguma regra quebrar)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3131, strictPort: true } });
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
	await page.goto("http://127.0.0.1:3131/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
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
	await page.evaluate((t) => window.__vtt_store__.getState().setTokens(t), [mk("a", "Aria", 455, 455), mk("b", "Bruno", 665, 455)]);
	await page.waitForTimeout(1200);
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const at = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	const worldOf = (p) => ({ x: (p.x - box.x - vp.x) / vp.scale, y: (p.y - box.y - vp.y) / vp.scale });
	const pings = () => page.evaluate(() => window.__vtt_store__.getState().activePings.map((p) => ({ kind: p.kind ?? null, x: Math.round(p.x), y: Math.round(p.y), tokenId: p.tokenId ?? null })));
	const reset = async () => {
		await page.waitForTimeout(250); // fora do limite de 1 ping por 150 ms
		await page.evaluate((v) => { const s = window.__vtt_store__.getState(); s.removePing && s.activePings.forEach((p) => s.removePing(p.id)); s.setPingKind("attention"); s.setActiveTool("select"); s.setSelectedTokenIds([]); s.setViewport(v); s.closePingWheel(); s.closePingPicker(); }, vp);
	};
	const wheel = () => page.evaluate(() => { const el = document.querySelector("[data-ping-wheel]"); if (!el) return null; return { chips: [...el.querySelectorAll("[data-ping-kind]")].map((c) => c.getAttribute("data-ping-kind")), active: [...el.querySelectorAll('[data-ping-kind][data-active="true"]')].map((c) => c.getAttribute("data-ping-kind")) }; });
	const offset = (i, n, r = 84) => ({ x: Math.sin((i * 2 * Math.PI) / n) * r, y: -Math.cos((i * 2 * Math.PI) / n) * r });

	// 1) jogador: Ctrl segurado abre a roda com 5 tipos; escolher Perigo e soltar
	const P = at(900, 600);
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.waitForTimeout(450);
	const w1 = await wheel();
	const dangerOff = offset(1, 5);
	await page.mouse.move(P.x + dangerOff.x, P.y + dangerOff.y, { steps: 5 });
	await page.waitForTimeout(150);
	const w1hover = await wheel();
	await page.screenshot({ path: "docs/previews/pings-wheel-player.png" });
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(300);
	const afterDanger = await pings();
	const wheelClosed = await wheel();
	console.log("1 roda do jogador            ", JSON.stringify({ chips: w1?.chips, hover: w1hover?.active }), "ping:", JSON.stringify(afterDanger), "fechou:", wheelClosed === null);

	// 2) soltar no miolo: o tipo escolhido (atenção); depois com 'ajuda' escolhida
	await reset();
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.waitForTimeout(450);
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(300);
	const center1 = await pings();
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setPingKind("help"));
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.waitForTimeout(450);
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(300);
	const center2 = await pings();
	console.log("2 soltar no miolo            ", JSON.stringify([center1.map((p) => p.kind), center2.map((p) => p.kind)]));

	// 3) Ctrl+clique rápido manda o ping do tipo escolhido, sem abrir a roda
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setPingKind("going"));
	await page.keyboard.down("Control");
	await page.mouse.click(P.x, P.y);
	await page.keyboard.up("Control");
	await page.waitForTimeout(300);
	const quick = await pings();
	const quickWheel = await wheel();
	console.log("3 Ctrl+clique rápido         ", JSON.stringify(quick.map((p) => p.kind)), "roda aberta:", quickWheel !== null);

	// 4) Ctrl + arrastar rápido continua sendo a caixa de seleção (não abre a roda, não pinga)
	await reset();
	const m1 = at(405, 405), m2 = at(505, 505);
	await page.keyboard.down("Control");
	await page.mouse.move(m1.x, m1.y);
	await page.mouse.down();
	await page.mouse.move(m2.x, m2.y, { steps: 6 });
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(500);
	const marquee = await page.evaluate(() => ({ sel: window.__vtt_store__.getState().selectedTokenIds, pings: window.__vtt_store__.getState().activePings.length }));
	console.log("4 Ctrl + arrastar            ", JSON.stringify(marquee), "roda:", (await wheel()) !== null);

	// 5) destacar o personagem selecionado pela roda; sem personagem, avisa
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedTokenIds(["a"]));
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.waitForTimeout(450);
	const hiOff = offset(4, 5);
	await page.mouse.move(P.x + hiOff.x, P.y + hiOff.y, { steps: 5 });
	await page.waitForTimeout(150);
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(400);
	const highlighted = await pings();
	await page.screenshot({ path: "docs/previews/pings-highlight.png" });
	await reset();
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.waitForTimeout(450);
	await page.mouse.move(P.x + hiOff.x, P.y + hiOff.y, { steps: 5 });
	await page.waitForTimeout(150);
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(400);
	const noTarget = await pings();
	const warned = await page.getByText("Escolha um personagem").count();
	console.log("5 destacar (selecionado)     ", JSON.stringify(highlighted), "| sem alvo:", JSON.stringify(noTarget), "aviso:", warned);

	// 5b) ferramenta Ping + tipo Destacar: clicar no token b destaca o b
	await reset();
	await page.evaluate(() => { const s = window.__vtt_store__.getState(); s.setPingKind("highlight"); s.setActiveTool("ping"); });
	await page.waitForTimeout(400);
	const B = at(665, 455);
	await page.mouse.click(B.x, B.y);
	await page.waitForTimeout(300);
	const clickedHighlight = await pings();
	console.log("5b ferramenta Ping em b      ", JSON.stringify(clickedHighlight));

	// 6) o painel da ferramenta Ping: escolhe o tipo; o jogador não vê 'Todos aqui'
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("ping"));
	await page.waitForTimeout(400);
	const group = page.getByRole("group", { name: "Tipo do ping" });
	const playerButtons = await group.getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
	await group.getByRole("button", { name: "Perigo" }).click();
	const chosen = await page.evaluate(() => window.__vtt_store__.getState().pingKind);
	const Q = at(1000, 300);
	await page.mouse.click(Q.x, Q.y);
	await page.waitForTimeout(300);
	const toolPing = await pings();
	console.log("6 painel (jogador)           ", JSON.stringify({ botoes: playerButtons, escolhido: chosen, ping: toolPing.map((p) => p.kind) }));

	// 7) jogador que força 'Todos aqui' manda ping comum
	await reset();
	await page.evaluate(() => { const s = window.__vtt_store__.getState(); s.setPingKind("focus"); s.setActiveTool("ping"); });
	await page.waitForTimeout(300);
	await page.mouse.click(Q.x, Q.y);
	await page.waitForTimeout(300);
	const forged = await pings();
	console.log("7 jogador força 'Todos aqui'  ", JSON.stringify(forged.map((p) => p.kind)));

	// 8) mestre: 6 tipos na roda, 'Todos aqui' no painel, e a câmera de quem manda não se mexe
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(true));
	await page.waitForTimeout(500);
	const vpBefore = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	await page.keyboard.down("Control");
	await page.mouse.move(P.x, P.y);
	await page.mouse.down();
	await page.waitForTimeout(450);
	const gmWheel = await wheel();
	const focusOff = offset(5, 6);
	await page.mouse.move(P.x + focusOff.x, P.y + focusOff.y, { steps: 5 });
	await page.waitForTimeout(150);
	await page.screenshot({ path: "docs/previews/pings-wheel-gm.png" });
	await page.mouse.up();
	await page.keyboard.up("Control");
	await page.waitForTimeout(400);
	const gmPing = await pings();
	const vpAfter = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("ping"));
	await page.waitForTimeout(400);
	const gmButtons = await page.getByRole("group", { name: "Tipo do ping" }).getByRole("button").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
	console.log("8 mestre                     ", JSON.stringify({ roda: gmWheel?.chips, ping: gmPing.map((p) => p.kind), cameraMexeu: JSON.stringify(vpBefore) !== JSON.stringify(vpAfter), botoes: gmButtons }));

	// 9) segurar o botão de Ping abre a lista; arrastar até 'A caminho' e soltar escolhe o tipo
	await reset();
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(false));
	await page.waitForTimeout(500);
	const pingBtn = page.getByRole("button", { name: "Ponteiro Laser (Ping)" });
	const bb = await pingBtn.boundingBox();
	const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
	await page.mouse.move(cx, cy);
	await page.mouse.down();
	await page.waitForTimeout(500);
	const pickerRows = await page.evaluate(() => [...document.querySelectorAll("[data-ping-picker] [data-ping-kind]")].map((c) => c.getAttribute("data-ping-kind")));
	const row = await page.locator('[data-ping-picker] [data-ping-kind="going"]').boundingBox();
	await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2, { steps: 6 });
	await page.waitForTimeout(150);
	const hoverRow = await page.evaluate(() => [...document.querySelectorAll('[data-ping-picker] [data-active="true"]')].map((c) => c.getAttribute("data-ping-kind")));
	await page.screenshot({ path: "docs/previews/pings-picker.png" });
	await page.mouse.up();
	await page.waitForTimeout(300);
	const afterPick = await page.evaluate(() => ({ kind: window.__vtt_store__.getState().pingKind, tool: window.__vtt_store__.getState().activeTool, picker: !!document.querySelector("[data-ping-picker]") }));
	console.log("9 segurar o botão de Ping     ", JSON.stringify({ linhas: pickerRows, sobDedo: hoverRow, depois: afterPick }));

	// 9b) toque rápido no botão segue só ligando a ferramenta (e logo depois do picker o clique não é engolido)
	await reset();
	await page.waitForTimeout(300);
	await pingBtn.click();
	await page.waitForTimeout(300);
	const quickTool = await page.evaluate(() => window.__vtt_store__.getState().activeTool);
	console.log("9b toque rápido no botão      ", quickTool);

	// 10) foto de todos os tipos juntos
	await reset();
	await page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		const now = Date.now();
		const kinds = [["attention", 300, 700], ["danger", 450, 700], ["going", 600, 700], ["help", 750, 700], ["focus", 950, 700]];
		kinds.forEach(([kind, x, y], i) => s.addPing({ x, y, userId: `u${i}`, userName: `U${i}`, color: "#38bdf8", timestamp: now, kind }));
		s.addPing({ x: 455, y: 455, userId: "u9", userName: "U9", color: "#a855f7", timestamp: now, kind: "highlight", tokenId: "a" });
	});
	await page.waitForTimeout(500);
	await page.screenshot({ path: "docs/previews/pings-all-kinds.png" });
	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();

	const problems = [];
	const wp = worldOf(P);
	const near = (p) => Math.abs(p.x - wp.x) < 3 && Math.abs(p.y - wp.y) < 3;
	if (JSON.stringify(w1?.chips) !== JSON.stringify(["attention", "danger", "going", "help", "highlight"])) problems.push(`a roda do jogador deveria ter 5 tipos sem 'Todos aqui' (${JSON.stringify(w1?.chips)})`);
	if (JSON.stringify(w1hover?.active) !== JSON.stringify(["danger"])) problems.push(`mover para Perigo deveria acendê-lo (${JSON.stringify(w1hover?.active)})`);
	if (!(afterDanger.length === 1 && afterDanger[0].kind === "danger" && near(afterDanger[0]))) problems.push(`soltar sobre Perigo deveria mandar 1 ping de perigo no ponto da roda (${JSON.stringify(afterDanger)})`);
	if (wheelClosed !== null) problems.push("a roda não fechou ao soltar");
	if (!(center1.length === 1 && center1[0].kind === "attention")) problems.push(`soltar no miolo deveria mandar o tipo escolhido, atenção (${JSON.stringify(center1)})`);
	if (!(center2.length === 1 && center2[0].kind === "help")) problems.push(`soltar no miolo com 'ajuda' escolhida deveria mandar ajuda (${JSON.stringify(center2)})`);
	if (!(quick.length === 1 && quick[0].kind === "going")) problems.push(`Ctrl+clique rápido deveria mandar o ping do tipo escolhido (${JSON.stringify(quick)})`);
	if (quickWheel !== null) problems.push("Ctrl+clique rápido não deveria abrir a roda");
	if (!marquee.sel.includes("a")) problems.push(`Ctrl + arrastar deveria continuar sendo a caixa de seleção (selecionou ${JSON.stringify(marquee.sel)})`);
	if (marquee.pings !== 0) problems.push("Ctrl + arrastar rápido não deveria mandar ping");
	if (!(highlighted.length === 1 && highlighted[0].kind === "highlight" && highlighted[0].tokenId === "a" && highlighted[0].x === 455 && highlighted[0].y === 455)) problems.push(`destacar com 'a' selecionado deveria pôr as setas no 'a' (${JSON.stringify(highlighted)})`);
	if (noTarget.length !== 0) problems.push("destacar sem personagem não deveria mandar ping");
	if (warned < 1) problems.push("destacar sem personagem deveria avisar 'Escolha um personagem'");
	if (!(clickedHighlight.length === 1 && clickedHighlight[0].tokenId === "b")) problems.push(`Ping + Destacar clicando no 'b' deveria destacar o 'b' (${JSON.stringify(clickedHighlight)})`);
	if (JSON.stringify(playerButtons) !== JSON.stringify(["Atenção", "Perigo", "A caminho", "Ajuda", "Destacar"])) problems.push(`o painel do jogador deveria ter 5 tipos sem 'Todos aqui' (${JSON.stringify(playerButtons)})`);
	if (chosen !== "danger") problems.push("o painel não escolheu Perigo");
	if (!(toolPing.length === 1 && toolPing[0].kind === "danger")) problems.push(`clicar no mapa com Perigo escolhido deveria mandar perigo (${JSON.stringify(toolPing)})`);
	if (!(forged.length === 1 && forged[0].kind === "attention")) problems.push(`jogador que força 'Todos aqui' deveria mandar ping comum (${JSON.stringify(forged)})`);
	if (JSON.stringify(gmWheel?.chips) !== JSON.stringify(["attention", "danger", "going", "help", "highlight", "focus"])) problems.push(`a roda do mestre deveria ter 6 tipos (${JSON.stringify(gmWheel?.chips)})`);
	if (!(gmPing.length === 1 && gmPing[0].kind === "focus")) problems.push(`o mestre escolhendo 'Todos aqui' deveria mandar esse ping (${JSON.stringify(gmPing)})`);
	if (JSON.stringify(vpBefore) !== JSON.stringify(vpAfter)) problems.push("o ping 'Todos aqui' mexeu na câmera de quem mandou (só a dos outros deve andar)");
	if (!gmButtons.includes("Todos aqui")) problems.push(`o painel do mestre deveria ter 'Todos aqui' (${JSON.stringify(gmButtons)})`);
	if (JSON.stringify(pickerRows) !== JSON.stringify(["attention", "danger", "going", "help", "highlight"])) problems.push(`segurar o botão de Ping deveria abrir a lista com os 5 tipos (${JSON.stringify(pickerRows)})`);
	if (JSON.stringify(hoverRow) !== JSON.stringify(["going"])) problems.push(`arrastar até 'A caminho' deveria acendê-lo (${JSON.stringify(hoverRow)})`);
	if (!(afterPick.kind === "going" && afterPick.tool === "ping" && !afterPick.picker)) problems.push(`soltar sobre 'A caminho' deveria escolher o tipo, ligar a ferramenta e fechar a lista (${JSON.stringify(afterPick)})`);
	if (quickTool !== "ping") problems.push(`um toque rápido no botão deveria ligar a ferramenta Ping (ficou ${quickTool})`);
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: roda do Ctrl, tipos, destaque, 'Todos aqui' só do mestre, painel e lista de segurar funcionam");
}
main().catch((e) => { console.error(e); process.exit(1); });
