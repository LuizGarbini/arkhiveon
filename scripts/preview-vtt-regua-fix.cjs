// Prova da régua no app real (Vite + Playwright).
// Saída fora do repo: ~/projects/arkhiveon-previews/vtt/regua-fix/
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startPreviewRecorder } = require("./vtt-preview-recorder.cjs");

const OUTPUT = path.join(
	process.env.HOME,
	"projects/arkhiveon-previews/vtt/regua-fix",
);
const PORT = 4197;
const CAMPAIGN_ID = "demo-tabletop";
const G = 70;
const HOLD_MS = 3000;

const world = {
	start: { x: 2.5 * G, y: 5.5 * G },
	curve: { x: 6.5 * G, y: 5.5 * G },
	tip: { x: 6.5 * G, y: 2.5 * G },
};

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
	await context.route("**/rest/v1/**", (route) => {
		const url = route.request().url();
		if (url.includes("/vtt_scenes")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([
					{
						id: "scene-regua",
						campaign_id: "demo-tabletop",
						name: "Sala da régua",
						map_image_url: null,
						grid_type: "square",
						grid_size: 70,
						grid_color: "#ffffff",
						grid_opacity: 0.18,
						grid_scale_distance: 1.5,
						grid_scale_unit: "m",
						grid_offset_x: 0,
						grid_offset_y: 0,
						map_scale: 1,
						width: 1600,
						height: 1200,
						fog_enabled: false,
						fog_exploration: false,
						is_active: true,
						order_index: 0,
						created_at: "2026-11-13T00:00:00.000Z",
						updated_at: "2026-11-13T00:00:00.000Z",
					},
				]),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "[]",
		});
	});
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
		store.setDiagonalRule("5105");
		const scene = {
			id: "scene-regua",
			campaignId,
			name: "Sala da régua",
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
		store.setActiveTool("select");
		store.setActiveMeasurement(null);
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
			await page.locator("canvas").last().waitFor({
				state: "visible",
				timeout: 8000,
			});
			const alive = await page.evaluate(
				() => window.__vtt_store__.getState().activeSceneId,
			);
			canvasReady = alive === "scene-regua";
		} catch {
			canvasReady = false;
		}
	}
	if (!canvasReady) {
		const info = await page.evaluate(() => ({
			path: location.pathname,
			canvases: document.querySelectorAll("canvas").length,
			sceneId: window.__vtt_store__?.getState?.().activeSceneId ?? null,
		}));
		throw new Error(`Canvas da mesa ausente: ${JSON.stringify(info)}`);
	}
	await page.waitForTimeout(300);
	return errors;
}

async function chooseRuler(page) {
	const box = await page.locator("canvas").last().boundingBox();
	if (!box) throw new Error("Canvas da mesa ausente.");
	await page.mouse.click(
		box.x + Math.min(140, box.width * 0.45),
		box.y + Math.min(160, box.height * 0.45),
	);
	if (!page.url().includes("/vtt")) {
		throw new Error(`saiu da mesa ao focar o mapa: ${page.url()}`);
	}
	await page.keyboard.press("r");
	for (let i = 0; i < 12; i++) {
		const tool = await page.evaluate(
			() => window.__vtt_store__.getState().activeTool,
		);
		if (tool === "ruler") return "keyboard";
		await page.waitForTimeout(50);
	}
	const button = page.getByRole("button", { name: "Régua de Medição" });
	if ((await button.count()) > 0) {
		await button.first().click();
		const tool = await page.evaluate(
			() => window.__vtt_store__.getState().activeTool,
		);
		if (tool === "ruler") return "button";
	}
	throw new Error("Ferramenta régua não ativou");
}

async function fitRuler(page) {
	await page.evaluate((points) => {
		const canvas = [...document.querySelectorAll("canvas")].find((item) =>
			String(item.parentElement?.className || "").includes("touch-none"),
		);
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const spanX = points.curve.x - points.start.x;
		const spanY = points.start.y - points.tip.y;
		const left = Math.max(88, Math.min(180, rect.width - spanX - 16));
		// Abaixo da faixa da régua (top-32 + controles). A ponta do L não pode cair nela.
		const top = Math.min(
			Math.max(260, rect.height * 0.42),
			Math.max(220, rect.height - spanY - 48),
		);
		window.__vtt_store__.getState().setViewport({
			x: left - points.start.x,
			y: top - points.tip.y,
			scale: 1,
		});
		window.__vtt_store__.getState().setActiveMeasurement(null);
	}, world);
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
	if (!client) throw new Error("Canvas da régua ausente.");
	return client;
}

async function readMeasure(page) {
	return page.evaluate(() => {
		const m = window.__vtt_store__.getState().activeMeasurement;
		if (!m) return null;
		const last = m.waypoints?.at?.(-1);
		const liveSeparate =
			!last || last.x !== m.currentX || last.y !== m.currentY;
		return {
			startX: m.startX,
			startY: m.startY,
			currentX: m.currentX,
			currentY: m.currentY,
			distance: m.distance,
			unit: m.unit,
			waypoints: m.waypoints ?? null,
			segments: m.segments ?? null,
			cells: m.cells ?? null,
			pinned: Boolean(m.pinned),
			pathCount: (m.waypoints?.length ?? 0) + (liveSeparate ? 1 : 0),
		};
	});
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
	await page.setViewportSize({ width: viewport.width, height: viewport.height });
	const errors = await openTable(page, base);
	const toolVia = await chooseRuler(page);
	await fitRuler(page);
	await page.waitForTimeout(150);
	const clients = {
		start: await clientOf(page, world.start),
		curve: await clientOf(page, world.curve),
		tip: await clientOf(page, world.tip),
	};
	const hits = await page.evaluate((points) => {
		const tag = (point) => document.elementFromPoint(point.x, point.y)?.tagName ?? null;
		const canvas = [...document.querySelectorAll("canvas")].find((item) =>
			String(item.parentElement?.className || "").includes("touch-none"),
		);
		const rect = canvas?.getBoundingClientRect();
		return {
			start: tag(points.start),
			curve: tag(points.curve),
			tip: tag(points.tip),
			innerWidth: window.innerWidth,
			innerHeight: window.innerHeight,
			canvas: rect
				? { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
				: null,
		};
	}, clients);
	if (hits.start !== "CANVAS" || hits.curve !== "CANVAS" || hits.tip !== "CANVAS") {
		fs.mkdirSync(OUTPUT, { recursive: true });
		fs.writeFileSync(
			path.join(OUTPUT, "hit-debug.json"),
			JSON.stringify({ hits, clients }, null, 2),
		);
		throw new Error(
			`régua fora do mapa (${hits.start}/${hits.curve}/${hits.tip} @ ${hits.innerWidth})`,
		);
	}

	let recording = null;
	if (record) {
		fs.mkdirSync(OUTPUT, { recursive: true });
		recording = await startPreviewRecorder(
			page,
			path.join(OUTPUT, "preview.webm"),
			"Arrasta a régua para a direita",
		);
	}

	await page.mouse.move(clients.start.x, clients.start.y);
	await page.mouse.down();
	await page.mouse.move(clients.curve.x, clients.curve.y, { steps: 18 });
	const dragHeld = await readMeasure(page);
	await page.mouse.up();
	const afterDragRelease = await readMeasure(page);
	if (!afterDragRelease) {
		const hit = await page.evaluate((point) => {
			const el = document.elementFromPoint(point.x, point.y);
			return {
				path: location.pathname,
				tool: window.__vtt_store__.getState().activeTool,
				tag: el?.tagName ?? null,
				cls: String(el?.className || "").slice(0, 140),
			};
		}, clients.start);
		fs.mkdirSync(OUTPUT, { recursive: true });
		fs.writeFileSync(
			path.join(OUTPUT, "drag-debug.json"),
			JSON.stringify({ dragHeld, hit, clients }, null, 2),
		);
		throw new Error("soltar o arrasto apagou a régua");
	}
	assert.equal(afterDragRelease.distance, 6);
	assert.equal(afterDragRelease.pathCount, 2);

	if (recording) await recording.chapter("Soltou: a medida ficou", 1600);

	await page.mouse.click(clients.curve.x, clients.curve.y);
	await page.mouse.move(clients.tip.x, clients.tip.y, { steps: 14 });
	const afterL = await readMeasure(page);
	assert.equal(afterL?.distance, 10.5);
	assert.equal(afterL?.pathCount, 3);
	assert.deepEqual(afterL?.segments, [6, 4.5]);
	assert.equal(afterL?.pinned, false);

	if (recording) {
		await recording.chapter("L: direita e depois para cima", 1400);
		await recording.chapter("Sem novo clique", HOLD_MS);
	} else {
		await page.waitForTimeout(HOLD_MS);
	}
	const afterHold = await readMeasure(page);
	assert.equal(afterHold?.distance, 10.5);
	assert.equal(afterHold?.pathCount, 3);

	fs.mkdirSync(OUTPUT, { recursive: true });
	await page.screenshot({
		path: path.join(
			OUTPUT,
			viewport.width < 500 ? "after-mobile.png" : "after-desktop.png",
		),
		type: "png",
	});

	await page.keyboard.press("Escape");
	await page.waitForTimeout(200);
	const afterEscape = await readMeasure(page);
	assert.equal(afterEscape, null);
	if (recording) {
		await recording.chapter("Esc limpa", 1400);
		await recording.stop();
	}

	const pathName = page.url();
	await context.close();
	return {
		viewport,
		toolVia,
		path: pathName,
		clients,
		dragHeld,
		afterDragRelease,
		afterL,
		holdMs: HOLD_MS,
		presentAfterHold: afterHold,
		afterEscape,
		pageErrors: errors,
	};
}

function writeReadme(measures) {
	const desktop = measures.desktop;
	const mobile = measures.mobile;
	const text = `# Régua da mesa — a medida ficava ao soltar

## Causa (reproduzida no app, antes da correção)

No \`pointerup\` de \`src/components/vtt/vtt-canvas.tsx\` (por volta da linha 2359, antes do conserto), o aperto com \`moved && fresh\` chamava \`setActiveMeasurement(null)\`. O \`pointerdown\` comentava o comportamento: arrastar a partir do zero media uma reta que sumia ao soltar. O movimento conta a partir de 8px (\`TOKEN_TAP_SLOP_PX\`).

Na mesa real (\`/campaigns/demo-tabletop/vtt\`, grade 70, 1,5 m, regra 5-10-5):

- Clique no início, mover à direita, clique na curva, mover para cima e esperar 2 s: a medida **permaneceu**, 3 pontos, **10,5 m** (6 m + 4,5 m), 7 casas. Ver \`l-idle.png\`.
- Arrastar do início até a curva com o botão preso: durante o aperto, **6 m / 4 casas** (\`before-held.png\`). Ao soltar, \`activeMeasurement\` ficou \`null\` e a barra voltou a "Clique no mapa" (\`before-desktop.png\`).

Não há timeout de régua remota. O receptor em \`src/routes/campaigns/$campaignId/vtt.tsx\` só apaga no broadcast \`null\` ou quando a presença sai. O envio local (no máximo a cada 40 ms) transmite a medida; não a apaga. O \`null\` do \`pointerup\` é o que some na tela de quem mede e na dos outros.

## Correção

\`rulerPointerUp\` mantém a medida ao soltar. O primeiro aperto deixa a ponta ao vivo; o clique seguinte fixa o ponto. Esc, troca de ferramenta e duplo clique (ou Enter) continuam limpando ou fixando. \`applyRemoteRuler\` ignora timeout.

## CA → evidência → resultado

| CA | Evidência | Resultado |
| --- | --- | --- |
| CA1 a medida local fica depois de soltar | desktop.afterDragRelease.distance = ${desktop?.afterDragRelease?.distance} | ${desktop?.afterDragRelease ? "passou" : "falhou"} |
| CA2 fluxo L (3 pontos, 10,5 m) | desktop.presentAfterHold | ${desktop?.presentAfterHold?.distance === 10.5 && desktop?.presentAfterHold?.pathCount === 3 ? "passou" : "falhou"} |
| CA3 Esc limpa | desktop.afterEscape = ${JSON.stringify(desktop?.afterEscape)} | ${desktop?.afterEscape === null ? "passou" : "falhou"} |
| CA3 troca de ferramenta e duplo clique | \`src/lib/vtt/ruler-gesture.test.ts\` | passou (vitest) |
| CA4 remoto não some por timeout | \`applyRemoteRuler\` no mesmo teste | passou (vitest) |
| CA5 arrastar e soltar não apaga; o clique seguinte continua | desktop.afterDragRelease + presentAfterHold | ${desktop?.afterDragRelease && desktop?.presentAfterHold?.pathCount === 3 ? "passou" : "falhou"} |
| Mobile 390×844 | after-mobile.png, mobile.presentAfterHold.distance = ${mobile?.presentAfterHold?.distance} | ${mobile?.presentAfterHold?.distance === 10.5 ? "passou" : "falhou"} |

Arrastar do zero, hoje: a reta fica (origem + ponta ao vivo). O próximo clique fixa o ponto e a régua continua. Antes, esse \`pointerup\` apagava a medida.

## Comandos

\`\`\`bash
pnpm vitest run src/lib/vtt/ruler-gesture.test.ts --configLoader runner
pnpm test
pnpm build
pnpm exec biome check src/lib/vtt/ruler-gesture.ts src/lib/vtt/ruler-gesture.test.ts src/components/vtt/vtt-canvas.tsx src/lib/vtt/vtt-store.ts src/routes/campaigns/\\$campaignId/vtt.tsx src/data/updates.ts
node scripts/preview-vtt-regua-fix.cjs
\`\`\`

Prova: \`~/projects/arkhiveon-previews/vtt/regua-fix/\` (\`preview.webm\`, \`after-desktop.png\`, \`after-mobile.png\`, \`before-desktop.png\`, \`measures.json\`).
`;
	fs.writeFileSync(path.join(OUTPUT, "README.md"), text);
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
		writeReadme(measures);
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
		setTimeout(() => process.exit(process.exitCode ?? 0), 300).unref();
	}
}

main().catch((error) => {
	console.error(redact(error?.stack || error));
	process.exitCode = 1;
});
