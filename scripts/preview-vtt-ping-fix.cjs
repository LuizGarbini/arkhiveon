// Prova do ping da mesa no app real (Vite + Playwright).
// Saída fora do repo: ~/projects/arkhiveon-previews/vtt/ping-fix/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startPreviewRecorder } = require("./vtt-preview-recorder.cjs");

const OUTPUT = path.join(
	process.env.HOME,
	"projects/arkhiveon-previews/vtt/ping-fix",
);
const PORT = 4188;
const CAMPAIGN_ID = "demo-tabletop";
const COLOR = "#38bdf8";

async function until(page, predicate, timeout, label) {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		if (await page.evaluate(predicate)) return;
		await page.waitForTimeout(50);
	}
	throw new Error(label);
}

function redact(value) {
	return String(value)
		.replace(/eyJ[A-Za-z0-9_-]{10,}/g, "[redacted]")
		.slice(0, 240);
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
		store.setUserColor("#38bdf8");
		const scene = {
			id: "scene-ping",
			campaignId,
			name: "Sala do ping",
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
		store.setViewport({ x: 80, y: 80, scale: 1 });
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
			canvasReady = alive === "scene-ping";
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
			scenes: window.__vtt_store__?.getState?.().scenes?.length ?? null,
		}));
		throw new Error(`Canvas da mesa ausente: ${JSON.stringify(info)}`);
	}
	await page.waitForTimeout(600);
	await page.evaluate(() => {
		window.__osc = 0;
		const patch = (Ctor) => {
			if (!Ctor?.prototype?.createOscillator) return;
			const original = Ctor.prototype.createOscillator;
			if (original.__pingPatched) return;
			function counted(...args) {
				window.__osc += 1;
				return original.apply(this, args);
			}
			counted.__pingPatched = true;
			Ctor.prototype.createOscillator = counted;
		};
		patch(window.AudioContext);
		patch(window.webkitAudioContext);
	});
	return errors;
}

async function pointInCanvas(page) {
	const box = await page.locator("canvas").first().boundingBox();
	if (!box) throw new Error("Canvas da mesa ausente.");
	return {
		x: box.x + box.width * 0.62,
		y: box.y + box.height * 0.48,
	};
}

async function dispatchPing(page, index) {
	await page.evaluate((step) => {
		const canvas = document.querySelector("canvas");
		const rect = canvas.getBoundingClientRect();
		canvas.dispatchEvent(
			new PointerEvent("pointerdown", {
				bubbles: true,
				cancelable: true,
				clientX: rect.left + rect.width * 0.62 + (step % 6) * 18,
				clientY: rect.top + rect.height * 0.48 + Math.floor(step / 6) * 16,
				button: 0,
				buttons: 1,
				pointerId: 1,
				pointerType: "mouse",
				isPrimary: true,
			}),
		);
	}, index);
}

async function holdAlt(page, down) {
	await page.evaluate((pressed) => {
		window.dispatchEvent(
			new KeyboardEvent(pressed ? "keydown" : "keyup", {
				code: "AltLeft",
				key: "Alt",
				bubbles: true,
			}),
		);
	}, down);
}

async function readTool(page) {
	return page.evaluate(() => window.__vtt_store__?.getState?.().activeTool ?? null);
}

async function toolDiag(page) {
	return page.evaluate(() => ({
		tool: window.__vtt_store__?.getState?.().activeTool ?? null,
		overlay:
			document.querySelector("[data-vtt-overlay='open']")?.getAttribute("aria-label") ??
			null,
		dialog: Boolean(document.querySelector("[role='dialog'], dialog[open]")),
		toolbar: Boolean(document.querySelector("[data-slot='vtt-toolbar']")),
		active: document.activeElement?.tagName ?? null,
	}));
}

async function chooseTool(page, tool, key, buttonName) {
	await page.locator("canvas").first().click({
		position: { x: 180, y: 180 },
		force: true,
	});
	await page.keyboard.press(key);
	for (let i = 0; i < 10; i++) {
		if ((await readTool(page)) === tool) return "keyboard";
		await page.waitForTimeout(50);
	}
	await page.evaluate((eventKey) => {
		window.dispatchEvent(
			new KeyboardEvent("keydown", { key: eventKey, bubbles: true }),
		);
	}, key);
	if ((await readTool(page)) === tool) return "dispatch";
	const button = page.getByRole("button", { name: buttonName });
	if ((await button.count()) > 0) {
		await button.first().click();
		if ((await readTool(page)) === tool) return "button";
	}
	const diag = await toolDiag(page);
	throw new Error(`Ferramenta ${tool} não ativou: ${JSON.stringify(diag)}`);
}

async function run(browser, base, viewport, record) {
	const context = await browser.newContext({
		viewport,
		deviceScaleFactor: 1,
		hasTouch: viewport.width < 500,
		isMobile: viewport.width < 500,
	});
	await setupContext(context);
	const page = await context.newPage();
	const errors = await openTable(page, base);
	await page.evaluate(() => document.activeElement?.blur?.());
	const pingVia = await chooseTool(
		page,
		"ping",
		"g",
		"Ponteiro Laser (Ping)",
	);
	await page.waitForTimeout(300);
	const spot = await pointInCanvas(page);
	await page.mouse.click(spot.x, spot.y);
	const colored = await page.evaluate(
		() => window.__vtt_store__.getState().activePings.at(-1)?.color ?? null,
	);
	assert.equal(colored, COLOR, "a cor do ping segue a cor do usuário");
	const selectVia = await chooseTool(
		page,
		"select",
		"v",
		"Selecionar e mover vários",
	);
	await page.waitForTimeout(300);
	const beforeAlt = await page.evaluate(
		() => window.__vtt_store__.getState().activePings.length,
	);
	await page.keyboard.down("Alt");
	await page.mouse.click(spot.x + 30, spot.y + 20);
	await page.keyboard.up("Alt");
	let afterAlt = await page.evaluate(
		() => window.__vtt_store__.getState().activePings.length,
	);
	let altVia = "playwright";
	if (afterAlt <= beforeAlt) {
		await holdAlt(page, true);
		await dispatchPing(page, 2);
		await holdAlt(page, false);
		afterAlt = await page.evaluate(
			() => window.__vtt_store__.getState().activePings.length,
		);
		altVia = "keydown-altleft";
	}
	assert.ok(afterAlt > beforeAlt, "Alt+clique cria um ping");

	await until(
		page,
		() => (window.__vttPingMetrics?.ticks ?? 0) > 0,
		3000,
		"o ticker de ping não desenhou",
	);
	const early = await page.evaluate(() => ({ ...window.__vttPingMetrics }));
	await page.waitForTimeout(400);
	const later = await page.evaluate(() => ({ ...window.__vttPingMetrics }));
	assert.ok(
		later.lastRadius > early.lastRadius,
		"o raio do ping cresce com o tempo",
	);
	assert.ok(later.lastAlpha < early.lastAlpha, "o alpha do ping cai com o tempo");

	await until(
		page,
		() =>
			window.__vtt_store__.getState().activePings.length === 0 &&
			window.__vttPingMetrics?.attached === false,
		5000,
		"o ping não expirou sozinho",
	);
	const ticksAtRest = await page.evaluate(() => window.__vttPingMetrics.ticks);
	await page.waitForTimeout(400);
	const ticksStill = await page.evaluate(() => window.__vttPingMetrics.ticks);
	assert.equal(ticksStill, ticksAtRest, "o ticker de ping para sem pings");

	await chooseTool(page, "ping", "g", "Ponteiro Laser (Ping)");
	await page.waitForTimeout(300);
	await page.evaluate(() => {
		window.__osc = 0;
	});
	const burst = await page.evaluate(async () => {
		const longs = [];
		let observer = null;
		try {
			observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) longs.push(entry.duration);
			});
			observer.observe({ type: "longtask", buffered: false });
		} catch {
			observer = null;
		}
		const store = window.__vtt_store__;
		let maxActive = 0;
		const unsubscribe = store.subscribe((state) => {
			maxActive = Math.max(maxActive, state.activePings.length);
		});
		const canvas = document.querySelector("canvas");
		const rect = canvas.getBoundingClientRect();
		const started = performance.now();
		for (let i = 0; i < 30; i++) {
			canvas.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
					cancelable: true,
					clientX: rect.left + rect.width * 0.55 + (i % 5) * 14,
					clientY: rect.top + rect.height * 0.42,
					button: 0,
					buttons: 1,
					pointerId: 1,
					pointerType: "mouse",
					isPrimary: true,
				}),
			);
		}
		const burstMs = performance.now() - started;
		await new Promise((resolve) => setTimeout(resolve, 50));
		observer?.disconnect();
		const accepted = store.getState().activePings.length;
		maxActive = Math.max(maxActive, accepted);
		unsubscribe();
		return {
			burstMs,
			accepted,
			maxActive,
			oscillators: window.__osc,
			longTasks: longs,
		};
	});
	assert.ok(burst.maxActive <= 12, "rajada passa de 12 pings ativos");
	assert.ok(burst.maxActive >= 1, "a rajada não criou ping");
	assert.ok(burst.oscillators <= 2, "a rajada criou um oscilador por ping");

	await until(
		page,
		() => window.__vtt_store__.getState().activePings.length === 0,
		5000,
		"a rajada não expirou",
	);

	let recording = null;
	if (record) {
		fs.mkdirSync(OUTPUT, { recursive: true });
		recording = await startPreviewRecorder(
			page,
			path.join(OUTPUT, "preview.webm"),
			"30 pings na mesa",
		);
	}
	const paced = page.evaluate(async () => {
		const store = window.__vtt_store__;
		let maxActive = 0;
		const unsubscribe = store.subscribe((state) => {
			maxActive = Math.max(maxActive, state.activePings.length);
		});
		const canvas = document.querySelector("canvas");
		const rect = canvas.getBoundingClientRect();
		for (let i = 0; i < 30; i++) {
			canvas.dispatchEvent(
				new PointerEvent("pointerdown", {
					bubbles: true,
					cancelable: true,
					clientX: rect.left + 80 + (i % 8) * 28,
					clientY: rect.top + 120 + Math.floor(i / 8) * 26,
					button: 0,
					buttons: 1,
					pointerId: 1,
					pointerType: "mouse",
					isPrimary: true,
				}),
			);
			await new Promise((resolve) => setTimeout(resolve, 160));
		}
		const active = store.getState().activePings.length;
		maxActive = Math.max(maxActive, active);
		unsubscribe();
		return { maxActive, active };
	});
	await until(
		page,
		() => window.__vtt_store__.getState().activePings.length >= 4,
		8000,
		"a série espaçada não mostrou 4 pings",
	);
	const shot = path.join(
		OUTPUT,
		viewport.width < 500 ? "after-mobile.png" : "after-desktop.png",
	);
	fs.mkdirSync(OUTPUT, { recursive: true });
	await page.screenshot({ path: shot, type: "png" });
	const pacedResult = await paced;
	assert.ok(pacedResult.maxActive <= 12, "a série espaçada passa de 12");
	assert.ok(pacedResult.maxActive >= 4, "a série espaçada não acumulou pings");
	if (recording) {
		await recording.chapter("Os anéis somem sozinhos", 3600);
		await recording.stop();
	} else {
		await page.waitForTimeout(200);
	}
	await context.close();
	return {
		viewport: { width: viewport.width, height: viewport.height },
		tool: pingVia,
		selectVia,
		color: colored,
		altVia,
		animation: {
			radiusBefore: early.lastRadius,
			radiusAfter: later.lastRadius,
			alphaBefore: early.lastAlpha,
			alphaAfter: later.lastAlpha,
		},
		ticker: {
			ticksAtRest,
			ticksAfterIdle: ticksStill,
			stopped: ticksStill === ticksAtRest,
		},
		burst,
		paced: pacedResult,
		pageErrors: errors,
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
	const measures = { beforeRecorded: false };
	try {
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
		fs.mkdirSync(OUTPUT, { recursive: true });
		fs.writeFileSync(
			path.join(OUTPUT, "measures.json"),
			`${JSON.stringify(measures, null, 2)}\n`,
		);
		console.log(JSON.stringify(measures, null, 2));
	} finally {
		await Promise.race([
			browser.close().catch(() => undefined),
			new Promise((resolve) => setTimeout(resolve, 4000)),
		]);
		await Promise.race([
			server.close().catch(() => undefined),
			new Promise((resolve) => setTimeout(resolve, 4000)),
		]);
	}
}

main().catch((error) => {
	console.error(redact(error?.stack || error));
	process.exitCode = 1;
});
