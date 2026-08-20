import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

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
	const devUrl = `${baseUrl}/dashboard`;

	// 1. Ensure local Vite server is running
	const alreadyRunning = await isServerRunning(baseUrl);
	if (!alreadyRunning) {
		console.log("⚡ Iniciando servidor local (Vite Preview)...");
		devProcess = spawn(
			"npx",
			["vite", "preview", "--port", `${port}`, "--host", "127.0.0.1"],
			{
				shell: true,
				stdio: "ignore",
			},
		);

		for (let i = 0; i < 30; i++) {
			await new Promise((r) => setTimeout(r, 400));
			if (await isServerRunning(baseUrl)) {
				console.log("✅ Servidor local pronto!");
				break;
			}
		}
	} else {
		console.log(`✅ Servidor já em execução em ${baseUrl}`);
	}

	console.log("🎬 Iniciando gravação do Dashboard com Playwright...");
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
		console.log(`🌐 Navegando para o Dashboard: ${devUrl}...`);
		await page.goto(devUrl, {
			waitUntil: "domcontentloaded",
			timeout: 25000,
		});
		await page.waitForTimeout(2000);

		// 1. Apresentação do Topo: Banner Discord com Dithering Shader
		console.log("🎮 Interagindo com o Banner Discord (Dither Shader)...");
		const discordBanner = page.locator(
			'aside[aria-label="Comunidade Discord"]',
		);
		if (await discordBanner.isVisible()) {
			await discordBanner.hover();
			await page.waitForTimeout(1000);
			const discordBtn = discordBanner.locator("a");
			await discordBtn.hover();
			await page.waitForTimeout(800);
		}

		// 2. Demonstração do Hero Card e Micro-interações de Hover
		console.log("✨ Testando Hero Card e Metric Cards com transitions.dev...");
		const header = page.locator("header");
		await header.hover();
		await page.waitForTimeout(800);

		// Hover nos 4 Metric Cards
		const metricCards = header.locator("a");
		const cardCount = await metricCards.count();
		for (let i = 0; i < cardCount; i++) {
			const card = metricCards.nth(i);
			await card.hover();
			await page.waitForTimeout(700);
		}

		// Hover no botão "+ Registrar Sessão"
		console.log("🔘 Testando botão + Registrar Sessão...");
		const registrarBtn = header.locator("button, a:has-text('Registrar')");
		if (await registrarBtn.first().isVisible()) {
			await registrarBtn.first().hover();
			await page.waitForTimeout(800);
		}

		// 3. Scroll suave para visualizar o Roster e Ações
		console.log("👥 Explorando o Grupo de Aventureiros e Ações Rápidas...");
		await page.evaluate(() => window.scrollBy({ top: 320, behavior: "smooth" }));
		await page.waitForTimeout(1200);

		// Hover nos cards de personagens do grupo
		const heroCards = page.locator(
			"div:has-text('Grupo de Aventureiros') + div .group",
		);
		const heroCount = await heroCards.count();
		for (let i = 0; i < Math.min(heroCount, 4); i++) {
			await heroCards.nth(i).hover();
			await page.waitForTimeout(600);
		}

		// Hover nas Ações Rápidas (VTT, Mochila, etc.)
		console.log("⚡ Testando Ações da Mesa (VTT, Mochila, Ficha)...");
		const actionCards = page.locator(
			"div:has-text('Ações da Mesa') + div .group",
		);
		const actionCount = await actionCards.count();
		for (let i = 0; i < actionCount; i++) {
			await actionCards.nth(i).hover();
			await page.waitForTimeout(600);
		}

		// 4. Scroll para Missões, NPCs e Grimório
		console.log("📜 Explorando Missões, NPCs e Grimório de Navegação...");
		await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
		await page.waitForTimeout(1200);

		// Hover nas Missões
		const questCards = page.locator(
			"div:has-text('Missões Ativas') + div .group",
		);
		if (await questCards.first().isVisible()) {
			await questCards.first().hover();
			await page.waitForTimeout(700);
		}

		// Retorna suavemente ao topo
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
		await page.waitForTimeout(1500);

		// Captura screenshot em alta resolução
		const screenshotPath = path.join(outputDir, "latest-preview.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`📸 Screenshot de alta resolução salva: ${screenshotPath}`);
	} catch (err) {
		console.error("❌ Erro durante gravação de demonstração:", err);
	} finally {
		await context.close();
		await browser.close();

		if (devProcess) {
			devProcess.kill();
		}
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

	console.log("\n✨ Vídeo de demonstração do Dashboard gravado com sucesso!");
	console.log(`📁 Arquivo: ${path.join(outputDir, "latest-preview.webm")}`);
}

recordPreview().catch((err) => {
	console.error(err);
	process.exit(1);
});
