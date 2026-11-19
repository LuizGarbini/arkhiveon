// A alça gira o token no lugar, no mouse e no toque, sem andar.
// Uso: pnpm check:giro-toque
const { chromium } = require("playwright");

const GRID = 70;
const RADIUS = GRID / 2;
// Centro da bola no zoom 1, sem disco de status: 21px de tela além do raio.
const DIST = RADIUS + 21;

function fail(message) {
	console.error(`FALHOU: ${message}`);
	process.exitCode = 1;
}

async function main() {
	const { createServer } = await import("vite");
	const server = await createServer({
		configLoader: "runner",
		mode: "test",
		server: { host: "127.0.0.1", port: 3288, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	try {
		await runCase(browser, {
			name: "mouse",
			viewport: { width: 1280, height: 800 },
			hasTouch: false,
			token: { x: 665, y: 385 },
		});
		await runCase(browser, {
			name: "toque",
			viewport: { width: 390, height: 844 },
			hasTouch: true,
			token: { x: 175, y: 455 },
		});
	} finally {
		await browser.close();
		await server.close();
	}
	if (process.exitCode) process.exit(process.exitCode);
	console.log("giro no toque: ok");
}

async function runCase(browser, spec) {
	const context = await browser.newContext({
		viewport: spec.viewport,
		hasTouch: spec.hasTouch,
	});
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	const writes = [];
	await context.route("**/rest/v1/**", (route) => {
		const req = route.request();
		if (req.url().includes("vtt_tokens") && req.method() !== "GET") {
			writes.push(JSON.parse(req.postData() || "{}"));
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: req.url().includes("/rpc/") ? "null" : "[]",
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
							id: "demo",
							name: "D",
							ownerId: "preview-gm-user",
							myRole: "owner",
							system: "dnd5e",
						},
					],
					activeCampaignId: "demo",
					hasLoadedCampaigns: true,
					campaignLoadStatus: "ready",
					characters: [],
					npcs: [],
				},
				version: 0,
			}),
		);
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (err) => errors.push(err.message));
	await page.goto("http://127.0.0.1:3288/campaigns/demo/vtt", {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(800);
	const { x, y } = spec.token;
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([
			{
				id: "s1",
				campaignId: "demo",
				name: "Mapa",
				gridType: "square",
				gridSize: 70,
				gridColor: "white",
				gridOpacity: 0.3,
				gridScaleDistance: 1.5,
				gridScaleUnit: "m",
				width: 1400,
				height: 900,
				fogEnabled: false,
				fogExploration: false,
				lightLevel: "bright",
				isActive: true,
				orderIndex: 0,
			},
		]);
		st.setActiveSceneId("s1");
		st.setActiveTool("select");
		st.setViewport({ x: 0, y: 0, scale: 1 });
	});
	await page.waitForTimeout(1500);
	await page.evaluate(({ x, y }) => {
		const st = window.__vtt_store__.getState();
		const mk = (id, name, px, py, extra = {}) => ({
			id,
			sceneId: "s1",
			name,
			layer: "token",
			x: px,
			y: py,
			sizeCells: 1,
			rotation: 0,
			elevation: 0,
			conditions: [],
			auras: [],
			visionRange: 6,
			isLocked: false,
			isHidden: false,
			controlledBy: ["preview-gm-user"],
			...extra,
		});
		st.setTokens([
			mk("a", "Aria", x, y),
			mk("b", "Bruno", x, y + 70),
			mk("lock", "Trava", x + 140, y, { isLocked: true }),
		]);
		st.setSelectedTokenIds(["a"]);
		st.setViewport({ x: 0, y: 0, scale: 1 });
	}, spec.token);
	await page.waitForTimeout(1200);

	const pose = () =>
		page.evaluate(() =>
			Object.fromEntries(
				window.__vtt_store__
					.getState()
					.tokens.map((token) => [
						token.id,
						{ x: token.x, y: token.y, r: token.rotation ?? 0 },
					]),
			),
		);

	const point = async (worldX, worldY) =>
		page.evaluate(
			({ worldX, worldY }) => {
				const canvas = document.querySelector("canvas");
				const rect = canvas.parentElement.getBoundingClientRect();
				const vp = window.__vtt_store__.getState().viewport;
				return {
					x: rect.left + vp.x + worldX * vp.scale,
					y: rect.top + vp.y + worldY * vp.scale,
				};
			},
			{ worldX, worldY },
		);

	const drag = async (from, to) => {
		if (spec.hasTouch) {
			await page.evaluate(
				({ from, to }) => {
					const el = document.querySelector("canvas").parentElement;
					const fire = (type, x, y) => {
						const event = new PointerEvent(type, {
							bubbles: true,
							cancelable: true,
							pointerId: 7,
							pointerType: "touch",
							clientX: x,
							clientY: y,
							button: 0,
							buttons: type === "pointerup" ? 0 : 1,
							isPrimary: true,
						});
						el.dispatchEvent(event);
					};
					fire("pointerdown", from.x, from.y);
					const steps = 8;
					for (let i = 1; i <= steps; i++) {
						fire(
							"pointermove",
							from.x + ((to.x - from.x) * i) / steps,
							from.y + ((to.y - from.y) * i) / steps,
						);
					}
					fire("pointerup", to.x, to.y);
				},
				{ from, to },
			);
		} else {
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			await page.mouse.move(to.x, to.y, { steps: 10 });
			await page.mouse.up();
		}
		await page.waitForTimeout(250);
	};

	const before = await pose();
	const north = await point(x, y - DIST);
	const east = await point(x + DIST, y);
	await drag(north, east);
	const turned = await pose();
	if (turned.a.r !== 90 || turned.a.x !== before.a.x || turned.a.y !== before.a.y) {
		fail(
			`${spec.name}: arrastar a alça para a direita deveria deixar Aria em 90° no mesmo lugar (ficou ${JSON.stringify(turned.a)}, saiu de ${JSON.stringify(before.a)})`,
		);
	}
	if (turned.b.r !== 0 || turned.b.x !== before.b.x) {
		fail(`${spec.name}: Bruno não estava selecionado e não devia girar`);
	}

	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.updateTokens([
			{ tokenId: "a", updates: { rotation: 0 } },
			{ tokenId: "b", updates: { rotation: 20 } },
		]);
		st.setSelectedTokenIds(["a", "b"]);
	});
	await page.waitForTimeout(300);
	writes.length = 0;
	const south = await point(x, y + DIST);
	await drag(await point(x, y - DIST), south);
	const group = await pose();
	if (group.a.r !== 180 || group.b.r !== 200) {
		fail(
			`${spec.name}: o grupo devia girar junto (Aria 180, Bruno 200; ficou ${group.a.r} e ${group.b.r})`,
		);
	}
	if (group.a.x !== x || group.a.y !== y || group.b.x !== x || group.b.y !== y + 70) {
		fail(`${spec.name}: girar o grupo andou o token (${JSON.stringify(group)})`);
	}
	await page.waitForTimeout(400);
	const rotationWrites = writes.filter((body) => "rotation" in body);
	if (rotationWrites.length < 1) {
		fail(`${spec.name}: girar não gravou a rotação`);
	}
	if (writes.some((body) => body.x !== undefined && body.x !== x)) {
		fail(`${spec.name}: a gravação do giro mudou o x`);
	}

	await page.evaluate(() => {
		window.__vtt_store__.getState().setSelectedTokenIds(["lock"]);
	});
	await page.waitForTimeout(200);
	const lockFrom = await point(x + 140, y - DIST);
	const lockTo = await point(x + 140 + DIST, y);
	await drag(lockFrom, lockTo);
	const locked = await pose();
	if (locked.lock.r !== 0 || locked.lock.x !== x + 140 || locked.lock.y !== y) {
		fail(
			`${spec.name}: token travado não tem alça e não devia girar nem andar (${JSON.stringify(locked.lock)})`,
		);
	}

	if (errors.length) fail(`${spec.name}: erro na página: ${errors[0]}`);
	await context.close();
	if (!process.exitCode) console.log(`${spec.name}: ok`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
