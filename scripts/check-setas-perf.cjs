// Desempenho das setas do teclado, com teclado de verdade e um "servidor" simulado:
// alterna cima/baixo (ou direita/esquerda) rápido, com 1 token e com um grupo de 8,
// numa mesa com vários tokens, com e sem névoa de exploração. O Supabase é simulado
// com ATRASO ALEATÓRIO (30–150 ms) e o Realtime devolve o eco de cada gravação (como
// o banco de verdade faz), então dá para ver gravação fora de ordem e eco velho.
// Mede e falha se:
//  - o token VISUAL (objeto Pixi) der salto para trás ("voltar para o local antigo");
//  - o passo teletransportar (um quadro andar quase uma casa inteira);
//  - os tokens forem reconstruídos / o canvas re-renderizar demais por toque;
//  - houver mais de uma gravação em voo por token, gravação demais, ou a posição
//    final gravada no banco não for a última pedida (gravação final perdida).
// Uso: pnpm check:setas-perf   (sai com código 1 se algo quebrar)
//      SETAS_PERF_CPU=4 pnpm check:setas-perf   (simula CPU 4x mais lenta; só relata)
//      SETAS_ONLY=<n> roda um cenário; SETAS_VIEWPORT=400x300 diminui o canvas (menos trabalho de GL)
const { chromium } = require("playwright");

const CELL = 70;
const PORT = Number(process.env.SETAS_PORT || 3150);
const cpuRate = Number(process.env.SETAS_PERF_CPU || 1);

function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCENARIOS = [
	{ name: "1 token, cima/baixo, mesa simples", group: 1, keys: ["ArrowUp", "ArrowDown"], fog: false },
	{ name: "grupo de 8, cima/baixo, mesa simples, com alvo remoto antigo", group: 8, keys: ["ArrowUp", "ArrowDown"], fog: false, staleTarget: true },
	{ name: "1 token, direita/esquerda, exploração", group: 1, keys: ["ArrowRight", "ArrowLeft"], fog: true },
	{ name: "grupo de 8, direita/esquerda, exploração", group: 8, keys: ["ArrowRight", "ArrowLeft"], fog: true },
	{ name: "misto: setas + Q/E + arrasto + outro usuário mexendo noutro token", group: 3, keys: [], fog: true, mixed: true },
];
const TAPS = 31; // ímpar: termina uma casa adiante do começo
const GAP_MS = 45;
const VEC = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowRight: [1, 0], ArrowLeft: [-1, 0] };
const ROT = { ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: 270 };

async function runScenario(browser, scenario, index) {
	const random = rng(1000 + index);
	const [vw, vh] = (process.env.SETAS_VIEWPORT || "1280x800").split("x").map(Number);
	const context = await browser.newContext({ viewport: { width: vw, height: vh } });
	const db = new Map();
	const writes = [];
	const inflight = new Map();
	const maxInflight = new Map();
	let broadcasts = 0;
	let moveInserts = 0;
	const reqCounts = {};
	let arrivals = 0;
	let echoChain = 0;
	let tokenChannel = null;
	let nextBind = 100;
	const t0 = Date.now();
	const rowOf = (t) => ({ id: t.id, scene_id: "s1", character_id: null, npc_id: null, name: t.name, avatar_url: null, layer: "token", x: t.x, y: t.y, size_cells: 1, rotation: t.rotation, hp_current: null, hp_max: null, temp_hp: 0, elevation: 0, conditions: [], auras: [], vision_range: 6, is_locked: false, is_hidden: false, controlled_by: t.controlledBy, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });

	await context.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
		ws.onMessage((raw) => {
			if (typeof raw !== "string") {
				if (Buffer.from(raw).toString("latin1").includes("token_drag")) broadcasts++;
				return;
			}
			let msg;
			try { msg = JSON.parse(raw); } catch { return; }
			const [joinRef, ref, topic, event, payload] = msg;
			if (event === "phx_join") {
				const pg = (payload?.config?.postgres_changes || []).map((f) => ({ id: nextBind++, ...f }));
				if (topic.includes("vtt-tokens-live")) {
					tokenChannel = { ws, topic, ids: pg.map((p) => p.id) };
				}
				ws.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: { postgres_changes: pg } }]));
			} else if (event === "heartbeat") {
				ws.send(JSON.stringify([null, ref, "phoenix", "phx_reply", { status: "ok", response: {} }]));
			} else if (event === "phx_leave") {
				ws.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }]));
			}
		});
	});

	const echo = (row) => {
		if (!tokenChannel) return;
		// O Realtime entrega em ordem, com atraso.
		const at = Math.max(echoChain, Date.now() + 20 + random() * 110);
		echoChain = at;
		setTimeout(() => {
			tokenChannel.ws.send(JSON.stringify([null, null, tokenChannel.topic, "postgres_changes", { ids: tokenChannel.ids, data: { schema: "public", table: "vtt_tokens", commit_timestamp: new Date().toISOString(), type: "UPDATE", columns: [], record: row, old_record: { id: row.id }, errors: null } }]));
		}, at - Date.now());
	};

	await context.route("**/rest/v1/**", async (r) => {
		const req = r.request();
		const url = req.url();
		if (url.includes("vtt_token_moves") && req.method() === "POST") moveInserts++;
		{ const key = `${req.method()} ${new URL(url).pathname.replace("/rest/v1/", "")}`; reqCounts[key] = (reqCounts[key] || 0) + 1; }
		if (url.includes("/rest/v1/vtt_tokens") && req.method() === "PATCH") {
			const id = decodeURIComponent((url.match(/[?&]id=eq\.([^&]+)/) || [])[1] || "");
			const body = JSON.parse(req.postData() || "{}");
			const sentAt = Date.now() - t0;
			arrivals++;
			const n = (inflight.get(id) || 0) + 1;
			inflight.set(id, n);
			maxInflight.set(id, Math.max(maxInflight.get(id) || 0, n));
			await sleep(30 + random() * 120);
			const row = db.get(id);
			if (row) {
				Object.assign(row, body);
				writes.push({ id, x: body.x, y: body.y, rotation: body.rotation, sentAt, appliedAt: Date.now() - t0 });
				echo({ ...row });
			}
			inflight.set(id, (inflight.get(id) || 1) - 1);
			return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id }) });
		}
		if (url.includes("/rest/v1/vtt_tokens") && req.method() === "GET") {
			return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([...db.values()].map((row) => ({ ...row }))) });
		}
		return r.fulfill({ status: 200, contentType: "application/json", body: url.includes("/rpc/") ? "null" : "[]" });
	});
	await context.addInitScript(() => {
		window.__fetches = [];
		const of = window.fetch.bind(window);
		window.__lat = [];
		window.fetch = (...a) => { const u = String(a[0]?.url || a[0]); const m = a[1]?.method || a[0]?.method || 'GET'; if (u.includes('vtt_tokens') && m === 'PATCH') { const t = performance.now(); window.__fetches.push(t); return of(...a).then((res) => { window.__lat.push(performance.now() - t); return res; }); } return of(...a); };
		localStorage.setItem("arkhiveon_preview_auth", "true");
		localStorage.setItem("rpg-notes-storage", JSON.stringify({ state: { campaigns: [{ id: "demo", name: "D", ownerId: "preview-gm-user", myRole: "owner", system: "dnd5e" }], activeCampaignId: "demo", hasLoadedCampaigns: true, campaignLoadStatus: "ready", characters: [], npcs: [] }, version: 0 }));
	});
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	if (process.env.SETAS_DEBUG) { page.on("requestfailed", (rq) => console.log("FAILED", rq.method(), rq.url().slice(0, 100), rq.failure()?.errorText)); page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console:", m.text().slice(0, 160)); }); }
	await page.goto(`http://127.0.0.1:${PORT}/campaigns/demo/vtt`, { waitUntil: "domcontentloaded", timeout: 90000 });
	await page.waitForFunction(() => window.__vtt_store__, { timeout: 30000 });
	await page.waitForTimeout(1500);

	const mk = (id, name, x, y, extra = {}) => ({ id, sceneId: "s1", name, layer: "token", x, y, sizeCells: 1, rotation: 0, elevation: 0, conditions: [], auras: [], visionRange: 6, isLocked: false, isHidden: false, controlledBy: ["preview-gm-user"], ...extra });
	// staleTarget: o token já foi movido por outro usuário antes e guarda o alvo de interpolação antigo.
	const mine = Array.from({ length: scenario.group }, (_, i) => mk(`p${i}`, `Pj${i}`, 105 + CELL * i, 455, scenario.staleTarget ? { targetX: 105 + CELL * i, targetY: 455 } : {}));
	const decoys = Array.from({ length: 20 }, (_, i) => mk(`n${i}`, `Npc${i}`, 1155 + (i % 3) * CELL, 105 + Math.floor(i / 3) * CELL * 1.5, { controlledBy: [] }));
	const all = [...mine, ...decoys];
	for (const t of all) db.set(t.id, rowOf(t));
	await page.evaluate(({ fog }) => {
		const st = window.__vtt_store__.getState();
		st.setIsGM(false);
		st.setScenes([{ id: "s1", campaignId: "demo", name: "Mapa", gridType: "square", gridSize: 70, gridColor: "white", gridOpacity: 0.3, gridScaleDistance: 1.5, gridScaleUnit: "m", width: 1400, height: 900, fogEnabled: fog, fogExploration: fog, lightLevel: "bright", isActive: true, orderIndex: 0 }]);
		st.setActiveSceneId("s1");
	}, { fog: scenario.fog });
	await page.waitForTimeout(1800);
	await page.evaluate((tokens) => window.__vtt_store__.getState().setTokens(tokens), all);
	await page.waitForTimeout(1500);
	await page.evaluate((ids) => window.__vtt_store__.getState().setSelectedTokenIds(ids), mine.map((t) => t.id));
	await page.waitForTimeout(1500);

	if (cpuRate > 1) {
		const cdp = await context.newCDPSession(page);
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
	}

	await page.evaluate((ids) => {
		const m = (window.__perf = { frames: [], taps: [], long: [], sets: 0, tokenSets: 0, running: false, ids });
		window.addEventListener("keydown", (e) => { if (m.running && e.key.startsWith("Arrow")) m.taps.push({ t: performance.now(), key: e.key }); }, true);
		try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.long.push({ t: e.startTime, d: e.duration }); }).observe({ entryTypes: ["longtask"] }); } catch {}
		window.__vtt_store__.subscribe((s, p) => { if (!m.running) return; m.sets++; if (s.tokens !== p.tokens) m.tokenSets++; });
		const loop = () => {
			if (m.running) {
				const row = { t: performance.now() };
				for (const id of m.ids) { const p = window.__vtt_probe__.tokenPos(id); row[id] = p ? [p.x, p.y] : null; }
				m.frames.push(row);
			}
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
	}, mine.map((t) => t.id));
	await page.waitForTimeout(300);

	await page.evaluate(() => { window.__perf.running = true; });
	await page.waitForTimeout(1200); // quadros em repouso: o piso do ambiente (WebGL por software)
	const countsBefore = await page.evaluate(() => ({ ...window.__vtt_probe__.counts }));
	const writesBefore = writes.length;
	const broadcastsBefore = broadcasts;
	const burstStart = Date.now();
	const model = scenario.mixed ? Object.fromEntries(mine.map((t) => [t.id, { x: t.x, y: t.y, r: 0 }])) : null;
	let otherExpected = null;
	if (scenario.mixed) {
		// Rajada MISTA: setas, giro Q/E (com e sem Shift), arrasto com o mouse e, no meio,
		// OUTRO usuário movendo um token qualquer (o eco dele nunca pode ser engolido).
		const script = ["ArrowUp", "ArrowRight", "e", "e", "ArrowDown", "q", "other", "ArrowLeft", "ArrowRight", "drag", "e", "ArrowUp", "ArrowUp", "q", "Shift+E", "ArrowDown", "ArrowLeft"];
		const box = await page.locator("canvas").first().boundingBox();
		for (const action of script) {
			if (action === "other") {
				const n0 = db.get("n0");
				n0.x += CELL;
				otherExpected = { x: n0.x, y: n0.y };
				echo({ ...n0 });
			} else if (action === "drag") {
				await page.waitForTimeout(400); // o último passo termina de deslizar
				const vp = await page.evaluate(() => window.__vtt_store__.getState().viewport);
				const at = await page.evaluate((id) => window.__vtt_probe__.tokenPos(id), mine[0].id);
				const from = { x: box.x + vp.x + at.x * vp.scale, y: box.y + vp.y + at.y * vp.scale };
				await page.mouse.move(from.x, from.y);
				await page.mouse.down();
				for (let i = 1; i <= 12; i++) { await page.mouse.move(from.x + (3 * CELL * vp.scale * i) / 12, from.y, { steps: 2 }); await page.waitForTimeout(30); }
				await page.mouse.up();
				for (const m of Object.values(model)) { m.x += 3 * CELL; m.r = 90; }
			} else {
				await page.keyboard.press(action);
				for (const m of Object.values(model)) {
					if (VEC[action]) { m.x += VEC[action][0] * CELL; m.y += VEC[action][1] * CELL; m.r = ROT[action]; }
					else if (action === "e") m.r = (m.r + 45) % 360;
					else if (action === "q") m.r = (m.r + 315) % 360;
					else if (action === "Shift+E") m.r = (m.r + 15) % 360;
				}
			}
			await page.waitForTimeout(action === "drag" ? 150 : GAP_MS + 20);
		}
	} else {
		for (let i = 0; i < TAPS; i++) {
			await page.keyboard.press(scenario.keys[i % 2]);
			await page.waitForTimeout(GAP_MS);
		}
	}
	const burstMs = Date.now() - burstStart;
	const lastTapAt = Date.now();
	// Espera tudo assentar: a fila de gravações da página vazia, nada em voo no servidor,
	// o último eco entregue e nenhuma gravação nova por 1,2 s. (Só olhar o servidor não
	// basta: a página pode segurar uma gravação por segundos antes de a requisição sair.)
	let quietSince = Date.now();
	let lastCount = -1;
	let settled = false;
	const settleDeadline = Date.now() + 60000;
	while (Date.now() < settleDeadline) {
		await page.waitForTimeout(250);
		const calls = await page.evaluate(() => window.__fetches.length);
		const pageBusy = await page.evaluate(() => (window.__vtt_probe__.writesBusy ? window.__vtt_probe__.writesBusy() : 0));
		const busy = pageBusy > 0 || [...inflight.values()].some((n) => n > 0) || Date.now() < echoChain + 300;
		if (calls !== lastCount || busy) { lastCount = calls; quietSince = Date.now(); }
		else if (Date.now() - quietSince >= 1200) { settled = true; break; }
	}
	const settleMs = Date.now() - lastTapAt;
	const lastWriteAt = writes.length ? writes[writes.length - 1].appliedAt : 0;
	const pageCalls = await page.evaluate(() => window.__fetches.length);
	const lat = (await page.evaluate(() => window.__lat)).sort((a, b) => a - b);
	const latStats = lat.length ? { mean: Math.round(lat.reduce((x, y) => x + y, 0) / lat.length), p95: Math.round(lat[Math.floor(lat.length * 0.95)]), max: Math.round(lat[lat.length - 1]) } : null;
	await page.evaluate(() => { window.__perf.running = false; });
	const countsAfter = await page.evaluate(() => ({ ...window.__vtt_probe__.counts }));
	const perf = await page.evaluate(() => window.__perf);
	const finalStore = await page.evaluate((ids) => Object.fromEntries(window.__vtt_store__.getState().tokens.filter((t) => ids.includes(t.id)).map((t) => [t.id, { x: t.x, y: t.y, r: t.rotation }])), mine.map((t) => t.id));
	// (c) depois da rajada: a seta de direção desenhada bate com o ângulo final (convive com o
	// giro Q/E) e o destaque de personagem (ping) ainda acha o token onde ele está agora.
	let facingOk = true, facingGot = null, highlightOk = true, highlightGot = null;
	if (scenario.mixed) {
		facingGot = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.__vtt_probe__.facing(id)])), mine.map((t) => t.id));
		facingOk = mine.every((t) => facingGot[t.id] === model[t.id].r);
		const box2 = await page.locator("canvas").first().boundingBox();
		const vp2 = await page.evaluate(() => window.__vtt_store__.getState().viewport);
		await page.evaluate(() => { const st = window.__vtt_store__.getState(); st.setSelectedTokenIds([]); st.setPingKind("highlight"); st.setActiveTool("ping"); });
		await page.mouse.click(box2.x + vp2.x + model[mine[1].id].x * vp2.scale, box2.y + vp2.y + model[mine[1].id].y * vp2.scale);
		await page.waitForTimeout(400);
		highlightGot = await page.evaluate(() => window.__vtt_store__.getState().activePings.map((p) => ({ kind: p.kind, tokenId: p.tokenId, x: p.x, y: p.y })));
		highlightOk = highlightGot.length === 1 && highlightGot[0].kind === "highlight" && highlightGot[0].tokenId === mine[1].id && highlightGot[0].x === model[mine[1].id].x && highlightGot[0].y === model[mine[1].id].y;
	}
	const otherStore = otherExpected ? await page.evaluate(() => { const t = window.__vtt_store__.getState().tokens.find((x) => x.id === "n0"); return t && { x: t.x, y: t.y }; }) : null;
	const finalVisual = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.__vtt_probe__.tokenPos(id)])), mine.map((t) => t.id));
	const banner = await page.locator('[role="alert"]').allInnerTexts();
	await context.close();

	// ---- análise ----
	const diff = (k) => (countsAfter[k] || 0) - (countsBefore[k] || 0);
	const lead = mine[0];
	const taps = perf.taps;
	const targetAt = (t) => {
		let x = lead.x, y = lead.y;
		for (const tap of taps) { if (tap.t > t) break; x += VEC[tap.key][0] * CELL; y += VEC[tap.key][1] * CELL; }
		return { x, y, n: taps.filter((tap) => tap.t <= t).length };
	};
	const frames = perf.frames.filter((f) => f[lead.id]);
	const firstTap = taps[0]?.t ?? 0;
	const lastTap = taps[taps.length - 1]?.t ?? 0;
	let backward = 0;
	let teleports = 0;
	let maxJump = 0;
	let maxBack = 0;
	for (let i = 1; !scenario.mixed && i < frames.length; i++) {
		const a = frames[i - 1], b = frames[i];
		if (b.t < firstTap - 50) continue;
		const pa = a[lead.id], pb = b[lead.id];
		const jump = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
		if (jump > maxJump) maxJump = jump;
		// teletransporte = salto grande num quadro NORMAL; quadro travado (>60 ms) engole o tween inteiro
		if (jump > CELL * 0.75 && b.t - a.t <= 60) teleports++;
		const ta = targetAt(a.t), tb = targetAt(b.t);
		if (ta.n !== tb.n) continue; // um toque novo mudou o alvo neste intervalo
		const da = Math.hypot(pa[0] - tb.x, pa[1] - tb.y);
		const db2 = Math.hypot(pb[0] - tb.x, pb[1] - tb.y);
		if (db2 > da + 0.5) { backward++; maxBack = Math.max(maxBack, db2 - da); }
	}
	const idleDts = [];
	const idleFrames = frames.filter((f) => f.t < firstTap - 50);
	for (let i = 1; i < idleFrames.length; i++) idleDts.push(idleFrames[i].t - idleFrames[i - 1].t);
	idleDts.sort((a, b) => a - b);
	const idleP95 = idleDts.length ? idleDts[Math.floor(idleDts.length * 0.95)] : 0;
	const win = frames.filter((f) => f.t >= firstTap && f.t <= lastTap + 300);
	const dts = [];
	for (let i = 1; i < win.length; i++) dts.push(win[i].t - win[i - 1].t);
	dts.sort((a, b) => a - b);
	const p95 = dts.length ? dts[Math.floor(dts.length * 0.95)] : 0;
	const maxDt = dts.length ? dts[dts.length - 1] : 0;
	const longTasks = perf.long.filter((l) => l.t >= firstTap - 20);
	const lastTapKey = taps[taps.length - 1]?.key;
	const expected = { x: lead.x + taps.reduce((s, tap) => s + VEC[tap.key][0] * CELL, 0), y: lead.y + taps.reduce((s, tap) => s + VEC[tap.key][1] * CELL, 0) };
	const finals = mine.map((t, i) => {
		const ex = model ? { x: model[t.id].x, y: model[t.id].y } : { x: t.x + (expected.x - lead.x), y: t.y + (expected.y - lead.y) };
		const wantRot = model ? model[t.id].r : ROT[lastTapKey];
		const row = db.get(t.id);
		const store = finalStore[t.id];
		const vis = finalVisual[t.id];
		const lastWrite = [...writes].reverse().find((w) => w.id === t.id);
		return { id: t.id, ex, got: { db: { x: row.x, y: row.y, r: row.rotation }, store, last: lastWrite && { x: lastWrite.x, y: lastWrite.y } }, dbOk: row.x === ex.x && row.y === ex.y && row.rotation === wantRot, storeOk: store && store.x === ex.x && store.y === ex.y && store.r === wantRot, visOk: vis && Math.abs(vis.x - ex.x) < 0.5 && Math.abs(vis.y - ex.y) < 0.5, lastApplied: model ? row.x === ex.x && row.y === ex.y && row.rotation === wantRot : lastWrite && lastWrite.x === ex.x && lastWrite.y === ex.y, wantRot };
	});
	const myWrites = writes.slice(writesBefore).filter((w) => w.id.startsWith("p"));
	const perTokenWrites = myWrites.length / scenario.group;
	const maxConc = Math.max(0, ...mine.map((t) => maxInflight.get(t.id) || 0));
	const tapsDone = taps.length;
	return {
		scenario, tapsDone, burstMs, errors, arrivals, banner, settleMs, settled, pageCalls, latStats, moveInserts, reqCounts, lastWriteLagMs: Math.max(0, lastWriteAt - (lastTapAt - t0)),
		rebuilds: diff("tokenRebuild"), renders: diff("canvasRender"), visionRuns: diff("visionRun"),
		storeSets: perf.sets, tokenSets: perf.tokenSets,
		writes: myWrites.length, perTokenWrites, maxConc, broadcasts: broadcasts - broadcastsBefore,
		backward, maxBack, teleports, maxJump, p95, maxDt, idleP95, longTasks: longTasks.length, longTaskMs: Math.round(longTasks.reduce((s, l) => s + l.d, 0)), longTaskMax: Math.round(Math.max(0, ...longTasks.map((l) => l.d))),
		facingOk, facingGot, highlightOk, highlightGot, finals, otherOk: otherExpected ? Boolean(otherStore) && otherStore.x === otherExpected.x && otherStore.y === otherExpected.y : true, otherStore, otherExpected,
		debugWrites: process.env.SETAS_DEBUG ? writes.filter((w) => w.id === (finals.find((f) => !f.dbOk) || {}).id).map((w) => `${w.sentAt - (lastTapAt - t0)}ms ${w.x},${w.y},${w.rotation} applied ${w.appliedAt - (lastTapAt - t0)}`) : [],
	};
}

async function main() {
	// O Supabase é simulado: URL e chave de mentira bastam (e o check roda em worktree sem .env).
	process.env.VITE_SUPABASE_URL ||= "https://setas-perf.supabase.co";
	process.env.VITE_SUPABASE_ANON_KEY ||= "setas-perf-anon-key";
	const { createServer } = await import("vite");
	const server = await createServer({ configLoader: "runner", mode: "test", server: { host: "127.0.0.1", port: PORT, strictPort: true } });
	await server.listen();
	const browser = await chromium.launch({ headless: true });
	const problems = [];
	console.log(`CPU: ${cpuRate}x   toques: ${TAPS} (a cada ~${GAP_MS} ms)   atraso do servidor simulado: 30–150 ms, eco do Realtime: +20–130 ms`);
	for (let i = 0; i < SCENARIOS.length; i++) {
		if (process.env.SETAS_ONLY && Number(process.env.SETAS_ONLY) !== i) continue;
		const r = await runScenario(browser, SCENARIOS[i], i);
		const n = Math.max(1, r.tapsDone);
		console.log(`\n== ${r.scenario.name} ==`);
		console.log(`  PATCH chamados pela página: ${r.pageCalls}, recebidos pelo servidor: ${r.arrivals}; ${r.settled ? "assentou" : "NÃO assentou (limite de 60 s)"} ${r.settleMs} ms após o último toque (última gravação aplicada ${r.lastWriteLagMs} ms depois dele)`);
		if (r.banner.length) console.log(`  aviso na tela: ${r.banner.join(" / ").slice(0, 120)}`);
		console.log(`  latência de cada gravação (chamada→resposta na página): ${r.latStats ? `média ${r.latStats.mean} ms, p95 ${r.latStats.p95} ms, máx ${r.latStats.max} ms` : "n/a"} | inserts do histórico (vtt_token_moves): ${r.moveInserts}`);
		if (process.env.SETAS_DEBUG) console.log(`  requisições REST (desde o início da página): ${JSON.stringify(r.reqCounts)}`);
		console.log(`  toques registrados: ${r.tapsDone} em ${r.burstMs} ms`);
		console.log(`  token visual: saltos para trás ${r.backward} (máx ${r.maxBack.toFixed(1)} px) | teleportes ${r.teleports} (maior salto/quadro ${r.maxJump.toFixed(1)} px)`);
		console.log(`  reconstruções de tokens: ${r.rebuilds} (${(r.rebuilds / n).toFixed(2)}/toque) | renders do canvas: ${r.renders} (${(r.renders / n).toFixed(2)}/toque; StrictMode renderiza 2x em dev => ~${(r.renders / 2 / n).toFixed(2)} reais/toque) | recálculos de visão: ${r.visionRuns}`);
		console.log(`  store: ${r.storeSets} mudanças (${(r.storeSets / n).toFixed(2)}/toque), ${r.tokenSets} em tokens`);
		console.log(`  gravações no banco: ${r.writes} (${r.perTokenWrites.toFixed(1)} por token, ${(r.writes / n).toFixed(2)}/toque), máx em voo por token ${r.maxConc} | broadcasts ${r.broadcasts}`);
		console.log(`  quadros: em repouso p95 ${r.idleP95.toFixed(1)} ms; na rajada p95 ${r.p95.toFixed(1)} ms, pior ${r.maxDt.toFixed(1)} ms | long tasks ${r.longTasks} (${r.longTaskMs} ms, maior ${r.longTaskMax} ms)`);
		console.log(`  final: banco ${r.finals.every((f) => f.dbOk) ? "ok" : "ERRADO"}, store ${r.finals.every((f) => f.storeOk) ? "ok" : "ERRADO"}, visual ${r.finals.every((f) => f.visOk) ? "ok" : "ERRADO"}, última gravação aplicada é a final ${r.finals.every((f) => f.lastApplied) ? "sim" : "NÃO"}`);
		if (r.debugWrites.length) console.log("  escritas do token errado (relativas ao último toque):\n    " + r.debugWrites.join("\n    "));
		const tag = r.scenario.name;
		if (cpuRate === 1 && !r.scenario.mixed) {
			if (r.backward > 0) problems.push(`${tag}: o token visual voltou para trás ${r.backward}x (até ${r.maxBack.toFixed(0)} px)`);
			if (r.teleports > 0) problems.push(`${tag}: ${r.teleports} quadros com salto de quase uma casa (teletransporte; maior ${r.maxJump.toFixed(0)} px)`);
			if (r.visionRuns > Math.max(4, n * 0.25)) problems.push(`${tag}: ${r.visionRuns} recálculos de visão em ${n} toques (limite ${Math.max(4, Math.floor(n * 0.25))}; sem adiar, é um por toque)`);
			if (r.storeSets / n > 1.5) problems.push(`${tag}: ${(r.storeSets / n).toFixed(2)} mudanças na store por toque (limite 1.5)`);
			if (r.rebuilds > 2) problems.push(`${tag}: ${r.rebuilds} reconstruções de tokens (limite 2)`);
			if (r.renders / 2 / n > 1.6) problems.push(`${tag}: ${(r.renders / 2 / n).toFixed(2)} renders reais do canvas por toque (limite 1.6)`);
			if (r.perTokenWrites > Math.ceil(r.burstMs / 100) + 4) problems.push(`${tag}: ${r.perTokenWrites.toFixed(1)} gravações por token em ${r.burstMs} ms (sem coalescer)`);
			if (r.broadcasts > Math.ceil(r.burstMs / 60) + 4) problems.push(`${tag}: ${r.broadcasts} broadcasts em ${r.burstMs} ms`);
		}
		if (r.maxConc > 1) problems.push(`${tag}: ${r.maxConc} gravações em voo ao mesmo tempo para o mesmo token (podem chegar fora de ordem)`);
		if (!r.finals.every((f) => f.dbOk)) problems.push(`${tag}: a posição final gravada no banco não é a última pedida (${JSON.stringify(r.finals.filter((f) => !f.dbOk).slice(0, 2))})`);
		if (!r.finals.every((f) => f.lastApplied)) problems.push(`${tag}: a última gravação aplicada pelo servidor não é a posição final`);
		if (!r.finals.every((f) => f.storeOk)) problems.push(`${tag}: a posição final na mesa não é a última pedida`);
		if (!r.finals.every((f) => f.visOk)) problems.push(`${tag}: o token desenhado não terminou na última posição pedida`);
		if (!r.settled) problems.push(`${tag}: as gravações não assentaram em 60 s depois do último toque`);
		if (!r.facingOk) problems.push(`${tag}: a seta de direção desenhada não bate com o ângulo final (${JSON.stringify(r.facingGot)})`);
		if (!r.highlightOk) problems.push(`${tag}: o destaque de personagem não achou o token na posição final (${JSON.stringify(r.highlightGot)})`);
		if (!r.otherOk) problems.push(`${tag}: a mudança de OUTRO usuário no token n0 foi engolida (mesa ${JSON.stringify(r.otherStore)}, esperado ${JSON.stringify(r.otherExpected)})`);
		if (!r.scenario.mixed && r.tapsDone < TAPS) problems.push(`${tag}: só ${r.tapsDone} de ${TAPS} toques chegaram`);
		if (r.errors.length) problems.push(`${tag}: erros de página: ${r.errors[0]}`);
	}
	await browser.close();
	await server.close();
	if (problems.length) {
		console.error("\nFALHOU:\n - " + problems.join("\n - "));
		process.exit(1);
	}
	console.log("\nOK: sem salto para trás nem teletransporte, sem reconstruir tokens, gravações coalescidas em ordem e a última posição sempre gravada");
}
main().catch((e) => { console.error(e); process.exit(1); });
