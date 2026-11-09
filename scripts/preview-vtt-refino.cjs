// Prints do refino do VTT (régua com pontos, moldes com medida, layout).
// Uso: node scripts/preview-vtt-refino.cjs <antes|depois>
// Rede simulada (REST + realtime) como em scripts/test-vtt.cjs.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const label = process.argv[2] || "depois";
const output = path.resolve("docs/previews/vtt-refino");
const GRID = 70;
const SCENE_W = 24 * GRID;
const SCENE_H = 16 * GRID;

async function setupContext(context) {
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
	);
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem(
			"rpg-notes-storage",
			JSON.stringify({
				state: {
					campaigns: [
						{
							id: "demo-tabletop",
							name: "A Forja dos Deuses",
							ownerId: "preview-gm-user",
							myRole: "owner",
						},
					],
					characters: [],
					npcs: [],
					hasLoadedCampaigns: true,
					campaignLoadStatus: "ready",
					activeCampaignId: "demo-tabletop",
				},
				version: 0,
			}),
		);
	});
}

// Mapa de masmorra desenhado no próprio navegador (sem arquivo no repo).
function paintDungeonMap({ grid, width, height }) {
	const c = document.createElement("canvas");
	c.width = width;
	c.height = height;
	const ctx = c.getContext("2d");
	let seed = 7;
	const rnd = () => {
		seed = (seed * 16807) % 2147483647;
		return (seed - 1) / 2147483646;
	};
	ctx.fillStyle = "#16120f";
	ctx.fillRect(0, 0, width, height);
	for (let i = 0; i < 2400; i++) {
		ctx.fillStyle = `rgba(${40 + rnd() * 30},${32 + rnd() * 20},${26 + rnd() * 16},0.5)`;
		ctx.fillRect(rnd() * width, rnd() * height, 2 + rnd() * 6, 2 + rnd() * 6);
	}
	const rooms = [
		[1, 2, 8, 7],
		[9, 4, 4, 2],
		[13, 1, 9, 8],
		[10, 9, 2, 2],
		[6, 11, 12, 4],
	];
	for (const [cx, cy, cw, ch] of rooms) {
		for (let x = cx; x < cx + cw; x++) {
			for (let y = cy; y < cy + ch; y++) {
				const v = 92 + rnd() * 22;
				ctx.fillStyle = `rgb(${v},${v - 8},${v - 20})`;
				ctx.fillRect(x * grid, y * grid, grid, grid);
				ctx.strokeStyle = "rgba(30,24,18,0.55)";
				ctx.lineWidth = 2;
				ctx.strokeRect(x * grid + 1, y * grid + 1, grid - 2, grid - 2);
				if (rnd() > 0.82) {
					ctx.strokeStyle = "rgba(40,32,24,0.5)";
					ctx.beginPath();
					ctx.moveTo(x * grid + rnd() * grid, y * grid + rnd() * grid);
					ctx.lineTo(x * grid + rnd() * grid, y * grid + rnd() * grid);
					ctx.stroke();
				}
			}
		}
	}
	ctx.strokeStyle = "#0c0a08";
	ctx.lineWidth = 14;
	for (const [cx, cy, cw, ch] of rooms) {
		ctx.strokeRect(cx * grid - 4, cy * grid - 4, cw * grid + 8, ch * grid + 8);
	}
	// Reabre as passagens entre salas.
	for (const [x, y, w, h] of [
		[8.8, 4.15, 0.5, 1.7],
		[12.7, 4.15, 0.5, 1.7],
		[10.15, 8.8, 1.7, 0.5],
		[10.15, 10.7, 1.7, 0.5],
	]) {
		ctx.fillStyle = "rgb(98,90,78)";
		ctx.fillRect(x * grid, y * grid, w * grid, h * grid);
	}
	// Tapete, colunas, poço e barris.
	ctx.fillStyle = "rgba(120,28,32,0.85)";
	ctx.fillRect(3 * grid + 10, 4 * grid + 10, 4 * grid - 20, 3 * grid - 20);
	ctx.strokeStyle = "rgba(214,170,80,0.8)";
	ctx.lineWidth = 3;
	ctx.strokeRect(3 * grid + 18, 4 * grid + 18, 4 * grid - 36, 3 * grid - 36);
	for (const [x, y] of [
		[15, 3],
		[20, 3],
		[15, 7],
		[20, 7],
	]) {
		ctx.fillStyle = "#3b342c";
		ctx.beginPath();
		ctx.arc(x * grid, y * grid, 22, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#6f665a";
		ctx.beginPath();
		ctx.arc(x * grid - 4, y * grid - 4, 15, 0, Math.PI * 2);
		ctx.fill();
	}
	const pool = ctx.createRadialGradient(
		14 * grid,
		13 * grid,
		10,
		14 * grid,
		13 * grid,
		95,
	);
	pool.addColorStop(0, "#2d6f8a");
	pool.addColorStop(1, "#123544");
	ctx.fillStyle = pool;
	ctx.beginPath();
	ctx.ellipse(14 * grid, 13 * grid, 100, 70, 0, 0, Math.PI * 2);
	ctx.fill();
	for (const [x, y] of [
		[1.5, 2.5],
		[1.5, 3.5],
		[2.5, 2.5],
		[7.5, 12.5],
	]) {
		ctx.fillStyle = "#5a3a1e";
		ctx.beginPath();
		ctx.arc(x * grid, y * grid, 24, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#2b1a0c";
		ctx.lineWidth = 4;
		ctx.stroke();
	}
	return c.toDataURL("image/png");
}

async function loadScene(page, base) {
	await page.goto(`${base}/campaigns/demo-tabletop/vtt`, {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1200);
	const map = await page.evaluate(paintDungeonMap, {
		grid: GRID,
		width: SCENE_W,
		height: SCENE_H,
	});
	await page.evaluate(
		({ map, grid, width, height }) => {
			const s = window.__vtt_store__.getState();
			s.setIsGM(true);
			s.setUserColor("#a855f7");
			const scene = {
				id: "scene-1",
				campaignId: "demo-tabletop",
				name: "Cripta de Vel'Karath",
				mapImageUrl: map,
				gridType: "square",
				gridSize: grid,
				gridColor: "#ffffff",
				gridOpacity: 0.12,
				gridScaleDistance: 1.5,
				gridScaleUnit: "m",
				width,
				height,
				fogEnabled: false,
				fogExploration: false,
				isActive: true,
				orderIndex: 0,
			};
			s.setScenes([
				scene,
				{
					...scene,
					id: "scene-2",
					name: "Taverna do Javali",
					mapImageUrl: null,
					isActive: false,
					orderIndex: 1,
				},
				{
					...scene,
					id: "scene-3",
					name: "Estrada de Brumafria",
					mapImageUrl: null,
					isActive: false,
					orderIndex: 2,
				},
			]);
			s.setActiveSceneId(scene.id);
		},
		{ map, grid: GRID, width: SCENE_W, height: SCENE_H },
	);
	await page.locator("canvas").first().waitFor();
	await page.waitForTimeout(400);
	await page.evaluate((grid) => {
		const s = window.__vtt_store__.getState();
		const base = {
			sceneId: "scene-1",
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
		};
		const at = (cx, cy) => ({ x: (cx + 0.5) * grid, y: (cy + 0.5) * grid });
		s.setTokens([
			{
				...base,
				id: "t1",
				name: "Thorin",
				avatarUrl: "/presets/warrior.png",
				...at(4, 3),
				hpCurrent: 38,
				hpMax: 44,
			},
			{
				...base,
				id: "t2",
				name: "Elara",
				avatarUrl: "/presets/mage.png",
				...at(3, 5),
				hpCurrent: 21,
				hpMax: 24,
				conditions: ["concentracao"],
			},
			{
				...base,
				id: "t3",
				name: "Sombra",
				avatarUrl: "/presets/rogue.png",
				...at(6, 6),
				hpCurrent: 12,
				hpMax: 30,
			},
			{
				...base,
				id: "t4",
				name: "Irmã Lúcia",
				avatarUrl: "/presets/cleric.png",
				...at(2, 7),
				hpCurrent: 27,
				hpMax: 27,
			},
			{
				...base,
				id: "m1",
				name: "Vampiro",
				avatarUrl: "/presets/vampire.png",
				...at(17, 5),
				hpCurrent: 80,
				hpMax: 110,
				sizeCells: 1,
			},
			{
				...base,
				id: "m2",
				name: "Carniçal",
				...at(19, 2),
				hpCurrent: 9,
				hpMax: 22,
			},
		]);
	}, GRID);
}

async function frame(page, vp) {
	const scale = vp.width < 640 ? 0.42 : 0.66;
	const x = vp.width < 640 ? -20 : Math.round((vp.width - SCENE_W * scale) / 2);
	const y = vp.width < 640 ? 150 : 130;
	await page.evaluate(
		(v) => {
			const s = window.__vtt_store__.getState();
			s.setViewport(v);
			s.setActiveTool("select");
			s.setSelectedTokenIds([]);
			s.setActiveTokenIdForMenu(null);
		},
		{ x, y, scale },
	);
	await page.evaluate(() => document.activeElement?.blur?.());
	await page.waitForTimeout(500);
	return {
		toScreen: (cx, cy) => ({
			x: x + (cx + 0.5) * GRID * scale,
			y: y + (cy + 0.5) * GRID * scale,
		}),
	};
}

// Regressão da régua com pontos e do alcance fixo (mouse real no canvas).
async function checkRulerFlows(page, toScreen) {
	const m = () =>
		page.evaluate(() => window.__vtt_store__.getState().activeMeasurement);
	const a = toScreen(4, 3);
	const b = toScreen(10, 5);
	const c = toScreen(17, 5);
	await page.keyboard.press("r");

	// Arrasto do zero: mede a reta e some ao soltar.
	await page.mouse.move(a.x, a.y);
	await page.mouse.down();
	await page.mouse.move(b.x, b.y, { steps: 6 });
	assert.equal((await m())?.distance, 10.5, "arrasto mede 7 casas (5-10-5)");
	await page.mouse.up();
	assert.equal(await m(), null, "arrasto do zero some ao soltar");

	// Clique, clique, cursor: dois trechos e o total.
	await page.mouse.click(a.x, a.y);
	await page.mouse.move(b.x, b.y, { steps: 4 });
	await page.mouse.click(b.x, b.y);
	await page.mouse.move(c.x, c.y, { steps: 4 });
	let r = await m();
	assert.equal(r.waypoints.length, 2, "dois pontos fixados");
	assert.deepEqual(r.segments, [10.5, 10.5], "trechos de 10,5 m");
	assert.equal(r.distance, 21, "total 21 m");
	assert.match(
		await page.locator("output", { hasText: "Distância" }).innerText(),
		/21 m/,
	);

	// Backspace e botão direito tiram o último ponto.
	await page.keyboard.press("Backspace");
	r = await m();
	assert.equal(r.waypoints.length, 1, "Backspace desfaz um ponto");
	await page.mouse.click(b.x, b.y);
	await page.mouse.click(c.x + 200, c.y + 200, { button: "right" });
	assert.equal((await m()).waypoints.length, 1, "botão direito desfaz um ponto");

	// Duplo clique fixa; o cursor não mexe mais; Esc limpa.
	await page.waitForTimeout(400);
	await page.mouse.click(b.x, b.y);
	await page.waitForTimeout(400);
	await page.mouse.dblclick(c.x, c.y);
	r = await m();
	assert.equal(r.pinned, true, "duplo clique fixa");
	assert.equal(r.distance, 21, "fixada em 21 m");
	await page.mouse.move(a.x, a.y, { steps: 3 });
	assert.equal((await m()).distance, 21, "fixada não segue o cursor");
	await page.keyboard.press("Escape");
	assert.equal(await m(), null, "Esc limpa a régua");

	// Sair da ferramenta apaga a régua.
	await page.mouse.click(a.x, a.y);
	await page.mouse.click(b.x, b.y);
	await page.keyboard.press("v");
	assert.equal(await m(), null, "trocar de ferramenta apaga a régua");

	// Alcance fixo: o clique já coloca o molde com 3 casas.
	await page.keyboard.press("t");
	await page.getByRole("button", { name: /Cone 60/ }).click();
	await page.getByRole("button", { name: "4,5 m", exact: true }).click();
	await page.mouse.click(c.x, c.y);
	const placed = await page.evaluate(
		() => window.__vtt_store__.getState().placedTemplates,
	);
	assert.equal(placed.at(-1)?.sizeCells, 3, "molde com alcance fixo de 3 casas");
	await page.getByRole("button", { name: /Limpar moldes/ }).click();
	await page.getByRole("button", { name: "Arrastar", exact: true }).click();
	await page.getByRole("button", { name: "Fechar moldes de magia" }).click();
	console.log("Régua e moldes: fluxos ok");
}

async function shoot(browser, base, vp, device) {
	const phone = vp.width < 640;
	const context = await browser.newContext({
		viewport: vp,
		deviceScaleFactor: 2,
		hasTouch: phone,
		isMobile: phone,
	});
	await setupContext(context);
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	try {
		await loadScene(page, base);
		let { toScreen } = await frame(page, vp);
		await page.waitForTimeout(1200);
		if (label !== "antes" && device === "desktop") {
			await checkRulerFlows(page, toScreen);
			({ toScreen } = await frame(page, vp));
		}
		await page.screenshot({
			path: path.join(output, `${label}-${device}-1-mesa.png`),
		});

		// Régua: do guerreiro até o vampiro contornando a parede.
		await page.keyboard.press("r");
		await page.waitForTimeout(200);
		const a = toScreen(4, 3);
		const b = toScreen(10, 5);
		const c = toScreen(17, 5);
		if (label === "antes") {
			await page.mouse.move(a.x, a.y);
			await page.mouse.down();
			await page.mouse.move(c.x, c.y, { steps: 8 });
			await page.waitForTimeout(250);
			await page.screenshot({
				path: path.join(output, `${label}-${device}-2-regua.png`),
			});
			await page.mouse.up();
		} else {
			await page.mouse.click(a.x, a.y);
			await page.mouse.move(b.x, b.y, { steps: 6 });
			await page.mouse.click(b.x, b.y);
			await page.mouse.move(c.x, c.y, { steps: 8 });
			await page.waitForTimeout(300);
			await page.screenshot({
				path: path.join(output, `${label}-${device}-2-regua.png`),
			});
			// Duplo clique fixa o caminho no vampiro.
			await page.mouse.dblclick(c.x, c.y);
			await page.mouse.move(c.x + 120, c.y + 160, { steps: 4 });
			await page.waitForTimeout(300);
			await page.screenshot({
				path: path.join(output, `${label}-${device}-2b-regua-fixada.png`),
			});
			await page.keyboard.press("Escape");
		}
		await page.waitForTimeout(200);

		// Moldes: cone a partir da maga e esfera na sala das colunas.
		({ toScreen } = await frame(page, vp));
		await page.keyboard.press("t");
		await page.waitForTimeout(200);
		await page.getByRole("button", { name: /Cone 60/ }).click();
		const o = toScreen(3, 5);
		const t = toScreen(9, 5);
		await page.mouse.move(o.x, o.y);
		await page.mouse.down();
		await page.mouse.move(t.x, t.y, { steps: 8 });
		await page.mouse.up();
		await page.getByRole("button", { name: /Esfera/ }).click();
		const s0 = toScreen(17, 5);
		const s1 = toScreen(20, 5);
		await page.mouse.move(s0.x, s0.y);
		await page.mouse.down();
		await page.mouse.move(s1.x, s1.y, { steps: 6 });
		await page.waitForTimeout(250);
		await page.screenshot({
			path: path.join(output, `${label}-${device}-3-moldes.png`),
		});
		await page.mouse.up();
		await page.waitForTimeout(200);
		await page.screenshot({
			path: path.join(output, `${label}-${device}-4-moldes-fixos.png`),
		});

		if (label !== "antes") {
			// Alcance fixo: Mãos Flamejantes (cone de 4,5 m) com um clique e arrasto curto.
			await page.getByRole("button", { name: /Limpar moldes/ }).click();
			await page.getByRole("button", { name: /Linha/ }).click();
			await page.getByRole("button", { name: "Arrastar", exact: true }).click();
			const l0 = toScreen(10, 12);
			const l1 = toScreen(16, 12);
			await page.mouse.move(l0.x, l0.y);
			await page.mouse.down();
			await page.mouse.move(l1.x, l1.y, { steps: 6 });
			await page.mouse.up();
			await page.getByRole("button", { name: /Cone 60/ }).click();
			await page.getByRole("button", { name: "4,5 m", exact: true }).click();
			const f0 = toScreen(4, 3);
			const f1 = toScreen(5, 4);
			await page.mouse.move(f0.x, f0.y);
			await page.mouse.down();
			await page.mouse.move(f1.x, f1.y, { steps: 4 });
			await page.mouse.up();
			await page.waitForTimeout(250);
			await page.screenshot({
				path: path.join(output, `${label}-${device}-5-alcance-fixo.png`),
			});
			if (vp.width >= 640) {
				await page.keyboard.press("Escape");
				await page.getByRole("button", { name: "Fechar moldes de magia" }).click();
				await page.getByRole("button", { name: "Régua de Medição" }).hover();
				await page.waitForTimeout(600);
				await page.screenshot({
					path: path.join(output, `${label}-${device}-6-toolbar.png`),
					clip: { x: 0, y: 0, width: 520, height: 900 },
				});
			}
		}
		if (errors.length) console.warn(`${device}: erros na página`, errors);
	} finally {
		await context.close();
	}
}

async function main() {
	fs.mkdirSync(output, { recursive: true });
	const { createServer } = await import("vite");
	const server = process.env.VTT_BASE_URL
		? null
		: await createServer({
				configLoader: "runner",
				mode: "test",
				server: { host: "127.0.0.1", port: 3118, strictPort: true },
			});
	await server?.listen();
	const base = process.env.VTT_BASE_URL || "http://127.0.0.1:3118";
	const browser = await chromium.launch({ headless: true });
	try {
		await shoot(browser, base, { width: 1440, height: 900 }, "desktop");
		await shoot(browser, base, { width: 390, height: 844 }, "mobile");
	} finally {
		await browser.close();
		await server?.close();
	}
	console.log(`Prints em ${output}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
