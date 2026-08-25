import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { preview } from "vite";

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
	const baseUrl = `http://127.0.0.1:${port}`;
	const devUrl = `${baseUrl}/campaigns/demo-tabletop/vtt`;

	console.log(`⚡ Iniciando servidor Vite Preview nativo na porta ${port}...`);
	const previewServer = await preview({
		preview: {
			port,
			host: "127.0.0.1",
		},
	});
	console.log("✅ Servidor Vite Preview pronto!");

	console.log("🎬 Iniciando gravação de demonstração completa com Playwright...");
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 720 },
		recordVideo: {
			dir: outputDir,
			size: { width: 1280, height: 720 },
		},
	});

	// Inject authentication and campaign state before any script execution
	await context.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem(
			"rpg-notes-storage",
			JSON.stringify({
				state: {
					campaigns: [
						{
							id: "demo-tabletop",
							name: "A Forja dos Deuses",
							description: "Campanha Épica de Demonstração",
							ownerId: "preview-gm-user",
							myRole: "owner",
						},
					],
					activeCampaignId: "demo-tabletop",
					hasLoadedCampaigns: true,
					campaignLoadStatus: "ready",
				},
				version: 0,
			}),
		);
	});

	const page = await context.newPage();

	try {
		console.log(`🌐 Navegando para o VTT autenticado: ${devUrl}...`);
		await page.goto(devUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
		await page.waitForFunction(() => (window as any).__vtt_store__ !== undefined, { timeout: 30000 }).catch(() => {});
		await page.waitForTimeout(2500);

		// Seed rich demo tabletop data
		console.log("🎲 Injetando dados de demonstração no VTT (Cena com Névoa, GM Layer, Tokens)...");
		await page.evaluate(() => {
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
					gridColor: "#ffffff",
					gridOpacity: 0.25,
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

			// Seed initial fog reveal path around player start
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

			// Seed Online Users
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

			// Seed Tokens (Player tokens & GM secret layer tokens)
			vttStore.setTokens([
				{
					id: "token-1",
					sceneId: "scene-1",
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
		});

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

		// --- ACTION 4: Switch to GM Layer & Select GM Token ---
		console.log("🛡️ Testando Camada do Mestre (GM Layer) e revelação de segredo...");
		const gmLayerBtn = page.locator("button[title*='Mestre']").first();
		if (await gmLayerBtn.isVisible()) {
			await gmLayerBtn.click();
			await page.waitForTimeout(800);
		}

		// Switch back to select tool
		const selectBtn = page.locator("button[title*='Selecionar']").first();
		if (await selectBtn.isVisible()) {
			await selectBtn.click();
			await page.waitForTimeout(600);
		}

		// Open GM Token Menu
		await page.evaluate(() => {
			const vttStore = (window as any).__vtt_store__?.getState();
			if (vttStore) {
				vttStore.setActiveTokenIdForMenu("token-gm-2");
			}
		});
		await page.waitForTimeout(1000);

		// Click "Mover para Camada de Jogadores"
		const moveLayerBtn = page.locator("button[title*='Mover para Camada de Jogadores']").first();
		if (await moveLayerBtn.isVisible()) {
			await moveLayerBtn.click();
			await page.waitForTimeout(800);
		}

		// Close token menu
		const closeMenuBtn = page.locator("button[title*='Fechar Menu']").first();
		if (await closeMenuBtn.isVisible()) {
			await closeMenuBtn.click();
			await page.waitForTimeout(600);
		}

		// Take Final High-Res Screenshot
		const screenshotPath = path.join(outputDir, "latest-preview.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`📸 Screenshot de alta resolução salva: ${screenshotPath}`);

		await page.waitForTimeout(2000);
	} catch (err) {
		console.warn("⚠️ Aviso durante gravação:", err);
	} finally {
		await page.close();
		await context.close();
		await browser.close();

		try {
			await previewServer.close();
		} catch {}

		const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".webm"));
		if (files.length > 0) {
			const originalVideoPath = path.join(outputDir, files[0]);
			const cleanVideoPath = path.join(outputDir, "latest-preview.webm");
			if (originalVideoPath !== cleanVideoPath) {
				fs.renameSync(originalVideoPath, cleanVideoPath);
			}
			console.log(`\n✨ Vídeo de demonstração inteligente gravado com sucesso!`);
			console.log(`📁 Arquivo: ${cleanVideoPath}`);
			console.log(
				"💡 Dica: Arraste e solte o arquivo acima direto na caixa de texto da PR no GitHub!\n",
			);
		}
	}
}

void recordPreview();
