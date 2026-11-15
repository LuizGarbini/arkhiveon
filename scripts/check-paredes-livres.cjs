// Verificação das paredes livres (sem grade) e do arrasto, com mouse e teclado de verdade:
//  - parede desenhada num pixel que NÃO é da grade guarda a coordenada exata;
//  - "Encaixar na grade" (painel) e Shift (inversão momentânea);
//  - ímã nas pontas (Alt desliga, e Alt não vira ping);
//  - arrastar uma parede e uma porta: prévia ao vivo, UMA gravação ao soltar;
//  - arrastar um vértice compartilhado: as paredes que dividem o ponto vão juntas;
//  - Ctrl+Z / Shift+Ctrl+Z; Esc cancela; clique sem arrasto só seleciona;
//  - setas empurram 1 px (Shift 10) com UMA gravação por lote;
//  - a visão do jogador acompanha a parede na nova posição.
// Uso: pnpm check:paredes-livres   (sai com código 1 se alguma regra quebrar)
const fs = require("node:fs");
const { chromium } = require("playwright");

const PORT = 3160;
const near = (a, b, eps = 0.011) => Math.abs(a - b) <= eps;

async function main() {
	fs.mkdirSync("docs/previews", { recursive: true });
	const { createServer } = await import("vite");
	const server = await createServer({
		configLoader: "runner",
		mode: "test",
		server: { host: "127.0.0.1", port: PORT, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());

	// "Banco" de mentira: o que a página grava aparece nas próximas leituras.
	const db = [];
	const posts = [];
	const patches = [];
	const rpcs = [];
	await context.route("**/rest/v1/**", (r) => {
		const req = r.request();
		const url = req.url();
		const json = (body, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
		if (url.includes("/rpc/")) {
			rpcs.push(url);
			return r.fulfill({ status: 200, contentType: "application/json", body: url.includes("/rpc/explore_scene_cells") ? "null" : "true" });
		}
		if (url.includes("/vtt_walls")) {
			if (req.method() === "POST") {
				const rows = JSON.parse(req.postData() || "[]");
				posts.push(rows);
				for (const row of rows) db.push({ ...row });
				return json([], 201);
			}
			if (req.method() === "PATCH") {
				const id = new URL(url).searchParams.get("id")?.replace("eq.", "");
				const body = JSON.parse(req.postData() || "{}");
				patches.push({ id, body });
				const row = db.find((w) => w.id === id);
				if (row) Object.assign(row, body);
				return json(row ? [{ id }] : []);
			}
			if (req.method() === "DELETE") return json([]);
			return json(db);
		}
		return json([]);
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem(
			"rpg-notes-storage",
			JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }),
		);
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto(`http://127.0.0.1:${PORT}/campaigns/demo/vtt`, { waitUntil: "domcontentloaded", timeout: 90000 });
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
	await page.evaluate((tokens) => window.__vtt_store__.getState().setTokens(tokens), [mk("pc", "Dante", 315, 700, { characterId: "dante", controlledBy: ["preview-gm-user"] })]);
	await page.waitForTimeout(2500);
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(true));
	await page.waitForTimeout(800);

	const store = () => page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		return { walls: s.walls, selected: s.selectedWallIds, draft: s.wallDraft, undo: s.wallUndo.length, redo: s.wallRedo.length, pings: s.activePings.length, snap: s.wallSnapGrid, tool: s.activeTool };
	});
	const wallOf = async (id) => (await store()).walls.find((w) => w.id === id);
	const box = await page.locator("canvas").first().boundingBox();
	const view = () => page.evaluate(() => window.__vtt_store__.getState().viewport);
	// mundo → tela e tela → mundo (a grade do mapa tem 70 px)
	const toScreen = async (x, y) => {
		const vp = await view();
		return { x: Math.round(box.x + vp.x + x * vp.scale), y: Math.round(box.y + vp.y + y * vp.scale) };
	};
	const toWorld = async (sx, sy) => {
		const vp = await view();
		return { x: (sx - box.x - vp.x) / vp.scale, y: (sy - box.y - vp.y) / vp.scale };
	};
	const round2 = (n) => Math.round(n * 100) / 100;
	const offGrid = (n) => Math.abs(n / 70 - Math.round(n / 70)) > 0.08;
	const problems = [];
	const expect = (cond, msg) => { if (!cond) problems.push(msg); };
	const log = (label, value) => console.log(label.padEnd(34), JSON.stringify(value));
	const clickAt = async (sx, sy, mods = []) => {
		for (const m of mods) await page.keyboard.down(m);
		await page.mouse.click(sx, sy);
		for (const m of mods.slice().reverse()) await page.keyboard.up(m);
	};
	const drag = async (from, to, { release = true } = {}) => {
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(to.x, to.y, { steps: 14 });
		if (release) await page.mouse.up();
	};

	// ---------------------------------------------------------------- 1
	// ferramenta Parede pelo atalho do próprio app (mestre)
	await page.evaluate(() => window.__vtt_store__.getState().setActiveTool("wall"));
	await page.waitForTimeout(800);
	const snapBtn = page.getByRole("button", { name: "Encaixar na grade" });
	const pressed = () => snapBtn.getAttribute("aria-pressed");
	log("0 painel: Encaixar na grade", await pressed());
	expect((await pressed()) === "false", "Encaixar na grade deveria vir DESLIGADO");

	// desenho livre: dois cliques fora da grade e Enter
	const p1 = { x: Math.round(box.x + 307), y: Math.round(box.y + 183) };
	const p2 = { x: Math.round(box.x + 523), y: Math.round(box.y + 239) };
	const w1a = await toWorld(p1.x, p1.y), w1b = await toWorld(p2.x, p2.y);
	expect(offGrid(w1a.x) || offGrid(w1a.y), "ponto de teste 1 caiu na grade (ajuste o script)");
	await clickAt(p1.x, p1.y);
	await clickAt(p2.x, p2.y);
	await page.waitForTimeout(150);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const s1 = await store();
	const free = s1.walls[0];
	log("1 parede livre", free);
	expect(s1.walls.length === 1, `deveria haver 1 parede (há ${s1.walls.length})`);
	if (free) {
		expect(near(free.x1, round2(w1a.x)) && near(free.y1, round2(w1a.y)) && near(free.x2, round2(w1b.x)) && near(free.y2, round2(w1b.y)), `coordenadas livres erradas: ${JSON.stringify(free)} (esperado ${JSON.stringify([w1a, w1b])})`);
		expect(offGrid(free.x1) || offGrid(free.y1), "a parede livre foi parar num canto da grade");
	}
	expect(posts.length === 1 && posts[0].length === 1, `deveria gravar 1 vez (gravou ${posts.length})`);
	if (posts[0]) expect(near(posts[0][0].x1, round2(w1a.x)) && near(posts[0][0].y2, round2(w1b.y)), "a gravação não tem as coordenadas livres");
	const decimals = (n) => (String(n).split(".")[1] || "").length;
	expect(free && [free.x1, free.y1, free.x2, free.y2].every((n) => decimals(n) <= 2), "coordenada com mais de 2 casas decimais");

	// ---------------------------------------------------------------- 2
	// interruptor ligado: encaixa; Shift inverte
	await snapBtn.click();
	await page.waitForTimeout(200);
	log("2 painel ligado", await pressed());
	expect((await pressed()) === "true", "o interruptor deveria ficar aria-pressed=true");
	const q = [
		{ x: Math.round(box.x + 307), y: Math.round(box.y + 383) },
		{ x: Math.round(box.x + 523), y: Math.round(box.y + 439) },
	];
	await clickAt(q[0].x, q[0].y);
	await clickAt(q[1].x, q[1].y);
	await page.waitForTimeout(150);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const gridWall = (await store()).walls[1];
	log("2 parede com grade ligada", gridWall);
	expect(gridWall && [gridWall.x1, gridWall.y1, gridWall.x2, gridWall.y2].every((n) => near(n / 70, Math.round(n / 70), 1e-6)), "com a grade ligada a parede deveria cair nos cantos");
	// Shift com a grade ligada: livre
	const r = [
		{ x: Math.round(box.x + 307), y: Math.round(box.y + 523) },
		{ x: Math.round(box.x + 523), y: Math.round(box.y + 579) },
	];
	const rw = await toWorld(r[0].x, r[0].y);
	await page.keyboard.down("Shift");
	await page.mouse.click(r[0].x, r[0].y);
	await page.mouse.click(r[1].x, r[1].y);
	await page.keyboard.up("Shift");
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const shiftFree = (await store()).walls[2];
	log("2b Shift (grade ligada) → livre", shiftFree);
	expect(shiftFree && near(shiftFree.x1, round2(rw.x)) && near(shiftFree.y1, round2(rw.y)), "Shift com a grade ligada deveria desenhar livre");
	// desliga; Shift encaixa
	await snapBtn.click();
	await page.waitForTimeout(200);
	expect((await pressed()) === "false", "o interruptor deveria desligar");
	const t = [
		{ x: Math.round(box.x + 607), y: Math.round(box.y + 183) },
		{ x: Math.round(box.x + 823), y: Math.round(box.y + 239) },
	];
	await page.keyboard.down("Shift");
	await page.mouse.click(t[0].x, t[0].y);
	await page.mouse.click(t[1].x, t[1].y);
	await page.keyboard.up("Shift");
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const shiftSnap = (await store()).walls[3];
	log("2c Shift (grade desligada) → encaixa", shiftSnap);
	expect(shiftSnap && [shiftSnap.x1, shiftSnap.y1, shiftSnap.x2, shiftSnap.y2].every((n) => near(n / 70, Math.round(n / 70), 1e-6)), "Shift com a grade desligada deveria encaixar nos cantos");
	// preferência lembrada
	await snapBtn.click();
	const remembered = await page.evaluate(() => localStorage.getItem("arkhiveon.vtt.wallSnapGrid"));
	await snapBtn.click();
	expect(remembered === "1", `a preferência deveria ir para o localStorage (veio ${remembered})`);

	// ---------------------------------------------------------------- 3
	// ímã: perto da ponta de outra parede encaixa EXATAMENTE nela; Alt desliga
	const endB = { x: free.x2, y: free.y2 };
	const endScreen = await toScreen(endB.x, endB.y);
	const pings0 = (await store()).pings;
	// começa num ponto vazio e termina PERTO (5 px de tela) da ponta da primeira parede
	const farStart = { x: endScreen.x + 180, y: endScreen.y + 90 };
	await clickAt(farStart.x, farStart.y);
	await clickAt(endScreen.x + 5, endScreen.y + 4);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const magnetWall = (await store()).walls[4];
	log("3 ímã", { ponta: endB, nova: magnetWall && [magnetWall.x2, magnetWall.y2] });
	expect(magnetWall && magnetWall.x2 === endB.x && magnetWall.y2 === endB.y, "o ímã deveria usar EXATAMENTE a ponta da outra parede (sem fresta)");
	// Alt: sem ímã, e Alt+clique na ferramenta Parede não vira ping
	const farStart2 = { x: endScreen.x + 260, y: endScreen.y + 40 };
	await clickAt(farStart2.x, farStart2.y);
	await clickAt(endScreen.x + 5, endScreen.y + 4, ["Alt"]);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const noMagnet = (await store()).walls[5];
	log("3b Alt (sem ímã)", noMagnet && [noMagnet.x2, noMagnet.y2]);
	expect(noMagnet && !(noMagnet.x2 === endB.x && noMagnet.y2 === endB.y), "com Alt o ímã deveria ficar desligado");
	expect((await store()).pings === pings0, "Alt+clique na ferramenta Parede não deveria criar ping");
	await page.screenshot({ path: "docs/previews/paredes-livres-1-desenho.png" });

	// ---------------------------------------------------------------- 4
	// cena limpa para o arrasto: duas paredes, uma porta aberta, e duas paredes que se encontram
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedWallIds([]));
	db.length = 0;
	posts.length = 0;
	patches.length = 0;
	const base = [
		{ id: "mv", scene_id: "s1", x1: 140, y1: 330, x2: 280, y2: 330, kind: "wall", is_open: false },
		{ id: "door", scene_id: "s1", x1: 420, y1: 330, x2: 560, y2: 330, kind: "door", is_open: true },
		{ id: "s1w", scene_id: "s1", x1: 700, y1: 300, x2: 800, y2: 300, kind: "wall", is_open: false },
		{ id: "s2w", scene_id: "s1", x1: 800, y1: 300, x2: 800, y2: 400, kind: "wall", is_open: false },
		{ id: "far", scene_id: "s1", x1: 900, y1: 500, x2: 1000, y2: 500, kind: "wall", is_open: false },
	];
	for (const row of base) db.push({ ...row });
	await page.evaluate((rows) => {
		const st = window.__vtt_store__.getState();
		st.setWalls(rows.map((r) => ({ id: r.id, sceneId: r.scene_id, x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, ...(r.kind !== "wall" ? { kind: r.kind, isOpen: r.is_open } : {}) })));
		st.setWallHistory([], []);
	}, base);
	await page.waitForTimeout(600);

	// 4a clique sem arrasto: só seleciona
	const mvMid = await toScreen(210, 330);
	await page.mouse.move(mvMid.x, mvMid.y);
	await page.mouse.down();
	await page.mouse.up();
	await page.waitForTimeout(300);
	let st4 = await store();
	log("4a clique sem arrasto", { selected: st4.selected, patches: patches.length });
	expect(st4.selected.length === 1 && st4.selected[0] === "mv", "clique sem arrasto deveria selecionar a parede");
	expect(patches.length === 0, "clique sem arrasto não pode gravar nada");
	const mvA = await wallOf("mv");
	expect(mvA.x1 === 140 && mvA.x2 === 280 && mvA.y1 === 330, "clique sem arrasto mexeu na parede");

	// 4a' um tremor de 3 px no clique (abaixo do limite de arrasto) também não move nada
	await page.mouse.move(mvMid.x, mvMid.y);
	await page.mouse.down();
	await page.mouse.move(mvMid.x + 3, mvMid.y + 2, { steps: 3 });
	await page.mouse.up();
	await page.waitForTimeout(300);
	const mvJitter = await wallOf("mv");
	log("4a' tremor de 3 px", { mvJitter, patches: patches.length });
	expect(patches.length === 0 && mvJitter.x1 === 140 && mvJitter.y1 === 330, "um tremor abaixo do limite de arrasto não pode mover nem gravar a parede");

	// 4b arrasto: prévia ao vivo sem gravar, UMA gravação ao soltar
	const dxS = 90, dyS = 60;
	const vp0 = await view();
	await page.mouse.move(mvMid.x, mvMid.y);
	await page.mouse.down();
	await page.mouse.move(mvMid.x + dxS, mvMid.y + dyS, { steps: 20 });
	await page.waitForTimeout(200);
	const during = { patches: patches.length, wall: await wallOf("mv") };
	log("4b durante o arrasto", during);
	expect(during.patches === 0, `durante o arrasto não pode gravar (gravou ${during.patches})`);
	await page.screenshot({ path: "docs/previews/paredes-livres-2-arrastando.png" });
	await page.mouse.up();
	await page.waitForTimeout(600);
	const mvB = await wallOf("mv");
	const ddx = dxS / vp0.scale, ddy = dyS / vp0.scale;
	log("4b depois de soltar", { mvB, patches });
	expect(near(mvB.x1, round2(140 + ddx)) && near(mvB.y1, round2(330 + ddy)) && near(mvB.x2, round2(280 + ddx)) && near(mvB.y2, round2(330 + ddy)), `a parede deveria andar (${ddx.toFixed(2)}, ${ddy.toFixed(2)}): ${JSON.stringify(mvB)}`);
	expect(patches.length === 1 && patches[0].id === "mv", `deveria gravar UMA vez ao soltar (gravou ${patches.length})`);
	expect(patches[0] && near(patches[0].body.x1, mvB.x1) && near(patches[0].body.y2, mvB.y2), "o que foi gravado não é o que a tela mostra");
	expect(Math.abs(mvB.x1 - 140) > 1 && Math.abs(mvB.x1 / 70 - Math.round(mvB.x1 / 70)) > 0.01, "o arrasto deveria ser livre (fora da grade)");

	// 4c Ctrl+Z desfaz, Shift+Ctrl+Z refaz
	await page.keyboard.press("Control+z");
	await page.waitForTimeout(500);
	const mvUndo = await wallOf("mv");
	log("4c Ctrl+Z", { mvUndo, patches: patches.length });
	expect(mvUndo.x1 === 140 && mvUndo.y1 === 330 && mvUndo.x2 === 280, "Ctrl+Z deveria devolver a parede ao lugar");
	expect(patches.length === 2 && patches[1].body.x1 === 140, "Ctrl+Z deveria gravar a posição antiga");
	await page.keyboard.press("Control+Shift+z");
	await page.waitForTimeout(500);
	const mvRedo = await wallOf("mv");
	expect(near(mvRedo.x1, mvB.x1) && near(mvRedo.y1, mvB.y1), "Shift+Ctrl+Z deveria refazer o movimento");
	await page.keyboard.press("Control+z");
	await page.waitForTimeout(500);

	// 4d Esc cancela o arrasto
	const patchesBeforeEsc = patches.length;
	await page.mouse.move(mvMid.x, mvMid.y);
	await page.mouse.down();
	await page.mouse.move(mvMid.x + 120, mvMid.y + 80, { steps: 12 });
	await page.keyboard.press("Escape");
	await page.mouse.move(mvMid.x + 160, mvMid.y + 100, { steps: 6 });
	await page.mouse.up();
	await page.waitForTimeout(500);
	const mvEsc = await wallOf("mv");
	log("4d Esc cancela", { mvEsc, patches: patches.length - patchesBeforeEsc });
	expect(mvEsc.x1 === 140 && mvEsc.y1 === 330 && mvEsc.x2 === 280, "Esc deveria cancelar e a parede voltar");
	expect(patches.length === patchesBeforeEsc, "Esc não pode gravar nada");

	// 4e porta aberta: arrasta mantendo tipo e estado; ícone no meio do novo vão
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedWallIds(["door"]));
	patches.length = 0;
	const doorMid = await toScreen(490, 330);
	await drag(doorMid, { x: doorMid.x + 70, y: doorMid.y + 120 });
	await page.waitForTimeout(600);
	const doorN = await wallOf("door");
	log("4e porta arrastada", { doorN, patches });
	expect(doorN.kind === "door" && doorN.isOpen === true, "a porta perdeu tipo ou estado ao ser movida");
	expect(doorN.y1 > 400 && near((doorN.x1 + doorN.x2) / 2, 490 + 70 / vp0.scale, 0.02), "a porta deveria ter andado");
	expect(patches.length === 1 && patches[0].body.kind === undefined && patches[0].body.is_open === undefined, "mover porta só grava coordenadas, uma vez");
	const doorPx = await page.evaluate(() => window.__vtt_store__.getState().walls.find((w) => w.id === "door"));
	expect(doorPx && near((doorPx.x1 + doorPx.x2) / 2, (doorN.x1 + doorN.x2) / 2), "ícone fora do meio do vão");
	await page.screenshot({ path: "docs/previews/paredes-livres-3-porta.png" });

	// 4f seleção múltipla: arrasta TODAS juntas
	patches.length = 0;
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedWallIds(["mv", "far"]));
	const before2 = [await wallOf("mv"), await wallOf("far")];
	const farMid = await toScreen(950, 500);
	await drag(farMid, { x: farMid.x - 60, y: farMid.y - 40 });
	await page.waitForTimeout(600);
	const after2 = [await wallOf("mv"), await wallOf("far")];
	const d0 = { x: after2[0].x1 - before2[0].x1, y: after2[0].y1 - before2[0].y1 };
	const d1 = { x: after2[1].x1 - before2[1].x1, y: after2[1].y1 - before2[1].y1 };
	log("4f duas selecionadas", { d0, d1, patches: patches.length });
	expect(near(d0.x, d1.x, 0.02) && near(d0.y, d1.y, 0.02) && Math.abs(d0.x) > 10, "as selecionadas deveriam andar juntas pelo mesmo deslocamento");
	expect(patches.length === 2 && new Set(patches.map((p) => p.id)).size === 2, `deveria gravar uma vez por parede (${patches.length})`);
	await page.keyboard.press("Control+z");
	await page.waitForTimeout(500);
	const undone2 = [await wallOf("mv"), await wallOf("far")];
	expect(undone2[0].x1 === before2[0].x1 && undone2[1].x1 === before2[1].x1, "Ctrl+Z deveria desfazer o movimento das duas de uma vez");

	// ---------------------------------------------------------------- 5
	// vértice compartilhado: s1w termina em (800,300) onde s2w começa
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedWallIds(["s1w"]));
	patches.length = 0;
	const vtx = await toScreen(800, 300);
	await drag(vtx, { x: vtx.x + 60, y: vtx.y - 45 });
	await page.waitForTimeout(600);
	const a1 = await wallOf("s1w"), a2 = await wallOf("s2w");
	log("5 vértice compartilhado", { a1, a2, patches: patches.length });
	expect(a1.x2 === a2.x1 && a1.y2 === a2.y1, "as duas paredes deveriam continuar unidas no mesmo ponto (sem fresta)");
	expect(Math.abs(a1.x2 - 800) > 20, "o vértice deveria ter andado");
	expect(a1.x1 === 700 && a1.y1 === 300 && a2.x2 === 800 && a2.y2 === 400, "as pontas de trás não podem mexer");
	expect(patches.length === 2, `deveria gravar as duas paredes, uma vez (${patches.length})`);
	// ímã ao arrastar vértice: perto da ponta de 'far'
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedWallIds(["s1w"]));
	const farNow = await wallOf("far");
	const vtx2 = await toScreen(a1.x2, a1.y2);
	const farEnd = await toScreen(farNow.x2, farNow.y2);
	await drag(vtx2, { x: farEnd.x + 4, y: farEnd.y - 3 });
	await page.waitForTimeout(600);
	const snapped = await wallOf("s1w");
	expect(snapped.x2 === farNow.x2 && snapped.y2 === farNow.y2, `arrastar o vértice perto de uma ponta deveria encaixar nela (${snapped.x2},${snapped.y2} vs ${farNow.x2},${farNow.y2})`);
	await page.screenshot({ path: "docs/previews/paredes-livres-4-vertice.png" });

	// ---------------------------------------------------------------- 6
	// setas: 1 px, Shift 10 px, uma gravação por lote
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedWallIds(["far"]));
	const farA = await wallOf("far");
	patches.length = 0;
	for (let i = 0; i < 3; i++) {
		await page.keyboard.press("ArrowRight");
		await page.waitForTimeout(70);
	}
	await page.keyboard.press("Shift+ArrowDown");
	const farMid2 = await wallOf("far");
	expect(near(farMid2.x1, farA.x1 + 3, 1e-6) && near(farMid2.y1, farA.y1 + 10, 1e-6), "setas: +3 px em x e Shift+seta +10 px em y");
	expect(patches.length === 0, "as setas gravam só no fim do lote");
	await page.waitForTimeout(900);
	log("6 setas", { patches });
	expect(patches.length === 1 && near(patches[0].body.x1, farA.x1 + 3, 1e-6), `uma gravação por lote (${patches.length})`);
	await page.keyboard.press("Control+z");
	await page.waitForTimeout(500);
	const farUndo = await wallOf("far");
	expect(farUndo.x1 === farA.x1 && farUndo.y1 === farA.y1, "Ctrl+Z deveria desfazer o lote de setas inteiro");

	// ---------------------------------------------------------------- 7
	// o jogador vê pela geometria nova: parede bloqueando em x=560, depois movida para x=760
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setSelectedWallIds([]);
		st.setActiveTool("select");
		st.setIsGM(false);
	});
	db.length = 0;
	patches.length = 0;
	db.push({ id: "vw", scene_id: "s1", x1: 560, y1: 40, x2: 560, y2: 860, kind: "wall", is_open: false });
	await page.evaluate((tokens) => {
		const st = window.__vtt_store__.getState();
		st.setTokens(tokens);
		st.setWalls([{ id: "vw", sceneId: "s1", x1: 560, y1: 40, x2: 560, y2: 860 }]);
	}, [mk("pc", "Dante", 315, 490, { characterId: "dante", controlledBy: ["preview-gm-user"] })]);
	await page.waitForTimeout(800);
	// a memória de exploração começa vazia e a visão recalcula com o personagem aqui
	await page.evaluate(() => {
		window.__explored_store__.getState().clear("s1");
		window.__vtt_store__.getState().updateToken("pc", { rotation: 1 });
	});
	await page.waitForTimeout(2500);
	const explored = (lo, hi) => page.evaluate(([lo, hi]) => {
		const e = window.__explored_store__.getState();
		let n = 0;
		if (e.grid) for (let i = 0; i < e.grid.cols * e.grid.rows; i++) {
			if ((e.grid.bits[i >> 3] >> (i & 7)) & 1) { const cx = (i % e.grid.cols) * e.grid.cell + e.grid.cell / 2; if (cx > lo && cx < hi) n++; }
		}
		return n;
	}, [lo, hi]);
	const beyondBefore = await explored(600, 880);
	log("7 antes (parede em 560)", { alem: beyondBefore });
	expect(beyondBefore === 0, `com a parede em x=560 nada além dela deveria ser explorado (${beyondBefore})`);
	await page.evaluate(() => { const st = window.__vtt_store__.getState(); st.setIsGM(true); st.setActiveTool("wall"); });
	await page.waitForTimeout(600);
	const vwTop = await toScreen(560, 300);
	await drag(vwTop, { x: vwTop.x + Math.round(200 * vp0.scale), y: vwTop.y });
	await page.waitForTimeout(600);
	const vw = await wallOf("vw");
	log("7 parede movida", vw);
	expect(near(vw.x1, 760, 1.5), `a parede deveria estar perto de x=760 (está em ${vw.x1})`);
	await page.evaluate(() => { const st = window.__vtt_store__.getState(); st.setSelectedWallIds([]); st.setActiveTool("select"); st.setIsGM(false); });
	await page.waitForTimeout(3500);
	const newlySeen = await explored(600, vw.x1 - 20);
	const stillHidden = await explored(vw.x1 + 20, 900);
	log("7 depois (parede em ~760)", { vistoEntre600e740: newlySeen, vistoAtrasDaParedeNova: stillHidden });
	expect(newlySeen > 0, "a visão do jogador não acompanhou: o espaço liberado pela parede movida continua escuro");
	expect(stillHidden === 0, "a visão do jogador deveria parar na NOVA posição da parede");
	await page.screenshot({ path: "docs/previews/paredes-livres-5-visao.png" });

	// ---------------------------------------------------------------- 8
	// com zoom: coordenadas fracionárias (até 2 casas) e ímã em px de TELA (10 px)
	await page.evaluate(() => { const st = window.__vtt_store__.getState(); st.setIsGM(true); st.setActiveTool("wall"); });
	await page.waitForTimeout(600);
	const cx = Math.round(box.x + 420), cy = Math.round(box.y + 360);
	await page.mouse.move(cx, cy);
	await page.mouse.wheel(0, -120);
	await page.mouse.wheel(0, -120);
	await page.waitForTimeout(500);
	const zoom = (await view()).scale;
	log("8 zoom", zoom);
	expect(zoom > 1.2, "o zoom não mudou (a roda do mouse não funcionou)");
	const za = { x: cx - 100, y: cy - 60 }, zb = { x: cx + 63, y: cy + 41 };
	const zwa = await toWorld(za.x, za.y), zwb = await toWorld(zb.x, zb.y);
	const beforeCount = (await store()).walls.length;
	await clickAt(za.x, za.y);
	await clickAt(zb.x, zb.y);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const zWall = (await store()).walls[beforeCount];
	log("8 parede com zoom", zWall);
	expect(zWall && near(zWall.x1, round2(zwa.x)) && near(zWall.y2, round2(zwb.y)), `coordenada com zoom errada: ${JSON.stringify(zWall)} esperado ${JSON.stringify([zwa, zwb])}`);
	expect(zWall && (!Number.isInteger(zWall.x1) || !Number.isInteger(zWall.y1)) && [zWall.x1, zWall.y1, zWall.x2, zWall.y2].every((n) => decimals(n) <= 2), "com zoom as coordenadas deveriam ser fracionárias com no máximo 2 casas");
	// ímã a 8 px de tela encaixa; a 14 px não (o raio é de TELA, não do mapa)
	const zbScreen = await toScreen(zWall.x2, zWall.y2);
	const c1 = { x: zbScreen.x - 40, y: zbScreen.y + 150 };
	await clickAt(c1.x, c1.y);
	await clickAt(zbScreen.x + 6, zbScreen.y + 5);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const mNear = (await store()).walls[beforeCount + 1];
	expect(mNear && mNear.x2 === zWall.x2 && mNear.y2 === zWall.y2, "com zoom o ímã a ~8 px de tela deveria encaixar exatamente");
	const c2 = { x: zbScreen.x + 90, y: zbScreen.y + 120 };
	await clickAt(c2.x, c2.y);
	await clickAt(zbScreen.x + 10, zbScreen.y + 10);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(500);
	const mFar = (await store()).walls[beforeCount + 2];
	log("8 ímã perto/longe", { perto: mNear && [mNear.x2, mNear.y2], longe: mFar && [mFar.x2, mFar.y2], ponta: [zWall.x2, zWall.y2] });
	expect(mFar && !(mFar.x2 === zWall.x2 && mFar.y2 === zWall.y2), "a ~14 px de tela o ímã não deveria encaixar");
	await page.screenshot({ path: "docs/previews/paredes-livres-6-zoom.png" });

	log("erros de página", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: parede livre, interruptor/Shift, ímã, arrastar (uma gravação), vértice, desfazer, Esc, setas e visão do jogador");
}
main().catch((e) => { console.error(e); process.exit(1); });
