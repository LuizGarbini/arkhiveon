const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
	const { createServer } = await import("vite");
	const server = process.env.VTT_BASE_URL
		? null
		: await createServer({
				configLoader: "runner",
				mode: "test",
				server: { host: "127.0.0.1", port: 3107, strictPort: true },
			});
	await server?.listen();
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		...(process.env.VTT_RECORD
			? {
					recordVideo: {
						dir: path.resolve("docs/previews"),
						size: { width: 1440, height: 900 },
					},
				}
			: {}),
	});
	await context.routeWebSocket("**/realtime/v1/**", (route) => route.close());
	const output = path.resolve("docs/previews");
	fs.mkdirSync(output, { recursive: true });
	await context.route("**/rest/v1/**", (route) =>
		route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
	);
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
							ownerId: "preview-gm-user",
							myRole: "owner",
							system: "ordem",
						},
					],
					activeCampaignId: "demo-tabletop",
					hasLoadedCampaigns: true,
					campaignLoadStatus: "ready",
					characters: [],
					npcs: [],
				},
				version: 0,
			}),
		);
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	try {
		await page.goto(
			(process.env.VTT_BASE_URL || "http://127.0.0.1:3107") +
				"/campaigns/demo-tabletop/vtt",
			{ waitUntil: "domcontentloaded", timeout: 90000 },
		);
		console.log("Rota aberta");
		await page
			.waitForFunction(() => window.__vtt_store__, { timeout: 20000 })
			.catch(async (error) => {
				console.log(await page.locator("body").innerText());
				console.log(errors);
				throw error;
			});
		await page.waitForTimeout(1500);
		await page.evaluate(() =>
			window.__rpg_store__.setState({
				campaigns: [
					{
						id: "demo-tabletop",
						name: "A Forja dos Deuses",
						ownerId: "preview-gm-user",
						myRole: "owner",
						worldId: "world-1",
					},
				],
				activeCampaignId: "demo-tabletop",
				sessions: [
					{
						id: "session-1",
						number: 12,
						title: "O ritual no observatório",
						summary:
							"O grupo conteve a invocação. Agora precisa descobrir quem abriu a fenda.",
						cliffhanger: "O sino da torre começou a tocar sozinho.",
					},
				],
				quests: [],
				characters: [],
				npcs: [],
			}),
		);
		await page.waitForTimeout(700);
		await page.evaluate(() => {
			const store = window.__vtt_store__.getState();
			store.setIsGM(true);
			const scene = {
				id: "scene-1",
				campaignId: "demo-tabletop",
				name: "Observatório esquecido",
				gridType: "square",
				gridSize: 70,
				gridColor: "white",
				gridOpacity: 0.15,
				gridScaleDistance: 1.5,
				gridScaleUnit: "m",
				width: 1600,
				height: 1200,
				fogEnabled: false,
				fogExploration: false,
				isActive: true,
				orderIndex: 0,
			};
			store.setScenes([
				scene,
				{
					...scene,
					id: "scene-2",
					name: "Cripta • preparação",
					isActive: false,
					orderIndex: 1,
				},
			]);
			store.setActiveSceneId(scene.id);
		});
		await page.locator("canvas").waitFor();
		await page.waitForTimeout(500);
		const initialCanvas = await page.screenshot({
			animations: "disabled",
			clip: { x: 300, y: 200, width: 200, height: 200 },
		});
		await page.evaluate(() =>
			window.__vtt_store__.getState().updateScene("scene-1", { gridSize: 70 }),
		);
		await page.waitForTimeout(300);
		const refreshedCanvas = await page.screenshot({
			animations: "disabled",
			clip: { x: 300, y: 200, width: 200, height: 200 },
		});
		fs.writeFileSync(path.join(output, "grid-initial.png"), initialCanvas);
		fs.writeFileSync(path.join(output, "grid-refreshed.png"), refreshedCanvas);
		assert.ok(
			initialCanvas.equals(refreshedCanvas),
			"O grid deve aparecer na primeira renderização, sem precisar editar a cena",
		);
		console.log("PASS: canvas pronto já renderiza grid");
		await page.evaluate(() =>
			window.__vtt_store__
				.getState()
				.setTokens([
					{
						id: "token-1",
						sceneId: "scene-1",
						name: "Carrara",
						layer: "token",
						x: 525,
						y: 385,
						sizeCells: 1,
						rotation: 0,
						hpCurrent: 38,
						hpMax: 48,
						elevation: 0,
						conditions: [],
						auras: [],
						visionRange: 6,
						isLocked: false,
						isHidden: false,
						controlledBy: [],
					},
				]),
		);
		await page.locator("canvas").waitFor();
		await page.waitForTimeout(300);
		await page.screenshot({
			animations: "disabled",
			path: path.join(output, "vtt-desktop.png"),
		});
		console.log("Mesa real carregada; erros:", errors);
		await page.getByRole("button", { name: /Observatório esquecido/ }).click();
		const count = await page.evaluate(
			() => window.__vtt_store__.getState().tokens.length,
		);
		assert.equal(
			count,
			1,
			"Clicar novamente na cena selecionada não pode apagar seus tokens",
		);
		console.log("PASS: selecionar a mesma cena preserva tokens");
		await page.evaluate(() => {
			const s = window.__vtt_store__.getState();
			s.addScene(s.scenes[0]);
		});
		assert.equal(
			await page
				.getByRole("button", { name: /Observatório esquecido/ })
				.count(),
			1,
			"Evento repetido não duplica cena",
		);
		await page
			.getByRole("button", { name: "Personagens e NPCs", exact: true })
			.click();
		await page
			.getByRole("complementary", { name: "Biblioteca da mesa" })
			.waitFor();
		await page.screenshot({
			animations: "disabled",
			path: path.join(output, "latest-preview.png"),
		});
		await page.getByRole("button", { name: "Localizar Carrara" }).click();
		assert.equal(await page.getByRole("complementary").count(), 0);
		await page
			.getByRole("button", { name: "Diário da campanha", exact: true })
			.click();
		await page
			.getByRole("heading", { name: "O ritual no observatório" })
			.waitFor();
		await page.screenshot({
			animations: "disabled",
			path: path.join(output, "vtt-journal.png"),
		});
		await page.keyboard.press("Escape");
		await context.route("**/rest/v1/vtt_scenes*", (route) =>
			route.request().method() === "POST"
				? route.fulfill({
						status: 500,
						contentType: "application/json",
						body: JSON.stringify({ message: "Falha de teste" }),
					})
				: route.fulfill({
						status: 200,
						contentType: "application/json",
						body: "[]",
					}),
		);
		await page.getByRole("button", { name: "Nova cena", exact: true }).click();
		await page
			.getByPlaceholder("Ex: Taverna do Javali Bêbado")
			.fill("Cena que deve ser preservada");
		await page.getByRole("button", { name: "Criar Cena", exact: true }).click();
		await page
			.getByRole("alert")
			.filter({ hasText: "Não foi possível criar a cena" })
			.waitFor();
		assert.equal(
			await page.getByPlaceholder("Ex: Taverna do Javali Bêbado").inputValue(),
			"Cena que deve ser preservada",
		);
		await page.getByRole("button", { name: "Cancelar", exact: true }).click();
		assert.equal(
			await page.getByRole("alert").count(),
			0,
			"Cancelar criação limpa o erro do formulário",
		);
		console.log("PASS: biblioteca, diário, deduplicação e erro de criação");
		for (const name of [
			"Selecionar & Mover",
			"Mão / Mover Câmera",
			"Configurações do Grid",
			"Nova cena",
			"Aumentar zoom",
		]) {
			const box = await page
				.getByRole("button", { name, exact: true })
				.boundingBox();
			assert.ok(
				box && box.width >= 44 && box.height >= 44,
				name + " deve oferecer alvo de 44px",
			);
		}
		console.log("PASS: alvos de toque medidos em 44px");
		await page.setViewportSize({ width: 390, height: 844 });
		await page
			.getByRole("button", { name: "Personagens e NPCs", exact: true })
			.click();
		const panel = await page
			.getByRole("complementary", { name: "Biblioteca da mesa" })
			.boundingBox();
		assert.ok(
			panel.x >= 0 &&
				panel.x + panel.width <= 390 &&
				panel.y + panel.height <= 844,
			"Biblioteca deve caber no celular",
		);
		await page.screenshot({
			animations: "disabled",
			path: path.join(output, "vtt-mobile.png"),
		});
		await page.getByRole("button", { name: "Fechar biblioteca" }).click();
		await page
			.getByRole("button", { name: "Configurações do Grid", exact: true })
			.click();
		await page.screenshot({
			animations: "disabled",
			path: path.join(output, "vtt-mobile-grid.png"),
		});
		await page
			.getByRole("button", { name: "Fechar configurações do grid" })
			.click();
		await page.evaluate(() => window.__vtt_store__.getState().setIsGM(false));
		assert.equal(
			await page.getByRole("button", { name: /Cripta/ }).count(),
			0,
			"Jogador não navega em cenas de preparação",
		);
		assert.equal(
			await page
				.getByRole("button", { name: "Nova cena", exact: true })
				.count(),
			0,
		);
		assert.deepEqual(errors, [], "Sem exceções no navegador");
		console.log("PASS: layout mobile e controles separados para jogador");
	} catch (error) {
		console.log(await page.locator("body").innerText());
		console.log(errors);
		await page.screenshot({
			animations: "disabled",
			path: path.join(output, "vtt-failure.png"),
		});
		throw error;
	} finally {
		await context.close();
		if (process.env.VTT_RECORD && page.video())
			await page.video().saveAs(path.join(output, "latest-preview.webm"));
		await browser.close();
		await server?.close();
	}
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
