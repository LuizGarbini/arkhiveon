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
	} else {
		// Clean older previews so we don't accumulate disk clutter
		const existingFiles = fs.readdirSync(outputDir);
		for (const file of existingFiles) {
			try {
				fs.unlinkSync(path.join(outputDir, file));
			} catch {}
		}
	}

	let devProcess: any = null;
	const port = 3000;
	const devUrl = `http://localhost:${port}`;

	// 1. Check if server is running, otherwise start vite preview
	const alreadyRunning = await isServerRunning(port);
	if (!alreadyRunning) {
		console.log("⚡ Iniciando servidor local para teste de preview...");
		devProcess = spawn("npx", ["vite", "preview", "--port", `${port}`], {
			shell: true,
			stdio: "ignore",
		});

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

	console.log("🎬 Gravando vídeo de demonstração com Playwright...");
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
		await page.goto(devUrl, { waitUntil: "commit", timeout: 15000 });
		await page.waitForTimeout(1500);

		// Simulate interactive test sequence
		console.log("🖱️ Executando sequência de testes e interação na tela...");
		await page.mouse.move(640, 360);
		await page.waitForTimeout(800);
		await page.mouse.move(300, 200);
		await page.waitForTimeout(800);
		await page.mouse.move(900, 400);
		await page.waitForTimeout(800);

		// Screenshot
		const screenshotPath = path.join(outputDir, "latest-preview.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`📸 Screenshot salvo: ${screenshotPath}`);

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

		// Find the recorded video and rename it to latest-preview.webm
		const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".webm"));
		if (files.length > 0) {
			const originalVideoPath = path.join(outputDir, files[0]);
			const cleanVideoPath = path.join(outputDir, "latest-preview.webm");
			if (originalVideoPath !== cleanVideoPath) {
				fs.renameSync(originalVideoPath, cleanVideoPath);
			}
			console.log(`\n✨ Vídeo de demonstração pronto: ${cleanVideoPath}`);
			console.log(
				"💡 Dica: Arraste e solte o arquivo acima direto na caixa de texto do Pull Request no GitHub para embutir o player de vídeo automaticamente!\n",
			);
		}
	}
}

void recordPreview();
