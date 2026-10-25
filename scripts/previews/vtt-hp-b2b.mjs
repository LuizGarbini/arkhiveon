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
const OUTPUT = path.join(os.homedir(), "projects", "b2b-previews");

process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = "preview-anon-key";

const now = new Date().toISOString();
let health = 33;
const healthMax = 38;
let denyNext = false;
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
		if (denyNext) {
			denyNext = false;
			return fulfill(
				route,
				{
					message: "Você não pode alterar os PV desta ficha.",
					code: "42501",
				},
				403,
			);
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
	denyNext = false;
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

async function runViewport(page, width, height) {
	const suffix = `${width}x${height}`;
	health = 33;
	denyNext = false;
	await page.setViewportSize({ width, height });
	await prepare(page);
	await setRole(page, "owner");
	const tokenX = width < 700 ? 180 : 480;
	const tokenY = width < 700 ? 220 : 340;
	await placeToken(page, tokenX, tokenY);
	await openPanels(page, { menu: true, sheet: false });
	await page.getByText("33 / 38").first().waitFor();
	await page.waitForTimeout(400);
	await shoot(page, `mestre-token-${suffix}`);

	await openPanels(page, { menu: false, sheet: true });
	await page.getByText("33 / 38").first().waitFor();
	await page.getByRole("spinbutton", { name: "PV máximo" }).waitFor();
	await page.waitForTimeout(300);
	await shoot(page, `mestre-ficha-${suffix}`);

	await setRole(page, "viewer");
	await placeToken(page, tokenX, tokenY);
	await openPanels(page, { menu: false, sheet: true });
	await page.getByText("33", { exact: true }).first().waitFor();
	if ((await page.getByText("33 / 38").count()) !== 0) {
		throw new Error("Jogador ainda vê o PV máximo.");
	}
	if ((await page.getByRole("spinbutton", { name: "PV máximo" }).count()) !== 0) {
		throw new Error("Jogador ainda pode editar o PV máximo.");
	}
	await page.waitForTimeout(300);
	await shoot(page, `jogador-ficha-sem-max-${suffix}`);

	await setRole(page, "owner");
	await placeToken(page, tokenX, tokenY);
	await openPanels(page, { menu: false, sheet: true });
	const damageButton = page.getByRole("button", { name: "-5" }).first();
	try {
		await damageButton.waitFor({ timeout: 8000 });
	} catch (error) {
		const state = await page.evaluate(() => {
			const vtt = window.__vtt_store__.getState();
			return {
				isGM: vtt.isGM,
				menu: vtt.activeTokenIdForMenu,
				sheet: vtt.showCharacterSheetId,
				open: vtt.openSheetIds,
				scene: vtt.activeSceneId,
				tokens: vtt.tokens.map((item) => item.id),
			};
		});
		throw new Error(`Sem botão -5. ${JSON.stringify(state)}`, { cause: error });
	}
	const before = rpcBodies.length;
	await damageButton.click();
	const damageDeadline = Date.now() + 8000;
	while (rpcBodies.length === before && Date.now() < damageDeadline) {
		await page.waitForTimeout(50);
	}
	await page.getByText("28 / 38").first().waitFor();
	const damage = rpcBodies[before];
	if (!damage || damage.p_current !== 28 || "p_max" in damage) {
		throw new Error(`RPC de dano inesperada: ${JSON.stringify(damage)}`);
	}
	await openPanels(page, { menu: true, sheet: true });
	await page.getByText("28 / 38").nth(1).waitFor();
	await fitSheetBelowMenu(page, width);
	await page.waitForTimeout(400);
	await shoot(page, `apos-dano-${suffix}`);

	denyNext = true;
	await page.getByRole("button", { name: "-5" }).first().click();
	await page.getByText("Não foi possível alterar os PV").waitFor();
	await page.getByText("Você não pode alterar os PV desta ficha.").waitFor();
	await page.getByText("28 / 38").first().waitFor();
	const reverted = await page.evaluate(
		() =>
			window.__rpg_store__
				.getState()
				.characters.find((item) => item.id === "char-lyra")?.health,
	);
	if (reverted !== 28) {
		throw new Error(`O PV não voltou ao valor anterior (ficou ${reverted}).`);
	}
	await fitSheetBelowMenu(page, width);
	await page.waitForTimeout(300);
	await shoot(page, `erro-revertido-${suffix}`);
}

async function fitSheetBelowMenu(page, width) {
	if (width >= 700) return;
	await page.evaluate(() => {
		const sheet = document.querySelector("[data-vtt-focus-scope='sheet']");
		if (!(sheet instanceof HTMLElement)) return;
		sheet.style.maxHeight = "52dvh";
	});
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
		await page
			.screenshot({ path: path.join(OUTPUT, "debug-falha.png") })
			.catch(() => {});
		const text = await page
			.locator("body")
			.innerText()
			.catch(() => "");
		console.error(text.slice(0, 2500));
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
