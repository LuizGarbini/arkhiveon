/**
 * Cenário `ficha-mobile` do `pnpm preview:record`.
 * Mock local da Elara (arkhiveon_preview_auth + __rpg_store__). Nenhuma mesa real.
 *
 *   VTT_BASE_URL=http://127.0.0.1:4173 node scripts/preview-ficha-mobile.cjs
 *   node scripts/preview-ficha-mobile.cjs --diff <antes> <depois> <saida.json>
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const LONG_NAME = "Elara Ventoclaro da Biblioteca de Valira";
const SHORT_NAME = "Elara Ventoclaro";

const spell = (id, name, level, school) => ({
	id,
	system: "dnd5e",
	name,
	level,
	school,
	casting_time: "1 ação",
	range: "18 m",
	components: "V, S",
	duration: "Instantânea",
	description: "",
});

const gear = (id, name, extra) => ({
	id,
	name,
	quantity: 1,
	weightLbs: 1,
	location: "backpack",
	category: "gear",
	...extra,
});

const character = {
	id: "char-1",
	createdAt: 1,
	campaignId: "demo-campaign",
	worldId: "world-1",
	system: "dnd5e",
	characterName: SHORT_NAME,
	playerName: "Jogador mock",
	race: "Alta-elfa",
	class: "Mago",
	subclass: "Escola de Evocação",
	background: "Sábia",
	alignment: "Neutra e Boa",
	level: 5,
	xp: 6500,
	age: "",
	height: "",
	weight: "",
	eyes: "",
	hair: "",
	skin: "",
	appearance: "",
	strength: 8,
	dexterity: 16,
	constitution: 14,
	intelligence: 18,
	wisdom: 12,
	charisma: 10,
	power: 10,
	size: 10,
	education: 10,
	sanity: 0,
	sanityMax: 0,
	health: 27,
	healthMax: 32,
	tempHealth: 0,
	armorClass: 15,
	initiative: 3,
	speed: 9,
	speedUnit: "m",
	proficiencyBonus: 3,
	hitDice: "5d6",
	hitDiceUsed: 1,
	deathSaves: { successes: 0, failures: 0 },
	savingThrows: "Inteligência, Sabedoria",
	savingThrowProficiencies: { intelligence: true, wisdom: true },
	skills: "",
	skillProficiencies: {
		arcana: "expertise",
		history: "proficient",
		investigation: "proficient",
		perception: "proficient",
		insight: "proficient",
	},
	languages: "Comum, Élfico, Dracônico, Silvestre",
	proficiencies: "Adagas, dardos, fundas, bordões, bestas leves",
	spellcastingClass: "Mago",
	spellAbility: "intelligence",
	spellSaveDc: 15,
	spellAttackBonus: 7,
	spells: "",
	spellSlots: "",
	spellSlotsState: {
		slots: {
			1: { total: 4, used: 1 },
			2: { total: 3, used: 1 },
			3: { total: 2, used: 0 },
		},
	},
	spellsList: [
		spell("s1", "Raio de Fogo", 0, "Evocação"),
		spell("s2", "Mãos Mágicas", 0, "Conjuração"),
		spell("s3", "Luz", 0, "Evocação"),
		spell("s4", "Raio de Gelo", 0, "Evocação"),
		spell("s5", "Escudo Arcano", 1, "Abjuração"),
		spell("s6", "Mísseis Mágicos", 1, "Evocação"),
		spell("s7", "Detectar Magia", 1, "Adivinhação"),
		spell("s8", "Armadura Arcana", 1, "Abjuração"),
		spell("s9", "Passo Nebuloso", 2, "Conjuração"),
		spell("s10", "Raio Ardente", 2, "Evocação"),
		spell("s11", "Teia", 2, "Conjuração"),
		spell("s12", "Bola de Fogo", 3, "Evocação"),
		spell("s13", "Contramágica", 3, "Abjuração"),
	],
	featsList: [
		{
			id: "ft1",
			system: "dnd5e",
			name: "Conjurador de Guerra",
			category: "Talento",
			prerequisites: "",
			description: "Vantagem em Constituição para manter concentração.",
			ability_increase: "",
			source: "PHB",
		},
	],
	equipment: "",
	currency: "84 PO, 23 PP, 6 PC",
	personalityTraits: "Curiosa até o limite do imprudente.",
	ideals: "Conhecimento não pertence a ninguém.",
	bonds: "Devo minha vida à biblioteca de Valir.",
	flaws: "Não resiste a um livro trancado.",
	notes: "Procurar o terceiro volume do Códice das Marés.",
	imageUrl: "/elara-portrait.png",
	imageFocusX: 50,
	imageFocusY: 22,
	share: "table",
	sharedWith: [],
	familyRelations: [],
	entityLinks: [
		{
			id: "l1",
			entityKind: "faction",
			entityId: "f1",
			label: "Ordem da Rosa de Aço",
			note: "Patrono do Grupo",
		},
		{
			id: "l2",
			entityKind: "faction",
			entityId: "f2",
			label: "Culto do Olho Prateado",
			note: "Inimigo declarado",
		},
	],
	inventoryList: [
		gear("i1", "Bordão de carvalho", {
			location: "equipped",
			category: "weapon",
			weightLbs: 4,
			weapon: {
				damageDice: "1d6",
				damageType: "bludgeoning",
				ability: "strength",
				versatileDice: "1d8",
			},
		}),
		gear("i2", "Adaga +1", {
			location: "equipped",
			category: "weapon",
			weapon: {
				damageDice: "1d4",
				damageType: "piercing",
				ability: "dexterity",
				magicBonus: 1,
			},
		}),
		gear("i3", "Besta leve", {
			location: "equipped",
			category: "weapon",
			weightLbs: 5,
			weapon: {
				damageDice: "1d8",
				damageType: "piercing",
				ability: "dexterity",
			},
		}),
		gear("i4", "Grimório de Valir", { location: "equipped", weightLbs: 3 }),
		gear("i5", "Bolsa de componentes", { location: "equipped", weightLbs: 2 }),
		gear("i6", "Virotes", { quantity: 20, weightLbs: 1.5 }),
		gear("i7", "Poção de cura", {
			category: "potion",
			quantity: 3,
			weightLbs: 0.5,
		}),
		gear("i8", "Pergaminho de Contramágica", {
			category: "treasure",
			weightLbs: 0,
		}),
		gear("i9", "Corda de seda (15 m)", { weightLbs: 5 }),
		gear("i10", "Kit de explorador", { weightLbs: 10 }),
		gear("i11", "Tinta e pena", { weightLbs: 0.2 }),
		gear("i12", "Diário de campo", { weightLbs: 1 }),
	],
	systemAttributes: {
		strength: 8,
		dexterity: 16,
		constitution: 14,
		intelligence: 18,
		wisdom: 12,
		charisma: 10,
	},
	systemFields: {},
	createdBy: "preview-player-user",
};

const factions = [
	{
		id: "f1",
		worldId: "world-1",
		name: "Ordem da Rosa de Aço",
		kind: "patron",
		imageUrl: "",
		createdAt: 1,
	},
	{
		id: "f2",
		worldId: "world-1",
		name: "Culto do Olho Prateado",
		kind: "cult_society",
		imageUrl: "",
		createdAt: 1,
	},
];

function safeText(text) {
	return String(text)
		.replace(/[\w.+-]+@[\w.-]+/g, "[email]")
		.slice(0, 600);
}

async function launchBrowser() {
	const options = {
		headless: true,
		args: ["--no-sandbox", "--disable-dev-shm-usage"],
	};
	try {
		return await chromium.launch({ ...options, channel: "chrome" });
	} catch {
		return chromium.launch({
			...options,
			executablePath: "/usr/bin/google-chrome",
		});
	}
}

async function prepareContext(browser, viewport, mobile) {
	const context = await browser.newContext({
		viewport,
		deviceScaleFactor: 2,
		isMobile: mobile,
		hasTouch: mobile,
		reducedMotion: "reduce",
		locale: "pt-BR",
	});
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "[]",
		}),
	);
	await context.route("**/functions/v1/**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "{}",
		}),
	);
	await context.routeWebSocket("**/realtime/**", (socket) => socket.close());
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
	});
	return context;
}

async function openSheet(page, baseUrl) {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto(`${baseUrl}/sheets/char-1`, {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	await page.waitForFunction(
		() =>
			typeof window.__rpg_store__ !== "undefined" &&
			!document.body.innerText.includes("Autenticando"),
		{ timeout: 20000 },
	);
	return errors;
}

async function applySheet(page, role, name) {
	await page.evaluate(
		({ role, name, character, factions }) => {
			const store = window.__rpg_store__;
			store.setState({
				campaigns: [
					{
						id: "demo-campaign",
						name: "Mesa de Teste (mock)",
						description: "Campanha fictícia só para o preview.",
						ownerId: "preview-gm-user",
						worldId: "world-1",
						myRole: role,
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
				characters: [{ ...character, characterName: name }],
				items: [],
				factions,
				isLoadingRemote: false,
				hasLoadedCampaigns: true,
				campaignLoadStatus: "ready",
				syncError: null,
				remoteLoadError: null,
				updateCharacter: async (id, patch) => {
					store.setState((state) => ({
						characters: state.characters.map((entry) =>
							entry.id === id ? { ...entry, ...patch } : entry,
						),
					}));
				},
			});
		},
		{ role, name, character, factions },
	);
	try {
		await page.waitForFunction(
			(expected) => {
				const heading = document.querySelector("[data-slot=sheet-header] h1");
				return heading?.textContent?.trim() === expected;
			},
			name,
			{ timeout: 15000 },
		);
	} catch (error) {
		const body = await page.evaluate(() => document.body.innerText);
		throw new Error(
			`Ficha não mostrou "${name}". ${safeText(body)} (${error.message})`,
		);
	}
	await page.evaluate(async () => {
		await document.fonts.ready;
		const image = document.querySelector("[data-slot=sheet-header] img");
		if (image && !image.complete) {
			await new Promise((resolve) => {
				image.addEventListener("load", resolve, { once: true });
				image.addEventListener("error", resolve, { once: true });
			});
		}
	});
	await page.waitForTimeout(250);
}

async function measure(page) {
	return page.evaluate(() => {
		const main = document.querySelector("main");
		const header = document.querySelector("[data-slot=sheet-header]");
		const visible = (element) => {
			const style = getComputedStyle(element);
			if (style.display === "none" || style.visibility === "hidden") return false;
			const box = element.getBoundingClientRect();
			return box.width > 0 && box.height > 0;
		};
		const labelOf = (element) =>
			(element.getAttribute("aria-label") || element.textContent || element.tagName)
				.trim()
				.replace(/\s+/g, " ")
				.slice(0, 48);
		const targets = [
			...document.querySelectorAll("button, a, input, textarea, select, [role=menuitem], [role=tab]"),
		].filter(visible);
		const small = (element) => {
			const box = element.getBoundingClientRect();
			return box.width < 43.5 || box.height < 43.5;
		};
		const mainTop = main ? main.getBoundingClientRect().top : 0;
		const sections = {};
		for (const section of document.querySelectorAll("[data-module-kind]")) {
			sections[section.dataset.moduleKind] = {
				id: section.id,
				top: Math.round(
					section.getBoundingClientRect().top -
						mainTop +
						(main ? main.scrollTop : 0),
				),
			};
		}
		const headerNodes = header
			? [...header.querySelectorAll("*")].filter((element) => {
					const style = getComputedStyle(element);
					return style.filter !== "none" || style.backdropFilter !== "none";
				})
			: [];
		const glow = header?.querySelector(".blur-3xl") ?? null;
		const name = header?.querySelector("h1") ?? null;
		const summary =
			[...(header?.querySelectorAll("p") ?? [])].find((node) =>
				node.textContent?.includes("·"),
			) ?? null;
		const sheetModule = document.querySelector("[data-slot=sheet-module]");
		return {
			scrollH: main ? main.scrollHeight : document.documentElement.scrollHeight,
			clientH: main ? main.clientHeight : window.innerHeight,
			sections,
			under44: targets.filter(small).map(labelOf),
			headerUnder44: targets
				.filter((element) => header?.contains(element) && small(element))
				.map(labelOf),
			overflowX: [...document.querySelectorAll("body *")].filter((element) => {
				const box = element.getBoundingClientRect();
				return box.width > 0 && box.right > window.innerWidth + 1;
			}).length,
			nativeSelect: document.querySelectorAll("select").length,
			backdropFilterCount: [...document.querySelectorAll("*")].filter((element) => {
				const style = getComputedStyle(element);
				return style.backdropFilter !== "none" || style.filter !== "none";
			}).length,
			headerFilter: headerNodes.map((element) =>
				String(element.className).slice(0, 80),
			),
			pillGap: null,
			statColors: header
				? [...header.querySelectorAll("dd")].map((node) => {
						const box = node.getBoundingClientRect();
						return {
							text: node.textContent?.trim() ?? "",
							color: getComputedStyle(node).color,
							x: box.x,
							y: box.y,
							w: box.width,
							h: box.height,
						};
					})
				: [],
			mobileProof: {
				headerShadow: header ? getComputedStyle(header).boxShadow : null,
				glowDisplay: glow ? getComputedStyle(glow).display : null,
				nameClamp: name ? getComputedStyle(name).webkitLineClamp : null,
				nameWhiteSpace: name ? getComputedStyle(name).whiteSpace : null,
				summaryColor: summary ? getComputedStyle(summary).color : null,
				moduleBg: sheetModule ? getComputedStyle(sheetModule).backgroundColor : null,
				moduleRadius: sheetModule
					? getComputedStyle(sheetModule).borderTopLeftRadius
					: null,
				moduleShadow: sheetModule ? getComputedStyle(sheetModule).boxShadow : null,
				modulePadding: sheetModule ? getComputedStyle(sheetModule).padding : null,
				moduleBorderLeft: sheetModule
					? getComputedStyle(sheetModule).borderLeftWidth
					: null,
				moduleBorderTop: sheetModule
					? getComputedStyle(sheetModule).borderTopWidth
					: null,
			},
		};
	});
}

async function openMenu(page) {
	await page.getByRole("button", { name: "Mais ações da ficha" }).click();
	await page.getByRole("menuitem", { name: "Exportar PDF" }).waitFor({
		timeout: 5000,
	});
	await page.waitForTimeout(150);
}

async function closeMenu(page) {
	await page.keyboard.press("Escape");
	await page.waitForTimeout(150);
}

async function shoot(page, file) {
	await page.screenshot({ path: file });
}

async function saveStrips(page, directory, prefix) {
	const { scrollH, clientH } = await page.evaluate(() => {
		const main = document.querySelector("main");
		return {
			scrollH: main ? main.scrollHeight : 0,
			clientH: main ? main.clientHeight : window.innerHeight,
		};
	});
	const step = Math.max(200, clientH - 40);
	const files = [];
	let index = 0;
	for (let top = 0; top < scrollH && index < 14; top += step) {
		await page.evaluate((value) => {
			const main = document.querySelector("main");
			if (main) main.scrollTop = value;
		}, top);
		await page.waitForTimeout(120);
		const name = `${prefix}-faixa-${index}.png`;
		await shoot(page, path.join(directory, name));
		files.push(name);
		index += 1;
	}
	await page.evaluate(() => {
		const main = document.querySelector("main");
		if (main) main.scrollTop = 0;
	});
	return files;
}

async function measureHeaderFit(page) {
	return page.evaluate(() => {
		const header = document.querySelector("[data-slot=sheet-header]");
		const name = header?.querySelector("h1") ?? null;
		const shown = (element) => {
			if (!element) return null;
			const style = getComputedStyle(element);
			if (style.display === "none" || style.visibility === "hidden") return null;
			const box = element.getBoundingClientRect();
			if (box.width === 0 || box.height === 0) return null;
			return {
				x: box.x,
				y: box.y,
				w: box.width,
				h: box.height,
			};
		};
		const buttons = header ? [...header.querySelectorAll("button")] : [];
		const rename = shown(
			buttons.find(
				(button) => button.getAttribute("aria-label") === "Renomear personagem",
			),
		);
		const more = shown(
			buttons.find(
				(button) => button.getAttribute("aria-label") === "Mais ações da ficha",
			),
		);
		const separated =
			!rename ||
			!more ||
			rename.x + rename.w <= more.x ||
			more.x + more.w <= rename.x ||
			rename.y + rename.h <= more.y ||
			more.y + more.h <= rename.y;
		const column = name?.parentElement?.parentElement ?? null;
		return {
			headerScrollWidth: header ? header.scrollWidth : null,
			headerClientWidth: header ? header.clientWidth : null,
			headerFits: header ? header.scrollWidth === header.clientWidth : null,
			nameClientWidth: name ? name.clientWidth : null,
			nameScrollWidth: name ? name.scrollWidth : null,
			nameClientHeight: name ? name.clientHeight : null,
			nameScrollHeight: name ? name.scrollHeight : null,
			nameFits: name ? name.scrollHeight <= name.clientHeight + 1 : null,
			nameTitle: name ? name.getAttribute("title") : null,
			columnWidth: column ? column.getBoundingClientRect().width : null,
			rename,
			more,
			separated,
		};
	});
}

async function measureThreeDigits(page) {
	return page.evaluate(() => {
		const cells = [...document.querySelectorAll("[data-slot=sheet-header] dd")];
		const originals = cells.map((cell) => cell.textContent);
		for (const cell of cells) cell.textContent = "108";
		const result = cells.map((cell) => ({
			w: cell.clientWidth,
			scroll: cell.scrollWidth,
			fits: cell.scrollWidth <= cell.clientWidth,
		}));
		cells.forEach((cell, index) => {
			cell.textContent = originals[index];
		});
		return {
			valor: "108",
			fits: result.every((cell) => cell.fits),
			cells: result,
		};
	});
}

async function capture(browser, baseUrl, directory) {
	fs.mkdirSync(directory, { recursive: true });
	const medidas = { nomeLongo: LONG_NAME, nomeLongoChars: LONG_NAME.length, cenarios: {} };
	const errors = [];

	const mobile = await prepareContext(
		browser,
		{ width: 390, height: 844 },
		true,
	);
	const mobilePage = await mobile.newPage();
	errors.push(...(await openSheet(mobilePage, baseUrl)));

	const phoneShots = [
		{ key: "390x844", width: 390, height: 844 },
		{ key: "360x800", width: 360, height: 800 },
	];
	for (const viewport of phoneShots) {
		await mobilePage.setViewportSize({
			width: viewport.width,
			height: viewport.height,
		});
		for (const name of [SHORT_NAME, LONG_NAME]) {
			await applySheet(mobilePage, "owner", name);
			const slug = name === SHORT_NAME ? "elara" : "nome-40";
			await shoot(
				mobilePage,
				path.join(directory, `${viewport.key}-${slug}.png`),
			);
			await openMenu(mobilePage);
			await shoot(
				mobilePage,
				path.join(directory, `${viewport.key}-${slug}-menu.png`),
			);
			await closeMenu(mobilePage);
			const fit = await measureHeaderFit(mobilePage);
			medidas.cabecalho = medidas.cabecalho ?? {};
			medidas.cabecalho[`${viewport.key}-${slug}`] = fit;
		}
		await applySheet(mobilePage, "viewer", SHORT_NAME);
		await openMenu(mobilePage);
		await shoot(
			mobilePage,
			path.join(directory, `${viewport.key}-jogador-menu.png`),
		);
		await closeMenu(mobilePage);
		medidas.cabecalho[`${viewport.key}-jogador`] = await measureHeaderFit(mobilePage);
		await applySheet(mobilePage, "owner", SHORT_NAME);
		medidas.cenarios[viewport.key] = await measure(mobilePage);
		if (viewport.key === "360x800") {
			medidas.digitos3 = await measureThreeDigits(mobilePage);
		}
	}

	await applySheet(mobilePage, "owner", SHORT_NAME);
	await mobilePage.setViewportSize({ width: 390, height: 844 });
	await mobilePage.evaluate(() => {
		localStorage.setItem("arkhiveon-performance-mode", "off");
		window.dispatchEvent(new Event("arkhiveon-performance-mode-change"));
	});
	await mobilePage.waitForTimeout(150);
	await shoot(
		mobilePage,
		path.join(directory, "390x844-elara-sem-perf-lite.png"),
	);
	medidas.semPerfLite = await mobilePage.evaluate(() => {
		const header = document.querySelector("[data-slot=sheet-header]");
		const glow = header?.querySelector(".blur-3xl");
		return {
			perfLite: document.documentElement.classList.contains("perf-lite"),
			glowDisplay: glow ? getComputedStyle(glow).display : null,
			headerShadow: header ? getComputedStyle(header).boxShadow : null,
		};
	});
	await mobilePage.evaluate(() => {
		localStorage.removeItem("arkhiveon-performance-mode");
		window.dispatchEvent(new Event("arkhiveon-performance-mode-change"));
	});
	await mobilePage.waitForTimeout(100);
	await mobilePage.evaluate(() => document.body.classList.remove("dark"));
	await mobilePage.waitForTimeout(100);
	await mobilePage.locator("[data-slot=sheet-header]").screenshot({
		path: path.join(directory, "light-cabecalho.png"),
	});
	medidas.lightStatColors = await mobilePage.evaluate(() =>
		[...document.querySelectorAll("[data-slot=sheet-header] dd")].map((node) => ({
			text: node.textContent?.trim() ?? "",
			color: getComputedStyle(node).color,
		})),
	);
	await mobilePage.evaluate(() => document.body.classList.add("dark"));
	await mobile.close();

	const desktop = await prepareContext(
		browser,
		{ width: 767, height: 1024 },
		false,
	);
	const desktopPage = await desktop.newPage();
	errors.push(...(await openSheet(desktopPage, baseUrl)));
	for (const viewport of [
		{ key: "767x1024", width: 767, height: 1024 },
		{ key: "768x1024", width: 768, height: 1024 },
	]) {
		await desktopPage.setViewportSize({
			width: viewport.width,
			height: viewport.height,
		});
		await applySheet(desktopPage, "owner", SHORT_NAME);
		await shoot(desktopPage, path.join(directory, `${viewport.key}.png`));
		medidas.cenarios[viewport.key] = await measure(desktopPage);
	}

	await desktopPage.setViewportSize({ width: 1440, height: 900 });
	for (const role of ["owner", "viewer"]) {
		const slug = role === "owner" ? "mestre" : "jogador";
		await applySheet(desktopPage, role, SHORT_NAME);
		await shoot(desktopPage, path.join(directory, `1440x900-${slug}.png`));
		medidas.cenarios[`1440x900-${slug}`] = await measure(desktopPage);
		medidas.cenarios[`1440x900-${slug}`].faixas = await saveStrips(
			desktopPage,
			directory,
			`1440x900-${slug}`,
		);
	}
	await desktop.close();

	medidas.errosDePagina = errors.map(safeText);
	fs.writeFileSync(
		path.join(directory, "medidas.json"),
		JSON.stringify(medidas, null, 2),
	);
	const phone = medidas.cenarios["390x844"];
	console.log(
		JSON.stringify({
			dir: directory,
			under44: phone.under44.length,
			headerUnder44: phone.headerUnder44,
			overflowX: phone.overflowX,
			nativeSelect: phone.nativeSelect,
			scrollH: phone.scrollH,
			erros: medidas.errosDePagina.length,
		}),
	);
	if (medidas.errosDePagina.length > 0) {
		throw new Error(medidas.errosDePagina[0]);
	}
}

function decodePng(buffer) {
	let offset = 8;
	let width = 0;
	let height = 0;
	let colorType = 0;
	const chunks = [];
	while (offset + 8 <= buffer.length) {
		const length = buffer.readUInt32BE(offset);
		const type = buffer.toString("ascii", offset + 4, offset + 8);
		const data = buffer.subarray(offset + 8, offset + 8 + length);
		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			colorType = data[9];
		} else if (type === "IDAT") {
			chunks.push(data);
		} else if (type === "IEND") {
			break;
		}
		offset += 12 + length;
	}
	const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
	if (!channels) throw new Error(`PNG color type ${colorType} não suportado`);
	const raw = zlib.inflateSync(Buffer.concat(chunks));
	const stride = width * channels;
	const pixels = Buffer.alloc(width * height * 4);
	let source = 0;
	let previous = Buffer.alloc(stride);
	const paeth = (left, up, upLeft) => {
		const estimate = left + up - upLeft;
		const leftDelta = Math.abs(estimate - left);
		const upDelta = Math.abs(estimate - up);
		const diagonal = Math.abs(estimate - upLeft);
		if (leftDelta <= upDelta && leftDelta <= diagonal) return left;
		if (upDelta <= diagonal) return up;
		return upLeft;
	};
	for (let y = 0; y < height; y += 1) {
		const filter = raw[source];
		source += 1;
		const row = Buffer.from(raw.subarray(source, source + stride));
		source += stride;
		for (let index = 0; index < stride; index += 1) {
			const left = index >= channels ? row[index - channels] : 0;
			const up = previous[index];
			const upLeft = index >= channels ? previous[index - channels] : 0;
			let value = row[index];
			if (filter === 1) value += left;
			else if (filter === 2) value += up;
			else if (filter === 3) value += Math.floor((left + up) / 2);
			else if (filter === 4) value += paeth(left, up, upLeft);
			row[index] = value & 255;
		}
		for (let x = 0; x < width; x += 1) {
			const from = x * channels;
			const to = (y * width + x) * 4;
			pixels[to] = row[from];
			pixels[to + 1] = row[from + 1];
			pixels[to + 2] = row[from + 2];
			pixels[to + 3] = channels === 4 ? row[from + 3] : 255;
		}
		previous = row;
	}
	return { width, height, pixels };
}

function diffFile(beforePath, afterPath) {
	const before = decodePng(fs.readFileSync(beforePath));
	const after = decodePng(fs.readFileSync(afterPath));
	if (before.width !== after.width || before.height !== after.height) {
		return {
			file: path.basename(beforePath),
			sameSize: false,
			before: { width: before.width, height: before.height },
			after: { width: after.width, height: after.height },
			changedPixels: null,
		};
	}
	let changed = 0;
	let minX = before.width;
	let minY = before.height;
	let maxX = 0;
	let maxY = 0;
	const total = before.width * before.height;
	for (let index = 0; index < total; index += 1) {
		const offset = index * 4;
		const distance =
			Math.abs(before.pixels[offset] - after.pixels[offset]) +
			Math.abs(before.pixels[offset + 1] - after.pixels[offset + 1]) +
			Math.abs(before.pixels[offset + 2] - after.pixels[offset + 2]);
		if (distance === 0) continue;
		changed += 1;
		const x = index % before.width;
		const y = Math.floor(index / before.width);
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	}
	return {
		file: path.basename(beforePath),
		sameSize: true,
		width: before.width,
		height: before.height,
		changedPixels: changed,
		box:
			changed === 0
				? null
				: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
	};
}

function diffDirectories(beforeDir, afterDir, outputPath) {
	const names = fs
		.readdirSync(afterDir)
		.filter((name) => name.endsWith(".png"))
		.filter((name) => fs.existsSync(path.join(beforeDir, name)))
		.filter(
			(name) =>
				name.startsWith("1440x900-") || name.startsWith("1440x900-mestre-faixa") || name.startsWith("1440x900-jogador-faixa"),
		);
	const results = names.map((name) =>
		diffFile(path.join(beforeDir, name), path.join(afterDir, name)),
	);
	const summary = {
		compared: results.length,
		results,
		changedPixelsTotal: results.reduce(
			(sum, item) => sum + (item.changedPixels || 0),
			0,
		),
	};
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
	console.log(
		JSON.stringify({
			compared: summary.compared,
			changedPixelsTotal: summary.changedPixelsTotal,
			files: results.map((item) => ({
				file: item.file,
				changedPixels: item.changedPixels,
				box: item.box,
				sameSize: item.sameSize,
			})),
		}),
	);
}

async function main() {
	if (LONG_NAME.length !== 40) {
		throw new Error(`O nome longo tem ${LONG_NAME.length} caracteres, não 40.`);
	}
	if (process.argv[2] === "--diff") {
		const beforeDir = process.argv[3];
		const afterDir = process.argv[4];
		const outputPath = process.argv[5];
		if (!beforeDir || !afterDir || !outputPath) {
			throw new Error("Uso: --diff <antes> <depois> <saida.json>");
		}
		diffDirectories(beforeDir, afterDir, outputPath);
		return;
	}
	const baseUrl = process.env.VTT_BASE_URL || "http://127.0.0.1:4173";
	const directory =
		process.env.FICHA_PREVIEW_OUT ||
		path.resolve("docs/previews/ficha-mobile/f1-cabecalho");
	const browser = await launchBrowser();
	try {
		await capture(browser, baseUrl, directory);
	} finally {
		await browser.close();
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error(safeText(error.stack || error.message));
		process.exitCode = 1;
	});
}

module.exports = {
	decodePng,
	launchBrowser,
	prepareContext,
	openSheet,
	applySheet,
	SHORT_NAME,
	LONG_NAME,
};
