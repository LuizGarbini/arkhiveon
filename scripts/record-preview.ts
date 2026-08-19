import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

async function recordPreview() {
	const outputDir = path.resolve(process.cwd(), "docs/previews");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
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
		// Navigate to local dev server (default port 5173 or 5174)
		console.log("🌐 Conectando em http://localhost:5173...");
		await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 15000 });

		// Wait a bit to record initial view
		await page.waitForTimeout(2000);

		// Take a high-resolution screenshot as well
		const screenshotPath = path.join(outputDir, "latest-preview.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`📸 Screenshot salvo em: ${screenshotPath}`);

		await page.waitForTimeout(3000);
	} catch (err) {
		console.warn("⚠️ Aviso durante navegação:", err);
	} finally {
		await context.close();
		await browser.close();
		console.log(`✨ Gravação concluída! Arquivos salvos em: ${outputDir}`);
	}
}

void recordPreview();
