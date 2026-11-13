// Prova da exclusão individual de moldes no app real (Vite + Playwright).
// Saída fora do repo: ~/projects/arkhiveon-previews/vtt/templates-delete/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startPreviewRecorder } = require("./vtt-preview-recorder.cjs");

const OUTPUT = path.join(
	process.env.HOME,
	"projects/arkhiveon-previews/vtt/templates-delete",
);
const PORT = 4203;
const CAMPAIGN_ID = "demo-tabletop";
const GRID = 70;

const SPELLS = [
	{ name: "Bola de Fogo", owner: "local" },
	{ name: "Muralha de Gelo", owner: "Lia" },
	{ name: "Relâmpago", owner: "Otto" },
];

function redact(value) {
	return String(value)
		.replace(/eyJ[A-Za-z0-9_-]{10,}/g, "[redacted]")
		.slice(0, 240);
}

async function until(page, predicate, timeout, label) {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		if (await page.evaluate(predicate)) return;
		await page.waitForTimeout(50);
	}
	throw new Error(label);
}

async function setupContext(context) {
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "[]",
		}),
	);
	await context.route("**/auth/v1/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "{}",
		}),
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
							system: "dnd5e",
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

async function openTable(page, base) {
	const errors = [];
	page.on("pageerror", (error) => errors.push(redact(error.message)));
	await page.goto(`${base}/campaigns/${CAMPAIGN_ID}/vtt`, {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	const installScene = (campaignId) => {
		const store = window.__vtt_store__?.getState?.();
		if (!store) return false;
		store.setIsGM(true);
		store.setIsCoGM(false);
		store.setUserColor("#38bdf8");
		const scene = {
			id: "scene-templates",
			campaignId,
			name: "Sala dos moldes",
			mapImageUrl: null,
			gridType: "square",
			gridSize: 70,
			gridColor: "#ffffff",
			gridOpacity: 0.18,
			gridScaleDistance: 1.5,
			gridScaleUnit: "m",
			gridOffsetX: 0,
			gridOffsetY: 0,
			mapScale: 1,
			width: 1600,
			height: 1200,
			fogEnabled: false,
			fogExploration: false,
			isActive: true,
			orderIndex: 0,
		};
		store.setScenes([scene]);
		store.setActiveSceneId(scene.id);
		store.setViewport({ x: 80, y: 40, scale: 1 });
		store.setActiveTool("select");
		return true;
	};
	let canvasReady = false;
	for (let attempt = 0; attempt < 5 && !canvasReady; attempt++) {
		try {
			await until(
				page,
				() => Boolean(window.__vtt_store__),
				30000,
				"store da mesa ausente",
			);
			await page.evaluate(installScene, CAMPAIGN_ID);
			await page.locator("canvas").first().waitFor({
				state: "visible",
				timeout: 8000,
			});
			const alive = await page.evaluate(
				() => window.__vtt_store__.getState().activeSceneId,
			);
			canvasReady = alive === "scene-templates";
		} catch {
			canvasReady = false;
		}
	}
	if (!canvasReady) {
		const info = await page.evaluate(() => ({
			path: location.pathname,
			heading: document.querySelector("h1,h2,h3")?.textContent?.trim() ?? "",
			canvases: document.querySelectorAll("canvas").length,
			sceneId: window.__vtt_store__?.getState?.().activeSceneId ?? null,
		}));
		throw new Error(`Canvas da mesa ausente: ${JSON.stringify(info)}`);
	}
	await page.waitForTimeout(400);
	return errors;
}

async function clientOf(page, point) {
	const client = await page.evaluate((worldPoint) => {
		const canvases = [...document.querySelectorAll("canvas")];
		const canvas =
			canvases.find((item) =>
				String(item.parentElement?.className || "").includes("touch-none"),
			) || canvases[canvases.length - 1];
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		const vp = window.__vtt_store__.getState().viewport;
		return {
			x: rect.left + worldPoint.x * vp.scale + vp.x,
			y: rect.top + worldPoint.y * vp.scale + vp.y,
		};
	}, point);
	if (!client) throw new Error("Canvas dos moldes ausente.");
	return client;
}

async function dragWorld(page, from, to) {
	const start = await clientOf(page, from);
	const end = await clientOf(page, to);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(end.x, end.y, { steps: 10 });
	await page.mouse.up();
}

async function placeSpells(page) {
	await page.getByRole("button", { name: "Moldes de magia" }).click();
	await page.getByRole("textbox", { name: "Nome da magia" }).waitFor();
	const points = await page.evaluate((grid) => {
		const panel = document.querySelector('[aria-label="Moldes"]');
		const canvases = [...document.querySelectorAll("canvas")];
		const canvas =
			canvases.find((item) =>
				String(item.parentElement?.className || "").includes("touch-none"),
			) || canvases[canvases.length - 1];
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		const vp = window.__vtt_store__.getState().viewport;
		const snap = (value) => Math.round(value / grid) * grid;
		const panelBottom = panel
			? panel.getBoundingClientRect().bottom
			: rect.top + 220;
		const topWorld = (panelBottom - rect.top - vp.y) / vp.scale + grid * 2;
		const leftWorld = (96 - vp.x) / vp.scale;
		const originX = Math.max(grid * 2, snap(leftWorld));
		let y = snap(topWorld);
		const laid = [];
		for (let i = 0; i < 3; i++) {
			const screenY = rect.top + y * vp.scale + vp.y;
			if (screenY > rect.bottom - grid) return null;
			laid.push({
				origin: { x: originX, y },
				target: { x: originX + grid, y },
			});
			y += grid * 2;
		}
		return laid;
	}, GRID);
	if (!points) throw new Error("Não couberam 3 moldes abaixo do painel.");
	for (let i = 0; i < SPELLS.length; i++) {
		const field = page.getByRole("textbox", { name: "Nome da magia" });
		await field.fill(SPELLS[i].name);
		await dragWorld(page, points[i].origin, points[i].target);
		const started = Date.now();
		let count = 0;
		while (Date.now() - started < 4000) {
			count = await page.evaluate(
				() => window.__vtt_store__.getState().placedTemplates.length,
			);
			if (count >= i + 1) break;
			await page.waitForTimeout(50);
		}
		if (count < i + 1) {
			throw new Error(`Colocação parou em ${count} de ${i + 1}.`);
		}
	}
	return points;
}

async function assignDistinctOwners(page) {
	const ok = await page.evaluate(() => {
		const store = window.__vtt_store__.getState();
		const muralha = store.placedTemplates.find(
			(template) => template.spellName === "Muralha de Gelo",
		);
		const relampago = store.placedTemplates.find(
			(template) => template.spellName === "Relâmpago",
		);
		if (!muralha || !relampago) return false;
		store.removeTemplatesByIds([muralha.id, relampago.id]);
		store.setRemoteTemplate("lia-preview", {
			...muralha,
			userName: "Lia",
			spellName: "Muralha de Gelo",
		});
		store.setRemoteTemplate("otto-preview", {
			...relampago,
			userName: "Otto",
			spellName: "Relâmpago",
		});
		return true;
	});
	if (!ok) throw new Error("Não achei os moldes para atribuir donos.");
}

async function nudgeBelowPanel(page) {
	await page.evaluate(() => {
		const panel = document.querySelector('[aria-label="Moldes"]');
		const canvases = [...document.querySelectorAll("canvas")];
		const canvas =
			canvases.find((item) =>
				String(item.parentElement?.className || "").includes("touch-none"),
			) || canvases[canvases.length - 1];
		if (!panel || !canvas) return;
		const store = window.__vtt_store__.getState();
		const templates = [
			...store.placedTemplates,
			...Object.values(store.remoteTemplates),
		];
		if (templates.length === 0) return;
		const rect = canvas.getBoundingClientRect();
		const vp = store.viewport;
		const minWorldY = Math.min(...templates.map((template) => template.originY));
		const screenY = rect.top + minWorldY * vp.scale + vp.y;
		const limit = panel.getBoundingClientRect().bottom + 28;
		if (screenY < limit) {
			store.setViewport({ ...vp, y: vp.y + (limit - screenY) });
		}
	});
}

async function templateSnapshot(page) {
	return page.evaluate(() => {
		const state = window.__vtt_store__.getState();
		const rows = [
			...state.placedTemplates,
			...Object.values(state.remoteTemplates),
		];
		const seen = new Set();
		const listed = [];
		for (const template of rows) {
			if (seen.has(template.id)) continue;
			seen.add(template.id);
			listed.push({
				id: template.id,
				spellName: template.spellName ?? null,
				userName: template.userName ?? null,
				originX: template.originX,
				originY: template.originY,
				targetX: template.targetX,
				targetY: template.targetY,
			});
		}
		return {
			count: listed.length,
			selectedTemplateId: state.selectedTemplateId,
			isGM: state.isGM,
			isCoGM: state.isCoGM,
			listed,
		};
	});
}

async function clickTemplate(page, spellName) {
	const point = await page.evaluate((name) => {
		const state = window.__vtt_store__.getState();
		const templates = [
			...state.placedTemplates,
			...Object.values(state.remoteTemplates),
		];
		const template = templates.find((item) => item.spellName === name);
		if (!template) return null;
		return { x: template.originX, y: template.originY, id: template.id };
	}, spellName);
	if (!point) throw new Error(`Molde ausente: ${spellName}`);
	const client = await clientOf(page, point);
	await page.mouse.click(client.x, client.y);
	await page.evaluate(() => {
		const active = document.activeElement;
		if (
			active instanceof HTMLElement &&
			(active.matches("input, textarea, select") || active.isContentEditable)
		) {
			active.blur();
		}
	});
	return point.id;
}

async function touchTargets(page) {
	return page.evaluate(() => {
		const list = document.querySelector('[aria-label="Moldes na mesa"]');
		if (!list) return [];
		return [...list.querySelectorAll("button")].map((el) => {
			const box = el.getBoundingClientRect();
			return {
				name: el.getAttribute("aria-label") || el.textContent.replace(/\s+/g, " ").trim(),
				width: Math.round(box.width),
				height: Math.round(box.height),
				disabled: Boolean(el.disabled),
			};
		});
	});
}

async function shot(page, name) {
	fs.mkdirSync(OUTPUT, { recursive: true });
	await page.screenshot({
		path: path.join(OUTPUT, name),
		type: "png",
	});
}

async function run(browser, base, viewport, record) {
	const context = await browser.newContext({
		viewport,
		hasTouch: viewport.width < 500,
		isMobile: viewport.width < 500,
	});
	await setupContext(context);
	const page = await context.newPage();
	await page.setViewportSize({ width: viewport.width, height: viewport.height });
	const errors = await openTable(page, base);
	let recording = null;
	if (record) {
		recording = await startPreviewRecorder(
			page,
			path.join(OUTPUT, "preview.webm"),
			"Moldes de magia na mesa",
		);
	}
	await page.getByRole("button", { name: "Moldes de magia" }).waitFor();
	const points = await placeSpells(page);
	await assignDistinctOwners(page);
	await nudgeBelowPanel(page);
	const before = await templateSnapshot(page);
	assert.equal(before.count, 3, "a mesa não ficou com 3 moldes");
	const names = before.listed.map((item) => item.spellName).sort();
	assert.deepEqual(names, ["Bola de Fogo", "Muralha de Gelo", "Relâmpago"]);
	const owners = new Set(before.listed.map((item) => item.userName));
	assert.equal(owners.size, 3, "os donos não ficaram distintos");
	for (const item of before.listed) {
		for (const value of [item.originX, item.originY, item.targetX, item.targetY]) {
			const mod = ((value % GRID) + GRID) % GRID;
			assert.ok(
				Math.abs(mod - GRID / 2) < 0.01,
				`ponto ${value} não caiu no centro da casa`,
			);
		}
	}
	if (recording) await recording.chapter("Três magias, três donos", 1800);
	await clickTemplate(page, "Bola de Fogo");
	await until(
		page,
		() => {
			const state = window.__vtt_store__.getState();
			const selected = [
				...state.placedTemplates,
				...Object.values(state.remoteTemplates),
			].find((template) => template.id === state.selectedTemplateId);
			return selected?.spellName === "Bola de Fogo";
		},
		4000,
		"o clique na mesa não selecionou a Bola de Fogo",
	);
	const targetsBefore = await touchTargets(page);
	if (viewport.width >= 500) await shot(page, "selected-desktop.png");
	if (recording) await recording.chapter("Selecionado na mesa", 1600);
	await page
		.getByRole("button", { name: "Excluir Muralha de Gelo de Lia" })
		.click();
	await until(
		page,
		() => {
			const state = window.__vtt_store__.getState();
			const namesNow = [
				...state.placedTemplates,
				...Object.values(state.remoteTemplates),
			].map((template) => template.spellName);
			return (
				namesNow.includes("Bola de Fogo") &&
				namesNow.includes("Relâmpago") &&
				!namesNow.includes("Muralha de Gelo")
			);
		},
		4000,
		"excluir a muralha não removeu só ela",
	);
	const afterButton = await templateSnapshot(page);
	if (recording) await recording.chapter("Só a muralha saiu", 1600);
	await clickTemplate(page, "Relâmpago");
	await page.keyboard.press("Delete");
	await until(
		page,
		() => {
			const state = window.__vtt_store__.getState();
			const left = [
				...state.placedTemplates,
				...Object.values(state.remoteTemplates),
			];
			return left.length === 1 && left[0]?.spellName === "Bola de Fogo";
		},
		4000,
		"Delete não removeu só o Relâmpago",
	);
	const afterDelete = await templateSnapshot(page);
	if (recording) await recording.chapter("Delete no relâmpago", 1400);
	await page.evaluate((grid) => {
		const store = window.__vtt_store__.getState();
		const bola = store.placedTemplates[0];
		store.setIsGM(false);
		store.setIsCoGM(false);
		store.setRemoteTemplate("otto-preview", {
			id: "otto-relogio",
			kind: "line",
			originX: bola?.originX ?? grid * 2,
			originY: (bola?.originY ?? grid * 6) + grid * 2,
			targetX: (bola?.originX ?? grid * 2) + grid * 2,
			targetY: (bola?.originY ?? grid * 6) + grid * 2,
			color: "#c4b5fd",
			spellName: "Relógio de Otto",
			userName: "Otto",
		});
		store.setShowTemplateControls(true);
		store.setActiveTool("template");
	}, GRID);
	await page.waitForTimeout(200);
	const denied = page.getByRole("button", {
		name: "Excluir Relógio de Otto de Otto",
	});
	await denied.waitFor();
	const deniedDisabled = await denied.isDisabled();
	assert.equal(deniedDisabled, true, "o botão do jogador alheio ficou habilitado");
	const own = page.getByRole("button", { name: /Excluir Bola de Fogo de / });
	assert.equal(await own.isDisabled(), false, "o dono perdeu o próprio botão");
	await nudgeBelowPanel(page);
	const targetsAfter = await touchTargets(page);
	const finalShot =
		viewport.width < 500 ? "after-mobile.png" : "after-desktop.png";
	await shot(page, finalShot);
	if (recording) {
		await recording.chapter("Jogador não apaga o molde alheio", 2200);
		await recording.stop();
	}
	const clearLabel = await page
		.getByRole("button", { name: /Limpar moldes/ })
		.innerText();
	await context.close();
	return {
		viewport,
		errors,
		points,
		before: before.count,
		afterButton: afterButton.count,
		afterDelete: afterDelete.count,
		owners: [...owners],
		snapGrid: GRID,
		deniedDisabled,
		clearLabel,
		touch: {
			beforeDelete: targetsBefore,
			playerView: targetsAfter,
		},
	};
}

async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({
		configLoader: "runner",
		server: { host: "127.0.0.1", port: PORT, strictPort: true },
	});
	await server.listen();
	const base = `http://127.0.0.1:${PORT}`;
	const browser = await chromium.launch({ headless: true });
	const measures = {};
	try {
		fs.mkdirSync(OUTPUT, { recursive: true });
		measures.desktop = await run(
			browser,
			base,
			{ width: 1440, height: 900 },
			true,
		);
		measures.mobile = await run(
			browser,
			base,
			{ width: 390, height: 844 },
			false,
		);
		fs.writeFileSync(
			path.join(OUTPUT, "measures.json"),
			`${JSON.stringify(measures, null, 2)}\n`,
		);
		console.log(JSON.stringify(measures, null, 2));
	} finally {
		const forceExit = setTimeout(() => process.exit(process.exitCode || 0), 3000);
		void browser.close().catch(() => undefined);
		void server.close().catch(() => undefined);
		forceExit.unref?.();
	}
}

main().catch((error) => {
	console.error(redact(error?.stack || error));
	process.exitCode = 1;
});
