import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const SUPABASE_URL = "http://127.0.0.1:5999";
const CAMPAIGN_ID = "demo-tabletop";
const SCENE_ID = "scene-lyra";
const TOKEN_ID = "token-lyra";
const CHARACTER_ID = "char-lyra";
const USER_ID = "preview-gm-user";
const OUTPUT = path.join(os.homedir(), "projects", "b2b-previews2");

process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = "preview-anon-key";

const now = new Date().toISOString();
let health = 33;
const healthMax = 38;
/** @type {null | "network" | "permission"} */
let failMode = null;
/** @type {Promise<void> | null} */
let saveHold = null;
const rpcBodies = [];
const foreignHosts = [];

const scene = {
	id: SCENE_ID,
	campaign_id: CAMPAIGN_ID,
	name: "Salão da Lyra",
	map_image_url: null,
	grid_type: "square",
	grid_size: 70,
	grid_color: "white",
	grid_opacity: 0.15,
	grid_scale_distance: 1.5,
	grid_scale_unit: "m",
	width: 1600,
	height: 1200,
	fog_enabled: false,
	fog_exploration: false,
	is_active: true,
	order_index: 0,
	created_at: now,
	updated_at: now,
};

const token = {
	id: TOKEN_ID,
	scene_id: SCENE_ID,
	character_id: CHARACTER_ID,
	npc_id: null,
	name: "Lyra",
	avatar_url: null,
	layer: "token",
	x: 480,
	y: 340,
	size_cells: 1,
	rotation: 0,
	hp_current: null,
	hp_max: null,
	elevation: 0,
	conditions: [],
	auras: [],
	vision_range: 6,
	is_locked: false,
	is_hidden: false,
	controlled_by: [],
	created_at: now,
	updated_at: now,
};

function characterRow() {
	return {
		id: CHARACTER_ID,
		campaign_id: CAMPAIGN_ID,
		user_id: USER_ID,
		created_by: USER_ID,
		name: "Lyra",
		created_at: now,
		updated_at: now,
		data: {
			system: "dnd5e",
			characterName: "Lyra",
			playerName: "Ana",
			race: "Humana",
			class: "Guerreira",
			level: 5,
			health,
			healthMax,
			strength: 16,
			dexterity: 14,
			constitution: 14,
			intelligence: 10,
			wisdom: 12,
			charisma: 8,
			armorClass: 16,
			speed: 9,
			imageUrl: "",
		},
	};
}

function fulfill(route, body, status = 200) {
	return route.fulfill({
		status,
		contentType: "application/json",
		headers: { "content-range": "0-0/1" },
		body: body === undefined ? "" : JSON.stringify(body),
	});
}

async function handleSupabase(route) {
	const request = route.request();
	const url = request.url();
	const host = new URL(url).host;
	if (host !== "127.0.0.1:5999") {
		foreignHosts.push(host);
		return route.abort();
	}
	if (request.method() === "HEAD") return fulfill(route, undefined, 200);
	const accept = request.headers().accept ?? "";
	const single = accept.includes("vnd.pgrst.object");

	if (url.includes("/auth/v1/")) {
		return fulfill(route, {
			access_token: "preview-token",
			token_type: "bearer",
			expires_in: 3600,
			expires_at: Math.floor(Date.now() / 1000) + 3600,
			refresh_token: "preview-refresh",
			user: {
				id: USER_ID,
				aud: "authenticated",
				role: "authenticated",
				email: "gm@arkhiveon.app",
				user_metadata: { full_name: "Mestre" },
				app_metadata: {},
			},
		});
	}

	if (url.includes("/rpc/set_character_hp")) {
		const body = request.postDataJSON() ?? {};
		rpcBodies.push(body);
		if (failMode === "network") {
			failMode = null;
			return route.abort("failed");
		}
		if (failMode === "permission") {
			failMode = null;
			return fulfill(
				route,
				{
					message: "Você não pode alterar os PV desta ficha.",
					code: "42501",
				},
				403,
			);
		}
		if (saveHold) {
			const hold = saveHold;
			saveHold = null;
			await hold;
		}
		const requested = Number(body.p_current);
		health = Math.max(0, Math.min(requested, healthMax));
		if (typeof body.p_max === "number" && body.p_max > 0) {
			return fulfill(route, { health, healthMax: body.p_max });
		}
		return fulfill(route, { health, healthMax });
	}

	if (url.includes("/rpc/get_user_accessible_campaigns")) {
		return fulfill(route, [
			{
				id: CAMPAIGN_ID,
				name: "A Forja dos Deuses",
				description: null,
				owner_id: USER_ID,
				world_id: null,
				system: "dnd5e",
				member_limit: null,
				my_role: "owner",
				created_at: now,
				updated_at: now,
			},
		]);
	}

	if (url.includes("/rest/v1/vtt_scenes")) return fulfill(route, [scene]);
	if (url.includes("/rest/v1/vtt_tokens")) return fulfill(route, [token]);
	if (url.includes("/rest/v1/characters")) return fulfill(route, [characterRow()]);
	if (url.includes("/rest/v1/campaigns")) {
		return fulfill(route, single ? { id: CAMPAIGN_ID, world_id: null } : []);
	}
	if (url.includes("/rest/v1/vtt_fog_states")) return fulfill(route, single ? null : []);
	return fulfill(route, single ? null : []);
}

async function prepare(page) {
	health = 33;
	failMode = null;
	saveHold = null;
	await page.goto(`http://127.0.0.1:3117/campaigns/${CAMPAIGN_ID}/vtt`, {
		waitUntil: "domcontentloaded",
		timeout: 90000,
	});
	await page.waitForFunction(() => window.__vtt_store__ && window.__rpg_store__, {
		timeout: 30000,
	});
	const loaded = await page.evaluate(async () => {
		try {
			await window.__rpg_store__.getState().loadRemoteData();
			const character = window.__rpg_store__
				.getState()
				.characters.find((item) => item.id === "char-lyra");
			return {
				ok: true,
				health: character?.health ?? null,
				max: character?.healthMax ?? null,
			};
		} catch (error) {
			return { ok: false, message: String(error) };
		}
	});
	if (!loaded.ok || loaded.health !== 33 || loaded.max !== 38) {
		throw new Error(
			`A ficha fake não entrou no store: ${JSON.stringify(loaded)}`,
		);
	}
	await page.waitForFunction(
		() =>
			window.__vtt_store__
				.getState()
				.tokens.some((item) => item.characterId === "char-lyra"),
		{ timeout: 20000 },
	);
	await page.locator("canvas").waitFor();
}

async function placeToken(page, x, y) {
	await page.evaluate(
		({ x, y }) => {
			window.__vtt_store__.getState().updateToken("token-lyra", { x, y });
		},
		{ x, y },
	);
}

async function setRole(page, role) {
	await page.evaluate((role) => {
		const state = window.__rpg_store__.getState();
		window.__rpg_store__.setState({
			campaigns: state.campaigns.map((campaign) =>
				campaign.id === "demo-tabletop"
					? {
							...campaign,
							myRole: role,
							ownerId: role === "owner" ? "preview-gm-user" : "outro-mestre",
						}
					: campaign,
			),
		});
	}, role);
	// Trocar o papel recarrega a cena. Espera a Lyra voltar e permanecer.
	let stable = false;
	for (let attempt = 0; attempt < 25 && !stable; attempt += 1) {
		try {
			await page.waitForFunction(
				(role) => {
					const vtt = window.__vtt_store__.getState();
					return (
						vtt.isGM === (role === "owner") &&
						vtt.activeSceneId === "scene-lyra" &&
						vtt.tokens.some((item) => item.id === "token-lyra")
					);
				},
				role,
				{ timeout: 5000 },
			);
			await page.waitForTimeout(500);
			stable = await page.evaluate((role) => {
				const vtt = window.__vtt_store__.getState();
				return (
					vtt.isGM === (role === "owner") &&
					vtt.tokens.some((item) => item.id === "token-lyra")
				);
			}, role);
		} catch {
			stable = false;
		}
	}
	if (!stable) throw new Error(`A mesa não estabilizou como ${role}.`);
}

async function openPanels(page, { menu, sheet }) {
	await page.evaluate(
		({ menu, sheet }) => {
			const store = window.__vtt_store__.getState();
			store.setActiveTokenIdForMenu(menu ? "token-lyra" : null);
			store.setShowCharacterSheetId(sheet ? "token-lyra" : null);
		},
		{ menu, sheet },
	);
}

async function shoot(page, name) {
	await page.screenshot({
		path: path.join(OUTPUT, `${name}.png`),
		animations: "disabled",
	});
}

async function assertSharedHpStyle(page, where) {
	const button = page.getByRole("button", { name: "-5" }).first();
	const buttonClass = (await button.getAttribute("class")) ?? "";
	const slot = await button.getAttribute("data-slot");
	if (
		slot !== "button" ||
		buttonClass.includes("rose-") ||
		buttonClass.includes("emerald-")
	) {
		throw new Error(
			`${where}: −5 fora do botão do design system (${slot} ${buttonClass})`,
		);
	}
	const barClass =
		(await page.getByTestId("vtt-hp-bar").first().getAttribute("class")) ?? "";
	if (!barClass.includes("bg-primary")) {
		throw new Error(`${where}: barra sem bg-primary (${barClass})`);
	}
}

async function resetHp(page) {
	health = 33;
	failMode = null;
	saveHold = null;
	await page.evaluate(() => {
		const state = window.__rpg_store__.getState();
		window.__rpg_store__.setState({
			characters: state.characters.map((item) =>
				item.id === "char-lyra"
					? { ...item, health: 33, healthMax: 38 }
					: item,
			),
		});
	});
}

async function sheetHealth(page) {
	return page.evaluate(
		() =>
			window.__rpg_store__
				.getState()
				.characters.find((item) => item.id === "char-lyra")?.health,
	);
}

async function runViewport(page, width, height) {
	const suffix = `${width}x${height}`;
	const narrow = width < 700;
	health = 33;
	failMode = null;
	saveHold = null;
	await page.setViewportSize({ width, height });
	await prepare(page);
	await setRole(page, "owner");
	const tokenX = narrow ? 180 : 480;
	const tokenY = narrow ? 220 : 340;
	await placeToken(page, tokenX, tokenY);

	await openPanels(page, { menu: true, sheet: false });
	await page.getByText("33 / 38").first().waitFor();
	await assertSharedHpStyle(page, "menu do mestre");
	await page.waitForTimeout(300);
	await shoot(page, `mestre-menu-${suffix}`);

	await openPanels(page, { menu: false, sheet: true });
	await page.getByText("33 / 38").first().waitFor();
	if ((await page.getByText("33 / 38").count()) !== 1) {
		throw new Error("O PV do mestre aparece mais de uma vez.");
	}
	if ((await page.getByText("33/38").count()) !== 0) {
		throw new Error("A ficha do mestre ainda repete 33/38.");
	}
	const menuStillOpen = await page.evaluate(
		() => window.__vtt_store__.getState().activeTokenIdForMenu,
	);
	if (menuStillOpen) {
		throw new Error("Abrir a ficha não fechou o menu do token.");
	}
	if (narrow) {
		if (
			(await page.getByRole("button", { name: "Fechar menu do token" }).count()) !==
			0
		) {
			throw new Error("Em 390px o menu do token continua aberto com a ficha.");
		}
		if (
			(await page
				.getByRole("button", { name: "Selecionar & Mover" })
				.count()) !== 0
		) {
			throw new Error(
				"Em 390px o trilho de ferramentas aparece com a ficha aberta.",
			);
		}
		const box = await page.getByRole("dialog").boundingBox();
		if (!box || box.x > 2 || box.width < width - 8) {
			throw new Error(
				`Em 390px a ficha não ocupa a largura (${JSON.stringify(box)}).`,
			);
		}
	}
	await assertSharedHpStyle(page, "ficha do mestre");
	await page.getByRole("spinbutton", { name: "PV máximo" }).waitFor();
	await page.waitForTimeout(300);
	await shoot(page, `mestre-ficha-${suffix}`);

	await setRole(page, "viewer");
	await placeToken(page, tokenX, tokenY);
	await openPanels(page, { menu: true, sheet: false });
	await page.getByText("33", { exact: true }).first().waitFor();
	if ((await page.getByText("33 / 38").count()) !== 0) {
		throw new Error("Jogador ainda vê o PV máximo no menu.");
	}
	await assertSharedHpStyle(page, "menu do jogador");
	await page.waitForTimeout(300);
	await shoot(page, `jogador-menu-${suffix}`);

	await openPanels(page, { menu: false, sheet: true });
	await page.getByText("33", { exact: true }).first().waitFor();
	if ((await page.getByText("33 / 38").count()) !== 0) {
		throw new Error("Jogador ainda vê o PV máximo.");
	}
	if ((await page.getByRole("spinbutton", { name: "PV máximo" }).count()) !== 0) {
		throw new Error("Jogador ainda pode editar o PV máximo.");
	}
	const ratio = await page.getByTestId("vtt-hp-bar").first().evaluate((bar) => {
		const track = bar.parentElement;
		if (!track) return 0;
		const trackWidth = track.getBoundingClientRect().width;
		if (trackWidth <= 0) return 0;
		return bar.getBoundingClientRect().width / trackWidth;
	});
	if (Math.abs(ratio - 33 / 38) > 0.08) {
		throw new Error(`A barra do jogador não é proporcional (razão ${ratio}).`);
	}
	await assertSharedHpStyle(page, "ficha do jogador");
	await page.waitForTimeout(300);
	await shoot(page, `jogador-ficha-${suffix}`);

	await setRole(page, "owner");
	await placeToken(page, tokenX, tokenY);
	await openPanels(page, { menu: false, sheet: true });
	await resetHp(page);
	await page.getByText("33 / 38").first().waitFor();
	let releaseSave = () => {};
	saveHold = new Promise((resolve) => {
		releaseSave = resolve;
	});
	try {
		const beforeSave = rpcBodies.length;
		await page.getByRole("button", { name: "-5" }).first().click();
		await page.getByText("Salvando…").waitFor();
		if (!(await page.getByRole("button", { name: "-5" }).first().isDisabled())) {
			throw new Error("O botão −5 não travou enquanto salvava.");
		}
		await page.waitForTimeout(200);
		await shoot(page, `salvando-${suffix}`);
		releaseSave();
		await page.getByText("28 / 38").first().waitFor();
		await page.getByText("Salvando…").waitFor({ state: "hidden" });
		if (rpcBodies.length !== beforeSave + 1 || rpcBodies[beforeSave]?.p_current !== 28) {
			throw new Error(
				`O salvamento não foi uma gravação só: ${JSON.stringify(rpcBodies.slice(beforeSave))}`,
			);
		}
	} finally {
		releaseSave();
	}

	await resetHp(page);
	await page.getByText("33 / 38").first().waitFor();
	failMode = "network";
	const beforeNetwork = rpcBodies.length;
	await page.getByRole("button", { name: "-5" }).first().click();
	await page.getByText("Não foi possível salvar os PV").waitFor();
	// No celular a ficha é um dialog e o aviso fica fora dele: o papel some
	// da árvore, mas o botão continua na tela e recebe o clique.
	const retry = page.getByText("Tentar de novo", { exact: true });
	await retry.waitFor();
	const healthAfterNetwork = await sheetHealth(page);
	if (healthAfterNetwork !== 33) {
		throw new Error(
			`A falha de rede não devolveu o PV anterior (ficou ${healthAfterNetwork}).`,
		);
	}
	await page.waitForTimeout(200);
	await shoot(page, `erro-rede-${suffix}`);
	await retry.click({ force: true });
	await page.getByText("28 / 38").first().waitFor();
	await page.getByText("Salvando…").waitFor({ state: "hidden" });
	const retried = rpcBodies[beforeNetwork + 1];
	if (!retried || retried.p_current !== 28) {
		throw new Error(
			`Tentar de novo não refez a mesma gravação: ${JSON.stringify(rpcBodies.slice(beforeNetwork))}`,
		);
	}
	await page.getByText("Não foi possível salvar os PV").waitFor({ state: "detached" });
	await page
		.getByText("Tentar de novo", { exact: true })
		.waitFor({ state: "detached" });

	await resetHp(page);
	await page.getByText("33 / 38").first().waitFor();
	failMode = "permission";
	await page.getByRole("button", { name: "-5" }).first().click();
	await page.getByText("Você não pode alterar os PV desta ficha.").waitFor();
	if ((await page.getByText("Não foi possível salvar os PV").count()) !== 0) {
		throw new Error("Erro 42501 mostrou a mensagem de rede.");
	}
	if ((await page.getByText("Tentar de novo", { exact: true }).count()) !== 0) {
		throw new Error("Erro 42501 ofereceu Tentar de novo.");
	}
	if ((await sheetHealth(page)) !== 33) {
		throw new Error("A falta de permissão não devolveu o PV anterior.");
	}
	await page.waitForTimeout(200);
	await shoot(page, `erro-permissao-${suffix}`);
}

async function main() {
	await mkdir(OUTPUT, { recursive: true });
	const server = await createServer({
		configLoader: "runner",
		server: { host: "127.0.0.1", port: 3117, strictPort: true },
	});
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	page.on("request", (request) => {
		try {
			const host = new URL(request.url()).host;
			if (host.includes("supabase")) foreignHosts.push(host);
		} catch {
			// data URLs
		}
	});
	page.on("pageerror", (error) => {
		console.error("pageerror", error.message);
	});
	await page.route(`${SUPABASE_URL}/**`, handleSupabase);
	await page.route("**://*.supabase.co/**", (route) => {
		foreignHosts.push(new URL(route.request().url()).host);
		return route.abort();
	});
	await page.routeWebSocket(`${SUPABASE_URL.replace("http", "ws")}/**`, (socket) =>
		socket.close(),
	);
	await page.addInitScript(() => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
	});
	try {
		await runViewport(page, 1440, 900);
		await runViewport(page, 390, 844);
		if (foreignHosts.length > 0) {
			throw new Error(
				`Houve pedido fora do Supabase fake: ${foreignHosts.join(", ")}`,
			);
		}
		console.log(`PNGs em ${OUTPUT}`);
	} catch (error) {
		console.error(error instanceof Error ? error.stack ?? error.message : error);
		await page
			.screenshot({ path: path.join(OUTPUT, "debug-falha.png") })
			.catch(() => {});
		const text = await page
			.locator("body")
			.innerText()
			.catch(() => "");
		console.error(text.slice(0, 1200));
		process.exitCode = 1;
		throw error;
	} finally {
		await Promise.race([
			(async () => {
				await browser.close();
				await server.close();
			})(),
			new Promise((resolve) => setTimeout(resolve, 8000)),
		]);
		process.exit(process.exitCode ?? 0);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
