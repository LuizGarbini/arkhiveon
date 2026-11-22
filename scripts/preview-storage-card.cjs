/**
 * Cenário `storage-card` do `pnpm preview:record`.
 * App real + auth de preview + Supabase interceptado (nenhuma conta real).
 *
 *   VTT_PREVIEW_SCENARIO=storage-card pnpm preview:record
 */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT =
	process.env.STORAGE_CARD_PREVIEW_OUT ||
	"/workspace/arkhiveon/previews/plano-pro-cota/u1-card";
const BASE = process.env.VTT_BASE_URL || "http://127.0.0.1:4173";

const FREE = 100_000_000;
const PRO = 10_000_000_000;
const overSince = new Date(Date.now() - 17 * 86_400_000).toISOString();

const STATES = {
	loading: {
		status: "loading",
		label: "free",
		usedBytes: 0,
		limitBytes: FREE,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	},
	free: {
		status: "ready",
		label: "free",
		usedBytes: 38_400_000,
		limitBytes: FREE,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	},
	pro: {
		status: "ready",
		label: "pro",
		usedBytes: 1_310_000_000,
		limitBytes: PRO,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	},
	near: {
		status: "ready",
		label: "pro",
		usedBytes: 9_600_000_000,
		limitBytes: PRO,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	},
	limit: {
		status: "ready",
		label: "free",
		usedBytes: 100_000_000,
		limitBytes: FREE,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	},
	over: {
		status: "ready",
		label: "guest_pro",
		usedBytes: 10_400_000_000,
		limitBytes: PRO,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: overSince,
		payerName: "Mestre Ana",
	},
	error: {
		status: "error",
		label: "free",
		usedBytes: 0,
		limitBytes: FREE,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	},
	p80: {
		status: "ready",
		label: "free",
		usedBytes: 81_000_000,
		limitBytes: FREE,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	},
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
};

const CARD_LAYOUTS = {
	p80: ["1440", "390"],
	guest_near: ["1440", "390"],
	guest_limit: ["1440", "390"],
};

const LAYOUTS = [
	{ id: "1440", viewport: { width: 1440, height: 900 }, collapsed: false, mobile: false },
	{ id: "390", viewport: { width: 390, height: 844 }, collapsed: false, mobile: true },
	{ id: "recolhida", viewport: { width: 1440, height: 900 }, collapsed: true, mobile: false },
];

function redact(value) {
	return String(value)
		.replace(/eyJ[A-Za-z0-9_-]{10,}/g, "[redacted]")
		.slice(0, 240);
}

async function setupContext(context, { storage, collapsed, recordsCount = 7 }) {
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
	await context.addInitScript(
		({ storage: previewStorage, collapsed: isCollapsed, recordsCount: count }) => {
			localStorage.setItem("arkhiveon_preview_auth", "true");
			localStorage.setItem(
				"arkhiveon_preview_storage",
				JSON.stringify(previewStorage),
			);
			if (isCollapsed) {
				localStorage.setItem("arkhiveon_preview_sidebar", "collapsed");
			} else {
				localStorage.removeItem("arkhiveon_preview_sidebar");
			}
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
						globalRecordsCount: count,
						isLoadingRemote: false,
						isRetryingBase: false,
						remoteLoadError: null,
						baseLoadError: null,
					},
					version: 0,
				}),
			);
		},
		{ storage, collapsed, recordsCount },
	);
}

async function measure(page) {
	return page.evaluate(() => {
		const vis = (el) => {
			const r = el.getBoundingClientRect();
			const s = getComputedStyle(el);
			return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
		};
		const card = document.querySelector("[data-card]");
		if (!card) return { missing: true };
		const parts = [card, ...card.querySelectorAll("[data-label], [data-status], [data-value]")];
		const overflows = parts
			.filter((el) => el.scrollWidth > el.clientWidth + 1)
			.map((el) => ({
				name: el.getAttribute("data-label") !== null ? "label" : el.getAttribute("data-status") !== null ? "status" : el.getAttribute("data-value") !== null ? "value" : "card",
				scrollWidth: el.scrollWidth,
				clientWidth: el.clientWidth,
			}));
		const ellipsis = parts
			.filter((el) => {
				const s = getComputedStyle(el);
				return s.textOverflow === "ellipsis" || s.textOverflow.includes("ellipsis");
			})
			.map((el) => el.getAttribute("data-value") || el.getAttribute("data-label") || el.tagName);
		const r = card.getBoundingClientRect();
		const under44 = r.height < 43.5 || r.width < 43.5;
		const blur = [...document.querySelectorAll("aside *, [data-card], [data-card] *")].filter((el) => {
			const s = getComputedStyle(el);
			return (s.backdropFilter && s.backdropFilter !== "none") || /blur/.test(s.filter);
		}).length;
		const nativeSelect = [...document.querySelectorAll("aside select")].filter(vis).length;
		return {
			missing: false,
			overflows,
			ellipsis,
			width: Math.round(r.width * 10) / 10,
			height: Math.round(r.height * 10) / 10,
			under44,
			blur,
			nativeSelect,
			text: (card.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
		};
	});
}

async function openPage(browser, layout, stateName, storage) {
	const context = await browser.newContext({
		viewport: layout.viewport,
		deviceScaleFactor: 2,
		isMobile: layout.mobile,
		hasTouch: layout.mobile,
		reducedMotion: "reduce",
	});
	await setupContext(context, { storage, collapsed: layout.collapsed });
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(redact(error.message)));
	await page.goto(`${BASE}/dashboard`, {
		waitUntil: "domcontentloaded",
		timeout: 90_000,
	});
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

async function clipOf(page, selector, pad = 8) {
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

(async () => {
	fs.mkdirSync(OUTPUT, { recursive: true });
	const antesDir = "/workspace/arkhiveon/previews/plano-pro-cota/antes";
	if (fs.existsSync(antesDir)) {
		for (const file of fs.readdirSync(antesDir)) {
			if (!file.endsWith(".png") || file.startsWith("_")) continue;
			const destName = file.startsWith("antes-") ? file : `antes-${file}`;
			fs.copyFileSync(path.join(antesDir, file), path.join(OUTPUT, destName));
		}
	}

	const browser = await chromium.launch({
		executablePath: "/usr/bin/google-chrome",
		headless: true,
	});
	const report = { gerado: new Date().toISOString(), resultados: [], falhas: [] };

	try {
		for (const [stateName, storage] of Object.entries(STATES)) {
			const allowed = CARD_LAYOUTS[stateName];
			const layouts = allowed ? LAYOUTS.filter((l) => allowed.includes(l.id)) : LAYOUTS;
			for (const layout of layouts) {
				const key = `${stateName}-${layout.id}`;
				const { context, page, errors } = await openPage(browser, layout, stateName, storage);
				const measures = await measure(page);
				if (stateName === "error" && !layout.collapsed) {
					const retry = page.getByRole("button", { name: "Tentar de novo" });
					const retryCount = await retry.count();
					if (!retryCount) {
						report.falhas.push(`${key}: sem botão Tentar de novo`);
					} else {
						const box = await retry.evaluate((el) => {
							const r = el.getBoundingClientRect();
							return {
								w: Math.round(r.width * 10) / 10,
								h: Math.round(r.height * 10) / 10,
								scrollWidth: el.scrollWidth,
								clientWidth: el.clientWidth,
							};
						});
						measures.retryButton = box;
						if (box.h < 43.5 || box.w < 43.5) {
							report.falhas.push(`${key}: botão abaixo de 44px (${box.w}×${box.h})`);
						}
						if (box.scrollWidth > box.clientWidth + 1) {
							report.falhas.push(`${key}: overflow no botão Tentar de novo`);
						}
					}
				}
				const cardClip = await clipOf(page, "[data-card]", 10);
				const asideClip = await clipOf(page, "aside", 0);
				const cardPath = path.join(OUTPUT, `u1-card-${key}.png`);
				const asidePath = path.join(OUTPUT, `u1-sidebar-${key}.png`);
				if (cardClip) await page.screenshot({ path: cardPath, clip: cardClip });
				if (asideClip) await page.screenshot({ path: asidePath, clip: asideClip });
				if (stateName === "pro" && layout.id === "1440") {
					await page.screenshot({
						path: path.join(OUTPUT, "depois-sidebar-1440-pro.png"),
					});
				}
				if (stateName === "free" && layout.id === "390") {
					await page.screenshot({
						path: path.join(OUTPUT, "depois-app-390-free.png"),
					});
				}
				const row = { key, measures, errors };
				report.resultados.push(row);
				if (measures.missing) report.falhas.push(`${key}: card ausente`);
				if (measures.overflows && measures.overflows.length) {
					report.falhas.push(`${key}: overflow ${JSON.stringify(measures.overflows)}`);
				}
				if (measures.ellipsis && measures.ellipsis.length) {
					report.falhas.push(`${key}: reticências ${measures.ellipsis.join(",")}`);
				}
				if (measures.under44) report.falhas.push(`${key}: alvo abaixo de 44px (${measures.width}×${measures.height})`);
				if (measures.blur) report.falhas.push(`${key}: blur no card/aside`);
				if (measures.nativeSelect) report.falhas.push(`${key}: select nativo`);
				if (errors.length) report.falhas.push(`${key}: pageerror ${errors[0]}`);
				await context.close();
			}
		}

		const consumoPages = [
			{
				id: "free",
				storage: STATES.free,
				recordsCount: 7,
				expect: ["7 / 20", "38,4 MB de 100 MB"],
			},
			{
				id: "pro",
				storage: STATES.pro,
				recordsCount: 42,
				expect: ["sem limite", "1,3 GB de 10 GB"],
			},
		];
		const consumoLayouts = LAYOUTS.filter((l) => l.id === "1440" || l.id === "390");
		for (const pageState of consumoPages) {
			for (const layout of consumoLayouts) {
				const key = `consumo-${pageState.id}-${layout.id}`;
				const context = await browser.newContext({
					viewport: layout.viewport,
					deviceScaleFactor: 2,
					isMobile: layout.mobile,
					hasTouch: layout.mobile,
					reducedMotion: "reduce",
				});
				await setupContext(context, {
					storage: pageState.storage,
					collapsed: false,
					recordsCount: pageState.recordsCount,
				});
				const page = await context.newPage();
				const errors = [];
				page.on("pageerror", (error) => errors.push(redact(error.message)));
				await page.goto(`${BASE}/consumo`, {
					waitUntil: "domcontentloaded",
					timeout: 90_000,
				});
				await page.getByRole("heading", { name: "Consumo" }).waitFor({
					state: "visible",
					timeout: 30_000,
				});
				await page.evaluate((count) => {
					const store = window.__rpg_store__;
					if (store) {
						store.setState({
							globalRecordsCount: count,
							isLoadingRemote: false,
							hasLoadedCampaigns: true,
							campaignLoadStatus: "ready",
							remoteLoadError: null,
							baseLoadError: null,
							isRetryingBase: false,
							activeCampaignId: "demo-tabletop",
							remoteLoadedCampaignId: "demo-tabletop",
						});
					}
				}, pageState.recordsCount);
				await page.evaluate(() => document.fonts.ready);
				await page.waitForTimeout(400);
				for (const text of pageState.expect) {
					const found = await page.getByText(text, { exact: true }).count();
					if (!found) report.falhas.push(`${key}: faltou o texto "${text}"`);
				}
				const pageOverflow = await page.evaluate(() => {
					const main = document.querySelector("main");
					return {
						document: document.documentElement.scrollWidth > innerWidth + 1,
						main: main ? main.scrollWidth > main.clientWidth + 1 : null,
						blur: [...document.querySelectorAll("main *")].some((el) => {
							const s = getComputedStyle(el);
							return (s.backdropFilter && s.backdropFilter !== "none") || /blur/.test(s.filter);
						}),
						nativeSelect: [...document.querySelectorAll("main select")].length,
						text: (document.querySelector("main")?.textContent || "")
							.replace(/\s+/g, " ")
							.trim()
							.slice(0, 200),
					};
				});
				if (pageOverflow.document || pageOverflow.main) {
					report.falhas.push(`${key}: overflow horizontal`);
				}
				if (pageOverflow.blur) report.falhas.push(`${key}: blur na /consumo`);
				if (pageOverflow.nativeSelect) report.falhas.push(`${key}: select nativo`);
				if (errors.length) report.falhas.push(`${key}: pageerror ${errors[0]}`);
				const mainClip = await clipOf(page, "main", 0);
				const pathName = path.join(OUTPUT, `u1-consumo-${pageState.id}-${layout.id}.png`);
				if (mainClip) await page.screenshot({ path: pathName, clip: mainClip });
				else await page.screenshot({ path: pathName, fullPage: true });
				report.resultados.push({ key, measures: pageOverflow, errors });
				await context.close();
			}
		}
	} finally {
		await browser.close();
	}

	fs.writeFileSync(path.join(OUTPUT, "overflow.json"), JSON.stringify(report, null, 2));
	fs.writeFileSync(
		path.join(OUTPUT, "preview.md"),
		`# U1 — card compacto da sidebar

Fonte provisória: \`user_plans.storage_used_bytes\` (o mesmo número que a sidebar já mostrava), isolada em \`useStorageContext\`. \`usedPdfs\` / \`usedImages\` ficam \`null\`; a barra é só o total (\`primary\` / \`destructive\`). O recorte PDF/imagens da V2 r2 entra depois da S1b/S2/S3.

Outros desvios da V2 r2:
- Sem barra dividida PDF (\`chart-2\`) / imagens (\`chart-4\`).
- Na combinação mais longa, o uso desce para a linha 2 (\`flex-wrap\`); o mock ainda tinha \`nowrap\` numa linha só.
- \`/consumo\` existe como página provisória (o detalhe é a U2).
- A sidebar recolhida (72px) só aparece no preview local (\`arkhiveon_preview_sidebar=collapsed\`); no app a barra permanece aberta no desktop.

Prova de overflow em \`overflow.json\`: \`scrollWidth <= clientWidth\` em carregando, Free, Pro, 80% (81%), 96%, Cheio, Convidado Pro (96%, Cheio e acima) e erro com o botão Tentar de novo; em 1440, 390 e recolhida (os estados novos, em 1440 e 390). \`/consumo\` mostra Registros (Free n/20, Pro sem limite) e o total de uso.
`,
	);

	if (report.falhas.length) {
		console.error("Falha na prova do card de cota:");
		for (const f of report.falhas) console.error("-", f);
		process.exit(1);
	}
	console.log(`Preview do card de cota gravado em ${OUTPUT}`);
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
