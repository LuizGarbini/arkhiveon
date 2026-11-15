// Verificação: áreas de luz. O mestre desenha áreas (mouse de verdade, painel de
// verdade) e o alcance de visão do personagem muda conforme a luz do LUGAR onde
// ele está: dia > penumbra > escuridão, dentro da área; fora dela, a luz da cena.
// Mede a visão pelo que o personagem passa a ter explorado (células) a cada luz.
// Uso: pnpm check:light-zones   (sai com código 1 se algo não bater)
const { chromium } = require("playwright");
async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: 3121, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	const sent = [];
	await context.route("**/rest/v1/**", (r) => {
		const req = r.request();
		if (req.url().includes("vtt_light_zones") && req.method() !== "GET") sent.push({ method: req.method(), url: req.url(), body: req.postData() });
		return r.fulfill({ status: 200, contentType: "application/json", body: req.url().includes("/rpc/") ? "null" : "[]" });
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3121/campaigns/demo/vtt", { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__ && window.__explored_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: true, fogExploration: true, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(1500);
	await page.evaluate(() => window.__vtt_store__.getState().setTokens([{ id: "pc", sceneId: "s1", name: "Dante", characterId: "dante", layer: "token", x: 420, y: 455, sizeCells: 1, rotation: 90, elevation: 0, conditions: [], auras: [], visionRange: 5, isLocked: false, isHidden: false, controlledBy: [] }]));
	await page.waitForTimeout(2500);

	let nudge = 0;
	// Quanto o personagem enxerga agora: apaga a memória, força a visão a recalcular
	// (gira 1 grau) e conta as células vistas.
	const measure = async () => {
		await page.evaluate((n) => {
			window.__explored_store__.getState().clear("s1");
			window.__vtt_store__.getState().updateToken("pc", { rotation: 90 + (n % 2) });
		}, ++nudge);
		await page.waitForTimeout(2200);
		return page.evaluate(() => {
			const g = window.__explored_store__.getState().grid;
			let n = 0;
			if (g) for (let i = 0; i < g.cols * g.rows; i++) if ((g.bits[i >> 3] >> (i & 7)) & 1) n++;
			return n;
		});
	};
	const setToken = async (x, y) => {
		await page.evaluate(([x, y]) => window.__vtt_store__.getState().updateToken("pc", { x, y }), [x, y]);
	};

	const bright1 = await measure();
	console.log("1 luz do dia (cena)         ", bright1, "células");

	// ---- o mestre desenha um círculo ESCURO em volta do personagem, com o mouse ----
	const box = await page.locator("canvas").first().boundingBox();
	const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
	const at = (x, y) => ({ x: box.x + vp.x + x * vp.scale, y: box.y + vp.y + y * vp.scale });
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(true);
		st.setLightDrawShape("circle");
		st.setLightDrawLevel("dark");
		st.setActiveTool("light");
	});
	await page.waitForTimeout(800);
	const c = at(420, 455);
	const e1 = at(420 + 140, 455);
	await page.mouse.move(c.x, c.y);
	await page.mouse.down();
	await page.mouse.move((c.x + e1.x) / 2, c.y, { steps: 4 });
	await page.mouse.move(e1.x, e1.y, { steps: 4 });
	await page.mouse.up();
	await page.waitForTimeout(800);
	const afterDraw = await page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		return { zones: s.lightZones.map((z) => ({ shape: z.shape, level: z.level, radius: z.radius })), selected: s.selectedLightZoneId };
	});
	console.log("2 círculo desenhado          ", JSON.stringify(afterDraw));
	await page.screenshot({ path: "docs/previews/light-1-gm-zone-dark.png" });
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(false));
	const dark = await measure();
	console.log("3 DENTRO da área escura      ", dark, "células");

	// ---- o mestre troca a luz da área pelo PAINEL: Penumbra ----
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(true));
	await page.waitForTimeout(600);
	const group = page.getByRole("group", { name: "Luz da área selecionada" });
	await group.getByRole("button", { name: "Penumbra" }).click();
	await page.waitForTimeout(500);
	const lvl = await page.evaluate(() => window.__vtt_store__.getState().lightZones[0]?.level);
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(false));
	const dim = await measure();
	console.log("4 DENTRO, agora penumbra     ", dim, "células (nível:", lvl + ")");

	// ---- fora da área: vale a luz da cena ----
	await setToken(1000, 455);
	const outside = await measure();
	console.log("5 FORA da área               ", outside, "células");
	await setToken(420, 455);
	const back = await measure();
	console.log("6 de volta DENTRO            ", back, "células");

	// ---- o mestre apaga a área (seleciona e Delete) ----
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(true);
		st.setLightDrawShape("select");
		st.setActiveTool("light");
	});
	await page.waitForTimeout(500);
	await page.mouse.click(c.x, c.y - 60);
	await page.waitForTimeout(400);
	const selectedId = await page.evaluate(() => window.__vtt_store__.getState().selectedLightZoneId);
	await page.keyboard.press("Delete");
	await page.waitForTimeout(800);
	const afterDelete = await page.evaluate(() => window.__vtt_store__.getState().lightZones.length);
	await page.evaluate(() => window.__vtt_store__.getState().setIsGM(false));
	const gone = await measure();
	console.log("7 área apagada               ", gone, "células (áreas:", afterDelete + ", selecionada antes:", selectedId ? "sim" : "não" + ")");

	// ---- outras formas: retângulo (arrasto) e polígono (cliques + Enter) ----
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(true);
		st.setLightDrawLevel("bright");
		st.setLightDrawShape("rect");
		st.setActiveTool("light");
	});
	await page.waitForTimeout(500);
	const r1 = at(700, 300), r2 = at(900, 400);
	await page.mouse.move(r1.x, r1.y);
	await page.mouse.down();
	await page.mouse.move(r2.x, r2.y, { steps: 6 });
	await page.mouse.up();
	await page.waitForTimeout(600);
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setLightDrawLevel("dim");
		st.setLightDrawShape("polygon");
	});
	for (const [x, y] of [[700, 600], [900, 600], [800, 760]]) {
		const p = at(x, y);
		await page.mouse.click(p.x, p.y);
		await page.waitForTimeout(450);
	}
	const draft = await page.evaluate(() => window.__vtt_store__.getState().lightDraft.length);
	await page.keyboard.press("Enter");
	await page.waitForTimeout(800);
	const shapes = await page.evaluate(() => window.__vtt_store__.getState().lightZones.map((z) => z.shape + ":" + z.level));
	console.log("8 formas                     ", JSON.stringify(shapes), "pontos antes do Enter:", draft);
	// um terceiro círculo escuro só para a foto mostrar as três luzes
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setLightDrawLevel("dark");
		st.setLightDrawShape("circle");
	});
	const k1 = at(1150, 450), k2 = at(1150 + 90, 450);
	await page.mouse.move(k1.x, k1.y);
	await page.mouse.down();
	await page.mouse.move(k2.x, k2.y, { steps: 5 });
	await page.mouse.up();
	await page.waitForTimeout(700);
	await page.screenshot({ path: "docs/previews/light-2-gm-three-lights.png" });
	const total = await page.evaluate(() => window.__vtt_store__.getState().lightZones.length);
	await browser.close();
	await server.close();

	const problems = [];
	if (afterDraw.zones.length !== 1 || afterDraw.zones[0].shape !== "circle" || afterDraw.zones[0].level !== "dark") problems.push("o círculo escuro não foi criado pelo desenho do mouse");
	if (!(afterDraw.zones[0]?.radius > 120 && afterDraw.zones[0]?.radius < 160)) problems.push(`raio do círculo fora do esperado (${afterDraw.zones[0]?.radius})`);
	if (!afterDraw.selected) problems.push("a área recém-criada deveria nascer selecionada");
	if (!(bright1 >= 60)) problems.push(`luz do dia: visão pequena demais (${bright1})`);
	if (!(dark <= bright1 * 0.2)) problems.push(`escuridão não reduziu a visão o bastante: dia ${bright1}, escuro ${dark}`);
	if (lvl !== "dim") problems.push(`o painel não trocou a luz da área (nível: ${lvl})`);
	if (!(dim > dark * 1.5 && dim < bright1 * 0.8)) problems.push(`penumbra deveria ficar entre o escuro e o dia: ${dark} < ${dim} < ${bright1}`);
	if (!(outside >= bright1 * 0.85 && outside <= bright1 * 1.15)) problems.push(`fora da área deveria valer a luz da cena: dia ${bright1}, fora ${outside}`);
	if (!(back <= dim * 1.2 && back >= dim * 0.8)) problems.push(`de volta à área deveria voltar à visão da penumbra: ${dim} vs ${back}`);
	if (!selectedId) problems.push("clicar na área no modo Selecionar não a selecionou");
	if (afterDelete !== 0) problems.push("Delete não apagou a área selecionada");
	if (!(gone >= bright1 * 0.85)) problems.push(`sem a área a visão deveria voltar ao dia: ${bright1} vs ${gone}`);
	if (draft !== 3) problems.push(`o polígono deveria ter 3 pontos antes do Enter (${draft})`);
	if (!(shapes.includes("rect:bright") && shapes.includes("polygon:dim"))) problems.push(`faltou retângulo ou polígono: ${JSON.stringify(shapes)}`);
	if (total !== 3) problems.push(`esperava 3 áreas no fim (${total})`);
	const inserts = sent.filter((s) => s.method === "POST");
	const deletes = sent.filter((s) => s.method === "DELETE");
	const patches = sent.filter((s) => s.method === "PATCH");
	console.log("banco: POST", inserts.length, "PATCH", patches.length, "DELETE", deletes.length);
	if (inserts.length < 4) problems.push(`esperava 4 gravações de áreas (${inserts.length})`);
	if (patches.length !== 1) problems.push(`esperava 1 troca de luz gravada (${patches.length})`);
	if (deletes.length !== 1) problems.push(`esperava 1 exclusão gravada (${deletes.length})`);
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: a visão acompanha a luz do lugar (dia > penumbra > escuro); círculo, retângulo e polígono; painel; apagar");
}
main().catch((e) => { console.error(e); process.exit(1); });
