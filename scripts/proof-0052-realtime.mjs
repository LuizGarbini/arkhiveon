/**
 * Prova local da 0052. Só fala com o stack em 127.0.0.1:54321
 * (docker supabase_db_arkhiveon-b2b). Não lê .env e não imprime token nem e-mail.
 *
 * Uso: node scripts/proof-0052-realtime.mjs
 */
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const openClients = [];
const API = "http://127.0.0.1:54321";
const DB = "supabase_db_arkhiveon-b2b";
const GM = "00520000-0000-0000-0000-0000000000a1";
const PLAYER = "00520000-0000-0000-0000-0000000000b1";
const OUTSIDER = "00520000-0000-0000-0000-0000000000c1";
const WORLD = "00520000-0000-0000-0000-0000000000d1";
const CAMP = "00520000-0000-0000-0000-0000000000e1";
const SCENE = "00520000-0000-0000-0000-0000000000f1";

function b64url(value) {
	return Buffer.from(value).toString("base64url");
}

function signJwt(payload, secret) {
	const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const body = b64url(JSON.stringify(payload));
	const data = `${header}.${body}`;
	const sig = createHmac("sha256", secret).update(data).digest("base64url");
	return `${data}.${sig}`;
}

function secretFromContainer(container, envName) {
	return execFileSync("docker", ["exec", container, "printenv", envName], {
		encoding: "utf8",
	}).trim();
}

function psql(sql) {
	try {
		return execFileSync(
			"docker",
			["exec", "-i", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-tA"],
			{ input: sql, encoding: "utf8" },
		);
	} catch (error) {
		const text = String(error.stderr || error.message || "psql failed");
		const safe = text
			.split("\n")
			.filter((line) => !line.includes("@"))
			.join("\n")
			.slice(0, 1200);
		throw new Error(safe);
	}
}

function clone(value) {
	return JSON.parse(JSON.stringify(value));
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function gitHead() {
	return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
		encoding: "utf8",
	}).trim();
}

function localIsoTimestamp(date = new Date()) {
	const pad = (value, size = 2) => String(value).padStart(size, "0");
	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absolute = Math.abs(offsetMinutes);
	const offset = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${offset}`;
}

async function waitUntil(list, from, ms) {
	const start = Date.now();
	while (Date.now() - start < ms) {
		if (list.length > from) return list.slice(from);
		await sleep(150);
	}
	return list.slice(from);
}

function clientFor(token, anonKey) {
	return createClient(API, anonKey, {
		accessToken: async () => token,
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

function subscribeRolls(client, onRoll, onStatus) {
	const channel = client.channel(`proof-rolls-${randomUUID()}`);
	channel.on(
		"postgres_changes",
		{
			event: "*",
			schema: "public",
			table: "vtt_rolls",
			filter: `campaign_id=eq.${CAMP}`,
		},
		(payload) => onRoll(clone(payload)),
	);
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error("timeout ao assinar vtt_rolls")), 20000);
		channel.subscribe((status, err) => {
			if (onStatus) onStatus(status === "SUBSCRIBED" ? "subscribed" : String(err?.message || status));
			if (status === "SUBSCRIBED") {
				clearTimeout(timer);
				resolve(channel);
			}
			if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
				clearTimeout(timer);
				reject(err instanceof Error ? err : new Error(status));
			}
		});
	});
}

function subscribeResults(client, onResult, onStatus) {
	const channel = client.channel(`proof-results-${randomUUID()}`);
	channel.on(
		"postgres_changes",
		{ event: "*", schema: "public", table: "vtt_roll_results" },
		(payload) => onResult(clone(payload)),
	);
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			onStatus("timeout");
			resolve(channel);
		}, 8000);
		channel.subscribe((status, err) => {
			if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
				clearTimeout(timer);
				onStatus(status === "SUBSCRIBED" ? "subscribed" : String(err?.message || status));
				resolve(channel);
			}
		});
	});
}

function assertPublicRoll(payload, { secret }) {
	const row = payload?.new;
	if (!row || typeof row !== "object") throw new Error("payload sem linha");
	if ("total" in row || "details" in row) {
		throw new Error("o payload do feed trouxe total ou details");
	}
	if (secret) {
		if (row.formula != null) throw new Error("rolagem secreta chegou com fórmula");
		if (row.is_secret !== true) throw new Error("rolagem secreta não veio marcada");
	} else if (typeof row.formula !== "string" || row.formula.length === 0) {
		throw new Error("rolagem normal chegou sem fórmula");
	}
	return row;
}

function setupSql() {
	return `
delete from public.campaigns where id = '${CAMP}';
delete from public.worlds where id = '${WORLD}';
delete from auth.users where id in ('${GM}', '${PLAYER}', '${OUTSIDER}');

insert into auth.users (id, email) values
	('${GM}', 'gm-0052@prova.invalid'),
	('${PLAYER}', 'jogador-0052@prova.invalid'),
	('${OUTSIDER}', 'fora-0052@prova.invalid');

insert into public.worlds (id, owner_user_id, name) values
	('${WORLD}', '${GM}', 'Prova 0052');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('${CAMP}', '${GM}', 'Prova 0052', '${WORLD}', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('${CAMP}', '${GM}', 'owner'),
	('${CAMP}', '${PLAYER}', 'viewer');

insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('${SCENE}', '${CAMP}', 'Prova', true);
`;
}

function cleanupSql() {
	return `
delete from public.campaigns where id = '${CAMP}';
delete from public.worlds where id = '${WORLD}';
delete from auth.users where id in ('${GM}', '${PLAYER}', '${OUTSIDER}');
`;
}

async function main() {
	mkdirSync("out/proofs-0052", { recursive: true });
	const secret = secretFromContainer("supabase_auth_arkhiveon-b2b", "GOTRUE_JWT_SECRET");
	const now = Math.floor(Date.now() / 1000);
	const anonKey = signJwt(
		{
			role: "anon",
			iss: `${API}/auth/v1`,
			iat: now,
			exp: now + 60 * 60,
		},
		secret,
	);
	const userJwt = (sub) =>
		signJwt(
			{
				aud: "authenticated",
				role: "authenticated",
				sub,
				iss: `${API}/auth/v1`,
				iat: now,
				exp: now + 60 * 60,
			},
			secret,
		);

	psql("notify pgrst, 'reload schema';");
	psql(setupSql());

	const gmToken = userJwt(GM);
	const playerToken = userJwt(PLAYER);
	const outsiderToken = userJwt(OUTSIDER);
	const gm = clientFor(gmToken, anonKey);
	const player = clientFor(playerToken, anonKey);
	const outsider = clientFor(outsiderToken, anonKey);
	const anon = createClient(API, anonKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
	openClients.push(gm, player, outsider, anon);
	await gm.realtime.setAuth(gmToken);
	await player.realtime.setAuth(playerToken);
	await outsider.realtime.setAuth(outsiderToken);

	const rollEvents = [];
	const resultEvents = [];
	let resultsStatus = "pending";
	const outsiderFeed = [];
	const outsiderResults = [];
	let outsiderFeedStatus = "pending";
	let outsiderResultsStatus = "pending";
	const rollsChannel = await subscribeRolls(player, (payload) => rollEvents.push(payload));
	const resultsChannel = await subscribeResults(
		player,
		(payload) => resultEvents.push(payload),
		(status) => {
			resultsStatus = status;
		},
	);
	const outsiderRollsChannel = await subscribeRolls(
		outsider,
		(payload) => outsiderFeed.push(payload),
		(status) => {
			outsiderFeedStatus = status;
		},
	);
	const outsiderResultsChannel = await subscribeResults(
		outsider,
		(payload) => outsiderResults.push(payload),
		(status) => {
			outsiderResultsStatus = status;
		},
	);
	await sleep(400);

	const secretRoll = await gm.rpc("roll_dice", {
		p_campaign_id: CAMP,
		p_scene_id: SCENE,
		p_formula: "2d6+3",
		p_secret: true,
		p_label: "Percepção",
		p_character_id: null,
	});
	if (secretRoll.error) throw new Error(`rpc secreta: ${secretRoll.error.message}`);
	const visible = await player
		.from("vtt_rolls")
		.select("id,formula,is_secret")
		.eq("campaign_id", CAMP);
	if (visible.error) throw new Error(`leitura do jogador: ${visible.error.message}`);
	if ((visible.data ?? []).length === 0) throw new Error("jogador não leu a rolagem secreta pela API");
	const secretId = secretRoll.data?.id;
	if (!secretId) throw new Error("rpc secreta não devolveu id");

	const secretEvents = await waitUntil(rollEvents, 0, 10000);
	if (secretEvents.length === 0) throw new Error("jogador não recebeu a rolagem secreta");
	assertPublicRoll(secretEvents[0], { secret: true });

	const normalRoll = await gm.rpc("roll_dice", {
		p_campaign_id: CAMP,
		p_scene_id: SCENE,
		p_formula: "1d20",
		p_secret: false,
		p_label: null,
		p_character_id: null,
	});
	if (normalRoll.error) throw new Error(`rpc normal: ${normalRoll.error.message}`);
	const normalId = normalRoll.data?.id;
	if (!normalId) throw new Error("rpc normal não devolveu id");

	const normalEvents = await waitUntil(rollEvents, secretEvents.length, 10000);
	if (normalEvents.length === 0) throw new Error("jogador não recebeu a rolagem normal");
	assertPublicRoll(normalEvents[0], { secret: false });

	const during = await player
		.from("vtt_rolls")
		.select("id,kind,formula,label,is_secret,session_id,message")
		.eq("campaign_id", CAMP);
	if (during.error) throw new Error(`leitura do jogador: ${during.error.message}`);

	const head = gitHead();
	const capturado = localIsoTimestamp();

	writeFileSync(
		"out/proofs-0052/payload-b.json",
		`${JSON.stringify(
			{
				head,
				capturado,
				realtime: rollEvents,
				resultadosRealtime: resultEvents,
				resultadosCanal: resultsStatus,
				leituraDoJogador: during.data,
			},
			null,
			2,
		)}\n`,
	);

	const beforeSession = rollEvents.length;
	const started = await gm.rpc("start_feed_session", { p_campaign_id: CAMP });
	if (started.error) throw new Error(`nova sessão: ${started.error.message}`);

	psql(`update public.vtt_rolls set label = 'antigo-1' where id = '${secretId}';`);
	const afterOldUpdate = await waitUntil(rollEvents, beforeSession, 4000);
	const leakedOld = afterOldUpdate.filter((event) => event?.new?.id === secretId || event?.old?.id === secretId);

	await player.removeChannel(rollsChannel);
	const secondEvents = [];
	const secondChannel = await subscribeRolls(player, (payload) => secondEvents.push(payload));
	await sleep(400);
	psql(`update public.vtt_rolls set label = 'antigo-2' where id = '${normalId}';`);
	const replay = await waitUntil(secondEvents, 0, 4000);
	const replayLeak = replay.filter((event) => event?.new?.id === normalId || event?.new?.id === secretId);

	const posted = await gm.rpc("post_table_message", {
		p_campaign_id: CAMP,
		p_scene_id: SCENE,
		p_message: "só a sessão nova",
		p_character_id: null,
	});
	if (posted.error) throw new Error(`chat novo: ${posted.error.message}`);
	const fresh = await waitUntil(secondEvents, replay.length, 10000);
	if (fresh.length === 0) throw new Error("jogador não recebeu a mensagem da sessão nova");
	const freshRow = fresh[0]?.new;
	if (freshRow?.message !== "só a sessão nova") {
		throw new Error("a mensagem nova não chegou inteira");
	}
	if ("total" in (freshRow ?? {}) || "details" in (freshRow ?? {})) {
		throw new Error("a mensagem nova trouxe total ou details");
	}
	await sleep(400);

	const after = await player
		.from("vtt_rolls")
		.select("id,kind,formula,label,is_secret,session_id,message")
		.eq("campaign_id", CAMP);
	if (after.error) throw new Error(`leitura depois da sessão: ${after.error.message}`);
	const outside = await outsider.from("vtt_rolls").select("id").eq("campaign_id", CAMP);
	const anonRead = await anon.from("vtt_rolls").select("id").eq("campaign_id", CAMP);
	const oldStillThere = psql(
		`select count(*) from public.vtt_rolls where id in ('${secretId}', '${normalId}');`,
	).trim();

	const leituraDoFeed = outside.data ?? [];
	const capturadoDepois = localIsoTimestamp();

	writeFileSync(
		"out/proofs-0052/payload-b-sessao.json",
		`${JSON.stringify(
			{
				head,
				capturado: capturadoDepois,
				eventosDepoisDaNovaSessao: afterOldUpdate,
				eventosNaAssinaturaNova: replay,
				mensagemNova: fresh,
				leituraDoJogador: after.data,
				leituraDeFora: outside.error ? outside.error.message : outside.data,
				anon: anonRead.error ? anonRead.error.message : anonRead.data,
				linhasAntigasAindaNoBanco: oldStillThere,
			},
			null,
			2,
		)}\n`,
	);
	writeFileSync(
		"out/proofs-0052/payload-fora.json",
		`${JSON.stringify(
			{
				head,
				capturado: capturadoDepois,
				realtimeFeed: outsiderFeed,
				realtimeResultados: outsiderResults,
				canalStatus: {
					feed: outsiderFeedStatus,
					resultados: outsiderResultsStatus,
				},
				leituraDoFeed,
			},
			null,
			2,
		)}\n`,
	);

	await player.removeChannel(secondChannel);
	await player.removeChannel(resultsChannel);
	await outsider.removeChannel(outsiderRollsChannel);
	await outsider.removeChannel(outsiderResultsChannel);
	gm.realtime.disconnect();
	player.realtime.disconnect();
	outsider.realtime.disconnect();
	anon.realtime.disconnect();

	if (leakedOld.length > 0) throw new Error("jogador recebeu update da rolagem antiga");
	if (replayLeak.length > 0) throw new Error("assinatura nova recebeu a sessão anterior");
	if ((after.data ?? []).some((row) => row.id === secretId || row.id === normalId)) {
		throw new Error("leitura do jogador ainda traz a sessão anterior");
	}
	if ((after.data ?? []).length !== 1) {
		throw new Error(`jogador vê ${after.data?.length ?? 0} linhas, esperava 1`);
	}
	if (outsiderFeed.length > 0 || outsiderResults.length > 0) {
		throw new Error("quem está fora recebeu evento ao vivo");
	}
	if (leituraDoFeed.length !== 0) {
		throw new Error("quem está fora leu o feed");
	}
	if (!anonRead.error) throw new Error("anônimo leu o feed");
	if (oldStillThere !== "2") throw new Error("as linhas antigas sumiram do banco");

	console.log("prova 0052 ok");
	console.log(`secreta formula=${secretEvents[0].new.formula} chaves=${Object.keys(secretEvents[0].new).join(",")}`);
	console.log(`normal formula=${normalEvents[0].new.formula} chaves=${Object.keys(normalEvents[0].new).join(",")}`);
	console.log(`canal de resultados: ${resultsStatus}, eventos: ${resultEvents.length}`);
	console.log(
		`fora da campanha: feed=${outsiderFeed.length} resultados=${outsiderResults.length} leitura=${leituraDoFeed.length}`,
	);
	console.log(`depois da sessão o jogador recebeu ${afterOldUpdate.length} eventos antigos e ${fresh.length} novos`);
}

try {
	await main();
} catch (error) {
	const message = error instanceof Error ? error.message : "falhou";
	console.error(message.split("\n").filter((line) => !line.includes("@")).join("\n"));
	process.exitCode = 1;
} finally {
	for (const client of openClients) {
		client.realtime.disconnect();
	}
	try {
		psql(cleanupSql());
	} catch (error) {
		const message = error instanceof Error ? error.message : "limpeza falhou";
		console.error(message.split("\n").filter((line) => !line.includes("@")).join("\n"));
		process.exitCode = 1;
	}
	process.exit(process.exitCode ?? 0);
}
