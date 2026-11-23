/**
 * Folha mock × implementação V2 r2 (opção B no Convidado Pro).
 *   VTT_PREVIEW_SCENARIO=u1-v2r2 pnpm preview:record
 */
const { chromium } = require("playwright");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT =
	process.env.U1_V2R2_OUT ||
	"/workspace/arkhiveon/previews/plano-pro-cota/u1-card-v2r2";
const BASE = process.env.VTT_BASE_URL || "http://127.0.0.1:4173";
const FREE = 100_000_000;
const PRO = 10_000_000_000;
const overSince = new Date(Date.now() - 17 * 86_400_000).toISOString();

function ctx(partial) {
	return {
		status: "ready",
		label: "free",
		usedBytes: 38_400_000,
		limitBytes: FREE,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
		...partial,
	};
}

const MOCK_STATES = [
	{ id: "free", label: "Free normal", storage: ctx() },
	{ id: "pro", label: "Pro normal", storage: ctx({ label: "pro", usedBytes: 4_212_000_000, limitBytes: PRO }) },
	{ id: "convidado", label: "Convidado Pro", storage: ctx({ label: "guest_pro", usedBytes: 6_120_000_000, limitBytes: PRO, payerName: "Kaelen" }) },
	{ id: "p80", label: "80%", storage: ctx({ label: "pro", usedBytes: 8_130_000_000, limitBytes: PRO }) },
	{ id: "p95", label: "95%", storage: ctx({ label: "pro", usedBytes: 9_610_000_000, limitBytes: PRO }) },
	{ id: "p100", label: "100% (cheio)", storage: ctx({ label: "pro", usedBytes: 10_000_000_000, limitBytes: PRO }) },
	{ id: "over", label: "Free acima do limite", storage: ctx({ usedBytes: 2_412_000_000, limitBytes: FREE, overLimitSince: overSince }) },
	{ id: "pdf", label: "Free tenta PDF grande", storage: ctx() },
	{ id: "loading", label: "Carregando", storage: ctx({ status: "loading" }) },
	{ id: "empty", label: "Vazio", storage: ctx({ usedBytes: 0 }) },
	{ id: "error", label: "Erro", storage: ctx({ status: "error" }) },
];

const OPTION_B_STATES = [
	{ id: "guest_p95", label: "Convidado Pro 96% (opção B)", storage: ctx({ label: "guest_pro", usedBytes: 9_600_000_000, limitBytes: PRO, payerName: "Mestre Ana" }) },
	{ id: "guest_p100", label: "Convidado Pro Cheio (opção B)", storage: ctx({ label: "guest_pro", usedBytes: 10_000_000_000, limitBytes: PRO, payerName: "Mestre Ana" }) },
	{ id: "guest_over", label: "Convidado Pro Acima (opção B)", storage: ctx({ label: "guest_pro", usedBytes: 10_400_000_000, limitBytes: PRO, overLimitSince: overSince, payerName: "Mestre Ana" }) },
];

const LAYOUTS = [
	{ id: "1440", viewport: { width: 1440, height: 900 }, mobile: false },
	{ id: "390", viewport: { width: 390, height: 844 }, mobile: true },
];

function redact(value) {
	return String(value).replace(/eyJ[A-Za-z0-9_-]{10,}/g, "[redacted]").slice(0, 240);
}

async function setupContext(context, storage) {
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
	);
	await context.route("**/auth/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
	);
	await context.addInitScript((previewStorage) => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("arkhiveon_preview_storage", JSON.stringify(previewStorage));
		localStorage.removeItem("arkhiveon_preview_sidebar");
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
	}, storage);
}

async function measure(page) {
	return page.evaluate(() => {
		const card = document.querySelector("[data-card]");
		if (!card) return { missing: true };
		const line = document.querySelector("[data-line1]");
		const cardBox = card.getBoundingClientRect();
		const out = {
			missing: false,
			text: (card.textContent || "").replace(/\s+/g, " ").trim(),
			card: {
				width: Math.round(cardBox.width * 10) / 10,
				height: Math.round(cardBox.height * 10) / 10,
				heightOk: Math.abs(cardBox.height - 44) < 1,
			},
		};
		if (!line) {
			return { ...out, line: null, singleLine: true, overflows: false };
		}
		const lineBox = line.getBoundingClientRect();
		const lineStyle = getComputedStyle(line);
		const lineHeight = Number.parseFloat(lineStyle.lineHeight);
		const leading = Number.isFinite(lineHeight) ? lineHeight : 20;
		return {
			...out,
			line: {
				scrollWidth: line.scrollWidth,
				clientWidth: line.clientWidth,
				width: Math.round(lineBox.width * 10) / 10,
				height: Math.round(lineBox.height * 10) / 10,
				lineHeight: Number.isFinite(lineHeight) ? lineHeight : null,
				overflows: line.scrollWidth > line.clientWidth + 1,
				singleLine: Math.abs(lineBox.height - leading) <= 1.5,
			},
		};
	});
}

async function open(browser, layout, storage) {
	const context = await browser.newContext({
		viewport: layout.viewport,
		deviceScaleFactor: 2,
		isMobile: layout.mobile,
		hasTouch: layout.mobile,
		reducedMotion: "reduce",
	});
	await setupContext(context, storage);
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(redact(error.message)));
	await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 });
	if (layout.mobile) {
		const opener = page.getByRole("button", { name: "Abrir menu lateral" });
		await opener.waitFor({ state: "visible", timeout: 30_000 });
		await opener.click();
	}
	await page.locator("[data-card]").waitFor({ state: "visible", timeout: 30_000 });
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(350);
	return { context, page, errors };
}

(async () => {
	const cardsDir = path.join(OUTPUT, "cards");
	fs.mkdirSync(cardsDir, { recursive: true });
	const browser = await chromium.launch({
		executablePath: "/usr/bin/google-chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-dev-shm-usage"],
	});
	const overflow = { gerado: new Date().toISOString(), resultados: [] };
	try {
		for (const group of [
			{ kind: "mock", states: MOCK_STATES },
			{ kind: "opcao-b", states: OPTION_B_STATES },
		]) {
			for (const state of group.states) {
				for (const layout of LAYOUTS) {
					const key = `${state.id}-${layout.id}`;
					const { context, page, errors } = await open(browser, layout, state.storage);
					const m = await measure(page);
					const file = path.join(cardsDir, `${group.kind}-${key}.png`);
					const card = page.locator("[data-card]");
					const box = await card.boundingBox();
					if (box) {
						const pad = 8;
						await page.screenshot({
							path: file,
							clip: {
								x: Math.max(0, box.x - pad),
								y: Math.max(0, box.y - pad),
								width: box.width + pad * 2,
								height: box.height + pad * 2,
							},
						});
					}
					const line = m.line;
					overflow.resultados.push({
						key,
						group: group.kind,
						label: state.label,
						layout: layout.id,
						file,
						cardHeight: m.card && m.card.height,
						cardHeightOk: m.card && m.card.heightOk,
						scrollWidth: line && line.scrollWidth,
						clientWidth: line && line.clientWidth,
						overflows: line ? line.overflows : false,
						lineHeight: line && line.height,
						lineHeightCss: line && line.lineHeight,
						singleLine: line ? line.singleLine : true,
						text: m.text,
						errors,
					});
					await context.close();
				}
			}
		}
	} finally {
		await browser.close();
	}
	fs.writeFileSync(path.join(OUTPUT, "overflow.json"), JSON.stringify(overflow, null, 2));
	const failed = overflow.resultados.filter(
		(r) => r.overflows || r.singleLine === false || r.cardHeightOk === false,
	);
	console.log(
		JSON.stringify(
			{
				total: overflow.resultados.length,
				falhas: failed.map((r) => ({
					key: r.key,
					overflows: r.overflows,
					singleLine: r.singleLine,
					cardHeight: r.cardHeight,
				})),
			},
			null,
			2,
		),
	);
	const compose = spawnSync(
		"python3",
		[path.join(__dirname, "compose-u1-v2r2-sheet.py"), OUTPUT],
		{ stdio: "inherit" },
	);
	if (compose.status !== 0) {
		throw new Error("Falha ao montar a folha mock × implementação");
	}
	if (failed.length) process.exit(1);
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
