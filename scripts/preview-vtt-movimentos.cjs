// Histórico de movimentos dos tokens: arrasto real, painel, seta no mapa e
// "devolver ao ponto de origem". Uso: node scripts/preview-vtt-movimentos.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { setupContext, loadScene, frame } = require("./preview-vtt-refino.cjs");

const output = path.resolve("docs/previews/vtt-movimentos");

async function run(browser, base, vp, device) {
	const phone = vp.width < 640;
	const context = await browser.newContext({
		viewport: vp,
		deviceScaleFactor: 2,
		hasTouch: phone,
		isMobile: phone,
	});
	await setupContext(context);
	// Gravar o token e o histórico responde como o servidor responde.
	const inserts = [];
	await context.route("**/rest/v1/vtt_token_moves*", (route) => {
		const request = route.request();
		if (request.method() === "POST") {
			inserts.push(request.postDataJSON());
			return route.fulfill({ status: 201, body: "" });
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: "[]",
		});
	});
	await context.route("**/rest/v1/vtt_tokens*", (route) =>
		route.request().method() === "PATCH"
			? route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ id: "t1" }),
				})
			: route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
	);
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const shot = (name) =>
		page.screenshot({ path: path.join(output, `${device}-${name}.png`) });
	const pos = (id) =>
		page.evaluate(
			(tokenId) => {
				const t = window.__vtt_store__
					.getState()
					.tokens.find((x) => x.id === tokenId);
				return { x: t.x, y: t.y };
			},
			id,
		);
	try {
		await loadScene(page, base);
		const { toScreen } = await frame(page, vp);
		await page.waitForTimeout(900);

		const a = toScreen(4, 3);
		const b = toScreen(7, 3);
		const c = toScreen(7, 6);
		const start = await pos("t1");
		const drag = async (from, to) => {
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
			await page.mouse.move(to.x, to.y, { steps: 4 });
			await page.mouse.up();
			await page.waitForTimeout(500);
		};

		// Dois arrastos do mesmo token e um de outro token.
		await drag(a, b);
		await drag(b, c);
		const mid = toScreen(3, 5);
		const dest = toScreen(5, 5);
		await drag(mid, dest);

		const log = await page.evaluate(() => window.__move_store__.getState().moves);
		assert.equal(log.length, 3, `3 movimentos anotados (veio ${log.length})`);
		const thorin = log.filter((m) => m.tokenName === "Thorin");
		assert.equal(thorin.length, 2);
		assert.deepEqual(thorin[0].from, start, "o 1º movimento sai de onde o token estava");
		assert.equal(thorin[0].distance, 4.5, "3 casas = 4,5 m");
		assert.deepEqual(thorin[1].from, thorin[0].to, "o 2º sai de onde o 1º chegou");
		for (let i = 0; i < 160 && inserts.length < 3; i++)
			await page.waitForTimeout(250);
		assert.ok(inserts.length >= 3, `gravou no banco (${inserts.length} inserts)`);
		assert.equal(inserts[0].token_name, "Thorin");
		assert.equal(inserts[0].from_x, start.x);

		// Jogador não vê o painel nem o botão.
		// Painel (atalho M para quem é mestre).
		if (!phone) await page.keyboard.press("m");
		else
			await page.evaluate(() => window.__move_store__.getState().setPanelOpen(true));
		await page.waitForTimeout(500);
		const panel = page.getByTestId("move-history-panel");
		await panel.waitFor();
		await shot("1-painel");

		// Escolher o movimento mais antigo do Thorin: seta de origem → destino.
		const rows = page
			.getByRole("log", { name: "Movimentos dos tokens" })
			.locator("button[aria-pressed]");
		assert.equal(await rows.count(), 3, "3 linhas no painel");
		await rows.last().click();
		await page.waitForTimeout(600);
		assert.ok(
			await page.evaluate(() => window.__move_store__.getState().focusedMoveId),
			"a linha ficou em destaque",
		);
		await shot("2-seta-no-mapa");

		// Devolver o Thorin ao ponto de origem do primeiro movimento.
		await page
			.getByRole("button", { name: "Devolver Thorin ao ponto de origem" })
			.last()
			.click();
		await page.waitForTimeout(700);
		const back = await pos("t1");
		assert.deepEqual(back, thorin[0].from, "devolveu o token ao ponto de origem");
		const after = await page.evaluate(() => window.__move_store__.getState().moves);
		assert.equal(after.at(-1).kind, "undo", "a devolução também fica no histórico");
		await shot("3-devolvido");

		// Filtro por token com a trilha desenhada.
		await page.getByRole("combobox", { name: "Filtrar por token" }).click();
		await page.getByRole("option", { name: "Thorin" }).hover();
		await page.getByRole("option", { name: "Thorin" }).click();
		await page.waitForTimeout(500);
		await shot("4-filtro");

		if (errors.length) console.warn(`${device}: erros na página`, errors);
		console.log(`${device}: histórico de movimentos — ok`);
	} finally {
		await context.close();
	}
}

async function main() {
	fs.mkdirSync(output, { recursive: true });
	const { createServer } = await import("vite");
	const server = await createServer({
		configLoader: "runner",
		mode: "test",
		server: { host: "127.0.0.1", port: 3123, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	try {
		await run(browser, "http://127.0.0.1:3123", { width: 1440, height: 900 }, "desktop");
		await run(browser, "http://127.0.0.1:3123", { width: 390, height: 844 }, "mobile");
	} finally {
		await browser.close();
		await server.close();
	}
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
