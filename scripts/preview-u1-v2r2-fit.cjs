/**
 * Mede se Convidado Pro + 96%/Cheio/Acima cabe em 213px na escala V2 r2.
 * Se não caber, grava prints das opções em u1-card-v2r2/opcoes/.
 *
 *   VTT_PREVIEW_SCENARIO=u1-v2r2-fit pnpm preview:record
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT =
	process.env.U1_V2R2_OUT ||
	"/workspace/arkhiveon/previews/plano-pro-cota/u1-card-v2r2";
const OPTIONS_OUT = path.join(OUTPUT, "opcoes");
const BASE = process.env.VTT_BASE_URL || "http://127.0.0.1:4173";
const PRO = 10_000_000_000;
const overSince = new Date(Date.now() - 17 * 86_400_000).toISOString();

const STATES = {
	guest_near: {
		status: "ready",
		label: "guest_pro",
		usedBytes: 9_600_000_000,
		limitBytes: PRO,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: "Mestre Ana",
	},
	guest_limit: {
		status: "ready",
		label: "guest_pro",
		usedBytes: 10_000_000_000,
		limitBytes: PRO,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: "Mestre Ana",
	},
	guest_over: {
		status: "ready",
		label: "guest_pro",
		usedBytes: 10_400_000_000,
		limitBytes: PRO,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: overSince,
		payerName: "Mestre Ana",
	},
};

const LAYOUTS = [
	{ id: "1440", viewport: { width: 1440, height: 900 }, mobile: false },
	{ id: "390", viewport: { width: 390, height: 844 }, mobile: true },
];

const OPTIONS = [
	{ id: "r2", label: "V2 r2 sem quebra (selo inteiro, estado e uso completos)" },
	{ id: "a-selo-uso", label: "A · selo Conv. Pro + Acima sem os dias + uso sem denominador" },
	{ id: "b-icone-uso", label: "B · selo Convidado Pro + estado só em ícone + uso sem denominador" },
	{ id: "c-selo-icone", label: "C · selo Conv. Pro + estado só em ícone + uso completo com denominador" },
];

function redact(value) {
	return String(value)
		.replace(/eyJ[A-Za-z0-9_-]{10,}/g, "[redacted]")
		.slice(0, 240);
}

async function setupContext(context, { storage, opt }) {
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
	);
	await context.route("**/auth/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
	);
	await context.addInitScript(
		({ storage: previewStorage, opt: cardOpt }) => {
			localStorage.setItem("arkhiveon_preview_auth", "true");
			localStorage.setItem("arkhiveon_preview_storage", JSON.stringify(previewStorage));
			if (cardOpt && cardOpt !== "r2") {
				localStorage.setItem("arkhiveon_preview_card_opt", cardOpt);
			} else {
				localStorage.removeItem("arkhiveon_preview_card_opt");
			}
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
		},
		{ storage, opt },
	);
}

async function measure(page) {
	return page.evaluate(() => {
		const card = document.querySelector("[data-card]");
		const line = document.querySelector("[data-line1]");
		if (!card || !line) return { missing: true };
		const parts = {
			label: line.querySelector("[data-label]"),
			status: line.querySelector("[data-status]"),
			value: line.querySelector("[data-value]"),
		};
		const box = (el) =>
			el
				? {
						text: (el.textContent || "").replace(/\s+/g, " ").trim(),
						scrollWidth: el.scrollWidth,
						clientWidth: el.clientWidth,
						width: Math.round(el.getBoundingClientRect().width * 10) / 10,
						height: Math.round(el.getBoundingClientRect().height * 10) / 10,
						overflows: el.scrollWidth > el.clientWidth + 1,
					}
				: null;
		const lineStyle = getComputedStyle(line);
		const lineHeight = Number.parseFloat(lineStyle.lineHeight);
		const lineBox = line.getBoundingClientRect();
		const cardBox = card.getBoundingClientRect();
		const childrenWidth =
			(parts.label ? parts.label.getBoundingClientRect().width : 0) +
			(parts.status ? parts.status.getBoundingClientRect().width : 0) +
			(parts.value ? parts.value.getBoundingClientRect().width : 0) +
			(parts.status ? 2 * 6 : 6); // gap-1.5 twice if status exists, else once
		// actual flex gap from computed
		const gap = Number.parseFloat(lineStyle.columnGap || lineStyle.gap || "0");
		const itemCount = [parts.label, parts.status, parts.value].filter(Boolean).length;
		const gaps = Math.max(0, itemCount - 1) * (Number.isFinite(gap) ? gap : 6);
		const sum =
			(parts.label ? parts.label.getBoundingClientRect().width : 0) +
			(parts.status ? parts.status.getBoundingClientRect().width : 0) +
			(parts.value ? parts.value.getBoundingClientRect().width : 0) +
			gaps;
		return {
			missing: false,
			card: {
				width: Math.round(cardBox.width * 10) / 10,
				height: Math.round(cardBox.height * 10) / 10,
				heightOk: Math.abs(cardBox.height - 44) < 1,
			},
			line: {
				scrollWidth: line.scrollWidth,
				clientWidth: line.clientWidth,
				width: Math.round(lineBox.width * 10) / 10,
				height: Math.round(lineBox.height * 10) / 10,
				lineHeight: Number.isFinite(lineHeight) ? lineHeight : null,
				fits213: line.scrollWidth <= 213 + 1 && line.clientWidth <= 213 + 1,
				overflows: line.scrollWidth > line.clientWidth + 1,
				singleLine: lineBox.height <= (Number.isFinite(lineHeight) ? lineHeight : 20) + 1.5,
			},
			sumItems: Math.round(sum * 10) / 10,
			fitsBySum: sum <= 213 + 1,
			label: box(parts.label),
			status: box(parts.status),
			value: box(parts.value),
			text: (card.textContent || "").replace(/\s+/g, " ").trim(),
		};
	});
}

async function clipOf(page, selector, pad = 10) {
	return page.evaluate(
		({ selector: s, pad: p }) => {
			const el = document.querySelector(s);
			if (!el) return null;
			const r = el.getBoundingClientRect();
			return {
				x: Math.max(0, r.left - p),
				y: Math.max(0, r.top - p),
				width: Math.min(innerWidth - Math.max(0, r.left - p), r.width + p * 2),
				height: r.height + p * 2,
			};
		},
		{ selector, pad },
	);
}

async function open(browser, layout, storage, opt) {
	const context = await browser.newContext({
		viewport: layout.viewport,
		deviceScaleFactor: 2,
		isMobile: layout.mobile,
		hasTouch: layout.mobile,
		reducedMotion: "reduce",
	});
	await setupContext(context, { storage, opt });
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
	await page.waitForTimeout(400);
	return { context, page, errors };
}

(async () => {
	fs.mkdirSync(OPTIONS_OUT, { recursive: true });
	const browser = await chromium.launch({
		executablePath: "/usr/bin/google-chrome",
		headless: true,
	});
	const report = { gerado: new Date().toISOString(), resultados: [], naoCabem: [] };
	try {
		for (const opt of OPTIONS) {
			for (const [stateName, storage] of Object.entries(STATES)) {
				for (const layout of LAYOUTS) {
					const key = `${opt.id}-${stateName}-${layout.id}`;
					const { context, page, errors } = await open(browser, layout, storage, opt.id);
					const m = await measure(page);
					const destDir = opt.id === "r2" ? OUTPUT : OPTIONS_OUT;
					const clip = await clipOf(page, "[data-card]", 10);
					const file = path.join(destDir, `${opt.id}-${stateName}-${layout.id}.png`);
					if (clip) await page.screenshot({ path: file, clip });
					const cabe = !m.missing && m.fitsBySum && m.line && !m.line.overflows && m.line.fits213;
					if (opt.id === "r2" && !cabe) report.naoCabem.push(key);
					report.resultados.push({ key, opt: opt.id, label: opt.label, cabe, measures: m, errors, file });
					await context.close();
				}
			}
		}
	} finally {
		await browser.close();
	}
	fs.writeFileSync(path.join(OUTPUT, "medida-convidado-pro.json"), JSON.stringify(report, null, 2));
	const r2Fail = report.naoCabem;
	console.log(JSON.stringify({ naoCabem: r2Fail, total: report.resultados.length }, null, 2));
	for (const r of report.resultados) {
		const m = r.measures;
		const line = m.line || {};
		console.log(
			`${r.key}: cabe=${r.cabe} lineW=${line.width} scroll=${line.scrollWidth} sum=${m.sumItems} hCard=${m.card && m.card.height} text=${JSON.stringify(m.text)}`,
		);
	}
	if (r2Fail.length) {
		console.log(`NAO CABE na escala V2 r2 (${r2Fail.length} casos). Opções gravadas em ${OPTIONS_OUT}`);
		process.exit(0); // expected stop — not a script failure
	}
	console.log("Coube nos 213px em todos os casos de Convidado Pro + estado.");
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
