// Verificação dos cursores dos outros integrantes, no navegador, com Realtime de
// mentira (scripts/fake-realtime.cjs) e mouse de verdade:
//  - cada integrante tem uma cor própria; cor igual à de quem chegou antes cede;
//  - cor inválida/adulterada vinda da rede nunca é desenhada; cai numa cor segura;
//  - o cursor remoto aparece no mapa (ponteiro + etiqueta com o nome);
//  - a pessoa escolhe a cor pelo seletor, a escolha é anunciada e sobrevive ao reload;
//  - o interruptor "Cursores dos outros" oculta SÓ o ponteiro com nome: pings e
//    réguas remotos continuam; o cursor próprio continua sendo enviado; religar volta;
//    a preferência persiste após recarregar.
// Uso: pnpm check:cursores   (sai com código 1 se alguma regra quebrar)
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { installFakeRealtime } = require("./fake-realtime.cjs");

const PORT = 3140;
const OUT = path.join(__dirname, "..", "docs", "previews");

async function main() {
	process.env.VITE_SUPABASE_URL = "http://127.0.0.1:54321";
	process.env.VITE_SUPABASE_ANON_KEY = "check-anon-key";
	fs.mkdirSync(OUT, { recursive: true });
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: PORT, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
	const rt = await installFakeRealtime(context);
	await context.route("**/rest/v1/**", (r) => {
		const url = r.request().url();
		return r.fulfill({ status: 200, contentType: "application/json", body: url.includes("/rpc/") ? "null" : "[]" });
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const errors = [];
	const problems = [];
	const expect = (ok, msg) => { if (!ok) problems.push(msg); };

	async function open() {
		rt.reset();
		const page = await context.newPage();
		page.on("pageerror", (e) => errors.push(e.message));
		await page.goto(`http://127.0.0.1:${PORT}/campaigns/demo/vtt`, { waitUntil: "domcontentloaded", timeout: 90000 });
		await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
		// Deixa a carga (simulada) das cenas terminar antes de montar a cena do teste.
		await page.waitForTimeout(1800);
		await page.evaluate(() => {
			const st = window.__vtt_store__.getState();
			st.setIsGM(false);
			st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: false, fogExploration: false, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
			st.setActiveSceneId("s1");
			st.setViewport({ x: 0, y: 0, scale: 1 });
		});
		const t0 = Date.now();
		while (rt.state.tracked.length === 0 && Date.now() - t0 < 20000) await page.waitForTimeout(100);
		await page.waitForTimeout(600);
		return page;
	}
	const store = (page, fn, arg) => page.evaluate(fn, arg);
	const myColor = (page) => page.evaluate(() => window.__vtt_store__.getState().userColor);
	const cursors = (page) => page.evaluate(() => window.__vttRemoteCursors ?? []);
	const lastTrack = () => rt.state.tracked.at(-1);
	const HEX = /^#[0-9a-f]{6}$/;
	const PALETTE = ["#38bdf8", "#2563eb", "#4f46e5", "#9333ea", "#c026d3", "#db2777", "#dc2626", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#14b8a6"];

	// ===== 1. cor padrão: do id, e cede a quem chegou antes =====
	let page = await open();
	const first = await myColor(page);
	expect(PALETTE.includes(first), `cor inicial fora da paleta: ${first}`);
	expect(lastTrack()?.color === first && lastTrack()?.colorChosen === false, `presença deveria anunciar a cor automática ${first}: ${JSON.stringify(lastTrack())}`);
	console.log("1 minha cor automática          ", first, "anunciada:", lastTrack()?.color);

	// Ana chega "antes" (onlineAt menor) com a MESMA cor que eu; Bruno com cor inválida.
	rt.peerJoin("peer-ana", { userId: "peer-ana", userName: "Ana", avatarUrl: null, color: first, colorChosen: false, isGM: false, isCoGM: false, onlineAt: 1000 });
	rt.peerJoin("peer-bruno", { userId: "peer-bruno", userName: "Bruno Muito Mas Muito Comprido Mesmo", avatarUrl: null, color: "red", isGM: false, isCoGM: false, onlineAt: 2000 });
	await page.waitForTimeout(900);
	const second = await myColor(page);
	const users = await store(page, () => window.__vtt_store__.getState().onlineUsers.map((u) => ({ id: u.userId, color: u.color })));
	console.log("1 depois de Ana (mesma cor)     ", second, "| mesa:", JSON.stringify(users));
	expect(second !== first, "a cor automática deveria ceder a quem chegou antes com a mesma cor");
	expect(lastTrack()?.color === second, `a nova cor deveria ser anunciada: ${JSON.stringify(lastTrack())}`);
	expect(new Set(users.map((u) => u.color)).size === users.length, `cores repetidas na mesa: ${JSON.stringify(users)}`);
	expect(users.every((u) => HEX.test(u.color)), `cor inválida na presença: ${JSON.stringify(users)}`);

	// ===== 2. cursores remotos: aparecem, com cor segura =====
	const ana = { userId: "peer-ana", userName: "Ana", color: first, x: 420, y: 330 };
	rt.peerBroadcast("cursor_move", ana);
	rt.peerBroadcast("cursor_move", { userId: "peer-bruno", userName: "Bruno Muito Mas Muito Comprido Mesmo", color: "red", x: 760, y: 420 });
	rt.peerBroadcast("cursor_move", { userId: "peer-evil", userName: "Mal", color: '#38bdf8" onload="x', x: 100, y: 100 });
	rt.peerBroadcast("cursor_move", { userId: "peer-nan", userName: "Nan", color: first, x: "NaN", y: 1 });
	rt.peerBroadcast("cursor_move", { userId: "peer-far", userName: "Longe", color: first, x: 1e12, y: 1 });
	await page.waitForTimeout(900);
	let list = await cursors(page);
	console.log("2 cursores desenhados           ", JSON.stringify(list.map((c) => [c.userId, c.color, c.name.slice(0, 12), c.visible])));
	const byId = Object.fromEntries(list.map((c) => [c.userId, c]));
	expect(byId["peer-ana"] && byId["peer-bruno"] && byId["peer-evil"], "Ana, Bruno e (cor adulterada) deveriam ser desenhados");
	expect(!byId["peer-nan"] && !byId["peer-far"], "coordenada inválida/absurda não pode virar cursor");
	expect(list.every((c) => HEX.test(c.color)), "todo cursor desenhado tem cor #rrggbb");
	expect(byId["peer-ana"]?.color === first, "o cursor da Ana usa a cor anunciada por ela");
	expect(byId["peer-bruno"]?.color !== byId["peer-evil"]?.color, "Bruno (cor inválida) e Mal (cor adulterada) deveriam cair em cores próprias, não na mesma");
	await page.screenshot({ path: path.join(OUT, "cursores-depois.png") });
	// recorte ampliado para conferir o desenho
	await page.screenshot({ path: path.join(OUT, "cursores-depois-zoom.png"), clip: { x: 380, y: 300, width: 480, height: 180 } });

	// suavizado: um movimento curto não teleporta; chega ao alvo em seguida
	rt.peerBroadcast("cursor_move", { ...ana, x: 520, y: 330 });
	await page.waitForTimeout(30);
	const mid = (await cursors(page)).find((c) => c.userId === "peer-ana");
	await page.waitForTimeout(700);
	const end = (await cursors(page)).find((c) => c.userId === "peer-ana");
	console.log("2 suavizado                     ", JSON.stringify({ meio: Math.round(mid?.x), fim: Math.round(end?.x) }));
	expect(end && Math.abs(end.x - 520) < 1, `o cursor deveria chegar a 520: ${end?.x}`);
	expect(mid && mid.x < 519, `o cursor deveria deslizar, não teleportar: ${mid?.x}`);

	// ===== 3. escolher a minha cor pelo seletor =====
	const trigger = page.getByRole("button", { name: "Alterar a cor do meu cursor" });
	const tbox = await trigger.boundingBox();
	expect(tbox && tbox.width >= 44 && tbox.height >= 44, `o gatilho da cor deveria ter ≥ 44 px: ${JSON.stringify(tbox)}`);
	await trigger.click();
	const rosa = page.getByRole("button", { name: "Rosa" });
	await rosa.waitFor({ state: "visible", timeout: 5000 });
	await page.waitForTimeout(400); // fim da animação de entrada do popover
	const rbox = await rosa.boundingBox();
	expect(rbox && rbox.width >= 44 && rbox.height >= 44, `a amostra de cor deveria ter ≥ 44 px: ${JSON.stringify(rbox)}`);
	expect(await page.getByRole("button", { pressed: false, name: "Automática" }).count() === 0, "Automática deveria estar marcada (pressed) antes de escolher");
	await rosa.click();
	await page.waitForTimeout(500);
	const chosen = await myColor(page);
	const stored = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => k.includes("cursor-color")));
	console.log("3 escolhi Rosa                  ", chosen, "| anunciada:", JSON.stringify([lastTrack()?.color, lastTrack()?.colorChosen]), "| salva:", JSON.stringify(stored.map(([, v]) => v)));
	expect(chosen === "#db2777", `a cor escolhida deveria ser #db2777: ${chosen}`);
	expect(lastTrack()?.color === "#db2777" && lastTrack()?.colorChosen === true, `a escolha deveria ser anunciada: ${JSON.stringify(lastTrack())}`);
	expect(stored.length === 1 && stored[0][1] === "#db2777", "a escolha deveria ficar salva no navegador");
	expect(await rosa.getAttribute("aria-pressed") === "true", "a amostra escolhida deveria ficar aria-pressed=true");
	await page.screenshot({ path: path.join(OUT, "cursores-seletor.png"), clip: { x: 760, y: 0, width: 520, height: 330 } });
	await page.keyboard.press("Escape");

	// a escolha vale também para o reload
	await page.close();
	page = await open();
	console.log("3 depois de recarregar          ", await myColor(page), "| anunciada:", JSON.stringify([lastTrack()?.color, lastTrack()?.colorChosen]));
	expect(await myColor(page) === "#db2777" && lastTrack()?.color === "#db2777" && lastTrack()?.colorChosen === true, "a cor escolhida deveria voltar sozinha após recarregar");

	// quem escolheu a cor não cede, mesmo que alguém chegue antes com a mesma
	rt.peerJoin("peer-ana", { userId: "peer-ana", userName: "Ana", color: "#db2777", colorChosen: false, isGM: false, onlineAt: 1 });
	await page.waitForTimeout(600);
	expect(await myColor(page) === "#db2777", "quem escolheu a cor não pode ceder");
	rt.peerJoin("peer-ana", { userId: "peer-ana", userName: "Ana", color: first, colorChosen: false, isGM: false, onlineAt: 1 });
	await page.waitForTimeout(300);

	// ===== 4. ocultar os cursores dos outros =====
	const toggle = page.getByRole("button", { name: "Cursores dos outros integrantes" });
	const tgBox = await toggle.boundingBox();
	expect(tgBox && tgBox.width >= 44 && tgBox.height >= 44, `o interruptor deveria ter ≥ 44 px: ${JSON.stringify(tgBox)}`);
	expect(await toggle.getAttribute("aria-pressed") === "true", "por padrão os cursores aparecem (aria-pressed=true)");
	rt.peerBroadcast("cursor_move", { userId: "peer-ana", userName: "Ana", color: first, x: 420, y: 330 });
	await page.waitForTimeout(500);
	expect((await cursors(page)).length >= 1, "antes de ocultar o cursor da Ana deveria aparecer");

	const sentBefore = rt.sentCount("cursor_move");
	await toggle.click();
	await page.waitForTimeout(200);
	const afterClick = await page.evaluate(() => ({ cursors: (window.__vttRemoteCursors ?? []).length, stored: localStorage.getItem("arkhiveon:vtt:show-remote-cursors:v1") }));
	console.log("4 ocultei                       ", JSON.stringify(afterClick), "aria-pressed:", await toggle.getAttribute("aria-pressed"));
	expect(afterClick.cursors === 0, "ao ocultar, os cursores já na tela deveriam sumir na hora");
	expect(await toggle.getAttribute("aria-pressed") === "false", "oculto: aria-pressed=false");
	expect(afterClick.stored === "0", "a preferência deveria ser salva");

	// novos movimentos dos outros não aparecem...
	rt.peerBroadcast("cursor_move", { userId: "peer-ana", userName: "Ana", color: first, x: 450, y: 340 });
	rt.peerBroadcast("cursor_move", { userId: "peer-bruno", userName: "Bruno", color: "red", x: 800, y: 440 });
	// ...mas ping e régua deles continuam
	rt.peerBroadcast("ping", { id: "ping-ana", x: 500, y: 350, userId: "peer-ana", userName: "Ana", color: first, timestamp: Date.now() });
	rt.peerBroadcast("ruler_move", { userId: "peer-ana", measurement: { startX: 140, startY: 600, currentX: 420, currentY: 600, distance: 6, unit: "m", userName: "Ana", color: first } });
	await page.waitForTimeout(400);
	const hidden = await page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		return { cursors: (window.__vttRemoteCursors ?? []).length, storeCursors: Object.keys(s.remoteCursors).length, pings: s.activePings.filter((p) => p.userId === "peer-ana").length, rulers: Object.keys(s.remoteMeasurements) };
	});
	console.log("4 oculto, chegou cursor+ping+régua", JSON.stringify(hidden));
	expect(hidden.cursors === 0 && hidden.storeCursors === 0, "oculto: nenhum cursor remoto pode aparecer nem entrar na store");
	expect(hidden.pings === 1, "oculto: o ping remoto deveria continuar aparecendo");
	expect(hidden.rulers.includes("peer-ana"), "oculto: a régua remota deveria continuar aparecendo");
	await page.screenshot({ path: path.join(OUT, "cursores-ocultos.png") });

	// pings de todos os tipos (e o "Todos aqui" do mestre) convivem com os cursores ocultos
	rt.peerJoin("peer-gm", { userId: "peer-gm", userName: "Mestre Peer", avatarUrl: null, color: "#f97316", colorChosen: false, isGM: true, isCoGM: false, onlineAt: 500 });
	await page.waitForTimeout(300);
	const vpBefore = await page.evaluate(() => ({ ...window.__vtt_store__.getState().viewport }));
	const mkPing = (id, userId, userName, kind, x, y) => ({ id, x, y, userId, userName, color: "#22c55e", timestamp: Date.now(), kind });
	rt.peerBroadcast("ping", mkPing("k1", "peer-ana", "Ana", "danger", 600, 300));
	rt.peerBroadcast("ping", mkPing("k2", "peer-bruno", "Bruno", "help", 650, 330));
	rt.peerBroadcast("ping", mkPing("k3", "peer-evil", "Mal", "focus", 200, 200)); // jogador forçando "Todos aqui"
	rt.peerBroadcast("ping", mkPing("k4", "peer-gm", "Mestre Peer", "focus", 1000, 700));
	await page.waitForTimeout(1500);
	const kinds = await page.evaluate(() => window.__vtt_store__.getState().activePings.map((p) => [p.userId, p.kind]));
	const vpAfter = await page.evaluate(() => ({ ...window.__vtt_store__.getState().viewport }));
	console.log("4 oculto + pings de vários tipos", JSON.stringify(kinds), "| câmera:", JSON.stringify([Math.round(vpBefore.x), Math.round(vpBefore.y)]), "→", JSON.stringify([Math.round(vpAfter.x), Math.round(vpAfter.y)]));
	const kindOf = (u) => kinds.find(([id]) => id === u)?.[1];
	expect(kindOf("peer-ana") === "danger" && kindOf("peer-bruno") === "help", "oculto: pings de perigo e ajuda deveriam aparecer");
	expect(kindOf("peer-gm") === "focus", "oculto: o 'Todos aqui' do mestre deveria aparecer");
	expect(kindOf("peer-evil") && kindOf("peer-evil") !== "focus", "jogador forçando 'Todos aqui' vira ping comum");
	expect(vpAfter.x !== vpBefore.x || vpAfter.y !== vpBefore.y, "'Todos aqui' do mestre deveria levar a câmera, mesmo com os cursores ocultos");
	expect((await cursors(page)).length === 0, "pings não podem trazer os cursores de volta");

	// o MEU cursor continua sendo enviado aos outros
	await page.mouse.move(300, 300);
	for (let i = 0; i < 12; i++) { await page.mouse.move(300 + i * 25, 320 + i * 8); await page.waitForTimeout(40); }
	const sentWhileHidden = rt.sentCount("cursor_move") - sentBefore;
	console.log("4 meu cursor enviado c/ oculto  ", sentWhileHidden, "mensagens");
	expect(sentWhileHidden > 0, "com os dos outros ocultos, o meu cursor deveria continuar sendo enviado");

	// a preferência persiste após recarregar
	await page.close();
	page = await open();
	const toggle2 = page.getByRole("button", { name: "Cursores dos outros integrantes" });
	console.log("4 após recarregar               ", "aria-pressed:", await toggle2.getAttribute("aria-pressed"));
	expect(await toggle2.getAttribute("aria-pressed") === "false", "a preferência de ocultar deveria persistir após recarregar");
	rt.peerJoin("peer-ana", { userId: "peer-ana", userName: "Ana", color: first, isGM: false, onlineAt: 1000 });
	rt.peerBroadcast("cursor_move", { userId: "peer-ana", userName: "Ana", color: first, x: 420, y: 330 });
	await page.waitForTimeout(500);
	expect((await cursors(page)).length === 0, "recarregado e oculto: o cursor não pode aparecer");

	// religar: volta
	await toggle2.click();
	await page.waitForTimeout(150);
	rt.peerBroadcast("cursor_move", { userId: "peer-ana", userName: "Ana", color: first, x: 430, y: 335 });
	await page.waitForTimeout(500);
	const back = await cursors(page);
	console.log("4 religado                      ", JSON.stringify(back.map((c) => [c.userId, c.visible])), "aria-pressed:", await toggle2.getAttribute("aria-pressed"));
	expect(back.some((c) => c.userId === "peer-ana" && c.visible), "religado: o cursor da Ana deveria voltar");
	expect(await toggle2.getAttribute("aria-pressed") === "true", "religado: aria-pressed=true");
	expect(await page.evaluate(() => localStorage.getItem("arkhiveon:vtt:show-remote-cursors:v1")) === null, "religado: a preferência volta ao padrão");

	// cursor parado some depois de um tempo (sem precisar de novo evento)
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		const c = st.remoteCursors["peer-ana"];
		st.setRemoteCursor({ ...c, timestamp: Date.now() - 13000 });
	});
	await page.waitForTimeout(300);
	const stale = (await cursors(page)).find((c) => c.userId === "peer-ana");
	expect(stale && stale.visible === false, "cursor parado há mais de 12 s deveria sumir");

	// quem sai da mesa perde o cursor
	rt.peerBroadcast("cursor_move", { userId: "peer-ana", userName: "Ana", color: first, x: 430, y: 335 });
	await page.waitForTimeout(300);
	rt.peerLeave("peer-ana");
	await page.waitForTimeout(500);
	expect(!(await cursors(page)).some((c) => c.userId === "peer-ana"), "quem saiu da mesa não pode deixar cursor");

	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	await browser.close();
	await server.close();
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: cores próprias e sem repetição, cor adulterada barrada, escolha persiste, cursores aparecem/somem/voltam, ping e régua continuam, meu cursor segue sendo enviado");
}
main().catch((e) => { console.error(e); process.exit(1); });
