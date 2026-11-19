// Prints da alça de giro do VTT, antes e depois.
// Uso: node scripts/preview-vtt-rotate-handle.cjs <antes|depois>
// PNGs e a medição saem em VTT_ROTATE_OUT (padrão /opt/cursor/artifacts/vtt-rotate-handle).
// Não grava nada em docs/.
const { chromium } = require("playwright");
const { createServer } = require("vite");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

process.env.VITE_SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.VITE_SUPABASE_ANON_KEY ||= "preview-anon-key";

const label = process.argv[2] === "antes" ? "antes" : "depois";
const output = path.resolve(
	process.env.VTT_ROTATE_OUT || "/opt/cursor/artifacts/vtt-rotate-handle",
);
const GRID = 70;
const RADIUS = GRID / 2;
const STATUS_OUTER = 1.32;
const GAP_PX = 21;
const BALL_PX = 14;

const A = { id: "a", name: "Aria", x: 900, y: 700, rotation: 0 };
const B = { id: "b", name: "Bruno", x: 1080, y: 700, rotation: 25 };
const C = { id: "c", name: "Cael", x: 1260, y: 700, rotation: 40 };

function fail(message) {
	console.error(`FALHOU: ${message}`);
	process.exitCode = 1;
	throw new Error(message);
}

/** Centro da bola, em unidades do mapa, na fórmula vigente de cada versão. */
function handleDistance(scale, outer) {
	const safe = Number.isFinite(scale) && scale > 0.05 ? scale : 1;
	if (label === "antes") return outer + Math.max(18, outer * 0.28);
	return outer + GAP_PX / safe;
}

function outerRadius(hasStatus) {
	return hasStatus ? RADIUS * STATUS_OUTER : RADIUS;
}

/** Diâmetro esperado da bola em px de tela. No antes, o desenho congela no zoom do rebuild. */
function expectedBallPx(scale) {
	const safe = Number.isFinite(scale) && scale > 0.05 ? scale : 1;
	if (label === "antes") return 2 * Math.max(10, 12 / safe) * safe;
	return BALL_PX;
}

function decodePng(buffer) {
	const png = Buffer.from(buffer);
	if (png.readUInt32BE(0) !== 0x89504e47) fail("screenshot não é PNG");
	let offset = 8;
	let width = 0;
	let height = 0;
	let colorType = 6;
	const idat = [];
	while (offset < png.length) {
		const length = png.readUInt32BE(offset);
		const type = png.toString("ascii", offset + 4, offset + 8);
		const data = png.subarray(offset + 8, offset + 8 + length);
		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			colorType = data[9];
		} else if (type === "IDAT") {
			idat.push(data);
		} else if (type === "IEND") break;
		offset += 12 + length;
	}
	const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
	if (!channels || dataBitDepthUnsupported(png)) {
		// bit depth is inside IHDR; guarded below via channels only for 8-bit RGB(A)
	}
	if (channels === 0) fail(`PNG cor ${colorType} não suportada na medição`);
	const raw = zlib.inflateSync(Buffer.concat(idat));
	const stride = width * channels;
	const out = Buffer.alloc(height * stride);
	let src = 0;
	let prev = Buffer.alloc(stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[src];
		src += 1;
		const row = raw.subarray(src, src + stride);
		src += stride;
		const cur = Buffer.alloc(stride);
		for (let i = 0; i < stride; i++) {
			const left = i >= channels ? cur[i - channels] : 0;
			const up = prev[i];
			const ul = i >= channels ? prev[i - channels] : 0;
			const v = row[i];
			if (filter === 0) cur[i] = v;
			else if (filter === 1) cur[i] = (v + left) & 255;
			else if (filter === 2) cur[i] = (v + up) & 255;
			else if (filter === 3) cur[i] = (v + Math.floor((left + up) / 2)) & 255;
			else if (filter === 4) cur[i] = (v + paeth(left, up, ul)) & 255;
			else fail(`filtro PNG ${filter}`);
		}
		cur.copy(out, y * stride);
		prev = cur;
	}
	return { width, height, channels, data: out };
}

function dataBitDepthUnsupported() {
	return false;
}

function paeth(a, b, c) {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	if (pa <= pb && pa <= pc) return a;
	if (pb <= pc) return b;
	return c;
}

function sample(png, x, y) {
	const cx = Math.max(0, Math.min(png.width - 1, Math.round(x)));
	const cy = Math.max(0, Math.min(png.height - 1, Math.round(y)));
	const i = (cy * png.width + cx) * png.channels;
	return [png.data[i], png.data[i + 1], png.data[i + 2]];
}

function distColor(a, b) {
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function lum(p) {
	return p[0] + p[1] + p[2];
}

function runLength(png, x, y, accept) {
	let left = x;
	let right = x;
	while (left > 0 && accept(sample(png, left - 1, y))) left--;
	while (right < png.width - 1 && accept(sample(png, right + 1, y))) right++;
	return right - left + 1;
}

function measureBall(png, expected) {
	const x = Math.round(expected.x);
	const y = Math.round(expected.y);
	const fillColor = sample(png, x, y);
	// Miolo da bola: pixels da mesma cor do centro. No depois isso é o disco
	// de 14px (o contorno é outra cor e para a conta).
	const fill = runLength(png, x, y, (p) => distColor(p, fillColor) < 36);
	// Disco visível no fundo escuro: branco ou roxo, até voltar ao fundo.
	const ink = runLength(png, x, y, (p) => lum(p) > 90);
	return {
		scale: expected.scale,
		expectedPx: expected.expectedPx,
		fillPx: fill,
		inkPx: ink,
		center: { x, y, rgb: fillColor },
		predicted: { x, y },
	};
}

async function boot() {
	const server = await createServer({
		configLoader: "runner",
		mode: "test",
		server: {
			host: "127.0.0.1",
			port: 3291,
			strictPort: true,
			watch: null,
		},
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	return {
		server,
		browser,
		base: "http://127.0.0.1:3291",
	};
}

async function setupPage(browser, base) {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		hasTouch: false,
	});
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: route.request().url().includes("/rpc/") ? "null" : "[]",
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
							name: "Mesa",
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
	await page.goto(`${base}/campaigns/demo/vtt`, {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await waitForTable(page);
	await paintMap(page);
	await waitForTable(page);
	return { context, page, errors };
}

function scenePayload(mapImageUrl) {
	return {
		id: "s1",
		campaignId: "demo",
		name: "Salão",
		mapImageUrl: mapImageUrl ?? null,
		gridType: "square",
		gridSize: 70,
		gridColor: "#ffffff",
		gridOpacity: 0,
		gridScaleDistance: 1.5,
		gridScaleUnit: "m",
		width: 2200,
		height: 1600,
		fogEnabled: false,
		fogExploration: false,
		lightLevel: "bright",
		isActive: true,
		orderIndex: 0,
	};
}

/** A carga da sessão zera as cenas; repor até o canvas do Pixi existir. */
async function waitForTable(page) {
	for (let attempt = 0; attempt < 40; attempt++) {
		await page.evaluate((scene) => {
			const st = window.__vtt_store__.getState();
			st.setIsGM(true);
			st.setActiveTool("select");
			st.setActiveLayer("token");
			st.setShowAllVisionCones(true);
			const current = st.scenes.find((item) => item.id === "s1");
			st.setScenes([
				{
					...scene,
					mapImageUrl: current?.mapImageUrl ?? scene.mapImageUrl,
					fogEnabled: current?.fogEnabled ?? scene.fogEnabled,
					fogExploration: current?.fogExploration ?? scene.fogExploration,
				},
			]);
			st.setActiveSceneId("s1");
		}, scenePayload(null));
		const ready = await page.evaluate(() => {
			const canvas = document.querySelector("canvas");
			const st = window.__vtt_store__.getState();
			return Boolean(
				canvas &&
					canvas.parentElement &&
					canvas.width > 0 &&
					st.activeSceneId === "s1" &&
					st.scenes.some((scene) => scene.id === "s1"),
			);
		});
		if (ready) return;
		await page.waitForTimeout(250);
	}
	const headline = await page
		.locator("h2, h3, p")
		.allTextContents()
		.catch(() => []);
	fail(`canvas da mesa não apareceu (${headline.join(" | ") || "sem título"})`);
}

async function paintMap(page) {
	await page.evaluate(() => {
		const canvas = document.createElement("canvas");
		canvas.width = 2200;
		canvas.height = 1600;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#5c564a";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.strokeStyle = "rgba(255,248,230,0.05)";
		ctx.lineWidth = 2;
		for (let x = 0; x <= canvas.width; x += 70) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}
		for (let y = 0; y <= canvas.height; y += 70) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}
		const st = window.__vtt_store__.getState();
		const scene = st.scenes.find((item) => item.id === "s1") ?? st.scenes[0];
		st.setScenes([{ ...scene, mapImageUrl: canvas.toDataURL("image/png") }]);
		st.setActiveSceneId("s1");
	});
	await page.waitForTimeout(400);
}

function tokenSpec(partial) {
	return {
		sceneId: "s1",
		layer: "token",
		sizeCells: 1,
		rotation: 0,
		elevation: 0,
		conditions: [],
		auras: [],
		visionRange: 4,
		isLocked: false,
		isHidden: false,
		controlledBy: ["preview-gm-user"],
		...partial,
	};
}

async function place(page, tokens, selected) {
	await page.evaluate(
		({ tokens, selected }) => {
			const st = window.__vtt_store__.getState();
			st.setTokens(tokens);
			st.setSelectedTokenIds(selected);
			st.setActiveTool("select");
			st.setActiveLayer("token");
		},
		{ tokens, selected },
	);
	await page.waitForTimeout(280);
	const count = await page.evaluate(
		() => window.__vtt_store__.getState().tokens.length,
	);
	if (count !== tokens.length) {
		await page.waitForTimeout(800);
		await page.evaluate(
			({ tokens, selected }) => {
				const st = window.__vtt_store__.getState();
				st.setTokens(tokens);
				st.setSelectedTokenIds(selected);
			},
			{ tokens, selected },
		);
		await page.waitForTimeout(280);
	}
}

async function setTheme(page, theme) {
	await page.evaluate((theme) => {
		document.body.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.body.style.colorScheme = theme;
	}, theme);
	await page.evaluate(() => {
		const st = window.__vtt_store__.getState();
		const ids = st.selectedTokenIds.slice();
		st.setSelectedTokenIds([]);
		st.setSelectedTokenIds(ids);
	});
	await page.waitForTimeout(220);
}

async function setFog(page, on) {
	await page.evaluate((on) => {
		const st = window.__vtt_store__.getState();
		st.setShowAllVisionCones(true);
		st.setScenes(
			st.scenes.map((scene) =>
				scene.id === st.activeSceneId
					? { ...scene, fogEnabled: on, fogExploration: on }
					: scene,
			),
		);
	}, on);
	await page.waitForTimeout(on ? 450 : 200);
}

async function frame(page, points, scale, vp) {
	await page.setViewportSize({ width: vp.w, height: vp.h });
	await page.waitForTimeout(180);
	await waitForTable(page);
	const view = await page.evaluate(
		({ points, scale, vp }) => {
			const xs = points.map((p) => p.x);
			const ys = points.map((p) => p.y);
			const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
			const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
			const padLeft = vp.w < 640 ? 76 : 96;
			const screenX = padLeft + (vp.w - padLeft) / 2;
			const screenY = vp.h * (scale >= 2 ? 0.58 : 0.48);
			const viewport = {
				x: screenX - midX * scale,
				y: screenY - midY * scale,
				scale,
			};
			window.__vtt_store__.getState().setViewport(viewport);
			const canvas = document.querySelector("canvas");
			const rect = canvas.parentElement.getBoundingClientRect();
			const toScreen = (x, y) => ({
				x: rect.left + viewport.x + x * scale,
				y: rect.top + viewport.y + y * scale,
			});
			return { viewport, screenX, screenY, origin: { x: rect.left, y: rect.top } };
		},
		{ points, scale, vp },
	);
	await page.waitForTimeout(160);
	return view;
}

async function screenOf(page, worldX, worldY) {
	return page.evaluate(
		({ worldX, worldY }) => {
			const canvas = document.querySelector("canvas");
			const rect = canvas.parentElement.getBoundingClientRect();
			const vp = window.__vtt_store__.getState().viewport;
			return {
				x: rect.left + vp.x + worldX * vp.scale,
				y: rect.top + vp.y + worldY * vp.scale,
				scale: vp.scale,
			};
		},
		{ worldX, worldY },
	);
}

function ballWorld(token, scale, hasStatus, rotation) {
	const dist = handleDistance(scale, outerRadius(hasStatus));
	const rad = ((rotation ?? 0) * Math.PI) / 180;
	return {
		x: token.x + Math.sin(rad) * dist,
		y: token.y - Math.cos(rad) * dist,
	};
}

async function legend(page, text) {
	await page.evaluate((text) => {
		let node = document.getElementById("rotate-proof-legend");
		if (!node) {
			node = document.createElement("div");
			node.id = "rotate-proof-legend";
			node.style.cssText =
				"position:fixed;left:12px;right:12px;bottom:10px;z-index:80;pointer-events:none;text-align:center;font:600 14px/1.3 system-ui,sans-serif;color:#fafafa;text-shadow:0 1px 2px #000;background:rgba(0,0,0,.55);border-radius:10px;padding:6px 10px;";
			document.body.appendChild(node);
		}
		node.textContent = text;
	}, text);
}

async function rotations(page) {
	return page.evaluate(() =>
		Object.fromEntries(
			window.__vtt_store__
				.getState()
				.tokens.map((token) => [
					token.id,
					{ x: token.x, y: token.y, r: token.rotation ?? 0 },
				]),
		),
	);
}

async function shoot(page, file) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	await page.screenshot({ path: file });
}

async function main() {
	fs.mkdirSync(path.join(output, label), { recursive: true });
	const { server, browser, base } = await boot();
	const measure = {
		label,
		ball: [],
		group: [],
		notes: [],
	};
	try {
		const { page, errors } = await setupPage(browser, base);
		// A primeira carga zera as cenas. Esperar o canvas antes de colocar
		// tokens, senão o print de PV sai vazio.
		await waitForTable(page);
		await page.waitForTimeout(400);
		const viewports = [
			{ name: "1440", w: 1440, h: 900 },
			{ name: "390", w: 390, h: 844 },
		];
		for (const vp of viewports) {
			for (const theme of ["dark", "light"]) {
				const dir = path.join(output, label);
				const name = (shot) =>
					path.join(dir, `${label}-${vp.name}-${theme}-${shot}.png`);
				await page.setViewportSize({ width: vp.w, height: vp.h });
				await setFog(page, false);

				const one = [
					tokenSpec({
						...A,
						rotation: 0,
						hpCurrent: 18,
						hpMax: 30,
					}),
				];
				await place(page, one, ["a"]);
				await setTheme(page, theme);
				await frame(page, [A], 1, vp);
				// O frame repõe a cena. Recolocar depois, para o token não sumir
				// se a carga inicial ainda estiver limpando a mesa.
				await place(page, one, ["a"]);
				await setTheme(page, theme);
				await legend(
					page,
					`${label} · ${vp.name} · ${theme === "dark" ? "escuro" : "claro"} · 1 token · zoom 1 · PV`,
				);
				await shoot(page, name("1-token-pv"));

				const plain = [tokenSpec({ ...A, rotation: 0 })];
				await place(page, plain, ["a"]);
				await setTheme(page, theme);
				for (const scale of [0.25, 1, 4]) {
					await frame(page, [A], scale, vp);
					await legend(
						page,
						`${label} · ${vp.name} · ${theme === "dark" ? "escuro" : "claro"} · zoom ${scale} · mesma arte, token centrado`,
					);
					const shot =
						scale === 0.25 ? "zoom-baixo" : scale === 4 ? "zoom-alto" : "zoom-1";
					await shoot(page, name(shot));
					const ball = ballWorld(A, scale, false, 0);
					const at = await screenOf(page, ball.x, ball.y);
					const png = decodePng(await page.screenshot());
					const row = measureBall(png, {
						x: at.x,
						y: at.y,
						scale,
						expectedPx: expectedBallPx(scale),
					});
					row.viewport = vp.name;
					row.theme = theme;
					if (
						label === "depois" &&
						(row.fillPx < 11 || row.fillPx > 17)
					) {
						fail(
							`${vp.name} ${theme} zoom ${scale}: diâmetro do miolo ${row.fillPx}px (esperado ~14)`,
						);
					}
					measure.ball.push(row);
					const crop = 96;
					await page.screenshot({
						path: name(`medida-zoom-${String(scale).replace(".", "")}`),
						clip: {
							x: Math.max(0, at.x - crop),
							y: Math.max(0, at.y - crop),
							width: Math.min(crop * 2, vp.w - Math.max(0, at.x - crop)),
							height: Math.min(crop * 2, vp.h - Math.max(0, at.y - crop)),
						},
					});
				}

				const status = [
					tokenSpec({
						...A,
						rotation: 0,
						conditions: ["envenenado"],
					}),
				];
				await place(page, status, ["a"]);
				await setTheme(page, theme);
				await frame(page, [A], vp.w < 640 ? 0.85 : 1, vp);
				await legend(
					page,
					`${label} · ${vp.name} · ${theme === "dark" ? "escuro" : "claro"} · status`,
				);
				await shoot(page, name("status"));

				const trioScale = vp.w < 640 ? 0.62 : 1;
				const trio = [
					tokenSpec({ ...A, rotation: 0 }),
					tokenSpec({ ...B, rotation: 0 }),
					tokenSpec({ ...C, rotation: 0 }),
				];
				await place(page, trio, ["a", "b", "c"]);
				await setTheme(page, theme);
				await frame(page, [A, B, C], trioScale, vp);
				await legend(
					page,
					`${label} · ${vp.name} · ${theme === "dark" ? "escuro" : "claro"} · 3 selecionados`,
				);
				await shoot(page, name("3-tokens"));

				const spinning = [
					tokenSpec({ ...A, rotation: 0, hpCurrent: 22, hpMax: 30 }),
					tokenSpec({ ...B, rotation: 25, hpCurrent: 14, hpMax: 28 }),
					tokenSpec({ ...C, rotation: 40, hpCurrent: 9, hpMax: 24 }),
				];
				await place(page, spinning, ["a", "b", "c"]);
				await setTheme(page, theme);
				await setFog(page, true);
				await frame(page, [A, B, C], trioScale, vp);
				const beforePose = await rotations(page);
				const poseText = (pose) =>
					`Aria ${pose.a.r}° · Bruno ${pose.b.r}° · Cael ${pose.c.r}°`;
				await legend(
					page,
					`${label} · grupo antes do arrasto · ${poseText(beforePose)}`,
				);
				await shoot(page, name("grupo-antes"));

				const scaleNow = trioScale;
				const from = ballWorld(A, scaleNow, false, 0);
				const mid = ballWorld(A, scaleNow, false, 36);
				const end = ballWorld(A, scaleNow, false, 90);
				const fromS = await screenOf(page, from.x, from.y);
				const midS = await screenOf(page, mid.x, mid.y);
				const endS = await screenOf(page, end.x, end.y);
				await page.mouse.move(fromS.x, fromS.y);
				await page.mouse.down();
				await page.mouse.move(midS.x, midS.y, { steps: 10 });
				await page.waitForTimeout(380);
				const duringPose = await rotations(page);
				await legend(
					page,
					`${label} · grupo durante o arrasto · ${poseText(duringPose)}`,
				);
				await shoot(page, name("grupo-durante"));
				await page.mouse.move(endS.x, endS.y, { steps: 10 });
				await page.mouse.up();
				await page.waitForTimeout(400);
				const afterPose = await rotations(page);
				await legend(
					page,
					`${label} · grupo depois do arrasto · ${poseText(afterPose)}`,
				);
				await shoot(page, name("grupo-depois"));
				const delta = (pose, id) => pose[id].r - beforePose[id].r;
				const sameDelta =
					delta(afterPose, "a") === delta(afterPose, "b") &&
					delta(afterPose, "b") === delta(afterPose, "c");
				const stayed =
					afterPose.a.x === beforePose.a.x &&
					afterPose.a.y === beforePose.a.y &&
					afterPose.b.x === beforePose.b.x &&
					afterPose.c.x === beforePose.c.x;
				const turned = delta(afterPose, "a") === 90;
				const midMoved =
					delta(duringPose, "a") > 15 &&
					delta(duringPose, "a") < 80 &&
					delta(duringPose, "a") === delta(duringPose, "b") &&
					delta(duringPose, "b") === delta(duringPose, "c");
				if (!sameDelta || !stayed || !turned || !midMoved) {
					fail(
						`${vp.name} ${theme}: giro do grupo não fechou (durante ${JSON.stringify(duringPose)} depois ${JSON.stringify(afterPose)})`,
					);
				}
				measure.group.push({
					viewport: vp.name,
					theme,
					before: beforePose,
					during: duringPose,
					after: afterPose,
				});
				await setFog(page, false);
			}
		}
		if (errors.length) fail(`erro na página: ${errors[0]}`);
		fs.writeFileSync(
			path.join(output, `${label}-medida.json`),
			JSON.stringify(measure, null, 2),
		);
		console.log(`prints ${label}: ${output}`);
	} finally {
		await browser.close();
		await new Promise((resolve, reject) =>
			server.close().then(resolve, reject),
		);
	}
	if (process.exitCode) process.exit(process.exitCode);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
