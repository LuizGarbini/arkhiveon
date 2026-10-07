// PR 77 regression flow on top of the #84 table: in-table sheet, spell
// templates, ruler readout and the token panel at the screen edge.
// Network responses are faked (REST + realtime) like scripts/test-vtt.cjs.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startPreviewRecorder } = require("./vtt-preview-recorder.cjs");

const MENU_CONTROLS = [
	"Abrir ficha na mesa",
	"Fechar menu do token",
	"-5",
	"-1",
	"+1",
	"+5",
	"Envenenado",
	"Concentração",
	"Tamanho 2 por 2 células",
	"Diminuir elevação em 1,5 metro",
	"Girar Token (45º)",
	"Travar no Lugar",
	"Excluir",
];

(async () => {
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
	});
	const output = path.resolve("docs/previews");
	fs.mkdirSync(output, { recursive: true });
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	const writes = [];
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
	const page = await context.newPage();
	let recording;
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const store = (fn, arg) => page.evaluate(fn, arg);

	async function checkMenu() {
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
		}
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
		await page.goto(`${process.env.VTT_BASE_URL}/campaigns/demo-tabletop/vtt`);
		await page.waitForFunction(() => window.__vtt_store__);
		await page.waitForTimeout(1000);
		await store(() => {
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
		await store(() => {
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
			s.setTokens([a, { ...a, id: "b", name: "Sentinela B", x: 595, hpCurrent: 10 }]);
			s.setViewport({ x: 0, y: 0, scale: 1 });
		});
		recording = await startPreviewRecorder(
			page,
			path.join(output, "vtt-review-preview.webm"),
			"PR 77 / Testes com respostas HTTP simuladas",
		);
		await recording.chapter("Dois tokens compartilham a mesma ficha", 2000);

		// 1. "Ficha" in the #84 token panel opens the in-table sheet for that token.
		await store(() => window.__vtt_store__.getState().setActiveTokenIdForMenu("b"));
		await page.getByRole("button", { name: "Abrir ficha na mesa", exact: true }).click();
		assert.equal(
			await page.getByRole("button", { name: "Fechar menu do token" }).count(),
			0,
			"Abrir a ficha fecha o menu do token",
		);
		await page.getByText("Ficha na mesa").waitFor();
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
		await checkMenu();
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
		assert.deepEqual(errors, []);
		console.log(
			"PASS: ficha na mesa, régua 5-10-5, moldes de magia, painel nas bordas, campos acessíveis e quadros de régua/moldes",
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
