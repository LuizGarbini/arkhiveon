const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
	const { preview } = await import("vite");
	const server = await preview({
		configLoader: "runner",
		preview: { host: "127.0.0.1", port: 4174, strictPort: true },
	});

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 1080 },
		deviceScaleFactor: 2,
	});

	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
	);

	const initialFactions = [
		{
			id: "patron-rosa-aco",
			worldId: "world-1",
			name: "Ordem da Rosa de Aço",
			kind: "patron",
			patronType: "Guilda Militar",
			leader: "Grão-Mestre Varik",
			seat: "Fortaleza Alta de Valir",
			goals: "Proteger as fronteiras contra a incursão abissal.",
			alignment: "Leal e Neutro",
			influence: "Continental",
			perks: "Acesso irrestrito a arsenais arcanos, alojamento de cavaleiros e suporte tático de batedores veteranos.",
			duties: "Atender ao chamado de defesa das muralhas e honrar o pacto da rosa.",
			description: "Uma renomada ordem militar de guerreiros juramentados e engenheiros de cerco.",
			imageUrl: "",
			createdAt: Date.now() - 100000,
		},
		{
			id: "culto-olho-prateado",
			worldId: "world-1",
			name: "Culto do Olho Prateado",
			kind: "cult_society",
			leader: "Oráculo Thalia",
			seat: "Catacumbas de Ilíria",
			goals: "Desvendar os segredos do cosmos e catalogar artefatos esquecidos.",
			alignment: "Neutro Verdadeiro",
			influence: "Oculto",
			perks: "Consultas divinatórias gratuitas e acesso a pergaminhos proibidos.",
			duties: "Guardar o segredo das relíquias encontradas.",
			description: "Sociedade secreta de arcanistas que manipulam o véu do destino.",
			imageUrl: "",
			createdAt: Date.now() - 90000,
		},
		{
			id: "casa-valerius",
			worldId: "world-1",
			name: "Casa Nobre Valerius",
			kind: "noble_house",
			leader: "Lorde Corvus Valerius",
			seat: "Cidadela de Ouro",
			goals: "Expandir o domínio mercantil marítimo.",
			alignment: "Leal e Mau",
			influence: "Imperial",
			perks: "Financiamento de expedições e imunidade jurídica nas cidades portuárias.",
			duties: "Tributo de 10% dos tesouros recuperados.",
			description: "A mais abastada e influente das casas nobres do arquipélago.",
			imageUrl: "",
			createdAt: Date.now() - 80000,
		},
	];

	const initialCharacter = {
		id: "char-1",
		campaignId: "demo-campaign",
		worldId: "world-1",
		characterName: "Kaelen Vane",
		className: "Paladino / Caçador de Relíquias",
		race: "Humano",
		level: 5,
		system: "dnd5e",
		health: 48,
		healthMax: 48,
		tempHealth: 0,
		armorClass: 18,
		initiative: 2,
		speed: 9,
		proficiencyBonus: 3,
		hitDice: "5d10",
		deathSaves: { successes: 0, failures: 0 },
		strength: 16,
		dexterity: 14,
		constitution: 15,
		intelligence: 10,
		wisdom: 12,
		charisma: 16,
		systemAttributes: {
			strength: 16,
			dexterity: 14,
			constitution: 15,
			intelligence: 10,
			wisdom: 12,
			charisma: 16,
		},
		savingThrows: "Sabedoria, Carisma",
		skills: "Atletismo, Percepção, Intimidação, História",
		languages: "Comum, Élfico, Celestial",
		proficiencies: "Armaduras pesadas, Todas as armas, Ferramentas de ferreiro",
		spellcastingClass: "Paladino",
		spellAbility: "charisma",
		spellSaveDc: 14,
		spellAttackBonus: 6,
		spells: "",
		spellSlots: "",
		equipment: "Espada Longa Forjada em Aço Estelar, Escudo de Aço, Placas Completas",
		currency: "150 PO, 45 PP",
		personalityTraits: "Disciplinado, mas obcecado por relíquias ancestrais.",
		ideals: "A honra da lâmina deve proteger os inocentes.",
		bonds: "👑 Ordem da Rosa de Aço (Patrono do Grupo) — Benefício: Acesso irrestrito a arsenais arcanos e suporte tático.",
		flaws: "Hesita em recuar mesmo quando superado numericamente.",
		notes: "Em missão para recuperar o Estandarte da Aurora.",
		imageUrl: "",
		familyRelations: [],
		entityLinks: [
			{
				id: "link-patron-1",
				entityKind: "faction",
				entityId: "patron-rosa-aco",
				label: "Ordem da Rosa de Aço",
				note: "Patrono do Grupo (Guilda Militar)",
			},
		],
		sheetLayout: {
			template: "dnd5e",
			columns: 2,
			modules: [
				{
					id: "mod-abilities",
					kind: "abilities",
					title: "Atributos",
					enabled: true,
					order: 10,
					column: "main",
				},
				{
					id: "mod-combat",
					kind: "combat",
					title: "Combate",
					enabled: true,
					order: 20,
					column: "main",
				},
				{
					id: "mod-connections",
					kind: "connections",
					title: "Conexões",
					enabled: true,
					order: 10,
					column: "side",
					fields: ["entityLinks"],
				},
				{
					id: "mod-personality",
					kind: "personality",
					title: "Personalidade & História",
					enabled: true,
					order: 20,
					column: "side",
				},
			],
		},
		createdAt: Date.now() - 50000,
	};

	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
	});

	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (err) => errors.push(err.message));

	await page.goto("http://127.0.0.1:4174/sheets/char-1", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});

	// Wait for store to be available
	await page.waitForFunction(() => typeof window.__rpg_store__ !== "undefined", {
		timeout: 15000,
	});

	// Seed store state
	await page.evaluate(
		({ character, factions }) => {
			window.__rpg_store__.setState({
				campaigns: [
					{
						id: "demo-campaign",
						name: "Crônicas de Valir",
						ownerId: "preview-gm-user",
						myRole: "owner",
						system: "dnd5e",
						worldId: "world-1",
					},
				],
				activeCampaignId: "demo-campaign",
				worlds: [
					{
						id: "world-1",
						name: "Reino de Valir",
						isDefault: true,
						ownerUserId: "preview-gm-user",
						createdAt: Date.now(),
					},
				],
				activeWorldId: "world-1",
				characters: [character],
				factions: factions,
				isLoadingRemote: false,
				hasLoadedCampaigns: true,
				campaignLoadStatus: "ready",
			});
		},
		{ character: initialCharacter, factions: initialFactions },
	);

	// Wait for character sheet to re-render with seeded character
	await page.waitForSelector("text=Kaelen Vane", { timeout: 10000 });
	await page.waitForSelector("text=Conexões", { timeout: 10000 });
	await page.waitForTimeout(1000);

	const outputDir = path.resolve("docs/previews");
	fs.mkdirSync(outputDir, { recursive: true });

	// Scroll Conexões module into view
	await page.locator("[data-module-kind='connections']").scrollIntoViewIfNeeded();
	await page.waitForTimeout(500);

	// Capture sheet view with Conexões module
	const sheetPreviewPath = path.join(outputDir, "conexoes-ficha.png");
	await page.screenshot({ path: sheetPreviewPath, fullPage: false });
	console.log("Saved sheet preview to:", sheetPreviewPath);

	// Capture close-up of the Conexões module card
	const connectionsCard = page.locator("[data-module-kind='connections']").first();
	const cardPreviewPath = path.join(outputDir, "modulo-conexoes-card.png");
	await connectionsCard.screenshot({ path: cardPreviewPath });
	console.log("Saved card preview to:", cardPreviewPath);

	// Click "+ Puxar Patrono / Facção"
	const pullButton = page
		.locator("button:has-text('Puxar Patrono / Facção')")
		.first();
	await pullButton.click();

	// Wait for dialog
	await page.waitForSelector("text=Puxar Patrono ou Facção", {
		timeout: 5000,
	});
	await page.waitForTimeout(600);

	// Select the second faction to show the connection note footer
	const cultCard = page.locator("button:has-text('Culto do Olho Prateado')");
	if ((await cultCard.count()) > 0) {
		await cultCard.click();
		await page.waitForTimeout(400);
	}

	// Capture modal preview
	const modalPreviewPath = path.join(outputDir, "modal-puxar-patrono.png");
	await page.screenshot({ path: modalPreviewPath });
	console.log("Saved modal preview to:", modalPreviewPath);

	await browser.close();
	await new Promise((resolve) => server.httpServer.close(resolve));
	console.log("Screenshots captured successfully!");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
