// Verificação do histórico de movimentos, no navegador, com banco e Realtime de
// mentira (tabela vtt_token_moves em memória + scripts/fake-realtime.cjs):
//  - cada casa andada com as setas vira UMA linha gravada (sem created_at: a hora é do servidor);
//  - encaixar o token no centro da mesma casa (arrasto curto) NÃO vira linha de 0 m;
//  - a linha anotada na tela é substituída pela do servidor (hora do servidor, não a do relógio local);
//  - gravação recusada: a linha fica na tela e o painel avisa que não foi salva;
//  - recarregar traz as linhas do banco, em ordem, e com mais de 1000 linhas traz as MAIS NOVAS;
//  - outro mestre limpando o histórico some da tela (DELETE sem filtro de cena).
// Uso: pnpm check:historico   (sai com código 1 se alguma regra quebrar)
const { chromium } = require("playwright");
const { installFakeRealtime } = require("./fake-realtime.cjs");

const PORT = 3141;

async function main() {
	process.env.VITE_SUPABASE_URL = "http://127.0.0.1:54321";
	process.env.VITE_SUPABASE_ANON_KEY = "check-anon-key";
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: PORT, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	const rt = await installFakeRealtime(context);

	/** O "banco": linhas de vtt_token_moves. */
	const table = [];
	const posts = [];
	const gets = [];
	let failInserts = false;
	const serverIso = (ms) => `${new Date(ms).toISOString().slice(0, -1)}456+00:00`;
	await context.route("**/rest/v1/**", async (route) => {
		const req = route.request();
		const url = new URL(req.url());
		const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
		if (url.pathname.endsWith("/vtt_token_moves")) {
			if (req.method() === "GET") {
				gets.push(url.search);
				const scene = (url.searchParams.get("scene_id") || "").replace("eq.", "");
				const [col, dir] = (url.searchParams.get("order") || "created_at.asc").split(".");
				const limit = Number(url.searchParams.get("limit") || 1000);
				const rows = table.filter((r) => r.scene_id === scene).sort((a, b) => Date.parse(a[col]) - Date.parse(b[col]));
				if (dir === "desc") rows.reverse();
				return json(200, rows.slice(0, limit));
			}
			if (req.method() === "POST") {
				const body = JSON.parse(req.postData() || "{}");
				posts.push(body);
				if (failInserts) return json(403, { code: "42501", message: "new row violates row-level security policy" });
				// O servidor carimba a hora (30 s no passado: relógio diferente do da página).
				const record = { ...body, created_at: serverIso(Date.now() - 30_000 + posts.length) };
				table.push(record);
				setTimeout(() => rt.pushChange("vtt_token_moves", { type: "INSERT", record }), 40);
				return route.fulfill({ status: 201, body: "" });
			}
			if (req.method() === "DELETE") {
				table.length = 0;
				return route.fulfill({ status: 204, body: "" });
			}
		}
		if (url.pathname.endsWith("/vtt_tokens") && req.method() === "PATCH") return json(200, { id: "x" });
		return json(200, url.pathname.includes("/rpc/") ? null : []);
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const errors = [];
	const problems = [];
	const expect = (ok, msg) => { if (!ok) problems.push(msg); };

	const mk = (id, name, x, y) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: ["preview-gm-user"] });
	async function open() {
		rt.reset();
		const page = await context.newPage();
		page.on("pageerror", (e) => errors.push(e.message));
		await page.goto(`http://127.0.0.1:${PORT}/campaigns/demo/vtt`, { waitUntil: "domcontentloaded", timeout: 90000 });
		await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
		await page.waitForTimeout(1800);
		await page.evaluate(() => {
			const st = window.__vtt_store__.getState();
			st.setIsGM(true);
			st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: false, fogExploration: false, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
			st.setActiveSceneId("s1");
			st.setViewport({ x: 0, y: 0, scale: 1 });
		});
		await page.waitForTimeout(1500);
		await page.evaluate((tokens) => window.__vtt_store__.getState().setTokens(tokens), [mk("a", "Aria", 455, 455), mk("b", "Bruno", 475, 595)]);
		await page.waitForTimeout(800);
		return page;
	}
	const moves = (page) => page.evaluate(() => window.__move_store__.getState().moves.map((m) => ({ id: m.id, tokenId: m.tokenId, from: m.from, to: m.to, createdAt: m.createdAt, distance: m.distance })));
	const press = async (page, key) => { await page.keyboard.press(key); await page.waitForTimeout(260); };

	// ===== 1. setas: uma linha por casa, hora do servidor =====
	let page = await open();
	await page.evaluate(() => window.__vtt_store__.getState().setSelectedTokenIds(["a"]));
	for (let i = 0; i < 3; i++) await press(page, "ArrowRight");
	await page.waitForTimeout(700);
	let list = await moves(page);
	console.log("1 três casas com a seta         ", `POSTs=${posts.length}`, "linhas na tela:", list.length, "| created_at no POST:", posts.map((p) => "created_at" in p).join(","));
	expect(posts.length === 3, `deveria gravar 3 linhas, gravou ${posts.length}`);
	expect(posts.every((p) => !("created_at" in p)), "o cliente não pode mandar created_at (hora do relógio dele)");
	expect(list.length === 3 && new Set(list.map((m) => m.id)).size === 3, `3 linhas distintas na tela: ${list.length}`);
	expect(list.every((m) => m.createdAt.endsWith("+00:00")), `as linhas deveriam ter sido trocadas pelas do servidor (hora do servidor): ${list.map((m) => m.createdAt)}`);
	expect(list.map((m) => m.to.x).join() === "525,595,665", `ordem das casas: ${list.map((m) => m.to.x)}`);

	// ===== 2. arrasto curto dentro da mesma casa não é movimento =====
	const rect = await page.evaluate(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { left: r.left, top: r.top }; });
	const sx = rect.left + 475;
	const sy = rect.top + 595;
	const before = posts.length;
	await page.mouse.move(sx, sy);
	await page.mouse.down();
	for (let i = 1; i <= 4; i++) { await page.mouse.move(sx + i * 2, sy + i, { steps: 2 }); await page.waitForTimeout(30); }
	await page.mouse.up();
	await page.waitForTimeout(700);
	const bPos = await page.evaluate(() => window.__vtt_store__.getState().tokens.find((t) => t.id === "b"));
	console.log("2 arrasto curto, mesma casa     ", `token em (${bPos.x},${bPos.y})`, "POSTs novos:", posts.length - before);
	expect(bPos.x === 455 && bPos.y === 595, `o token deveria encaixar no centro da casa (455,595): (${bPos.x},${bPos.y})`);
	expect(posts.length === before, `encaixar na mesma casa não pode gerar linha (gerou ${posts.length - before})`);

	// controle: arrastar para outra casa gera 1 linha
	const cx = rect.left + 455;
	await page.mouse.move(cx, sy);
	await page.mouse.down();
	await page.mouse.move(cx + 150, sy, { steps: 8 });
	await page.mouse.up();
	await page.waitForTimeout(800);
	console.log("2 arrasto para outra casa       ", "POSTs novos:", posts.length - before);
	expect(posts.length === before + 1, `arrastar para outra casa deveria gerar 1 linha (gerou ${posts.length - before})`);

	// ===== 3. gravação recusada: avisa e mantém na tela =====
	await page.evaluate(() => { window.__vtt_store__.getState().setSelectedTokenIds(["a"]); window.__move_store__.getState().setPanelOpen(true); });
	failInserts = true;
	await press(page, "ArrowDown");
	await page.waitForTimeout(800);
	const failed = await page.evaluate(() => ({ failed: (window.__move_store__.getState().failedIds ?? []).length, rows: window.__move_store__.getState().moves.length }));
	const warning = await page.getByText("não foram salvos no servidor").count();
	console.log("3 gravação recusada (403)       ", JSON.stringify(failed), "aviso no painel:", warning);
	failInserts = false;
	expect(failed.failed === 1, `a linha recusada deveria ficar marcada como não salva: ${JSON.stringify(failed)}`);
	expect(warning >= 1, "o painel deveria avisar que há movimento não salvo");
	await page.screenshot({ path: "docs/previews/historico-aviso.png" });

	// ===== 4. recarregar: as linhas do banco, em ordem; o aviso some com a linha não salva =====
	await page.close();
	gets.length = 0;
	page = await open();
	await page.evaluate(() => window.__move_store__.getState().setPanelOpen(true));
	await page.waitForTimeout(1200);
	list = await moves(page);
	const getUrl = gets.find((g) => g.includes("scene_id")) || "";
	console.log("4 depois de recarregar          ", `linhas=${list.length}`, "| GET:", decodeURIComponent(getUrl).slice(0, 90));
	expect(list.length === table.length, `deveria trazer as ${table.length} linhas gravadas: trouxe ${list.length}`);
	expect(/order=created_at\.desc/.test(getUrl) && /limit=1000/.test(getUrl), `a carga deveria pedir as mais NOVAS (order desc + limit): ${getUrl}`);
	expect(list.map((m) => Date.parse(m.createdAt)).every((t, i, a) => i === 0 || t >= a[i - 1]), "as linhas deveriam estar em ordem de hora");
	const rows = await page.locator('[role="log"] li').count();
	expect(rows === table.length, `o painel deveria listar ${table.length} linhas: ${rows}`);

	// ===== 5. mais de 1000 linhas: recarregar traz as mais novas =====
	const base = Date.parse("2026-01-01T00:00:00Z");
	for (let n = 0; n < 1100; n++) {
		table.push({ id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, scene_id: "s1", token_id: "a", token_name: "Aria", from_x: 35, from_y: 35, to_x: 105, to_y: 35, distance: 1.5, unit: "m", round: null, kind: "move", author_id: "preview-gm-user", author_name: "Mestre", created_at: serverIso(base + n * 1000) });
	}
	const newest = table.filter((r) => r.created_at.startsWith("2026-11") || r.created_at > "2026-06").map((r) => r.id);
	await page.close();
	page = await open();
	await page.waitForTimeout(1200);
	list = await moves(page);
	const ids = new Set(list.map((m) => m.id));
	console.log("5 com 1100 linhas antigas + novas", `na tela=${list.length}`, "mais nova presente:", newest.every((id) => ids.has(id)), "| mais velha presente:", ids.has("00000000-0000-4000-8000-000000000000"));
	expect(list.length === 1000, `a tela deveria ter 1000 linhas: ${list.length}`);
	expect(newest.every((id) => ids.has(id)), "as linhas NOVAS deveriam aparecer (antes, só vinham as 1000 mais velhas)");
	expect(!ids.has("00000000-0000-4000-8000-000000000000"), "a mais velha deveria ter ficado de fora");

	// ===== 6. outro mestre limpa o histórico =====
	const victim = list.at(-1).id;
	rt.pushChange("vtt_token_moves", { type: "DELETE", old: { id: victim } });
	await page.waitForTimeout(300);
	const afterDelete = await moves(page);
	console.log("6 outro mestre apagou 1 linha   ", `${list.length} → ${afterDelete.length}`);
	expect(afterDelete.length === list.length - 1 && !afterDelete.some((m) => m.id === victim), "o DELETE de outro mestre deveria tirar a linha da tela");

	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	await browser.close();
	await server.close();
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: uma linha por casa com hora do servidor, mesma casa não gera linha, recusa avisa, recarregar traz as mais novas em ordem, DELETE de outro mestre chega");
}
main().catch((e) => { console.error(e); process.exit(1); });
