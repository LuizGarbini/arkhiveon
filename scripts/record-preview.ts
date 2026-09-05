import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { preview } from "vite";

function seedDemoVtt(viewport = { x: 180, y: 50, scale: 1 }) {
	const vttStore = (window as any).__vtt_store__?.getState();
	if (!vttStore) return;

	vttStore.setIsGM(true);
	vttStore.setScenes([
		{
			id: "scene-1",
			campaignId: "demo-tabletop",
			name: "Masmorra Antiga dos Titãs",
			gridType: "square",
			gridSize: 70,
			gridColor: "#c4b5fd",
			gridOpacity: 0.45,
			gridScaleDistance: 1.5,
			gridScaleUnit: "m",
			width: 3200,
			height: 2400,
			fogEnabled: true,
			fogExploration: true,
			isActive: true,
			orderIndex: 0,
		},
	]);
	vttStore.setActiveSceneId("scene-1");
	vttStore.setViewport(viewport);

	vttStore.setFogPaths([
		{
			id: "fog-start-1",
			type: "circle",
			mode: "reveal",
			x: 525,
			y: 390,
			radius: 160,
		},
	]);

	vttStore.setOnlineUsers([
		{
			userId: "preview-gm-user",
			userName: "Mestre (Você)",
			color: "#a855f7",
			isGM: true,
			onlineAt: Date.now(),
		},
		{
			userId: "player-1",
			userName: "Arthur (Paladino)",
			color: "#38bdf8",
			isGM: false,
			onlineAt: Date.now(),
		},
	]);

	vttStore.setTokens([
		{
			id: "token-1",
			sceneId: "scene-1",
			characterId: "char-arthur",
			name: "Arthur Pendelton",
			layer: "token",
			x: 525,
			y: 390,
			sizeCells: 1,
			rotation: 0,
			hpCurrent: 45,
			hpMax: 50,
			elevation: 0,
			conditions: [],
			auras: [{ radius: 2, color: "#38bdf8", opacity: 0.2 }],
			visionRange: 6,
			isLocked: false,
			isHidden: false,
			controlledBy: ["player-1"],
		},
		{
			id: "token-gm-1",
			sceneId: "scene-1",
			name: "Armadilha de Espinhos (Oculta)",
			layer: "gm",
			x: 735,
			y: 390,
			sizeCells: 1,
			rotation: 0,
			hpCurrent: 10,
			hpMax: 10,
			elevation: 0,
			conditions: [],
			auras: [],
			visionRange: 0,
			isLocked: true,
			isHidden: false,
			controlledBy: [],
		},
		{
			id: "token-gm-2",
			sceneId: "scene-1",
			name: "Espectro das Sombras (Emboscada)",
			layer: "gm",
			x: 875,
			y: 460,
			sizeCells: 1.5,
			rotation: 0,
			hpCurrent: 35,
			hpMax: 35,
			elevation: 1.5,
			conditions: ["invisivel"],
			auras: [{ radius: 2, color: "#a855f7", opacity: 0.25 }],
			visionRange: 8,
			isLocked: false,
			isHidden: false,
			controlledBy: [],
		},
	]);

	const rpgStore = (window as any).__rpg_store__;
	if (rpgStore?.setState) {
		rpgStore.setState({
			characters: [
				{
					id: "char-arthur",
					system: "dnd5e",
					characterName: "Arthur Pendelton",
					class: "Paladino",
					level: 5,
					strength: 16,
					dexterity: 10,
					constitution: 14,
					intelligence: 8,
					wisdom: 12,
					charisma: 16,
					health: 45,
					healthMax: 50,
					armorClass: 18,
					speed: 9,
					sheetLayout: { template: "dnd5e", modules: [] },
				},
			],
		});
	}
}

async function recordPreview() {
	const outputDir = path.resolve(process.cwd(), "docs/previews");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	} else {
		const existingFiles = fs.readdirSync(outputDir);
		for (const file of existingFiles) {
			try {
				fs.unlinkSync(path.join(outputDir, file));
			} catch {}
		}
	}

	const port = 4173;
	console.log(`⚡ Iniciando servidor Vite Preview nativo na porta ${port}...`);
	const previewServer = await preview({
		preview: {
			port,
			host: "127.0.0.1",
			strictPort: false,
		},
	});
	const previewOrigin =
		previewServer.resolvedUrls?.local?.[0]?.replace(/\/$/, "") ??
		`http://127.0.0.1:${port}`;
	const vttUrl = `${previewOrigin}/campaigns/demo-tabletop/vtt`;
	console.log(`✅ Servidor Vite Preview pronto em ${previewOrigin}`);

	console.log("🎬 Iniciando gravação do VTT com Playwright...");
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1366, height: 820 },
		recordVideo: {
			dir: outputDir,
			size: { width: 1366, height: 820 },
		},
	});

	// Inject rich mock campaign data
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem(
			"arkhiveon-storage",
			JSON.stringify({
				state: {
					activeCampaignId: "demo-tabletop",
					campaigns: [
						{
							id: "demo-tabletop",
							name: "A Forja dos Deuses",
							description:
								"Uma crônica sombria onde relíquias arcanas despertam nas profundezas de Valência.",
							myRole: "owner",
						},
					],
				},
				version: 2,
			}),
		);
		localStorage.setItem(
			"rpg-notes-storage",
			JSON.stringify({
				state: {
					campaigns: [
						{
							id: "demo-tabletop",
							name: "A Forja dos Deuses",
							description:
								"Uma crônica sombria onde relíquias arcanas despertam nas profundezas de Valência. O destino do reino repousa nas mãos da guilda.",
							system: "ordem",
							ownerId: "preview-gm-user",
							myRole: "owner",
						},
					],
					activeCampaignId: "demo-tabletop",
					hasLoadedCampaigns: true,
					campaignLoadStatus: "ready",
					characters: [
						{
							id: "c1",
							campaignId: "demo-tabletop",
							characterName: "Carrara",
							playerName: "Gabriel Arroyo",
							class: "Especialista",
							race: "Investigador",
							level: 7,
							health: 48,
							healthMax: 48,
							armorClass: 16,
							initiative: 3,
							speed: 9,
							imageUrl:
								"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
						},
						{
							id: "c2",
							campaignId: "demo-tabletop",
							characterName: 'Moura "Fênix" Carvalho',
							playerName: "Luiz Garbini",
							class: "Combatente",
							race: "Operações Especiais",
							level: 7,
							health: 72,
							healthMax: 84,
							armorClass: 18,
							initiative: 2,
							speed: 9,
							imageUrl:
								"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
						},
						{
							id: "c3",
							campaignId: "demo-tabletop",
							characterName: "Elysia Corvo",
							playerName: "Helena Prado",
							class: "Ocultista",
							race: "Graduado",
							level: 6,
							health: 32,
							healthMax: 38,
							armorClass: 13,
							initiative: 1,
							speed: 9,
							imageUrl:
								"https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
						},
						{
							id: "c4",
							campaignId: "demo-tabletop",
							characterName: "Kaelen Vane",
							playerName: "Lucas Mendes",
							class: "Infiltrador",
							race: "Sobrevivente",
							level: 6,
							health: 41,
							healthMax: 50,
							armorClass: 15,
							initiative: 4,
							speed: 12,
							imageUrl:
								"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
						},
					],
					npcs: [
						{
							id: "n1",
							campaignId: "demo-tabletop",
							name: "Valerius, o Herege",
							role: "Líder de Seita",
							race: "Humano",
							importance: "boss",
							disposition: "hostile",
							isAlive: true,
						},
						{
							id: "n2",
							campaignId: "demo-tabletop",
							name: "Comandante Verena",
							role: "Líder da Ordem Local",
							race: "Humano",
							importance: "major",
							disposition: "friendly",
							isAlive: true,
						},
					],
					sessions: [
						{
							id: "s1",
							campaignId: "demo-tabletop",
							sessionNumber: 12,
							title: "O Ritual no Observatório Esquecido",
							date: "2026-08-15",
							inGameDate: "14 de Outono, Ano 412",
							summary:
								"O grupo invadiu o observatório selado a tempo de conter a primeira fase da invocação. Elysia decifrou o glifo de contenção enquanto Moura e Carrara seguravam os cultistas nas escadarias.",
							cliffhanger:
								"O sino da torre começou a dobrar sozinho e uma névoa púrpura cobriu os arredores.",
						},
					],
					quests: [
						{
							id: "q1",
							campaignId: "demo-tabletop",
							title: "Conter o Despertar do Observatório",
							category: "main",
							status: "active",
							description:
								"Investigar as anomalias dimensionais e selar a fenda antes do solstício.",
							giverNpcName: "Comandante Verena",
						},
						{
							id: "q2",
							campaignId: "demo-tabletop",
							title: "Recuperar o Tomo de Selamento",
							category: "secondary",
							status: "active",
							description:
								"Localizar as páginas arrancadas na biblioteca subterrânea.",
						},
					],
					items: [
						{
							id: "i1",
							campaignId: "demo-tabletop",
							name: "Lâmina Rúnica da Aurora",
							type: "Arma Mágica",
							rarity: "very_rare",
							equipped: true,
							owner: "Moura",
						},
						{
							id: "i2",
							campaignId: "demo-tabletop",
							name: "Amuleto de Proteção Mental",
							type: "Acessório",
							rarity: "rare",
							equipped: true,
							owner: "Carrara",
						},
					],
					partyLoot: [
						{
							id: "pl1",
							campaignId: "demo-tabletop",
							name: "3x Poções de Vitalidade Maior",
							quantity: 3,
							notes: "Recuperadas no cofre do observatório",
						},
						{
							id: "pl2",
							campaignId: "demo-tabletop",
							name: "Grimório com Glifos Antigos",
							quantity: 1,
							notes: "Aguardando tradução por Elysia",
						},
					],
				},
				version: 0,
			}),
		);
	});

	const page = await context.newPage();

	try {
		console.log(`🌐 Navegando para o VTT autenticado: ${vttUrl}...`);
		await page.goto(vttUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
		await page.waitForFunction(() => (window as any).__vtt_store__ !== undefined, { timeout: 30000 }).catch(() => {});
		await page.waitForTimeout(2500);

		// Seed rich demo tabletop data
		console.log("🎲 Injetando dados de demonstração no VTT (Cena com Névoa, GM Layer, Tokens)...");
		await page.evaluate(seedDemoVtt);

		await page.waitForTimeout(1500);

		// --- ACTION 1: Test Fog of War Tool & Open VTTFogControls ---
		console.log("🌫️ Testando Ferramenta de Névoa de Guerra e Painel de Controles...");
		const fogToolBtn = page.locator("button[title*='Névoa']").first();
		if (await fogToolBtn.isVisible()) {
			await fogToolBtn.click();
			await page.waitForTimeout(1000);
		}

		// --- ACTION 2: Paint Freehand Fog Reveal (Brush Tool) ---
		console.log("🖌️ Pintando caminho com Pincel Livre para Revelar Névoa...");
		await page.mouse.move(525, 390);
		await page.mouse.down();
		await page.mouse.move(630, 390, { steps: 10 });
		await page.mouse.move(735, 390, { steps: 10 });
		await page.mouse.move(800, 420, { steps: 10 });
		await page.waitForTimeout(500);
		await page.mouse.up();
		await page.waitForTimeout(1200);

		// --- ACTION 3: Switch to Rect Shape and Reveal Chamber ---
		console.log("⬛ Revelando sala retangular com ferramenta de Retângulo...");
		const rectBtn = page.locator("button:has-text('Retângulo')").first();
		if (await rectBtn.isVisible()) {
			await rectBtn.click();
			await page.waitForTimeout(600);

			await page.mouse.move(800, 320);
			await page.mouse.down();
			await page.mouse.move(1020, 520, { steps: 15 });
			await page.waitForTimeout(600);
			await page.mouse.up();
			await page.waitForTimeout(1200);
		}

		// --- ACTION 4: Ruler with scale ticks ---
		console.log("📏 Testando régua de medição com marcadores de escala...");
		const rulerBtn = page.locator("button[title*='Régua']").first();
		if (await rulerBtn.isVisible()) {
			await rulerBtn.click();
			await page.waitForTimeout(400);
			await page.mouse.move(520, 400);
			await page.mouse.down();
			await page.mouse.move(820, 520, { steps: 12 });
			await page.waitForTimeout(800);
			await page.mouse.up();
			await page.waitForTimeout(600);
		}

		// --- ACTION 5: Spell template cone ---
		console.log("✨ Testando molde de cone de magia...");
		const templateBtn = page.locator("button[title*='Moldes']").first();
		if (await templateBtn.isVisible()) {
			await templateBtn.click();
			await page.waitForTimeout(500);
			const coneBtn = page.locator("button:has-text('Cone 60')").first();
			if (await coneBtn.isVisible()) {
				await coneBtn.click();
			}
			await page.mouse.move(525, 400);
			await page.mouse.down();
			await page.mouse.move(780, 280, { steps: 12 });
			await page.waitForTimeout(700);
			await page.mouse.up();
			await page.waitForTimeout(800);
		}

		// --- ACTION 6: Radial token menu + character sheet drawer ---
		console.log("🎯 Abrindo menu radial e gaveta de ficha...");
		const selectBtn = page.locator("button[title*='Selecionar']").first();
		if (await selectBtn.isVisible()) {
			await selectBtn.click();
			await page.waitForTimeout(400);
		}

		await page.evaluate(() => {
			const vttStore = (window as any).__vtt_store__?.getState();
			if (vttStore) {
				vttStore.setActiveTool("select");
				vttStore.setActiveTokenIdForMenu("token-1");
			}
		});
		await page.waitForTimeout(900);

		const sheetBtn = page.locator("button[title='Ficha']").first();
		if (await sheetBtn.isVisible()) {
			await sheetBtn.click();
			await page.waitForTimeout(1200);
			const rollFor = page.locator("button:has-text('FOR')").first();
			if (await rollFor.isVisible()) {
				await rollFor.click();
				await page.waitForTimeout(1800);
			}
		}

		const closeMenuBtn = page.locator("button[title='Fechar']").first();
		if (await closeMenuBtn.isVisible()) {
			await closeMenuBtn.click();
			await page.waitForTimeout(400);
		}

		// Retorna suavemente ao topo
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
		await page.waitForTimeout(1500);

		await page.evaluate(() => {
			const vttStore = (window as any).__vtt_store__?.getState();
			vttStore?.setActiveTokenIdForMenu(null);
			vttStore?.setShowCharacterSheetId(null);
			vttStore?.setShowFogControls(false);
			vttStore?.setShowTemplateControls(false);
			vttStore?.setActiveTool("select");
		});
		await page.waitForTimeout(400);

		// Captura screenshot em alta resolução
		const screenshotPath = path.join(outputDir, "latest-preview.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`📸 Screenshot de alta resolução salva: ${screenshotPath}`);
		await context.close();

		console.log("📱 Capturando HUD no viewport mobile...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
		});
		await mobileContext.addInitScript(() => {
			localStorage.setItem("arkhiveon_preview_auth", "true");
			localStorage.setItem(
				"arkhiveon-storage",
				JSON.stringify({
					state: {
						activeCampaignId: "demo-tabletop",
						campaigns: [
							{
								id: "demo-tabletop",
								name: "A Forja dos Deuses",
								myRole: "owner",
							},
						],
					},
					version: 2,
				}),
			);
		});
		const mobilePage = await mobileContext.newPage();
		await mobilePage.goto(vttUrl, {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		await mobilePage
			.waitForFunction(
				() => (window as any).__vtt_store__ !== undefined,
				{ timeout: 30000 },
			)
			.catch(() => {});
		await mobilePage.evaluate(seedDemoVtt, {
			x: -330,
			y: 80,
			scale: 1,
		});
		await mobilePage.waitForTimeout(2500);
		await mobilePage.screenshot({
			path: path.join(outputDir, "latest-preview-mobile.png"),
			fullPage: false,
		});
		await mobilePage.evaluate(() => {
			(window as any).__vtt_store__
				?.getState()
				?.setActiveTokenIdForMenu("token-1");
		});
		await mobilePage.waitForTimeout(700);
		await mobilePage.screenshot({
			path: path.join(outputDir, "latest-preview-mobile-menu.png"),
			fullPage: false,
		});
		await mobileContext.close();
		console.log("📸 Screenshots mobile salvas.");
	} catch (err) {
		console.error("❌ Erro durante gravação de demonstração:", err);
	} finally {
		try {
			await context.close();
		} catch {}
		try {
			await browser.close();
		} catch {}

		try {
			await previewServer.close();
		} catch {}
	}

	// 5. Rename generated video
	const files = fs.readdirSync(outputDir);
	const videoFile = files.find((f) => f.endsWith(".webm"));
	if (videoFile && videoFile !== "latest-preview.webm") {
		const oldPath = path.join(outputDir, videoFile);
		const newPath = path.join(outputDir, "latest-preview.webm");
		if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
		fs.renameSync(oldPath, newPath);
	}

	console.log("\n✨ Vídeo de demonstração do VTT gravado com sucesso!");
	console.log(`📁 Arquivo: ${path.join(outputDir, "latest-preview.webm")}`);
}

recordPreview().catch((err) => {
	console.error(err);
	process.exit(1);
});
