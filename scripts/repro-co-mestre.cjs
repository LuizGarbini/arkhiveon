// Co-mestre (papel "editor") na mesa: move tokens e abre a ficha, mas vê a
// mesa como jogador (névoa, sem camada do mestre).
// Uso: node scripts/repro-co-mestre.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const GRID = 70;

async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({
		configLoader: "runner",
		mode: "test",
		server: { host: "127.0.0.1", port: 3122, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	const sceneRow = {
		id: "scene-1",
		campaign_id: "demo-tabletop",
		name: "Cripta",
		map_image_url: null,
		grid_type: "square",
		grid_size: GRID,
		grid_color: "#ffffff",
		grid_opacity: 0.2,
		grid_scale_distance: 1.5,
		grid_scale_unit: "m",
		grid_offset_x: 0,
		grid_offset_y: 0,
		map_scale: 1,
		width: 1400,
		height: 900,
		fog_enabled: false,
		fog_exploration: false,
		is_active: true,
		order_index: 0,
	};
	const tokenRow = (over) => ({
		scene_id: "scene-1",
		character_id: null,
		npc_id: null,
		avatar_url: null,
		layer: "token",
		size_cells: 1,
		rotation: 0,
		hp_current: 30,
		hp_max: 40,
		temp_hp: 0,
		elevation: 0,
		conditions: [],
		auras: [],
		vision_range: 6,
		is_locked: false,
		is_hidden: false,
		controlled_by: [],
		created_at: "2026-11-09T22:00:00.000Z",
		...over,
	});
	const tokenRows = [
		tokenRow({
			id: "t1",
			name: "Thorin",
			character_id: "c-thorin",
			x: GRID * 4.5,
			y: GRID * 3.5,
		}),
		tokenRow({ id: "m1", name: "Carniçal", x: GRID * 8.5, y: GRID * 3.5 }),
		tokenRow({
			id: "gm1",
			name: "Vampiro escondido",
			layer: "gm",
			x: GRID * 10.5,
			y: GRID * 5.5,
		}),
	];
	await context.route("**/rest/v1/**", (route) => {
		const request = route.request();
		const url = request.url();
		const json = (body) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(body),
			});
		if (request.method() === "PATCH") return json({ id: "m1" });
		if (url.includes("/vtt_scenes")) return json([sceneRow]);
		if (url.includes("/vtt_tokens")) return json(tokenRows);
		return json([]);
	});
	const asOwner = process.env.ROLE === "owner";
	const campaign = {
		id: "demo-tabletop",
		name: "Mesa do co-mestre",
		ownerId: asOwner ? "preview-gm-user" : "dono-da-mesa",
		myRole: asOwner ? "owner" : "editor",
	};
	await context.addInitScript((c) => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem(
			"rpg-notes-storage",
			JSON.stringify({
				state: {
					campaigns: [c],
					characters: [
						{
							id: "c-thorin",
							system: "dnd5e",
							characterName: "Thorin",
							race: "Anão",
							class: "Guerreiro",
							level: 5,
							strength: 16,
							speed: 9,
							health: 30,
							healthMax: 40,
						},
					],
					hasLoadedCampaigns: true,
					campaignLoadStatus: "ready",
					activeCampaignId: c.id,
				},
				version: 0,
			}),
		);
	}, campaign);
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	try {
		await page.goto("http://127.0.0.1:3122/campaigns/demo-tabletop/vtt", {
			waitUntil: "domcontentloaded",
			timeout: 90000,
		});
		await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
		await page.waitForTimeout(1200);
		// O modo de preview pode criar uma campanha "owner" antes de hidratar:
		// fixa a mesa como co-mestre (a cena volta a carregar pelo REST).
		await page.evaluate(
			(c) =>
				window.__rpg_store__.setState({
					campaigns: [c],
					activeCampaignId: c.id,
				}),
			campaign,
		);
		await page.waitForFunction(
			(owner) => window.__vtt_store__.getState().isGM === owner,
			asOwner,
		);
		await page
			.locator("canvas")
			.first()
			.waitFor({ timeout: 20000 });
		await page.waitForFunction(
			() => window.__vtt_store__.getState().tokens.length === 3,
		);
		await page.evaluate(() =>
			window.__vtt_store__.getState().setViewport({ x: 0, y: 0, scale: 1 }),
		);
		await page.waitForTimeout(600);

		const role = await page.evaluate(() => {
			const s = window.__vtt_store__.getState();
			return { isGM: s.isGM };
		});
		assert.equal(role.isGM, asOwner, "co-mestre não vê a mesa como mestre");

		// Arrastar o monstro (sem dono) duas casas para a direita.
		await page.mouse.move(GRID * 8.5, GRID * 3.5);
		await page.mouse.down();
		await page.mouse.move(GRID * 9.5, GRID * 3.5, { steps: 5 });
		await page.mouse.move(GRID * 10.5, GRID * 3.5, { steps: 5 });
		await page.mouse.up();
		await page.waitForTimeout(300);
		const moved = await page.evaluate(
			() => window.__vtt_store__.getState().tokens.find((t) => t.id === "m1").x,
		);
		assert.equal(moved, GRID * 10.5, `co-mestre move o token (x=${moved})`);

		// Duplo clique no personagem abre a ficha na mesa.
		await page.waitForTimeout(450);
		// Clique antes: o duplo clique instantâneo do Playwright cai no meio do
		// redesenho dos tokens quando a seleção muda (gente leva > 50 ms).
		await page.mouse.click(GRID * 4.5, GRID * 3.5);
		await page.waitForTimeout(450);
		await page.mouse.dblclick(GRID * 4.5, GRID * 3.5);
		await page.waitForTimeout(300);
		const sheet = await page.evaluate(
			() => window.__vtt_store__.getState().showCharacterSheetId,
		);
		assert.equal(sheet, "t1", "duplo clique abre a ficha");

		// Botão direito abre o menu do token.
		await page.keyboard.press("Escape");
		await page.mouse.click(GRID * 10.5, GRID * 3.5, { button: "right" });
		await page.waitForTimeout(300);
		const menu = await page.evaluate(
			() => window.__vtt_store__.getState().activeTokenIdForMenu,
		);
		assert.equal(menu, "m1", "botão direito abre o menu do token");

		// O token da camada do mestre continua invisível para o co-mestre.
		const gmTokenVisible = await page.evaluate(() =>
			window.__vtt_store__
				.getState()
				.tokens.some((t) => t.id === "gm1" && t.layer === "gm"),
		);
		assert.ok(gmTokenVisible, "fixture tem token na camada do mestre");
		console.log("Co-mestre: move, abre ficha e menu — ok");
		if (errors.length) console.warn("erros na página", errors);
	} finally {
		await browser.close();
		await server.close();
	}
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
