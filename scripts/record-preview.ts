import { chromium } from "playwright";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

async function isServerRunning(url: string): Promise<boolean> {
	try {
		const res = await fetch(url, { method: "GET" });
		return res.status < 500;
	} catch {
		return false;
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

	let devProcess: any = null;
	const port = 3000;
	const baseUrl = `http://127.0.0.1:${port}`;
	const devUrl = `${baseUrl}/campaigns/demo-tabletop/vtt`;

	// 1. Ensure local Vite server is running (use vite preview for instant 5ms loading)
	const alreadyRunning = await isServerRunning(baseUrl);
	if (!alreadyRunning) {
		console.log("⚡ Iniciando servidor local instantâneo (Vite Preview)...");
		devProcess = spawn("npx", ["vite", "preview", "--port", `${port}`, "--host", "127.0.0.1"], {
			shell: true,
			stdio: "ignore",
		});

		for (let i = 0; i < 30; i++) {
			await new Promise((r) => setTimeout(r, 400));
			if (await isServerRunning(baseUrl)) {
				console.log("✅ Servidor local pronto!");
				break;
			}
		}
	} else {
		console.log("✅ Servidor já em execução em " + baseUrl);
	}

	console.log("🎬 Iniciando gravação de demonstração completa com Playwright...");
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1280, height: 720 },
		recordVideo: {
			dir: outputDir,
			size: { width: 1280, height: 720 },
		},
	});

	const page = await context.newPage();

	try {
		console.log(`🌐 Navegando para o VTT: ${devUrl}...`);
		await page.goto(devUrl, { waitUntil: "commit", timeout: 20000 });
		await page.waitForTimeout(2000);

		// Seed rich demo tabletop data
		console.log("🎲 Injetando dados de demonstração (Cena, Presença Realtime, Tokens)...");
		await page.evaluate(() => {
			const vttStore = (window as any).__vtt_store__?.getState();
			const rpgStore = (window as any).__rpg_store__?.getState();

			if (rpgStore) {
				rpgStore.setCampaigns?.([
					{
						id: "demo-tabletop",
						name: "A Forja dos Deuses",
						description: "Campanha Épica de Demonstração",
						ownerId: "gm-user",
						myRole: "owner",
					},
				]);
			}

			if (vttStore) {
				vttStore.setIsGM(true);
				vttStore.setScenes([
					{
						id: "scene-1",
						campaignId: "demo-tabletop",
						name: "Caverna dos Dragões",
						gridType: "hex_pointy",
						gridSize: 75,
						gridColor: "#38bdf8",
						gridOpacity: 0.35,
						gridScaleDistance: 1.5,
						gridScaleUnit: "m",
						width: 3200,
						height: 2400,
						isActive: true,
						orderIndex: 0,
					},
					{
						id: "scene-2",
						campaignId: "demo-tabletop",
						name: "Taverna do Javali",
						gridType: "square",
						gridSize: 70,
						gridColor: "#ffffff",
						gridOpacity: 0.25,
						gridScaleDistance: 1.5,
						gridScaleUnit: "m",
						width: 3000,
						height: 2000,
						isActive: false,
						orderIndex: 1,
					},
				]);
				vttStore.setActiveSceneId("scene-1");

				// Seed Online Users
				vttStore.setOnlineUsers([
					{
						userId: "gm-user",
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
					{
						userId: "player-2",
						userName: "Lyra (Maga)",
						color: "#22c55e",
						isGM: false,
						onlineAt: Date.now(),
					},
				]);

				// Seed Tokens
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
						hpCurrent: 42,
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
						id: "token-2",
						sceneId: "scene-1",
						name: "Lyra Moonshadow",
						layer: "token",
						x: 600,
						y: 480,
						sizeCells: 1,
						rotation: 0,
						hpCurrent: 24,
						hpMax: 28,
						elevation: 0,
						conditions: [],
						auras: [],
						visionRange: 6,
						isLocked: false,
						isHidden: false,
						controlledBy: ["player-2"],
					},
					{
						id: "token-3",
						sceneId: "scene-1",
						name: "Dragão Vermelho Jovem",
						layer: "token",
						x: 825,
						y: 390,
						sizeCells: 2,
						rotation: 0,
						hpCurrent: 85,
						hpMax: 110,
						elevation: 3,
						conditions: ["burning"],
						auras: [{ radius: 3, color: "#ef4444", opacity: 0.25 }],
						visionRange: 10,
						isLocked: false,
						isHidden: false,
						controlledBy: [],
					},
				]);

				// Seed remote cursor
				vttStore.setRemoteCursor({
					userId: "player-2",
					userName: "Lyra (Maga)",
					color: "#22c55e",
					x: 750,
					y: 420,
					timestamp: Date.now(),
				});
			}
		});

		await page.waitForTimeout(1500);

		// --- ACTION 1: Test Presence Bar & Change User Color ---
		console.log("🎨 Testando Presence Bar e seletor de cor...");
		const colorTrigger = page.locator("button[title*='Alterar Minha Cor']").first();
		if (await colorTrigger.isVisible()) {
			await colorTrigger.click();
			await page.waitForTimeout(800);
			const colorOption = page.locator(".grid button").nth(2);
			if (await colorOption.isVisible()) {
				await colorOption.click();
			}
			await page.waitForTimeout(800);
		}

		// --- ACTION 2: Test Tactical Ping on Canvas ---
		console.log("📍 Testando Ping Tático animado no Canvas...");
		const pingButton = page.locator("button[title*='Ping']").first();
		if (await pingButton.isVisible()) {
			await pingButton.click();
			await page.waitForTimeout(500);
			await page.mouse.click(700, 380);
			await page.waitForTimeout(1500);
		}

		// --- ACTION 3: Test Ruler Tool ---
		console.log("📏 Testando Régua de Medição em Tempo Real...");
		const rulerButton = page.locator("button[title*='Régua']").first();
		if (await rulerButton.isVisible()) {
			await rulerButton.click();
			await page.waitForTimeout(500);
			await page.mouse.move(525, 390);
			await page.mouse.down();
			await page.mouse.move(825, 390, { steps: 20 });
			await page.waitForTimeout(1200);
			await page.mouse.up();
			await page.waitForTimeout(600);
		}

		// Switch back to select tool
		const selectButton = page.locator("button[title*='Selecionar']").first();
		if (await selectButton.isVisible()) {
			await selectButton.click();
			await page.waitForTimeout(500);
		}

		// --- ACTION 4: Test Token Dragging with Magnetic Snap ---
		console.log("♟️ Testando Movimentação e Snap Magnético de Tokens...");
		await page.mouse.move(525, 390);
		await page.mouse.down();
		await page.mouse.move(675, 450, { steps: 25 });
		await page.waitForTimeout(600);
		await page.mouse.up();
		await page.waitForTimeout(1000);

		// --- ACTION 5: Test Token Quick Action Menu (HP, Status, Elevation) ---
		console.log("⚡ Testando Menu Contextual de Token e Barra de Vida...");
		await page.evaluate(() => {
			const vttStore = (window as any).__vtt_store__?.getState();
			if (vttStore) {
				vttStore.setActiveTokenIdForMenu("token-1");
			}
		});
		await page.waitForTimeout(1000);

		// Click damage button "-5"
		const damageBtn = page.locator("button:has-text('-5')").first();
		if (await damageBtn.isVisible()) {
			await damageBtn.click();
			await page.waitForTimeout(600);
			await damageBtn.click();
			await page.waitForTimeout(800);
		}

		// Toggle a condition badge
		const condBadge = page.locator("button:has-text('Envenenado')").first();
		if (await condBadge.isVisible()) {
			await condBadge.click();
			await page.waitForTimeout(800);
		}

		// Close menu
		const closeMenuBtn = page.locator("button[title*='Fechar Menu']").first();
		if (await closeMenuBtn.isVisible()) {
			await closeMenuBtn.click();
			await page.waitForTimeout(500);
		}

		// --- ACTION 6: Test Roster Spawner Drawer ---
		console.log("👥 Testando Drawer de Bestiário e Spawner de Tokens...");
		const rosterBtn = page.locator("button:has-text('Personagens & NPCs')").first();
		if (await rosterBtn.isVisible()) {
			await rosterBtn.click();
			await page.waitForTimeout(1200);

			const monsterTab = page.locator("button:has-text('Criar Monstro')").first();
			if (await monsterTab.isVisible()) {
				await monsterTab.click();
				await page.waitForTimeout(800);
			}

			await page.waitForTimeout(1000);
			await rosterBtn.click(); // Close drawer
			await page.waitForTimeout(800);
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

		if (devProcess) {
			try {
				devProcess.kill();
			} catch {}
		}

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
