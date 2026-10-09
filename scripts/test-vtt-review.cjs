// PR 77 regression flow on top of the #84 table: in-table sheet, spell
// templates, ruler readout and the token panel at the screen edge.
// Network responses are faked (REST + realtime) like scripts/test-vtt.cjs.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startPreviewRecorder } = require("./vtt-preview-recorder.cjs");

// Every control of the #84 token panel (plus "Ficha"); checkMenu fails if
// any is missing, under 44px, off screen or covered (e.g. by the footer).
const MENU_CONTROLS = [
	"Abrir ficha na mesa",
	"Fechar menu do token",
	"-5",
	"-1",
	"+1",
	"+5",
	"Dano",
	"Cura",
	"Envenenado",
	"Caído",
	"Cego",
	"Atordoado",
	"Invisível",
	"Em Chamas",
	"Concentração",
	"Tamanho 1 por 1 células",
	"Tamanho 2 por 2 células",
	"Tamanho 3 por 3 células",
	"Tamanho 4 por 4 células",
	"Diminuir elevação em 1,5 metro",
	"Aumentar elevação em 1,5 metro",
	"Girar Token (45º)",
	"Ocultar dos Jogadores",
	"Mover para Camada do Mestre (GM Layer)",
	"Travar no Lugar",
	"Excluir",
];

// Fake REST + realtime and a GM preview session, shared by every context.
async function setupContext(context, writes) {
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	await context.route("**/rest/v1/**", (route) => {
		const request = route.request();
		if (request.method() === "PATCH") {
			writes.push(request.postDataJSON());
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ id: "b" }),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "[]",
		});
	});
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem(
			"rpg-notes-storage",
			JSON.stringify({
				state: {
					campaigns: [
						{
							id: "demo-tabletop",
							name: "Mesa de revisão",
							ownerId: "preview-gm-user",
							myRole: "owner",
						},
					],
					characters: [],
					hasLoadedCampaigns: true,
					campaignLoadStatus: "ready",
					activeCampaignId: "demo-tabletop",
				},
				version: 0,
			}),
		);
	});
}

// Scene "Arena de testes" with tokens A (315,245) and B (595,245), camera at 0,0 x1.
async function loadFixture(page, overridesB = {}) {
	await page.goto(`${process.env.VTT_BASE_URL}/campaigns/demo-tabletop/vtt`);
	await page.waitForFunction(() => window.__vtt_store__);
	await page.waitForTimeout(1000);
	await page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		s.setIsGM(true);
		s.setScenes([
			{
				id: "scene",
				campaignId: "demo-tabletop",
				name: "Arena de testes",
				gridType: "square",
				gridSize: 70,
				gridColor: "white",
				gridOpacity: 0.2,
				gridScaleDistance: 1.5,
				gridScaleUnit: "m",
				width: 1600,
				height: 1200,
				fogEnabled: false,
				fogExploration: false,
				isActive: true,
				orderIndex: 0,
			},
		]);
		s.setActiveSceneId("scene");
	});
	await page.locator("canvas").first().waitFor();
	await page.waitForTimeout(500);
	await page.evaluate((b) => {
		const s = window.__vtt_store__.getState();
		const a = {
			id: "a",
			sceneId: "scene",
			characterId: "hero",
			name: "Sentinela A",
			x: 315,
			y: 245,
			layer: "token",
			sizeCells: 1,
			rotation: 0,
			elevation: 0,
			conditions: [],
			auras: [],
			visionRange: 6,
			isLocked: false,
			isHidden: false,
			controlledBy: [],
			hpCurrent: 20,
			hpMax: 20,
		};
		s.setTokens([a, { ...a, id: "b", name: "Sentinela B", x: 595, hpCurrent: 10, ...b }]);
		s.setViewport({ x: 0, y: 0, scale: 1 });
	}, overridesB);
}

// Selection and token-panel state read back from the table store.
function tableState(page) {
	return page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		return {
			selected: s.selectedTokenIds,
			menu: s.activeTokenIdForMenu,
			tokens: Object.fromEntries(s.tokens.map((t) => [t.id, { x: t.x, y: t.y }])),
		};
	});
}

async function expectSelection(page, selected, menu, why) {
	await page.waitForFunction(
		({ selected, menu }) => {
			const s = window.__vtt_store__.getState();
			return (
				JSON.stringify(s.selectedTokenIds) === JSON.stringify(selected) &&
				s.activeTokenIdForMenu === menu
			);
		},
		{ selected, menu },
		{ timeout: 3000 },
	).catch(async () => {
		const state = await tableState(page);
		assert.fail(`${why}: esperado seleção ${JSON.stringify(selected)} e painel ${menu}, obtido ${JSON.stringify(state)}`);
	});
	const panel = page.getByRole("button", { name: "Fechar menu do token" });
	if (menu) await panel.waitFor();
	else await panel.waitFor({ state: "detached" });
}

// First candidate point whose top element is the table canvas (no panel/HUD).
async function emptyCanvasPoint(page, candidates) {
	const point = await page.evaluate((points) => {
		for (const [x, y] of points) {
			if (document.elementFromPoint(x, y)?.tagName === "CANVAS") return { x, y };
		}
		return null;
	}, candidates);
	assert.ok(point, "nenhum ponto vazio da mesa disponível");
	return point;
}

// Scene buttons, badge boxes and scroll state of the scene bar.
function readSceneBar(page) {
	return page.evaluate(() => {
		const nav = document.querySelector('nav[aria-label="Cenas da mesa"]');
		const navRect = nav.getBoundingClientRect();
		const box = (r) => ({
			left: Math.round(r.left * 10) / 10,
			right: Math.round(r.right * 10) / 10,
			top: Math.round(r.top * 10) / 10,
			bottom: Math.round(r.bottom * 10) / 10,
		});
		return {
			nav: box(navRect),
			scrollLeft: nav.scrollLeft,
			scrollWidth: nav.scrollWidth,
			clientWidth: nav.clientWidth,
			windowScrollY: window.scrollY,
			needsScroll: nav.scrollWidth > nav.clientWidth,
			scenes: [...nav.querySelectorAll("button")].map((btn) => {
				const [name, badge] = btn.querySelectorAll("span");
				const b = badge.getBoundingClientRect();
				return {
					name: name.textContent,
					height: btn.getBoundingClientRect().height,
					truncated: name.scrollWidth > name.clientWidth,
					lines: Math.round(
						name.getBoundingClientRect().height /
							Number.parseFloat(getComputedStyle(name).lineHeight),
					),
					badge: badge.textContent,
					badgeBox: box(b),
					badgeShown: getComputedStyle(badge).display !== "none" && b.width > 0,
					badgeInNav: b.left >= navRect.left && b.right <= navRect.right,
				};
			}),
			actions: ["Exibir cena aos jogadores", "Nova cena"]
				.map((label) => document.querySelector(`[aria-label="${label}"]`))
				.filter(Boolean)
				.map((el) => el.getBoundingClientRect().height),
		};
	});
}

// Scenes as the REST API returns them, for a real page load of the table.
function sceneRows(scenes) {
	return scenes.map(([id, name, isActive], index) => ({
		id,
		campaign_id: "demo-tabletop",
		name,
		map_image_url: null,
		grid_type: "square",
		grid_size: 70,
		grid_color: "white",
		grid_opacity: 0.2,
		grid_scale_distance: 1.5,
		grid_scale_unit: "m",
		width: 1600,
		height: 1200,
		fog_enabled: false,
		fog_exploration: false,
		is_active: isActive,
		order_index: index,
		created_at: "2026-10-08T12:00:00Z",
		updated_at: "2026-10-08T12:00:00Z",
	}));
}

const IN_PLAY_LAST = [
	["taverna", "Taverna", false],
	["ruinas", "Ruínas da Cidadela Submersa", false],
	["arena", "Arena do Pântano", true],
];

function assertLiveBadgeVisible(bar, scrollYBefore, why) {
	const live = bar.scenes.find((scene) => scene.badge === "Em jogo");
	assert.ok(live, `nenhum selo "Em jogo" na barra (${why})`);
	assert.ok(
		live.badgeInNav,
		`selo "Em jogo" de "${live.name}" fora da barra visível sem rolar (${why}): selo ${JSON.stringify(live.badgeBox)}, barra ${JSON.stringify(bar.nav)}, scrollLeft ${bar.scrollLeft}`,
	);
	assert.equal(bar.windowScrollY, scrollYBefore, `a página rolou na vertical (${why})`);
}

// Scene bar with one "Em jogo" scene and one "Preparação" scene with a long
// name, the Preparação one selected (tightest bar for the GM). Then three
// scenes with the in-play one LAST in order_index: "Em jogo" must be visible
// without any user scroll, both when another scene goes live and on a real
// page load, and selecting a scene must not scroll the bar.
async function checkSceneBadges(browser, viewport, extra, errors) {
	const context = await browser.newContext({ viewport, ...extra });
	await setupContext(context, []);
	const page = await context.newPage();
	page.on("pageerror", (e) => errors.push(e.message));
	const where = `${viewport.width}x${viewport.height}`;
	try {
		await loadFixture(page);
		await page.evaluate(() => {
			const s = window.__vtt_store__.getState();
			const [base] = s.scenes;
			s.setScenes([
				{ ...base, id: "live", name: "Taverna", isActive: true, orderIndex: 0 },
				{ ...base, id: "prep", name: "Ruínas da Cidadela Submersa", isActive: false, orderIndex: 1 },
			]);
			s.setActiveSceneId("prep");
		});
		await page.getByRole("button", { name: "Exibir cena aos jogadores" }).waitFor();
		await page.waitForTimeout(300);
		const bar = await readSceneBar(page);
		const [live, prep] = bar.scenes;
		assert.deepEqual([live.badge, prep.badge], ["Em jogo", "Preparação"], `selos das cenas (${where})`);
		for (const scene of bar.scenes) {
			assert.ok(scene.height >= 44, `cena "${scene.name}" com ${scene.height}px de altura (${where})`);
			assert.equal(scene.lines, 1, `nome da cena "${scene.name}" quebrou linha (${where})`);
			assert.ok(scene.badgeShown, `selo "${scene.badge}" escondido (${where})`);
		}
		for (const h of bar.actions) assert.ok(h >= 44, `ação da barra de cenas com ${h}px (${where})`);
		assert.equal(live.truncated, false, `nome curto "${live.name}" cortado (${where})`);
		assert.equal(prep.truncated, true, `nome longo deveria terminar em reticências (${where})`);
		assert.ok(live.badgeInNav, `selo "Em jogo" fora da área visível (${where})`);
		if (bar.needsScroll) {
			// Phone: the second scene is reached by scrolling the scene bar.
			const reachable = await page.evaluate(() => {
				const nav = document.querySelector('nav[aria-label="Cenas da mesa"]');
				nav.scrollLeft = nav.scrollWidth;
				const badge = nav.querySelectorAll("button")[1].querySelectorAll("span")[1];
				const b = badge.getBoundingClientRect();
				const n = nav.getBoundingClientRect();
				return b.left >= n.left && b.right <= n.right;
			});
			assert.ok(reachable, `selo "Preparação" inacessível mesmo rolando a barra (${where})`);
		} else {
			assert.ok(prep.badgeInNav, `selo "Preparação" fora da área visível (${where})`);
		}

		// Three scenes, in-play LAST, a Preparação scene selected: the live
		// scene changes in the store (as when the GM shows another scene).
		await loadFixture(page);
		const scrollYBefore = await page.evaluate(() => window.scrollY);
		await page.evaluate((scenes) => {
			const s = window.__vtt_store__.getState();
			const [base] = s.scenes;
			s.setScenes(
				scenes.map(([id, name, isActive], orderIndex) => ({ ...base, id, name, isActive, orderIndex })),
			);
			s.setActiveSceneId("ruinas");
		}, IN_PLAY_LAST);
		await page.getByRole("button", { name: "Exibir cena aos jogadores" }).waitFor();
		await page.waitForTimeout(300);
		const liveChange = await readSceneBar(page);
		assert.deepEqual(
			liveChange.scenes.map((scene) => scene.badge),
			["Preparação", "Preparação", "Em jogo"],
			`selos das três cenas (${where})`,
		);
		for (const scene of liveChange.scenes) {
			assert.ok(scene.height >= 44, `cena "${scene.name}" com ${scene.height}px de altura (${where})`);
			assert.equal(scene.lines, 1, `nome da cena "${scene.name}" quebrou linha (${where})`);
		}
		assertLiveBadgeVisible(liveChange, scrollYBefore, `cena em jogo por último, ${where}`);
	} finally {
		await context.close();
	}

	// Real page load: the API returns the three scenes, the table picks the
	// in-play one; nothing scrolls the bar but the bar itself.
	const loadContext = await browser.newContext({ viewport, ...extra });
	await setupContext(loadContext, []);
	await loadContext.route("**/rest/v1/vtt_scenes*", (route) =>
		route.request().method() === "GET"
			? route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(sceneRows(IN_PLAY_LAST)),
				})
			: route.fallback(),
	);
	const loadPage = await loadContext.newPage();
	loadPage.on("pageerror", (e) => errors.push(e.message));
	try {
		await loadPage.goto(`${process.env.VTT_BASE_URL}/campaigns/demo-tabletop/vtt`);
		await loadPage.locator('nav[aria-label="Cenas da mesa"] button').nth(2).waitFor();
		await loadPage.waitForTimeout(500);
		const loaded = await readSceneBar(loadPage);
		assert.equal(loaded.scenes.length, 3, `três cenas carregadas (${where})`);
		assertLiveBadgeVisible(loaded, 0, `carregamento com a cena em jogo por último, ${where}`);
		// Selecting a scene never scrolls the bar.
		await loadPage.evaluate(() => window.__vtt_store__.getState().setActiveSceneId("taverna"));
		await loadPage.waitForTimeout(300);
		const selected = await readSceneBar(loadPage);
		assert.equal(selected.scrollLeft, loaded.scrollLeft, `selecionar cena rolou a barra (${where})`);
		// Another scene going live is revealed again.
		await loadPage.evaluate(() => {
			const s = window.__vtt_store__.getState();
			s.setScenes(s.scenes.map((scene) => ({ ...scene, isActive: scene.id === "taverna" })));
		});
		await loadPage.waitForTimeout(300);
		const relive = await readSceneBar(loadPage);
		assertLiveBadgeVisible(relive, 0, `nova cena em jogo, ${where}`);
		assert.equal(relive.scenes[0].badge, "Em jogo", `Taverna em jogo (${where})`);
	} finally {
		await loadContext.close();
	}
}

// In-memory vtt_scenes behind the fake REST. With deliverTwice every scene
// POST is applied twice, as when the same request reaches the server again
// (a network-level retry, or a retry after an error whose insert committed);
// the client gets the second answer. Postgres rejects a repeated id with
// 23505, like PostgREST does.
async function fakeSceneTable(context, { deliverTwice }) {
	const table = { rows: [], posts: 0 };
	const now = "2026-10-08T12:00:00Z";
	const insert = (body) => {
		const id = body.id ?? `servidor-${table.rows.length + 1}`;
		if (table.rows.some((row) => row.id === id)) {
			return {
				status: 409,
				body: {
					code: "23505",
					details: `Key (id)=(${id}) already exists.`,
					hint: null,
					message: 'duplicate key value violates unique constraint "vtt_scenes_pkey"',
				},
			};
		}
		const row = {
			grid_color: "white",
			grid_opacity: 0.2,
			fog_enabled: false,
			fog_exploration: false,
			created_at: now,
			updated_at: now,
			...body,
			id,
		};
		table.rows.push(row);
		return { status: 201, body: row };
	};
	await context.route("**/rest/v1/vtt_scenes*", (route) => {
		const request = route.request();
		const single = (request.headers().accept ?? "").includes("vnd.pgrst.object");
		if (request.method() === "POST") {
			table.posts++;
			const body = request.postDataJSON();
			let result = insert(body);
			if (deliverTwice) result = insert(body);
			return route.fulfill({
				status: result.status,
				contentType: "application/json",
				body: JSON.stringify(result.body),
			});
		}
		if (request.method() === "GET") {
			const id = new URL(request.url()).searchParams.get("id")?.replace(/^eq\./, "");
			const rows = id ? table.rows.filter((row) => row.id === id) : table.rows;
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(single ? rows[0] : rows),
			});
		}
		return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
	});
	return table;
}

// Bug 04: one press creates one scene, even when the create reaches the
// server twice. First scene from the empty table (double press on desktop),
// then "Nova cena" → "Criar Cena" with one real click/tap; a reload shows
// what the database kept.
async function checkCreateSceneOnce(browser, viewport, extra, errors) {
	const context = await browser.newContext({ viewport, ...extra });
	await setupContext(context, []);
	const table = await fakeSceneTable(context, { deliverTwice: true });
	const page = await context.newPage();
	page.on("pageerror", (e) => errors.push(e.message));
	const where = `${viewport.width}x${viewport.height}`;
	const press = (locator) => (extra.hasTouch ? locator.tap() : locator.click());
	const sceneButtons = page.locator('nav[aria-label="Cenas da mesa"] button');
	try {
		await page.goto(`${process.env.VTT_BASE_URL}/campaigns/demo-tabletop/vtt`);
		const first = page.getByRole("button", { name: "Criar Primeira Cena" });
		await first.waitFor();
		if (extra.hasTouch) await first.tap();
		else await first.dblclick();
		await sceneButtons.first().waitFor();
		await page.waitForTimeout(500);
		assert.equal(table.rows.length, 1, `primeira cena criada ${table.rows.length} vezes (${where})`);

		await press(page.getByRole("button", { name: "Nova cena" }));
		await page.getByPlaceholder("Ex: Taverna do Javali Bêbado").fill("Smoke Audit 2026-10-08");
		await press(page.getByRole("button", { name: "Criar Cena" }));
		await page.getByRole("dialog").waitFor({ state: "detached" });
		await page.waitForTimeout(500);
		const copies = table.rows.filter((row) => row.name === "Smoke Audit 2026-10-08");
		assert.equal(copies.length, 1, `um clique em "Criar Cena" gravou ${copies.length} cenas (${where})`);
		const inStore = await page.evaluate(
			() =>
				window.__vtt_store__
					.getState()
					.scenes.filter((scene) => scene.name === "Smoke Audit 2026-10-08").length,
		);
		assert.equal(inStore, 1, `${inStore} cenas "Smoke Audit" na mesa (${where})`);

		await page.reload();
		await sceneButtons.nth(1).waitFor();
		await page.waitForTimeout(500);
		const names = await sceneButtons.allTextContents();
		const shown = names.filter((name) => name.startsWith("Smoke Audit")).length;
		assert.equal(names.length, 2, `barra com ${names.length} cenas após recarregar (${where}): ${names}`);
		assert.equal(shown, 1, `${shown} cenas "Smoke Audit" após recarregar (${where})`);
	} finally {
		await context.close();
	}
}

// Fake characters/vtt_tokens tables (whole sheet kept in `data`) and one
// active scene, so a sheet saved in the UI can be read back and placed.
async function fakeSheetTables(context) {
	const db = { characters: [], tokens: [] };
	const now = "2026-10-09T12:00:00Z";
	const scene = {
		id: "cena-pv",
		campaign_id: "demo-tabletop",
		name: "Cena PV",
		map_image_url: null,
		grid_type: "square",
		grid_size: 70,
		grid_color: "white",
		grid_opacity: 0.2,
		width: 1600,
		height: 1200,
		fog_enabled: false,
		fog_exploration: false,
		is_active: true,
		order_index: 0,
		created_at: now,
		updated_at: now,
	};
	const reply = (route, status, body) =>
		route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
	await context.route(/\/rest\/v1\/(characters|vtt_scenes|vtt_tokens)/, (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const table = url.pathname.split("/").pop();
		const single = (request.headers().accept ?? "").includes("vnd.pgrst.object");
		const id = url.searchParams.get("id")?.replace(/^eq\./, "");
		const rows = table === "characters" ? db.characters : db.tokens;
		if (table === "vtt_scenes") return reply(route, 200, single ? scene : [scene]);
		if (request.method() === "POST") {
			const body = request.postDataJSON();
			const row = {
				id: `${table}-${rows.length + 1}`,
				conditions: [],
				created_at: now,
				updated_at: now,
				...(Array.isArray(body) ? body[0] : body),
			};
			rows.push(row);
			return reply(route, 201, single ? row : [row]);
		}
		if (request.method() === "PATCH") {
			const row = rows.find((r) => r.id === id);
			if (row) Object.assign(row, request.postDataJSON());
			return reply(route, 200, single ? row : [row]);
		}
		const found = id ? rows.filter((r) => r.id === id) : rows;
		return reply(route, 200, single ? found[0] : found);
	});
	return db;
}

// Bug 05: a typed max HP is what the sheet and its token get. (1) Wizard with
// only "HP Máximo" = 12; (2) a 0/0 sheet left by the old wizard, edited to
// max 12 in "Combate". Both read back from the fake table and the placed token.
async function checkSheetMaxHp(browser, viewport, extra, errors) {
	const context = await browser.newContext({ viewport, ...extra });
	await setupContext(context, []);
	const db = await fakeSheetTables(context);
	const page = await context.newPage();
	page.on("pageerror", (e) => errors.push(e.message));
	const where = `${viewport.width}x${viewport.height}`;
	const press = (locator) => (extra.hasTouch ? locator.tap() : locator.click());
	const go = (to) =>
		page.evaluate((url) => {
			history.pushState({}, "", url);
			dispatchEvent(new PopStateEvent("popstate"));
		}, to);
	const saved = (name) => db.characters.find((row) => row.name === name)?.data;
	const sheetPv = () =>
		page.evaluate(() => {
			const label = [...document.querySelectorAll("*")].find(
				(el) => el.children.length === 0 && el.textContent.trim() === "PV",
			);
			return label?.parentElement?.textContent?.replace(/^PV/, "").trim();
		});
	const placeToken = async (name) => {
		await go("/campaigns/demo-tabletop/vtt");
		await page.locator('nav[aria-label="Cenas da mesa"] button').first().waitFor();
		await page.waitForTimeout(500);
		const roster = page.getByRole("button", { name: "Personagens e NPCs" });
		if ((await roster.getAttribute("aria-expanded")) !== "true") await press(roster);
		await press(
			page
				.getByRole("complementary", { name: "Biblioteca da mesa" })
				.getByRole("button", { name: "Fichas", exact: true }),
		);
		const card = page.locator("div.rounded-xl", { has: page.locator(`h3:text-is("${name}")`) }).first();
		await press(card.getByRole("button", { name: "Colocar" }));
		await page.waitForFunction((n) => window.__vtt_store__.getState().tokens.some((t) => t.name === n), name);
		return page.evaluate((n) => {
			const token = window.__vtt_store__.getState().tokens.find((t) => t.name === n);
			return `${token.hpCurrent}/${token.hpMax}`;
		}, name);
	};
	const typeMax = async (scope, value) => {
		const input = scope.locator('input[name="healthMax"]');
		await press(input);
		await input.press("ControlOrMeta+a");
		await input.pressSequentially(value);
	};
	try {
		await page.goto(`${process.env.VTT_BASE_URL}/sheets/new`);
		await press(page.getByRole("button", { name: /^D&D 5ª Edição/ }));
		await press(page.getByRole("button", { name: "Avançar" }));
		await page.locator('input[name="characterName"]').fill("Guerreiro PV");
		await press(page.getByRole("button", { name: "Avançar" }));
		await press(page.getByRole("button", { name: "Avançar" }));
		await press(page.getByRole("button", { name: "Combate", exact: true }));
		await typeMax(page, "12");
		await press(page.getByRole("button", { name: "Avançar" }));
		await page.waitForTimeout(500);
		if (page.url().includes("/sheets/new")) {
			await press(page.getByRole("button", { name: /Criar Ficha de Personagem/ }));
		}
		await page.waitForURL(/sheets\/(?!new)/);
		await page.waitForTimeout(500);
		const wizard = saved("Guerreiro PV");
		assert.equal(wizard?.healthMax, 12, `assistente gravou PV máx ${wizard?.healthMax} (${where})`);
		assert.equal(wizard?.health, 12, `assistente gravou PV atual ${wizard?.health} (${where})`);
		assert.equal(await sheetPv(), "12/12", `ficha do assistente (${where})`);
		assert.equal(await placeToken("Guerreiro PV"), "12/12", `token do assistente (${where})`);

		const legacyId = await page.evaluate(
			() =>
				window.__rpg_store__.getState().addCharacter({
					characterName: "Mago PV",
					system: "dnd5e",
					health: 0,
					healthMax: 0,
				}).id,
		);
		await go(`/sheets/${legacyId}`);
		const combate = page.locator('h2:text-is("Combate"), h3:text-is("Combate")').first();
		await combate.waitFor();
		await page.waitForTimeout(500);
		assert.equal(await sheetPv(), "0/0", `ficha antiga sem PV (${where})`);
		await press(
			combate
				.locator('xpath=ancestor::*[.//button[contains(., "Editar")]][1]')
				.getByRole("button", { name: /Editar/ })
				.first(),
		);
		const dialog = page.getByRole("dialog");
		await dialog.waitFor();
		await page.waitForTimeout(300);
		await typeMax(dialog, "12");
		await press(dialog.getByRole("button", { name: /Salvar/ }));
		await dialog.waitFor({ state: "detached" });
		await page.waitForTimeout(500);
		const edited = saved("Mago PV");
		assert.equal(edited?.healthMax, 12, `edição gravou PV máx ${edited?.healthMax} (${where})`);
		assert.equal(edited?.health, 12, `edição gravou PV atual ${edited?.health} (${where})`);
		assert.equal(await sheetPv(), "12/12", `ficha editada (${where})`);
		assert.equal(await placeToken("Mago PV"), "12/12", `token da ficha editada (${where})`);
	} finally {
		await context.close();
	}
}

(async () => {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
	});
	const output = path.resolve("docs/previews");
	fs.mkdirSync(output, { recursive: true });
	const writes = [];
	await setupContext(context, writes);
	const page = await context.newPage();
	let recording;
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const store = (fn, arg) => page.evaluate(fn, arg);

	// The elevation −/+ row must be fully visible as soon as the panel opens:
	// not clipped by the panel and not hidden behind the pinned action footer.
	// Wait for the panel's zoom-in entrance to finish before measuring it.
	// The dice overlay must not paint a box between the die and the result:
	// the strip at the bottom of the dice canvas has to match the overlay
	// background beside it (median luminance, robust to stray particles).
	async function assertNoEmptyBoxUnderDie() {
		const rects = await page.evaluate(() => {
			const overlay = document.querySelector(".fixed.inset-0.z-\\[100\\]");
			const canvas = overlay?.querySelector("canvas");
			if (!canvas) return null;
			const r = canvas.getBoundingClientRect();
			const h = 48;
			const band = { x: r.left, y: r.bottom - h, width: r.width, height: h };
			const ref = { ...band, x: Math.max(0, r.left - r.width - 24) };
			return { band, ref };
		});
		assert.ok(rects, "overlay do dado não encontrado");
		const luminance = async (clip) => {
			const png = await page.screenshot({ clip });
			return page.evaluate(async (b64) => {
				const img = new Image();
				img.src = `data:image/png;base64,${b64}`;
				await img.decode();
				const c = document.createElement("canvas");
				c.width = img.width;
				c.height = img.height;
				const ctx = c.getContext("2d");
				ctx.drawImage(img, 0, 0);
				const { data } = ctx.getImageData(0, 0, c.width, c.height);
				const values = [];
				for (let i = 0; i < data.length; i += 4)
					values.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
				values.sort((a, b) => a - b);
				return values[Math.floor(values.length / 2)];
			}, png.toString("base64"));
		};
		const band = await luminance(rects.band);
		const ref = await luminance(rects.ref);
		console.log(`dice band luminance ${band.toFixed(2)} vs background ${ref.toFixed(2)}`);
		assert.ok(
			Math.abs(band - ref) <= 1.5,
			`caixa vazia sob o dado (luminância ${band.toFixed(1)} vs fundo ${ref.toFixed(1)})`,
		);
	}

	async function waitMenuSettled() {
		await page.waitForFunction(() => {
			const panel = document
				.querySelector('[aria-label="Fechar menu do token"]')
				?.closest(".fixed");
			return Boolean(panel?.getAnimations({ subtree: true }).every((a) => a.playState !== "running"));
		});
	}

	async function assertElevationVisibleOnOpen(where) {
		await waitMenuSettled();
		for (const name of ["Diminuir elevação em 1,5 metro", "Aumentar elevação em 1,5 metro"]) {
			const btn = page.getByRole("button", { name, exact: true });
			assert.equal(await btn.count(), 1, `${name} ausente (${where})`);
			const state = await btn.evaluate((el) => {
				const panel = el.closest(".fixed");
				const footer = [...panel.querySelectorAll("button")]
					.find((b) => b.textContent.includes("Excluir"))
					.closest("div.sticky");
				const r = el.getBoundingClientRect();
				const p = panel.getBoundingClientRect();
				const limit = Math.min(p.bottom, footer.getBoundingClientRect().top, window.innerHeight);
				const hits = [r.top + 4, r.top + r.height / 2, r.bottom - 4].map((y) => {
					const hit = document.elementFromPoint(r.left + r.width / 2, y);
					return Boolean(hit && (hit === el || el.contains(hit)));
				});
				return {
					scrollTop: panel.scrollTop,
					height: r.height,
					inside: r.top >= p.top && r.bottom <= limit,
					hits,
				};
			});
			assert.equal(state.scrollTop, 0, `painel deve abrir sem rolagem (${where})`);
			assert.ok(state.height >= 44, `${name} precisa ter 44px (${where})`);
			assert.ok(state.inside, `${name} escondido atrás do rodapé ou recortado (${where})`);
			assert.ok(state.hits.every(Boolean), `${name} coberto por outro elemento (${where})`);
		}
	}

	// The open sheet stops above the zoom dock: the zoom −/+ buttons stay
	// uncovered and clickable, "Rolar d20" is fully on screen and uncovered,
	// and nothing between the sheet and the page root (filter, opacity, mask,
	// clip-path, blend mode) turns its backdrop-filter into a no-op.
	async function assertSheetClearsZoomDock(where) {
		await page.waitForTimeout(500);
		const report = await page.evaluate(() => {
			const aside = document.querySelector('aside[aria-label="Ficha na mesa"]');
			const glass = aside?.querySelector(".backdrop-blur-md");
			if (!aside || !glass) return { missing: true };
			const blur = getComputedStyle(glass).backdropFilter;
			const roots = [];
			for (let el = glass.parentElement; el; el = el.parentElement) {
				const cs = getComputedStyle(el);
				if (
					cs.filter !== "none" ||
					Number(cs.opacity) < 1 ||
					cs.maskImage !== "none" ||
					cs.clipPath !== "none" ||
					cs.mixBlendMode !== "normal" ||
					cs.backdropFilter !== "none"
				)
					roots.push(`${el.tagName}.${el.className}`.slice(0, 80));
			}
			const sheet = glass.getBoundingClientRect();
			const probe = (el) => {
				const r = el.getBoundingClientRect();
				const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
				return {
					label: el.getAttribute("aria-label") ?? el.textContent.trim(),
					top: r.top,
					bottom: r.bottom,
					onScreen: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
					hitSelf: Boolean(hit && hit.closest("button") === el),
				};
			};
			const zoom = [
				...document.querySelectorAll('[aria-label="Diminuir zoom"], [aria-label="Aumentar zoom"]'),
			].map(probe);
			const d20 = [...aside.querySelectorAll("button")].find((el) => /Rolar d20/.test(el.textContent));
			return { blur, roots, sheetBottom: sheet.bottom, zoom, d20: d20 ? probe(d20) : null };
		});
		assert.ok(!report.missing, `ficha aberta não encontrada (${where})`);
		assert.match(report.blur, /blur/, `ficha sem backdrop-blur (${where})`);
		assert.deepEqual(report.roots, [], `ancestral anula o desfoque da ficha (${where})`);
		assert.equal(report.zoom.length, 2, `controles de zoom não encontrados (${where})`);
		for (const z of report.zoom) {
			assert.ok(z.onScreen, `${z.label} fora da tela com a ficha aberta (${where})`);
			assert.ok(z.hitSelf, `${z.label} coberto pela ficha (${where})`);
			assert.ok(report.sheetBottom <= z.top, `ficha invade o dock de zoom (${where})`);
		}
		assert.ok(report.d20, `Rolar d20 ausente na ficha (${where})`);
		assert.ok(report.d20.onScreen, `Rolar d20 cortado pela borda da tela (${where})`);
		assert.ok(report.d20.hitSelf, `Rolar d20 coberto por outro elemento (${where})`);
		// A real click on + with the sheet open must change the zoom level.
		const pct = page.getByTitle("Redefinir Zoom para 100%");
		const before = await pct.innerText();
		await page.getByRole("button", { name: "Aumentar zoom", exact: true }).click();
		await page.waitForFunction(
			(prev) => document.querySelector('[title="Redefinir Zoom para 100%"]')?.textContent !== prev,
			before,
			{ timeout: 3000 },
		).catch(() => assert.fail(`+ no zoom não alterou ${before} com a ficha aberta (${where})`));
		assert.ok(await page.getByText("Ficha na mesa", { exact: true }).isVisible(), `ficha fechou ao usar o zoom (${where})`);
		await store(() => window.__vtt_store__.getState().setViewport({ x: 0, y: 0, scale: 1 }));
	}

	async function checkMenu() {
		await waitMenuSettled();
		const size = page.viewportSize();
		for (const name of MENU_CONTROLS) {
			const btn = page.getByRole("button", { name, exact: true });
			await btn.scrollIntoViewIfNeeded();
			const b = await btn.boundingBox();
			assert.ok(b, `${name} precisa existir`);
			assert.ok(b.width >= 44 && b.height >= 44, `${name} precisa de 44px`);
			assert.ok(
				b.x >= 0 &&
					b.y >= 0 &&
					b.x + b.width <= size.width &&
					b.y + b.height <= size.height,
				`${name} fora da tela`,
			);
			const onTop = await btn.evaluate((el, point) => {
				const hit = document.elementFromPoint(point.x, point.y);
				return Boolean(hit && (hit === el || el.contains(hit)));
			}, { x: b.x + b.width / 2, y: b.y + b.height / 2 });
			assert.ok(onTop, `${name} está coberto por outro elemento`);
		}
		const field = page.getByLabel("Quantidade de dano ou cura", { exact: true });
		await field.scrollIntoViewIfNeeded();
		const fieldBox = await field.boundingBox();
		assert.ok(fieldBox && fieldBox.height >= 44, "Campo de dano/cura precisa ter 44px");
		const fieldOnTop = await field.evaluate((el, point) => {
			const hit = document.elementFromPoint(point.x, point.y);
			return Boolean(hit && (hit === el || el.contains(hit)));
		}, { x: fieldBox.x + fieldBox.width / 2, y: fieldBox.y + fieldBox.height / 2 });
		assert.ok(fieldOnTop, "Campo de dano/cura está coberto por outro elemento");
	}

	// Deterministic frames for the PR: ruler (5-10-5 diagonal) and a placed
	// spell template, same world framing on desktop and phone.
	async function captureFrames(label) {
		await store(() => {
			const s = window.__vtt_store__.getState();
			s.setActiveTokenIdForMenu(null);
			s.setShowGridSettings(false);
			s.setShowCharacterSheetId(null);
			s.setSelectedTokenIds([]);
			s.updateToken("b", { x: 595, y: 245 });
			s.updateScene("scene", { gridScaleDistance: 1.5, gridScaleUnit: "m" });
			s.setViewport({ x: 0, y: 0, scale: 1 });
			s.setActiveTool("select");
		});
		await page.evaluate(() => document.activeElement?.blur?.());
		await page.waitForTimeout(250);

		await page.keyboard.press("r");
		await page.mouse.move(105, 385);
		await page.mouse.down();
		await page.mouse.move(210, 490, { steps: 4 });
		await page.mouse.move(315, 595, { steps: 4 });
		const readout = page.locator("output", { hasText: "Distância" });
		await readout.waitFor();
		assert.match(await readout.innerText(), /6 m/, `${label}: 5-10-5 = 6 m`);
		await page.waitForTimeout(150);
		await page.screenshot({
			path: path.join(output, `vtt-review-ruler-${label}.png`),
		});
		await page.mouse.up();

		await page.keyboard.press("t");
		await page.getByRole("button", { name: /Esfera/ }).click();
		await page.mouse.move(245, 665);
		await page.mouse.down();

		await page.mouse.move(315, 665, { steps: 4 });
		await page.mouse.move(385, 665, { steps: 4 });
		await page.mouse.up();
		await page.waitForFunction(
			() => window.__vtt_store__.getState().placedTemplates.length === 1,
		);
		await store(() =>
			window.__vtt_store__.getState().setShowTemplateControls(false),
		);
		await page.waitForTimeout(250);
		assert.equal(
			await page.evaluate(() => document.querySelector(".vtt-surface").scrollLeft),
			0,
			`${label}: a mesa não pode deslocar horizontalmente`,
		);
		await page.screenshot({
			path: path.join(output, `vtt-review-template-${label}.png`),
		});
		await store(() => {
			const s = window.__vtt_store__.getState();
			s.clearPlacedTemplates();
			s.setActiveTool("select");
		});
	}

	try {
		await loadFixture(page);
		recording = await startPreviewRecorder(
			page,
			path.join(output, "vtt-review-preview.webm"),
			"PR 77 / Testes com respostas HTTP simuladas",
		);
		await recording.chapter("Dois tokens compartilham a mesma ficha", 2000);

		// 0. Real mouse input on the canvas: click selects, double-click and
		// right-click open the token panel, empty click deselects, drag only moves.
		await page.mouse.click(315, 245);
		await expectSelection(page, ["a"], null, "clique simples seleciona sem abrir o painel");
		await recording.chapter("Clique simples seleciona o token A", 1200);
		await page.waitForTimeout(450);
		await page.mouse.dblclick(315, 245);
		await expectSelection(page, ["a"], "a", "duplo clique abre o painel do token");
		await recording.chapter("Duplo clique abre o painel do token", 1200);
		let empty = await emptyCanvasPoint(page, [[900, 620], [1000, 300], [760, 700]]);
		await page.mouse.click(empty.x, empty.y);
		await expectSelection(page, [], null, "clique na área vazia desmarca e fecha o painel");
		await page.mouse.click(595, 245, { button: "right" });
		await expectSelection(page, ["b"], "b", "botão direito abre o painel do token");
		await recording.chapter("Botão direito abre o painel; clique vazio fecha", 1200);
		empty = await emptyCanvasPoint(page, [[900, 620], [1000, 300], [760, 700]]);
		await page.mouse.click(empty.x, empty.y);
		await expectSelection(page, [], null, "clique vazio fecha o painel aberto pelo botão direito");
		await page.waitForTimeout(450);
		await page.mouse.move(315, 245);
		await page.mouse.down();
		await page.mouse.move(385, 315, { steps: 5 });
		await page.mouse.move(455, 385, { steps: 5 });
		await page.mouse.up();
		await expectSelection(page, ["a"], null, "arrastar o token não abre o painel");
		const dragged = await tableState(page);
		assert.deepEqual(dragged.tokens.a, { x: 455, y: 385 }, "arrastar move o token para a célula de destino");
		await recording.chapter("Arrastar move o token sem abrir o painel", 1200);
		await store(() => {
			const s = window.__vtt_store__.getState();
			s.updateToken("a", { x: 315, y: 245 });
			s.setSelectedTokenIds([]);
		});

		// 1. "Ficha" in the #84 token panel opens the in-table sheet for that token.
		await store(() => window.__vtt_store__.getState().setActiveTokenIdForMenu("b"));
		await page.getByRole("button", { name: "Abrir ficha na mesa", exact: true }).click();
		assert.equal(
			await page.getByRole("button", { name: "Fechar menu do token" }).count(),
			0,
			"Abrir a ficha fecha o menu do token",
		);
		await page.getByText("Ficha na mesa").waitFor();
		await assertSheetClearsZoomDock("1280x800");
		const saved = page.waitForResponse(
			(r) => r.request().method() === "PATCH" && r.url().includes("/vtt_tokens"),
		);
		await page.getByRole("button", { name: "-1", exact: true }).click();
		await saved;
		assert.equal(writes.at(-1).hp_current, 9);
		await page.waitForFunction(
			() => window.__vtt_store__.getState().tokens.find((t) => t.id === "b")?.hpCurrent === 9,
		);
		assert.deepEqual(
			await store(() => window.__vtt_store__.getState().tokens.map((t) => t.hpCurrent)),
			[20, 9],
		);
		await recording.chapter("Verificado: apenas B perde 1 PV; A continua com 20", 2500);

		await page.getByRole("button", { name: "Rolar d20" }).click();
		await page.waitForTimeout(400);
		const diceCanvas = await page.locator("canvas").last().elementHandle();
		for (let i = 0; i < 8; i++) {
			await store((x) => window.__vtt_store__.getState().updateToken("a", { x }), 315 + i * 4);
			await page.waitForTimeout(70);
		}
		assert.ok(
			await diceCanvas.evaluate((e) => e.isConnected),
			"Rolagem não deve destruir seu canvas durante movimento",
		);
		await recording.chapter("A rolagem continua enquanto outro token se move", 4000);
		await page.keyboard.press("Escape");
		await page.waitForTimeout(300);
		const closeSheet = page.getByRole("button", { name: "Fechar ficha" });
		if (await closeSheet.count()) await closeSheet.click();
		await page.waitForFunction(() => !window.__vtt_store__.getState().showCharacterSheetId);

		// 1b. Attribute roll shows the modifier in the result and in the last-roll line.
		await store(() => {
			window.__rpg_store__.setState({
				characters: [
					{
						id: "hero",
						system: "dnd5e",
						characterName: "Heroína",
						class: "Guerreira",
						level: 3,
						strength: 16,
						dexterity: 12,
						constitution: 14,
						intelligence: 10,
						wisdom: 10,
						charisma: 8,
						armorClass: 16,
						speed: 9,
					},
				],
			});
			window.__vtt_store__.getState().setShowCharacterSheetId("b");
		});
		await page.getByRole("button", { name: /^FOR\s*\+3$/ }).click();
		const banner = page.getByText(/(Resultado:|Acerto crítico ·|Falha crítica ·) \d+ \+ 3 = \d+/);
		await banner.waitFor({ timeout: 15000 });
		await assertNoEmptyBoxUnderDie();
		await recording.chapter("Rolagem de FOR soma o modificador +3 ao resultado", 1200);
		await page.getByText(/^FOR: \d+ \+ 3 = \d+$/).waitFor({ timeout: 15000 });
		await page.getByRole("button", { name: "Fechar ficha" }).click();
		await page.waitForFunction(() => !window.__vtt_store__.getState().showCharacterSheetId);
		await store(() => window.__rpg_store__.setState({ characters: [] }));

		// 2. Ruler: "Distância" readout with the 5-10-5 / Euclidiano toggle.
		await page.mouse.click(900, 600);
		await page.keyboard.press("r");
		await page.mouse.move(455, 385);
		await page.mouse.down();
		await page.mouse.move(560, 490, { steps: 4 });
		await page.mouse.move(665, 595, { steps: 4 });
		const readout = page.locator("output", { hasText: "Distância" });
		await readout.waitFor();
		assert.match(await readout.innerText(), /6 m/, "5-10-5: 3 diagonais = 4 casas = 6 m");
		await page.getByRole("button", { name: "5-10-5", exact: true }).waitFor();
		await recording.chapter("Régua: distância 5-10-5 junto aos controles de zoom", 2200);
		await page.mouse.up();

		// 3. Spell templates: toolbar button, placement and clearing.
		await page.getByRole("button", { name: "Moldes de magia", exact: true }).click();
		await page.getByText("Clique no ponto de origem").waitFor();
		await page.getByRole("button", { name: /Esfera/ }).click();
		await page.mouse.move(805, 385);
		await page.mouse.down();
		await page.mouse.move(875, 455, { steps: 4 });
		await page.mouse.move(945, 455, { steps: 4 });
		await page.mouse.up();
		await page.waitForFunction(() => window.__vtt_store__.getState().placedTemplates.length === 1);
		await recording.chapter("Molde de esfera posicionado na mesa", 2200);
		await page.getByRole("button", { name: "Limpar moldes (1)" }).click();
		await page.waitForFunction(() => window.__vtt_store__.getState().placedTemplates.length === 0);
		await page.keyboard.press("v");

		// 4. Token panel at the screen edge keeps every control reachable.
		await store(() => {
			const s = window.__vtt_store__.getState();
			s.updateToken("b", { x: 1275, y: 790 });
			s.setActiveTokenIdForMenu("b");
		});
		await page.getByRole("button", { name: "Fechar menu do token" }).waitFor();
		await assertElevationVisibleOnOpen("1280x800");
		await checkMenu();
		for (const [name, expected] of [
			["Aumentar elevação em 1,5 metro", 1.5],
			["Diminuir elevação em 1,5 metro", 0],
		]) {
			const elevationSaved = page.waitForResponse(
				(r) => r.request().method() === "PATCH" && r.url().includes("/vtt_tokens"),
			);
			await page.getByRole("button", { name, exact: true }).click();
			await elevationSaved;
			assert.equal(writes.at(-1).elevation, expected, `${name} grava ${expected}`);
			await page.waitForFunction(
				(value) =>
					window.__vtt_store__.getState().tokens.find((t) => t.id === "b")?.elevation === value,
				expected,
			);
			await page.getByText(`Elevação: ${expected}m`).waitFor();
		}
		await recording.chapter("Painel do token permanece dentro da borda", 2200);
		await page.screenshot({ path: path.join(output, "vtt-review-preview.png") });
		await recording.stop();
		recording = null;

		// 5. Mobile: same panel, plus labelled scale/unit fields at 16px.
		// The panel is positioned when it opens, so reopen it on the phone viewport.
		await store(() => window.__vtt_store__.getState().setActiveTokenIdForMenu(null));
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(200);
		await store(() => window.__vtt_store__.getState().setActiveTokenIdForMenu("b"));
		await page.getByRole("button", { name: "Fechar menu do token" }).waitFor();
		recording = await startPreviewRecorder(
			page,
			path.join(output, "vtt-review-mobile.webm"),
			"Celular / Painel e alvos de toque",
		);
		await assertElevationVisibleOnOpen("390x844");
		// The action row is pinned: Excluir is on screen without scrolling,
		// and the panel stops above the zoom dock.
		{
			const size = page.viewportSize();
			const del = await page
				.getByRole("button", { name: "Excluir", exact: true })
				.boundingBox();
			assert.ok(del && del.y + del.height <= size.height, "Excluir visível sem rolar");
			const hit = await page.evaluate(
				({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent ?? "",
				{ x: del.x + del.width / 2, y: del.y + del.height / 2 },
			);
			assert.match(hit, /Excluir/, "Excluir não pode estar recortado nem coberto");
			const panel = await page
				.getByRole("button", { name: "Fechar menu do token" })
				.evaluate((el) => el.closest(".fixed").getBoundingClientRect().bottom);
			const zoom = await page
				.getByRole("button", { name: "Enquadrar mapa" })
				.boundingBox();
			assert.ok(panel <= zoom.y, "Painel não cobre os controles de zoom");
			await page.screenshot({
				path: path.join(output, "vtt-review-menu-mobile.png"),
			});
		}
		await checkMenu();
		await recording.chapter("Ações e condições acessíveis na tela estreita", 2200);
		await page.getByRole("button", { name: "Fechar menu do token", exact: true }).click();
		await store(() => window.__vtt_store__.getState().setShowCharacterSheetId("b"));
		await page.getByText("Ficha na mesa").waitFor();
		await assertSheetClearsZoomDock("390x844");
		await page.getByRole("button", { name: "Fechar ficha" }).click();
		await page.waitForFunction(() => !window.__vtt_store__.getState().showCharacterSheetId);
		await store(() => window.__vtt_store__.getState().setShowGridSettings(true));
		const input = page.getByRole("spinbutton", { name: "Escala" });
		assert.ok(await input.evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize) >= 16));
		await input.fill("3");
		await page.getByRole("combobox", { name: "Unidade" }).selectOption("ft");
		await page.getByRole("button", { name: "Euclidiano", exact: true }).waitFor();
		await recording.chapter("Escala, unidade e diagonal com rótulos e fonte de 16px", 2200);
		await page.screenshot({ path: path.join(output, "vtt-review-mobile.png") });
		await recording.stop();
		recording = null;
		await page.setViewportSize({ width: 1440, height: 900 });
		await store(() => window.__vtt_store__.getState().setShowCharacterSheetId("b"));
		await page.getByText("Ficha na mesa", { exact: true }).waitFor();
		await assertSheetClearsZoomDock("1440x900");
		await page.getByRole("button", { name: "Fechar ficha" }).click();
		await page.waitForFunction(() => !window.__vtt_store__.getState().showCharacterSheetId);
		await captureFrames("desktop");
		await page.setViewportSize({ width: 390, height: 844 });
		await captureFrames("mobile");
		// 6. Touch input on a phone: a single tap selects the token and opens its
		// panel, a tap on the empty table closes it, a touch drag only moves it.
		const touchContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			hasTouch: true,
			isMobile: true,
		});
		await setupContext(touchContext, []);
		const touchPage = await touchContext.newPage();
		touchPage.on("pageerror", (e) => errors.push(e.message));
		try {
			await loadFixture(touchPage, { x: 175, y: 455 });
			recording = await startPreviewRecorder(
				touchPage,
				path.join(output, "vtt-selection-mobile.webm"),
				"Celular / Toque no token",
			);
			await touchPage.touchscreen.tap(315, 245);
			await expectSelection(touchPage, ["a"], "a", "toque simples seleciona e abre o painel");
			// The click synthesized after the tap must not hit the panel under the finger.
			await touchPage.waitForTimeout(400);
			assert.equal(
				await touchPage.evaluate(
					() => window.__vtt_store__.getState().tokens.find((t) => t.id === "a").hpCurrent,
				),
				20,
				"o clique gerado pelo toque não pode acionar o painel recém-aberto",
			);
			await recording.chapter("Um toque seleciona o token e abre o painel", 1500);
			await touchPage.screenshot({ path: path.join(output, "vtt-selection-tap-mobile.png") });
			const emptyTouch = await emptyCanvasPoint(touchPage, [
				[200, 790],
				[60, 790],
				[350, 110],
				[20, 700],
			]);
			await touchPage.touchscreen.tap(emptyTouch.x, emptyTouch.y);
			await expectSelection(touchPage, [], null, "toque na área vazia desmarca e fecha o painel");
			await recording.chapter("Toque na área vazia fecha o painel", 1200);
			await touchPage.waitForTimeout(450);
			const cdp = await touchContext.newCDPSession(touchPage);
			const touch = (type, x, y) =>
				cdp.send("Input.dispatchTouchEvent", {
					type,
					touchPoints: type === "touchEnd" ? [] : [{ x, y }],
				});
			await touch("touchStart", 175, 455);
			for (let i = 1; i <= 6; i++) await touch("touchMove", 175, 455 + i * 12);
			await touch("touchEnd");
			await expectSelection(touchPage, ["b"], null, "arrastar com o dedo não abre o painel");
			assert.deepEqual(
				(await tableState(touchPage)).tokens.b,
				{ x: 175, y: 525 },
				"arrastar com o dedo move o token",
			);
			await recording.chapter("Arrastar com o dedo move o token sem abrir o painel", 1200);
			await recording.stop();
			recording = null;
		} finally {
			await touchContext.close();
		}
		// 7. Scene badges "Em jogo"/"Preparação" on desktop and on the phone.
		await checkSceneBadges(browser, { width: 1440, height: 900 }, {}, errors);
		await checkSceneBadges(
			browser,
			{ width: 390, height: 844 },
			{ hasTouch: true, isMobile: true },
			errors,
		);
		// 8. One press on "Criar Cena" creates one scene (bug 04).
		await checkCreateSceneOnce(browser, { width: 1440, height: 900 }, {}, errors);
		await checkCreateSceneOnce(
			browser,
			{ width: 390, height: 844 },
			{ hasTouch: true, isMobile: true },
			errors,
		);
		// 9. A typed max HP reaches the sheet and the token (bug 05).
		await checkSheetMaxHp(browser, { width: 1440, height: 900 }, {}, errors);
		await checkSheetMaxHp(
			browser,
			{ width: 390, height: 844 },
			{ hasTouch: true, isMobile: true },
			errors,
		);
		assert.deepEqual(errors, []);
		console.log(
			"PASS: seleção por clique/duplo clique/botão direito/toque, selos de cena no celular com a cena em jogo sempre à vista, um clique cria uma cena só, PV máximo digitado chega à ficha e ao token, ficha na mesa, rolagem com modificador, régua 5-10-5, moldes de magia, painel nas bordas, campos acessíveis e quadros de régua/moldes",
		);
	} catch (error) {
		await page.screenshot({ path: path.join(output, "vtt-review-failure.png") }).catch(() => {});
		throw error;
	} finally {
		await recording?.stop().catch(() => {});
		await context.close();
		await browser.close();
	}
})().catch((e) => {
	console.error(e);
	process.exitCode = 1;
});
