// Prints do chat (rolagens e mensagens) e da ficha na mesa.
// Uso: node scripts/preview-vtt-chat-ficha.cjs <antes|depois>
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { setupContext, loadScene, frame } = require("./preview-vtt-refino.cjs");

const label = process.argv[2] || "depois";
const output = path.resolve("docs/previews/vtt-chat-ficha");
const ME = "preview-gm-user";

const CHARACTERS = [
	["c-thorin", "t1", "Thorin", "Anão", "Guerreiro", 5, [16, 12, 16, 8, 13, 10], 38, 44, "/presets/warrior.png"],
	["c-elara", "t2", "Elara", "Elfa", "Maga", 5, [8, 14, 12, 18, 12, 10], 21, 24, "/presets/mage.png"],
	["c-sombra", "t3", "Sombra", "Humana", "Ladina", 5, [10, 18, 12, 12, 14, 13], 12, 30, "/presets/rogue.png"],
	["c-lucia", "t4", "Irmã Lúcia", "Humana", "Clériga", 5, [12, 10, 14, 10, 17, 14], 27, 27, "/presets/cleric.png"],
];

async function seedCharacters(page) {
	await page.evaluate((list) => {
		const characters = list.map(
			([id, , name, race, klass, level, s, health, healthMax, imageUrl]) => ({
				id,
				imageUrl,
				system: "dnd5e",
				characterName: name,
				race,
				class: klass,
				level,
				strength: s[0],
				dexterity: s[1],
				constitution: s[2],
				intelligence: s[3],
				wisdom: s[4],
				charisma: s[5],
				armorClass: 16,
				speed: 9,
				health,
				healthMax,
			}),
		);
		window.__rpg_store__.setState({ characters, campaignLoadStatus: "ready" });
		const vtt = window.__vtt_store__.getState();
		for (const [id, tokenId] of list) vtt.updateToken(tokenId, { characterId: id });
	}, CHARACTERS);
}

// Histórico da sessão servido pelo REST simulado: o painel recarrega o feed
// a cada reconexão, então o dado precisa vir das mesmas tabelas.
function feedFixture() {
	const at = (min) => new Date(Date.UTC(2026, 10, 9, 22, min)).toISOString();
	const base = {
		campaign_id: "demo-tabletop",
		scene_id: "scene-1",
		session_id: "s3",
		label: null,
		message: null,
		formula: null,
		is_secret: false,
		character_id: null,
	};
	const chat = (id, min, author, message, character = null) => ({
		...base,
		id,
		kind: "chat",
		author_id: author,
		character_id: character,
		message,
		created_at: at(min),
	});
	const roll = (id, min, author, character, formula, rollLabel, secret = false) => ({
		...base,
		id,
		kind: "roll",
		author_id: author,
		character_id: character,
		formula: secret ? null : formula,
		label: rollLabel,
		is_secret: secret,
		created_at: at(min),
	});
	const rolls = [
		chat("m1", 2, ME, "Vocês descem para a cripta. O ar é frio e cheira a incenso velho."),
		roll("r1", 3, "u-thorin", "c-thorin", "1d20+1", "Percepção"),
		chat("m2", 3, "u-elara", "Tem algo se mexendo atrás das colunas.", "c-elara"),
		chat("m3", 4, "u-elara", "Preparo Mísseis Mágicos.", "c-elara"),
		roll("r2", 5, ME, null, "1d20+4", null, true),
		roll("r3", 6, "u-thorin", "c-thorin", "1d20+5", "Ataque · Machado"),
		roll("r4", 6, "u-thorin", "c-thorin", "1d12+2d6+3", "Dano crítico"),
		roll("r5", 7, "u-sombra", "c-sombra", "1d20+6", "Furtividade"),
		chat("m4", 8, ME, "O vampiro sibila e recua para a sombra."),
	];
	const result = (rollId, formula, dice, modifier, faces, count) => ({
		roll_id: rollId,
		total: dice.reduce((a, b) => a + b, 0) + modifier,
		details: { formula, count, faces, modifier, rolls: dice },
	});
	const results = [
		result("r1", "1d20+1", [16], 1, 20, 1),
		result("r2", "1d20+4", [11], 4, 20, 1),
		result("r3", "1d20+5", [20], 5, 20, 1),
		result("r4", "1d12+2d6+3", [9, 4, 6], 3, 12, 3),
		result("r5", "1d20+6", [1], 6, 20, 1),
	];
	return { rolls, results, sessions: [{ id: "s3", started_at: at(0) }] };
}

async function routeFeed(context) {
	const { rolls, results, sessions } = feedFixture();
	const reply = (route, rows) => {
		const single = (route.request().headers().accept || "").includes(
			"vnd.pgrst.object",
		);
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(single ? (rows[0] ?? null) : rows),
		});
	};
	const byParam = (url, field, rows) => {
		const value = new URL(url).searchParams.get(field);
		if (!value) return rows;
		if (value.startsWith("eq.")) return rows.filter((r) => r[field] === value.slice(3));
		return rows;
	};
	await context.route("**/rest/v1/campaigns*", (route) =>
		reply(route, [{ current_feed_session_id: "s3" }]),
	);
	await context.route("**/rest/v1/vtt_feed_sessions*", (route) =>
		reply(route, sessions),
	);
	await context.route("**/rest/v1/vtt_rolls*", (route) =>
		reply(route, byParam(route.request().url(), "id", rolls)),
	);
	await context.route("**/rest/v1/vtt_roll_results*", (route) =>
		reply(route, byParam(route.request().url(), "roll_id", results)),
	);
	// O servidor "rola" 14 no d20 e grava o cartão com o rótulo da ficha.
	await context.route("**/rest/v1/rpc/roll_dice*", (route) => {
		const body = route.request().postDataJSON();
		const match = /^1d(\d+)([+-]\d+)?$/.exec(body.p_formula);
		const modifier = match?.[2] ? Number(match[2]) : 0;
		const id = `sheet-${rolls.length}`;
		const total = 14 + modifier;
		rolls.push({
			id,
			campaign_id: body.p_campaign_id,
			scene_id: body.p_scene_id,
			session_id: "s3",
			author_id: ME,
			character_id: body.p_character_id,
			kind: "roll",
			formula: body.p_formula,
			label: body.p_label,
			message: null,
			is_secret: false,
			created_at: new Date(Date.UTC(2026, 10, 9, 22, 9)).toISOString(),
		});
		results.push({
			roll_id: id,
			total,
			details: {
				formula: body.p_formula,
				count: 1,
				faces: Number(match?.[1] ?? 20),
				modifier,
				rolls: [14],
			},
		});
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				id,
				total,
				formula: body.p_formula,
				is_secret: false,
			}),
		});
	});
}

async function shoot(browser, base, vp, device) {
	const phone = vp.width < 640;
	const context = await browser.newContext({
		viewport: vp,
		deviceScaleFactor: 2,
		hasTouch: phone,
		isMobile: phone,
	});
	await setupContext(context);
	await routeFeed(context);
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const shot = (name) =>
		page.screenshot({ path: path.join(output, `${label}-${device}-${name}.png`) });
	try {
		await loadScene(page, base);
		await frame(page, vp);
		await seedCharacters(page);
		await page.evaluate(() => window.__roll_store__.getState().setPanelOpen(true));
		await page.waitForTimeout(1500);
		await shot("1-chat");

		if (phone || label === "antes") {
			await page.evaluate(() => {
				window.__roll_store__.getState().setPanelOpen(false);
				window.__vtt_store__.getState().setShowCharacterSheetId("t1");
			});
			await page.waitForTimeout(900);
			await shot("2-ficha");
		} else {
			// Ficha à esquerda e chat à direita, juntos.
			await page.evaluate(() =>
				window.__vtt_store__.getState().setShowCharacterSheetId("t1"),
			);
			await page.waitForTimeout(900);
			await shot("2-ficha");
			const forca = page.getByRole("button", { name: /Rolar Força/ });
			await forca.scrollIntoViewIfNeeded();
			await forca.click();
			await page.waitForTimeout(3900);
			await shot("3-dado-da-ficha");
			await page.waitForTimeout(4200);
			await shot("4-rolagem-no-chat");

			await page.getByRole("button", { name: "Minimizar ficha" }).click();
			await page.evaluate(() =>
				window.__vtt_store__.getState().setShowCharacterSheetId("t2"),
			);
			await page.waitForTimeout(500);
			await page.getByRole("button", { name: "Minimizar ficha" }).click();
			await page.evaluate(() =>
				window.__vtt_store__.getState().setShowCharacterSheetId("t3"),
			);
			await page.waitForTimeout(600);
			await shot("5-fichas-minimizadas");
		}
		if (errors.length) console.warn(`${device}: erros na página`, errors);
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
		server: { host: "127.0.0.1", port: 3121, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	try {
		await shoot(browser, "http://127.0.0.1:3121", { width: 1440, height: 900 }, "desktop");
		await shoot(browser, "http://127.0.0.1:3121", { width: 390, height: 844 }, "mobile");
	} finally {
		await browser.close();
		await server.close();
	}
	console.log(`Prints em ${output}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
