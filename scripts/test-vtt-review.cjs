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

	// The open sheet must hide whatever sits behind it: it stacks above the zoom
	// dock, and nothing between it and the page root (filter, opacity, mask,
	// clip-path, blend mode) turns its backdrop-filter into a no-op.
	async function assertSheetHidesZoom(where) {
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
			const zoom = [
				...document.querySelectorAll(
					'[aria-label="Enquadrar mapa"], [title="Redefinir zoom para 100%"]',
				),
			].map((el) => {
				const r = el.getBoundingClientRect();
				const x = r.left + r.width / 2;
				const y = r.top + r.height / 2;
				const under =
					x >= sheet.left && x <= sheet.right && y >= sheet.top && y <= sheet.bottom;
				const hit = document.elementFromPoint(x, y);
				return { under, covered: Boolean(hit && aside.contains(hit)) };
			});
			return { blur, roots, zoom };
		});
		assert.ok(!report.missing, `ficha aberta não encontrada (${where})`);
		assert.match(report.blur, /blur/, `ficha sem backdrop-blur (${where})`);
		assert.deepEqual(report.roots, [], `ancestral anula o desfoque da ficha (${where})`);
		assert.ok(report.zoom.length > 0, `controles de zoom não encontrados (${where})`);
		for (const z of report.zoom) {
			if (z.under) assert.ok(z.covered, `zoom aparece por cima da ficha (${where})`);
		}
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
		await assertSheetHidesZoom("1280x800");
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
		await assertSheetHidesZoom("390x844");
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
		assert.deepEqual(errors, []);
		console.log(
			"PASS: seleção por clique/duplo clique/botão direito/toque, ficha na mesa, régua 5-10-5, moldes de magia, painel nas bordas, campos acessíveis e quadros de régua/moldes",
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
