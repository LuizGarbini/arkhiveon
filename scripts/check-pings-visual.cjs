// Fluidez e visual dos pings:
//  - Ctrl + arrastar: a roda aparece no mesmo turno em que o ponteiro sai do centro;
//  - o destaque troca o atributo e não troca o nó da roda;
//  - soltar pinta o ping local nesse turno;
//  - a roda não recria o Pixi nem recalcula a visão;
//  - o mesmo, com a CPU em 4x.
// Uso: pnpm check:pings-visual
const { chromium } = require("playwright");
const fs = require("node:fs");

async function main() {
	fs.mkdirSync("docs/previews", { recursive: true });
	const { createServer } = await import("vite");
	const server = await createServer({
		configLoader: "runner",
		mode: "test",
		server: { host: "127.0.0.1", port: 3210, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	await context.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	await context.route("**/rest/v1/**", (r) =>
		r.fulfill({
			status: 200,
			contentType: "application/json",
			body: r.request().url().includes("/rpc/") ? "null" : "[]",
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
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("http://127.0.0.1:3210/campaigns/demo/vtt", {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(800);
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(true);
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
	});
	await page.waitForTimeout(1200);
	await page.evaluate((t) => window.__vtt_store__.getState().setTokens(t), [
		{
			id: "a",
			sceneId: "s1",
			name: "Aria",
			layer: "token",
			x: 455,
			y: 455,
			sizeCells: 1,
			rotation: 0,
			elevation: 0,
			conditions: [],
			auras: [],
			visionRange: 6,
			isLocked: false,
			isHidden: false,
			controlledBy: ["preview-gm-user"],
		},
	]);
	await page.waitForTimeout(800);
	await page.waitForFunction(() => window.__vttPingFrame?.pixiBoots >= 1, {
		timeout: 15000,
	});

	const point = await page.evaluate(() => {
		const canvas = document.querySelector("canvas");
		const box = canvas.getBoundingClientRect();
		const vp = window.__vtt_store__.getState().viewport;
		return {
			x: box.x + vp.x + 900 * vp.scale,
			y: box.y + vp.y + 600 * vp.scale,
		};
	});

	async function gesture(label) {
		const down = await page.evaluate(({ x, y }) => {
			const canvas = document.querySelector("canvas");
			canvas.dispatchEvent(
				new PointerEvent("pointerdown", {
					clientX: x,
					clientY: y,
					button: 0,
					buttons: 1,
					ctrlKey: true,
					bubbles: true,
					pointerId: 1,
				}),
			);
			return {
				wheel: !!document.querySelector("[data-ping-wheel]"),
				pixi: window.__vttPingFrame?.pixiBoots ?? 0,
				vision: window.__vttPingFrame?.visionPasses ?? 0,
			};
		}, point);
		const leave = await page.evaluate(({ x, y }) => {
			const renders = window.__vttPingFrame?.wheelRenders ?? 0;
			const pixi = window.__vttPingFrame?.pixiBoots ?? 0;
			const vision = window.__vttPingFrame?.visionPasses ?? 0;
			const t0 = performance.now();
			window.dispatchEvent(
				new PointerEvent("pointermove", {
					clientX: x,
					clientY: y - 90,
					button: 0,
					buttons: 1,
					ctrlKey: true,
					bubbles: true,
					pointerId: 1,
				}),
			);
			const ms = performance.now() - t0;
			const root = document.querySelector("[data-ping-wheel]");
			if (root) root.dataset.node = "keep";
			return {
				ms,
				frameMs: window.__vttPingFrame?.lastWheelMs ?? -1,
				revealed: root?.dataset.revealed ?? null,
				hidden: root?.hidden ?? true,
				sameNode: root?.dataset.node === "keep",
				renders: (window.__vttPingFrame?.wheelRenders ?? 0) - renders,
				pixiSame: (window.__vttPingFrame?.pixiBoots ?? 0) === pixi,
				visionSame: (window.__vttPingFrame?.visionPasses ?? 0) === vision,
			};
		}, point);
		await page.evaluate(
			() =>
				new Promise((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(resolve)),
				),
		);
		const hover = await page.evaluate(({ x, y }) => {
			const root = document.querySelector("[data-ping-wheel]");
			const renders = window.__vttPingFrame?.wheelRenders ?? 0;
			const chips = root.querySelectorAll("[data-ping-kind]").length;
			window.dispatchEvent(
				new PointerEvent("pointermove", {
					clientX: x + 84,
					clientY: y,
					button: 0,
					buttons: 1,
					ctrlKey: true,
					bubbles: true,
					pointerId: 1,
				}),
			);
			return {
				sameNode: root.dataset.node === "keep",
				chipsSame: root.querySelectorAll("[data-ping-kind]").length === chips,
				active: root
					.querySelector('[data-ping-kind="going"]')
					?.getAttribute("data-active"),
				renders: (window.__vttPingFrame?.wheelRenders ?? 0) - renders,
				label: root.querySelector("[data-ping-wheel-label]")?.textContent ?? "",
			};
		}, point);
		const release = await page.evaluate(({ x, y }) => {
			const pixi = window.__vttPingFrame?.pixiBoots ?? 0;
			const vision = window.__vttPingFrame?.visionPasses ?? 0;
			const t0 = performance.now();
			window.dispatchEvent(
				new PointerEvent("pointerup", {
					clientX: x + 84,
					clientY: y,
					button: 0,
					buttons: 0,
					ctrlKey: true,
					bubbles: true,
					pointerId: 1,
				}),
			);
			const paint = window.__vttPingFrame?.lastPaintAt ?? 0;
			const ping = window.__vtt_store__.getState().activePings[0] ?? null;
			const root = document.querySelector("[data-ping-wheel]");
			return {
				painted: paint >= t0,
				kind: ping?.kind ?? null,
				name: ping?.userName ?? null,
				pixiSame: (window.__vttPingFrame?.pixiBoots ?? 0) === pixi,
				visionSame: (window.__vttPingFrame?.visionPasses ?? 0) === vision,
				wheelOpen: root?.dataset.revealed === "true" && root.hidden === false,
			};
		}, point);
		console.log(label, JSON.stringify({ down, leave, hover, release }));
		return { down, leave, hover, release };
	}

	const plain = await gesture("1x");
	await page.waitForTimeout(200);
	await page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		for (const ping of s.activePings) s.removePing(ping.id);
		s.closePingWheel();
	});
	const session = await context.newCDPSession(page);
	await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
	const slow = await gesture("4x");
	await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });

	await page.evaluate(() => {
		const s = window.__vtt_store__.getState();
		for (const ping of s.activePings) s.removePing(ping.id);
		const now = Date.now();
		const kinds = [
			["attention", 280, 560, "#38bdf8", "Lia"],
			["danger", 460, 560, "#a855f7", "Nilo"],
			["going", 640, 560, "#22c55e", "Eva"],
			["help", 820, 560, "#f59e0b", "Otto"],
			["focus", 1000, 560, "#eab308", "Mestre"],
		];
		kinds.forEach(([kind, x, y, color, userName], i) =>
			s.addPing({
				x,
				y,
				userId: `u${i}`,
				userName,
				color,
				timestamp: now,
				kind,
			}),
		);
		s.addPing({
			x: 455,
			y: 455,
			userId: "u9",
			userName: "Aria",
			color: "#f472b6",
			timestamp: now,
			kind: "highlight",
			tokenId: "a",
		});
	});
	await page.waitForTimeout(280);
	await page.screenshot({ path: "docs/previews/pings-visual-dark.png" });
	await page.evaluate(() => document.body.classList.remove("dark"));
	await page.waitForTimeout(80);
	await page.screenshot({ path: "docs/previews/pings-visual-light.png" });
	await page.evaluate(() => document.body.classList.add("dark"));

	await page.keyboard.down("Control");
	await page.mouse.move(point.x, point.y);
	await page.mouse.down();
	await page.mouse.move(point.x, point.y - 90, { steps: 4 });
	await page.waitForTimeout(80);
	await page.screenshot({ path: "docs/previews/pings-visual-wheel.png" });
	await page.mouse.up();
	await page.keyboard.up("Control");

	const pingBtn = page.getByRole("button", { name: "Ponteiro Laser (Ping)" });
	const bb = await pingBtn.boundingBox();
	await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(450);
	const row = await page.locator('[data-ping-picker] [data-ping-kind="help"]').boundingBox();
	if (row) {
		await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2, { steps: 4 });
	}
	await page.waitForTimeout(80);
	await page.screenshot({ path: "docs/previews/pings-visual-picker.png" });
	await page.mouse.up();

	console.log("erros de página:", errors.length ? errors.slice(0, 3) : "nenhum");
	await browser.close();
	await server.close();

	const problems = [];
	const check = (name, sample) => {
		if (!sample.leave.revealed || sample.leave.hidden) {
			problems.push(`${name}: a roda não apareceu ao sair do centro`);
		}
		if (sample.leave.ms > 32) {
			problems.push(`${name}: sair do centro levou ${sample.leave.ms.toFixed(1)} ms (orçamento 32)`);
		}
		if (!sample.leave.sameNode) problems.push(`${name}: a roda foi recriada ao aparecer`);
		// A primeira aparição monta a roda uma vez. No dev o StrictMode chama a
		// função duas vezes; o destaque, depois, não pode pintar de novo.
		if (sample.leave.renders > 2) {
			problems.push(`${name}: aparecer repintou a roda ${sample.leave.renders} vezes`);
		}
		if (!sample.hover.sameNode || !sample.hover.chipsSame) {
			problems.push(`${name}: o destaque reconstruiu a roda`);
		}
		if (sample.hover.renders !== 0) {
			problems.push(`${name}: o destaque repintou a roda (${sample.hover.renders})`);
		}
		if (sample.hover.active !== "true") {
			problems.push(`${name}: A caminho não acendeu (${sample.hover.active})`);
		}
		if (sample.hover.label !== "A caminho") {
			problems.push(`${name}: a etiqueta ficou "${sample.hover.label}"`);
		}
		if (!sample.release.painted) problems.push(`${name}: soltar não pintou o ping no mesmo turno`);
		if (sample.release.kind !== "going") {
			problems.push(`${name}: soltar mandou ${sample.release.kind}, não a caminho`);
		}
		if (!sample.release.name) problems.push(`${name}: o ping saiu sem nome`);
		if (!sample.release.pixiSame || !sample.leave.pixiSame) {
			problems.push(`${name}: a roda recriou o Pixi`);
		}
		if (!sample.release.visionSame || !sample.leave.visionSame) {
			problems.push(`${name}: a roda recalculou a visão`);
		}
		if (sample.release.wheelOpen) problems.push(`${name}: a roda ficou aberta`);
	};
	check("1x", plain);
	check("CPU 4x", slow);
	if (errors.length) problems.push(`erros de página: ${errors[0]}`);
	if (problems.length) {
		console.error("FALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("OK: roda no mesmo quadro, destaque sem reconstruir, ping no soltar, Pixi e visão quietos (1x e CPU 4x)");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
