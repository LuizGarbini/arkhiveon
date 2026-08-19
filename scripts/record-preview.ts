import { chromium } from "playwright";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

async function isServerRunning(port: number): Promise<boolean> {
	try {
		const res = await fetch(`http://localhost:${port}`, { method: "GET" });
		return res.status < 500;
	} catch {
		return false;
	}
}

async function recordPreview() {
	const outputDir = path.resolve(process.cwd(), "docs/previews");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	let devProcess: any = null;
	const port = 3000;
	const devUrl = `http://localhost:${port}`;

	// 1. Check if server is running, otherwise start vite preview/dev
	const alreadyRunning = await isServerRunning(port);
	if (!alreadyRunning) {
		console.log("⚡ Iniciando servidor local para teste de preview...");
		devProcess = spawn("npx", ["vite", "preview", "--port", `${port}`], {
			shell: true,
			stdio: "ignore",
		});

		// Wait up to 15 seconds for server to be responsive
		for (let i = 0; i < 30; i++) {
			await new Promise((r) => setTimeout(r, 500));
			if (await isServerRunning(port)) {
				console.log("✅ Servidor local pronto!");
				break;
			}
		}
	} else {
		console.log("✅ Servidor já em execução em " + devUrl);
	}

	console.log("🎬 Iniciando gravação de preview com Playwright...");
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
		console.log(`🌐 Acessando ${devUrl}...`);
		await page.goto(devUrl, { waitUntil: "commit", timeout: 15000 });
		await page.waitForTimeout(1500);

		// Interact with the page (simulate user testing)
		console.log("🖱️ Executando sequência de testes e interação na tela...");
		await page.mouse.move(640, 360);
		await page.waitForTimeout(800);
		await page.mouse.move(300, 200);
		await page.waitForTimeout(800);
		await page.mouse.move(900, 400);
		await page.waitForTimeout(800);

		// Save screenshot
		const screenshotPath = path.join(outputDir, "latest-preview.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`📸 Screenshot salvo em: ${screenshotPath}`);

		await page.waitForTimeout(2000);
	} catch (err) {
		console.warn("⚠️ Detalhes durante execução:", err);
	} finally {
		await page.close();
		await context.close();
		await browser.close();

		if (devProcess) {
			try {
				devProcess.kill();
			} catch {}
		}

		// Find the generated video file and log its path
		const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".webm"));
		if (files.length > 0) {
			const latestVideo = path.join(outputDir, files[files.length - 1]);
			console.log(`✨ Vídeo de demonstração salvo em: ${latestVideo}`);
		}
	}
}

void recordPreview();
