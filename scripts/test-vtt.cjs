const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startPreviewRecorder } = require("./vtt-preview-recorder.cjs");

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
	let recording;
	const chapter = async (text, ms) => recording?.chapter(text, ms);
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
		if (process.env.VTT_RECORD) {
			recording = await startPreviewRecorder(page, path.join(output, "latest-preview.webm"), "01 / Mesa carregada - dados de teste");
			await chapter("01 / Mesa carregada - dados de teste", 3500);
		}
		await chapter("02 / Selecionar a mesma cena preserva o personagem", 1800);
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
		await chapter("Verificado: Carrara permanece na cena", 2500);
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
		await chapter("03 / Biblioteca: localizar um personagem", 1800);
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
		await chapter("Personagens presentes na cena, em um só lugar", 3500);
		await page.getByRole("button", { name: "Localizar Carrara" }).click();
		assert.equal(await page.getByRole("complementary").count(), 0);
		await chapter("Verificado: personagem localizado e biblioteca recolhida", 2800);
		await page.mouse.click(720, 450, { button: "right" });
		await page.getByRole("button", { name: "Fechar menu do token", exact: true }).waitFor();
		const sizeButtons = await page.getByRole("button", { name: /^Tamanho [1-4] por [1-4] células$/ }).all();
		assert.equal(sizeButtons.length, 4);
		const elevationButton = await page.getByRole("button", { name: "Diminuir elevação em 1,5 metro" }).boundingBox();
		for (const button of sizeButtons) {
			const box = await button.boundingBox();
			assert.ok(box.width >= 44 && box.height >= 44);
			assert.ok(box.y + box.height <= elevationButton.y, "Tamanhos não sobrepõem elevação");
		}
		await chapter("Menu do token: tamanho e elevação sem sobreposição", 2500);
		await page.screenshot({path: path.join(output, "vtt-token-menu.png")});
		let pendingTokenWrite;
		const tokenWriteReceived = new Promise(resolve => { pendingTokenWrite = resolve; });
		let patchCount = 0;
		await context.route("**/rest/v1/vtt_tokens*", async route => {
			if (route.request().method() === "PATCH") { patchCount++; pendingTokenWrite(route); }
			else if (route.request().method() === "DELETE") await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({message: "Falha simulada"}) });
			else await route.fulfill({status: 200, contentType: "application/json", body: "[]"});
		});
		const size2 = page.getByRole("button", {name: "Tamanho 2 por 2 células", exact: true});
		await size2.click();
		const pendingRoute = await tokenWriteReceived;
		assert.ok(await size2.isDisabled(), "Evita cliques duplicados enquanto salva");
		await chapter("Salvamento pendente: controles protegidos contra duplicação", 1800);
		await pendingRoute.fulfill({status: 200, contentType: "application/json", body: JSON.stringify({id: "token-1"})});
		await page.waitForFunction(() => window.__vtt_store__.getState().tokens[0]?.sizeCells === 2);
		assert.equal(patchCount, 1);
		await page.getByRole("button", {name: "Excluir", exact: true}).click();
		await page.getByRole("alert").filter({hasText:"Não foi possível remover o token"}).waitFor();
		assert.equal(await page.evaluate(() => window.__vtt_store__.getState().tokens.length), 1);
		await chapter("Falha simulada: o token permanece na mesa", 1800);
		await page.getByRole("button", {name: "Fechar aviso da mesa", exact: true}).click();
		await page.getByRole("button", {name: "Fechar menu do token", exact: true}).click();
		await chapter("04 / Diário: consultar a sessão sem sair da mesa", 1800);
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
		await chapter("Resumo e gancho da última sessão", 5000);
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
		await chapter("05 / Falha de rede simulada: preservar o texto digitado", 2500);
		await page.getByRole("button", { name: "Nova cena", exact: true }).click();
		await page
			.getByPlaceholder("Ex: Taverna do Javali Bêbado")
			.fill("Cena que deve ser preservada");
		await chapter("Criar cena - formulário preenchido", 2500);
		await page.getByRole("button", { name: "Criar Cena", exact: true }).click();
		await page
			.getByRole("alert")
			.filter({ hasText: "Não foi possível criar a cena" })
			.waitFor();
		assert.equal(
			await page.getByPlaceholder("Ex: Taverna do Javali Bêbado").inputValue(),
			"Cena que deve ser preservada",
		);
		await chapter("Verificado: erro visível e nome da cena preservado", 4000);
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
		await chapter("Cancelar limpa o erro. Testes desktop aprovados.", 3000);
		await recording?.stop();
		recording = null;
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(500);
		if (process.env.VTT_RECORD) {
			recording = await startPreviewRecorder(page, path.join(output, "vtt-mobile-preview.webm"), "Mobile / Mesa pronta - dados de teste");
			await chapter("Mobile / Mesa pronta - dados de teste", 3000);
		}
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
		await chapter("Biblioteca cabe na tela do celular", 4000);
		await page.getByRole("button", { name: "Fechar biblioteca" }).click();
		await page
			.getByRole("button", { name: "Configurações do Grid", exact: true })
			.click();
		await page.screenshot({
			animations: "disabled",
			path: path.join(output, "vtt-mobile-grid.png"),
		});
		for (const name of ["Tamanho da célula", "Opacidade do grid"]) {
			const box = await page.getByRole("slider", {name, exact: true}).boundingBox();
			assert.ok(box.height >= 44, "Slider deve ter alvo de 44px");
		}
		await chapter("Configurações do grid acessíveis", 4000);
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
		await chapter("Jogador: cenas em preparação ficam ocultas", 4000);
		await recording?.stop();
		recording = null;
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

		await browser.close();
		await server?.close();
	}
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
