// As iniciais do token continuam cabendo no disco parado, no zoom e durante o arrasto.
// Um token com retrato não ganha letras por cima enquanto anda.
// Uso: pnpm check:token-iniciais
const { chromium } = require("playwright");

function fail(message) {
	console.error(`FALHOU: ${message}`);
	process.exitCode = 1;
}

const SCENE_ROW = {
	id: "s1",
	campaign_id: "demo",
	name: "Mapa",
	map_image_url: null,
	grid_type: "square",
	grid_size: 70,
	grid_color: "white",
	grid_opacity: 0.12,
	grid_scale_distance: 1.5,
	grid_scale_unit: "m",
	grid_offset_x: 0,
	grid_offset_y: 0,
	map_scale: 1,
	width: 1400,
	height: 900,
	fog_enabled: false,
	fog_exploration: false,
	light_level: "bright",
	is_active: true,
	order_index: 0,
	created_at: "2026-11-16T00:00:00.000Z",
	updated_at: "2026-11-16T00:00:00.000Z",
};

function token(extra = {}) {
	return {
		id: "a",
		sceneId: "s1",
		name: "Aria",
		layer: "token",
		x: 480,
		y: 360,
		sizeCells: 1,
		rotation: 0,
		elevation: 0,
		conditions: [],
		auras: [],
		visionRange: 6,
		isLocked: false,
		isHidden: false,
		controlledBy: ["preview-gm-user"],
		avatarUrl: null,
		...extra,
	};
}

async function main() {
	// O worktree de teste não tem .env. O cliente só precisa existir: o REST é falso.
	process.env.VITE_SUPABASE_URL ||= "http://127.0.0.1:54321";
	process.env.VITE_SUPABASE_ANON_KEY ||= "sb_publishable_test_initials";
	const { createServer } = await import("vite");
	const server = await createServer({
		configLoader: "runner",
		mode: "test",
		server: { host: "127.0.0.1", port: 3519, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	try {
		await run(browser);
	} finally {
		await browser.close();
		await server.close();
	}
	if (process.exitCode) process.exit(process.exitCode);
	console.log("iniciais do token: ok");
}

async function run(browser) {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 1,
	});
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	// O endereço do banco é falso. Nada pode sair da máquina.
	await context.route("http://127.0.0.1:54321/**", (route) => {
		const url = route.request().url();
		let body = "[]";
		if (url.includes("/rpc/")) body = "null";
		else if (url.includes("vtt_scenes")) body = JSON.stringify([SCENE_ROW]);
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body,
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
	page.on("console", (msg) => {
		if (msg.type() !== "error") return;
		const text = msg.text();
		// O teste fecha o websocket de propósito. O cliente avisa; não é falha da mesa.
		if (text.includes("socket closed") || text.includes("Realtime channel error"))
			return;
		// Retrato de propósito ausente: o token cai nas iniciais.
		if (
			text.includes("elara-portrait") ||
			text.includes("nao-existe-retrato") ||
			text.includes("ERR_CONNECTION_REFUSED")
		)
			return;
		errors.push(text);
	});
	await page.goto("http://127.0.0.1:3519/campaigns/demo/vtt", {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	try {
		await page.waitForFunction(() => window.__vtt_probe__?.tokenInk, {
			timeout: 30000,
		});
	} catch (err) {
		const snap = await page.evaluate(() => ({
			href: location.href,
			title: document.title,
			text: (document.body?.innerText || "").slice(0, 500),
			store: Boolean(window.__vtt_store__),
			probe: Boolean(window.__vtt_probe__),
			canvas: Boolean(document.querySelector("canvas")),
		}));
		console.log("erros antes da sonda", errors.slice(0, 8));
		console.log("pagina", JSON.stringify(snap));
		throw err;
	}

	const place = async (opts) => {
		await page.evaluate((opts) => {
			const st = window.__vtt_store__.getState();
			st.setScenes([
				{
					...st.scenes[0],
					fogEnabled: Boolean(opts.fog),
					fogExploration: Boolean(opts.fog),
				},
			]);
			st.setIsGM(opts.gm);
			st.setActiveTool("select");
			st.setActiveLayer("token");
			st.setSelectedTokenIds([]);
			st.setDraggedTokenIds([]);
			st.setTokens(opts.tokens);
			st.setViewport(opts.viewport);
		}, opts);
		await page.waitForTimeout(600);
	};

	const ink = () => page.evaluate(() => window.__vtt_probe__.tokenInk("a"));

	const drag = async () => {
		const from = await page.evaluate(() => {
			const canvas = document.querySelector("canvas");
			const rect = canvas.getBoundingClientRect();
			const st = window.__vtt_store__.getState();
			const t = st.tokens[0];
			const vp = st.viewport;
			return {
				x: rect.left + vp.x + t.x * vp.scale,
				y: rect.top + vp.y + t.y * vp.scale,
			};
		});
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(from.x + 70, from.y + 24, { steps: 6 });
		await page.waitForTimeout(180);
		const state = await page.evaluate(() => {
			const st = window.__vtt_store__.getState();
			return { drag: st.draggedTokenId, x: st.tokens[0]?.x, y: st.tokens[0]?.y };
		});
		const during = await ink();
		await page.mouse.up();
		await page.waitForTimeout(200);
		return { state, during };
	};

	const letters = (sample) =>
		(sample?.texts ?? []).filter((item) => item.text !== "GM");

	const fits = (sample, label) => {
		const text = letters(sample)[0];
		if (!text) {
			fail(`${label}: sem iniciais`);
			return;
		}
		const ratio = text.boundsWidth / sample.boundsWidth;
		console.log(
			label,
			JSON.stringify({
				ratio,
				fontSize: text.fontSize,
				w: text.boundsWidth,
				disc: sample.boundsWidth,
				scale: sample.worldScaleX,
			}),
		);
		if (!(ratio < 0.8)) fail(`${label}: iniciais maiores que o disco (${ratio})`);
	};

	await place({
		tokens: [token()],
		viewport: { x: 200, y: 140, scale: 1 },
		gm: true,
	});
	fits(await ink(), "parado zoom 1");
	const dragged = await drag();
	if (dragged.state.drag !== "a") {
		fail(`não arrastou no zoom 1: ${JSON.stringify(dragged.state)}`);
	} else if (dragged.state.x === 480) {
		fail("o arrasto não moveu o token");
	}
	fits(dragged.during, "arrasto zoom 1");
	if ((dragged.during?.ghost ?? []).length > 0) {
		fail("mestre sem névoa não deveria ter fantasma com iniciais");
	}

	await page.evaluate(() => {
		window.__vtt_store__.getState().setViewport({ x: 200, y: 140, scale: 0.35 });
		window.__vtt_store__.getState().setDraggedTokenIds([]);
		window.__vtt_store__.getState().setSelectedTokenIds([]);
	});
	await page.waitForTimeout(250);
	const zoomed = await ink();
	fits(zoomed, "zoom 0.35");
	if (zoomed && Math.abs(zoomed.worldScaleX - 0.35) > 0.02) {
		fail(`escala do texto não acompanhou o zoom (${zoomed.worldScaleX})`);
	}

	await place({
		tokens: [token()],
		viewport: { x: 200, y: 140, scale: 1 },
		gm: false,
		fog: true,
	});
	const plainFog = await drag();
	const ghostLetter = plainFog.during?.ghost?.[0];
	console.log(
		"sem retrato na névoa",
		JSON.stringify({ drag: plainFog.state.drag, ghost: ghostLetter }),
	);
	if (plainFog.state.drag !== "a") {
		fail(
			`não arrastou o token sem retrato na névoa: ${JSON.stringify(plainFog.state)}`,
		);
	} else if (!ghostLetter) {
		fail("sem retrato, o fantasma precisa das iniciais para achar o token na névoa");
	} else if (!(ghostLetter.boundsWidth < plainFog.during.boundsWidth * 0.8)) {
		fail(`iniciais do fantasma maiores que o disco: ${ghostLetter.boundsWidth}`);
	}

	await place({
		tokens: [token({ avatarUrl: "/elara-portrait.png", characterId: "sheet" })],
		viewport: { x: 200, y: 140, scale: 1 },
		gm: false,
		fog: true,
	});
	await page.waitForTimeout(400);
	const portrait = await drag();
	console.log(
		"retrato",
		JSON.stringify({ drag: portrait.state, ghost: portrait.during?.ghost }),
	);
	if (portrait.state.drag !== "a") {
		fail(`não arrastou o token com retrato: ${JSON.stringify(portrait.state)}`);
	} else if ((portrait.during?.ghost ?? []).some((item) => item.boundsWidth > 12)) {
		fail(
			`iniciais do fantasma estouraram no retrato: ${JSON.stringify(portrait.during.ghost)}`,
		);
	}

	await place({
		tokens: [
			token({ id: "a", name: "Aria", x: 400, y: 360 }),
			token({ id: "b", name: "Bram", x: 620, y: 360, sizeCells: 2 }),
		],
		viewport: { x: 80, y: 120, scale: 1 },
		gm: false,
		fog: true,
	});
	await page.waitForFunction(() => {
		const probe = window.__vtt_probe__;
		const a = probe?.tokenInk?.("a");
		const b = probe?.tokenInk?.("b");
		return a?.texts?.some((item) => item.text !== "GM") &&
			b?.texts?.some((item) => item.text !== "GM");
	});
	await page.evaluate(() => {
		window.__vtt_store__.getState().setSelectedTokenIds(["a", "b"]);
	});
	const groupFrom = await page.evaluate(() => {
		const canvas = document.querySelector("canvas");
		const rect = canvas.getBoundingClientRect();
		const st = window.__vtt_store__.getState();
		const t = st.tokens.find((item) => item.id === "a");
		const b = st.tokens.find((item) => item.id === "b");
		const vp = st.viewport;
		return {
			x: rect.left + vp.x + t.x * vp.scale,
			y: rect.top + vp.y + t.y * vp.scale,
			ax: t.x,
			bx: b.x,
			selected: [...st.selectedTokenIds],
		};
	});
	await page.mouse.move(groupFrom.x, groupFrom.y);
	await page.waitForTimeout(80);
	await page.mouse.down();
	await page.mouse.move(groupFrom.x + 90, groupFrom.y + 10, { steps: 10 });
	let group = null;
	for (let i = 0; i < 10; i++) {
		group = await page.evaluate(() => {
			const st = window.__vtt_store__.getState();
			return {
				ax: st.tokens.find((item) => item.id === "a")?.x,
				bx: st.tokens.find((item) => item.id === "b")?.x,
				drag: [...(st.draggedTokenIds ?? [])],
				a: window.__vtt_probe__.tokenInk("a"),
				b: window.__vtt_probe__.tokenInk("b"),
			};
		});
		if (group.drag.includes("a") && group.drag.includes("b")) break;
		await page.waitForTimeout(40);
	}
	await page.mouse.up();
	await page.waitForTimeout(150);
	console.log(
		"grupo",
		JSON.stringify({
			ax: group.ax,
			bx: group.bx,
			drag: group.drag,
			selected: groupFrom.selected,
		}),
	);
	if (!group.drag.includes("a") || !group.drag.includes("b")) {
		fail(`o grupo não arrastou junto: ${JSON.stringify(group.drag)}`);
	} else if (group.ax === groupFrom.ax || group.bx === groupFrom.bx) {
		fail("um token do grupo não saiu do lugar");
	}
	const groupFits = (sample, label) => {
		const text = letters(sample)[0];
		const ghost = (sample?.ghost ?? []).find((item) => item.text !== "GM");
		if (!text) {
			fail(`${label}: sem iniciais no token`);
			return;
		}
		const ratio = text.boundsWidth / sample.boundsWidth;
		console.log(label, JSON.stringify({ ratio, ghost: ghost?.boundsWidth }));
		if (!(ratio < 0.8)) fail(`${label}: iniciais maiores que o disco (${ratio})`);
		if (!ghost) {
			fail(`${label}: o fantasma do grupo precisa das iniciais`);
		} else if (!(ghost.boundsWidth < sample.boundsWidth * 0.8)) {
			fail(`${label}: iniciais do fantasma maiores que o disco`);
		}
	};
	groupFits(group.a, "grupo token a");
	groupFits(group.b, "grupo token b");

	await place({
		tokens: [token({ avatarUrl: "/nao-existe-retrato.png" })],
		viewport: { x: 200, y: 140, scale: 1 },
		gm: true,
	});
	let failed = null;
	for (let i = 0; i < 20; i++) {
		failed = await ink();
		if (letters(failed).length > 0) break;
		await page.waitForTimeout(150);
	}
	fits(failed, "imagem que não carregou");

	if (errors.length) fail(`erro de página: ${errors[0]}`);
	await context.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
