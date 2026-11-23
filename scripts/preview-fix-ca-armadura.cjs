/**
 * Cabeçalho da ficha do Alfratur (mock): CA 18 + Traje Elegante baseAc 0.
 * App real + auth de preview + Supabase interceptado.
 *
 *   VTT_PREVIEW_SCENARIO=fix-ca-armadura FIX_CA_SHOT=antes pnpm preview:record
 *   VTT_PREVIEW_SCENARIO=fix-ca-armadura FIX_CA_SHOT=depois pnpm preview:record
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT =
	process.env.FIX_CA_PREVIEW_OUT ||
	"/workspace/arkhiveon/previews/ficha/fix-ca-armadura-base-zero";
const BASE = process.env.VTT_BASE_URL || "http://127.0.0.1:4173";
const SHOT = process.env.FIX_CA_SHOT === "depois" ? "depois" : "antes";

const TRAJE_ID = "item-traje-elegante";
const CHAR_ID = "char-alfratur";

const traje = {
	id: TRAJE_ID,
	createdAt: 1,
	createdBy: "preview-gm-user",
	worldId: "world-1",
	publicationScope: "restricted",
	campaignIds: ["demo-campaign"],
	visibility: "public",
	name: "Traje Elegante",
	type: "Armadura",
	rarity: "raro",
	subtype: "",
	weight: "0,5 kg",
	value: "",
	requiresAttunement: false,
	attunedTo: "",
	charges: "",
	source: "",
	stats: "",
	properties: "",
	description: "Roupa elegante.",
	owner: "",
	imageUrl: "",
	equipped: false,
	entityLinks: [],
	armor: { baseAc: 0, dexMode: "none", armorCategory: "light" },
	bonuses: [{ id: "init", target: "initiative", value: 2 }],
};

const character = {
	id: CHAR_ID,
	createdAt: 1,
	createdBy: "preview-gm-user",
	campaignId: "demo-campaign",
	worldId: "world-1",
	system: "dnd5e",
	characterName: "Alfratur Dulmor",
	playerName: "Jogador mock",
	race: "Draconato, Meio dragão",
	class: "Feiticeiro",
	subclass: "",
	background: "",
	alignment: "",
	level: 15,
	xp: 0,
	age: "",
	height: "",
	weight: "",
	eyes: "",
	hair: "",
	skin: "",
	appearance: "",
	strength: 10,
	dexterity: 18,
	constitution: 14,
	intelligence: 12,
	wisdom: 10,
	charisma: 20,
	power: 10,
	size: 10,
	education: 10,
	sanity: 0,
	sanityMax: 0,
	health: 203,
	healthMax: 203,
	tempHealth: 0,
	armorClass: 18,
	initiative: 7,
	speed: 9,
	speedUnit: "m",
	proficiencyBonus: 5,
	hitDice: "15d6",
	deathSaves: { successes: 0, failures: 0 },
	savingThrows: "",
	skills: "",
	languages: "",
	proficiencies: "",
	spellcastingClass: "Feiticeiro",
	spellAbility: "charisma",
	spellSaveDc: 18,
	spellAttackBonus: 10,
	spells: "",
	spellSlots: "",
	equipment: "",
	currency: "",
	personalityTraits: "",
	ideals: "",
	bonds: "",
	flaws: "",
	notes: "",
	imageUrl: "",
	share: "table",
	sharedWith: [],
	familyRelations: [],
	entityLinks: [],
	inventoryList: [
		{
			id: "inv-traje",
			name: "Traje Elegante",
			quantity: 1,
			weightLbs: 0.5,
			location: "equipped",
			slot: "armor",
			category: "armor",
			campaignItemId: TRAJE_ID,
		},
	],
	systemAttributes: {},
	systemFields: {},
};

const LAYOUTS = [
	{ id: "1440", viewport: { width: 1440, height: 900 }, mobile: false },
	{ id: "390", viewport: { width: 390, height: 844 }, mobile: true },
];

function redact(value) {
	return String(value)
		.replace(/eyJ[A-Za-z0-9_-]{10,}/g, "[redacted]")
		.replace(/[\w.+-]+@[\w.-]+/g, "[email]")
		.slice(0, 240);
}

async function setupContext(browser, layout) {
	const context = await browser.newContext({
		viewport: layout.viewport,
		deviceScaleFactor: 2,
		isMobile: layout.mobile,
		hasTouch: layout.mobile,
		reducedMotion: "reduce",
		locale: "pt-BR",
	});
	await context.routeWebSocket("**/realtime/**", (socket) => socket.close());
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
	);
	await context.route("**/auth/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
	);
	await context.route("**/functions/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
	);
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
	});
	return context;
}

async function applySheet(page) {
	await page.evaluate(
		({ character: char, traje: item }) => {
			const store = window.__rpg_store__;
			store.setState({
				campaigns: [
					{
						id: "demo-campaign",
						name: "Mesa de Teste (mock)",
						description: "Campanha fictícia só para o preview.",
						ownerId: "preview-gm-user",
						worldId: "world-1",
						myRole: "owner",
						system: "dnd5e",
						createdAt: 1,
					},
				],
				activeCampaignId: "demo-campaign",
				worlds: [
					{
						id: "world-1",
						name: "Mundo mock",
						isDefault: true,
						ownerUserId: "preview-gm-user",
						createdAt: 1,
					},
				],
				activeWorldId: "world-1",
				characters: [char],
				items: [item],
				isLoadingRemote: false,
				hasLoadedCampaigns: true,
				campaignLoadStatus: "ready",
				syncError: null,
				remoteLoadError: null,
			});
		},
		{ character, traje },
	);
	await page.waitForFunction(
		() => {
			const heading = document.querySelector("[data-slot=sheet-header] h1");
			return heading?.textContent?.trim() === "Alfratur Dulmor";
		},
		{ timeout: 20000 },
	);
}

async function measureHeader(page) {
	return page.evaluate(() => {
		const header = document.querySelector("[data-slot=sheet-header]");
		if (!header) return { missing: true };
		const r = header.getBoundingClientRect();
		const labels = [...header.querySelectorAll("dt, [data-stat-label]")].map(
			(el) => (el.textContent || "").trim(),
		);
		const values = [...header.querySelectorAll("dd, [data-stat-value]")].map(
			(el) => (el.textContent || "").trim(),
		);
		const text = (header.textContent || "").replace(/\s+/g, " ").trim();
		const caMatch = text.match(/\bCA\b[^\d]*(\d+)/i);
		return {
			missing: false,
			width: Math.round(r.width * 10) / 10,
			height: Math.round(r.height * 10) / 10,
			ca: caMatch ? caMatch[1] : null,
			labels,
			values,
			text: text.slice(0, 400),
		};
	});
}

(async () => {
	fs.mkdirSync(OUTPUT, { recursive: true });
	const browser = await chromium.launch({
		executablePath: "/usr/bin/google-chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-dev-shm-usage"],
	});
	const results = [];
	try {
		for (const layout of LAYOUTS) {
			const context = await setupContext(browser, layout);
			const page = await context.newPage();
			const errors = [];
			page.on("pageerror", (error) => errors.push(redact(error.message)));
			await page.goto(`${BASE}/sheets/${CHAR_ID}`, {
				waitUntil: "domcontentloaded",
				timeout: 90_000,
			});
			await page.waitForFunction(
				() =>
					typeof window.__rpg_store__ !== "undefined" &&
					!document.body.innerText.includes("Autenticando"),
				{ timeout: 30_000 },
			);
			await applySheet(page);
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(400);
			const header = page.locator("[data-slot=sheet-header]");
			await header.waitFor({ state: "visible", timeout: 15_000 });
			const measures = await measureHeader(page);
			const file = path.join(OUTPUT, `${SHOT}-cabecalho-${layout.id}.png`);
			const box = await header.boundingBox();
			if (!box) throw new Error(`Cabeçalho sem caixa em ${layout.id}`);
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
			results.push({ shot: SHOT, layout: layout.id, file, measures, errors });
			await context.close();
		}
	} finally {
		await browser.close();
	}
	const reportPath = path.join(OUTPUT, `${SHOT}-medidas.json`);
	fs.writeFileSync(reportPath, JSON.stringify({ shot: SHOT, results }, null, 2));
	console.log(JSON.stringify({ shot: SHOT, results }, null, 2));
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
