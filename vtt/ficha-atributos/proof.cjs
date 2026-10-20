// Prova: painel "Ficha na Mesa" com ficha antiga (0) e nova; rolagem FOR; ficha x painel.
const { chromium } = require("playwright");
const path = require("node:path");
const OUT = "/workspace/arkhiveon/previews/vtt/ficha-atributos";
const BASE = process.env.BASE || "http://127.0.0.1:4173";
const base = { system: "dnd5e", race: "Humana", class: "Guerreiro", level: 5, health: 10, healthMax: 10, armorClass: 0, speed: 0, inventoryList: [], sheetLayout: undefined };
const OLD = { ...base, id: "old", characterName: "QA Guerreira", strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 };
const NEW = { ...base, id: "qa-nova", characterName: "QA Nova", strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 10, charisma: 3 };
const campaign = { id: "demo-qa", name: "QA Designer (teste)", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e", worldId: "w" };

async function setup(browser, vp) {
	const ctx = await browser.newContext({ viewport: vp });
	await ctx.routeWebSocket("**/realtime/v1/**", (r) => r.close());
	await ctx.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
	await ctx.route("**/functions/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
	await ctx.addInitScript((s) => {
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: s, version: 0 }));
	}, { campaigns: [campaign], activeCampaignId: "demo-qa", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [OLD, NEW], npcs: [] });
	return ctx;
}

async function openVtt(page) {
	await page.goto(`${BASE}/campaigns/demo-qa/vtt`, { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__ && window.__rpg_store__, { timeout: 30000 });
	await page.waitForTimeout(3000);
	await page.evaluate(([c, chars]) => {
		window.__rpg_store__.setState({ campaigns: [c], activeCampaignId: "demo-qa", characters: chars });
	}, [campaign, [OLD, NEW]]);
	await page.waitForTimeout(1500);
	for (let i = 0; i < 6; i++) {
	await page.evaluate(() => {
			const s = window.__vtt_store__.getState();
			s.setIsGM(true);
			const scene = { id: "scene", campaignId: "demo-qa", name: "Cena Inicial", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.15, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1600, height: 1200, fogEnabled: false, fogExploration: false, isActive: true, orderIndex: 0 };
			s.setScenes([scene]);
			s.setActiveSceneId("scene");
			const t = { sceneId: "scene", x: 315, y: 245, layer: "token", sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: [], hpCurrent: 10, hpMax: 10 };
			s.setTokens([{ ...t, id: "t-old", characterId: "old", name: "QA Guerreira" }, { ...t, id: "t-new", characterId: "qa-nova", name: "QA Nova", x: 455 }]);
		});
		await page.waitForTimeout(2500);
		if (await page.locator("canvas").count()) break;
	}

	console.log(await page.evaluate(() => { const s = window.__vtt_store__.getState(); return JSON.stringify({ scenes: s.scenes?.length, active: s.activeSceneId, canv: document.querySelectorAll("canvas").length }); }));
	await page.locator("canvas").first().waitFor().catch(async (e) => { await page.screenshot({ path: path.join(OUT, "_debug.png") }); throw e; });
}

async function showPanel(page, tokenId) {
	await page.waitForTimeout(2000);
	await page.evaluate((id) => {
		const s = window.__vtt_store__.getState();
		const t = { sceneId: "scene", x: 315, y: 245, layer: "token", sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: [], hpCurrent: 10, hpMax: 10 };
		s.setTokens([{ ...t, id: "t-old", characterId: "old", name: "QA Guerreira" }, { ...t, id: "t-new", characterId: "qa-nova", name: "QA Nova", x: 455 }]);
		s.setShowCharacterSheetId(id);
	}, tokenId);
	await page.getByText("Ficha na mesa", { exact: true }).waitFor({ timeout: 8000 }).catch(async (e) => { await page.screenshot({ path: path.join(OUT, "_debug.png") }); console.log(await page.evaluate(() => window.__vtt_store__.getState().showCharacterSheetId)); throw e; });
	await page.waitForTimeout(600);
}

async function chips(page) {
	return page.evaluate(() => {
		const aside = document.querySelector('aside[aria-label="Ficha na mesa"]');
		return [...aside.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((t) => /^(FOR|DES|CON|INT|SAB|CAR)/.test(t));
	});
}

(async () => {
	const browser = await chromium.launch();
	const log = [];
	for (const vp of (process.env.ONLY ? [{ width: 1440, height: 900 }] : [{ width: 1440, height: 900 }, { width: 390, height: 844 }])) {
		const w = vp.width;
		const ctx = await setup(browser, vp);
		const page = await ctx.newPage();
		await openVtt(page);
		await showPanel(page, "t-old");
		log.push(`${w} antiga: ${(await chips(page)).join(" ")}`);
		await page.screenshot({ path: path.join(OUT, `depois-painel-ficha-antiga-${w}.png`) });
		await showPanel(page, "t-new");
		log.push(`${w} nova: ${(await chips(page)).join(" ")}`);
		await page.screenshot({ path: path.join(OUT, `depois-painel-ficha-nova-${w}.png`) });
		const panel = await page.locator('aside[aria-label="Ficha na mesa"]').screenshot({ path: path.join(OUT, `_painel-nova-${w}.png`) });
		await page.locator('aside[aria-label="Ficha na mesa"] button', { hasText: /^FOR/ }).click();
		const rollText = page.getByText(/^FOR: \d+/);
		await rollText.waitFor({ timeout: 20000 });
		await page.waitForTimeout(400);
		log.push(`${w} rolagem: ${await rollText.first().textContent()}`);
		await page.screenshot({ path: path.join(OUT, `depois-rolagem-for-${w}.png`) });
		// Ficha do mesmo personagem
		await page.evaluate(() => window.__TSR_ROUTER__.navigate({ to: "/sheets/$characterId", params: { characterId: "qa-nova" } }));
		await page.waitForTimeout(2500);
		await page.evaluate(([c, chars]) => window.__rpg_store__.setState({ campaigns: [c], activeCampaignId: "demo-qa", characters: chars, isLoadingRemote: false }), [campaign, [OLD, NEW]]);
		await page.waitForTimeout(1000);
		console.log("url", page.url(), await page.evaluate(() => [location.pathname, window.__TSR_ROUTER__ ? "router" : "no-router"]));
		const attr = page.getByRole("heading", { name: /atributos/i }).first();
		await attr.waitFor({ timeout: 30000 });
		await attr.evaluate((el) => el.scrollIntoView({ block: "start" }));
		await page.waitForTimeout(800);
		await page.screenshot({ path: path.join(OUT, `_ficha-nova-${w}.png`) });
		await attr.locator('xpath=ancestor::*[.//*[normalize-space(text())="Carisma"]][1]').screenshot({ path: path.join(OUT, `_ficha-atributos-${w}.png`) });
		await ctx.close();
		void panel;
	}
	await browser.close();
	console.log(log.join("\n"));
})().catch((e) => { console.error(e); process.exit(1); });
