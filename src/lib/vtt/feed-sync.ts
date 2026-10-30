import { showToast } from "@/components/ui/toast";
import type { Json } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";
import { playDiceAudio } from "./audio";
import { tryParseDiceFormula } from "./dice";
import {
	type FeedSessionRow,
	SESSION_FAILED_TEXT,
	sessionToastText,
	trackSessionOrdinal,
} from "./feed-line";
import {
	type FeedSnapshot,
	type TableFeedEntry,
	type TableRollDetails,
	type TableRollResult,
	useRollStore,
} from "./roll-store";
import { useVTTStore } from "./vtt-store";

const SESSION_KEY = "arkhiveon-feed-sessions";
const POLL_MS = 1500;

let loadRequest = 0;
let primed = false;
let ignoreSessionToast = false;
const knownRolls = new Set<string>();

type DbError = { code?: string; message?: string } | null | undefined;

export function isMissingFeedTable(error: DbError): boolean {
	if (!error) return false;
	if (
		error.code === "42P01" ||
		error.code === "PGRST205" ||
		error.code === "42703" ||
		error.code === "PGRST204" ||
		error.code === "PGRST202"
	) {
		return true;
	}
	const message = error.message ?? "";
	return (
		/vtt_rolls|vtt_feed_sessions|vtt_roll_results|current_feed_session_id|roll_dice|start_feed_session|post_table_message/.test(
			message,
		) && /exist|schema cache|column|function/i.test(message)
	);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

export function mapFeedEntry(value: unknown): TableFeedEntry | null {
	const row = asRecord(value);
	if (!row || typeof row.id !== "string") return null;
	if (row.kind !== "roll" && row.kind !== "chat") return null;
	if (typeof row.author_id !== "string" || typeof row.campaign_id !== "string")
		return null;
	if (typeof row.session_id !== "string" || typeof row.created_at !== "string")
		return null;
	return {
		id: row.id,
		campaignId: row.campaign_id,
		sceneId: typeof row.scene_id === "string" ? row.scene_id : null,
		sessionId: row.session_id,
		authorId: row.author_id,
		characterId: typeof row.character_id === "string" ? row.character_id : null,
		kind: row.kind,
		formula: typeof row.formula === "string" ? row.formula : null,
		label: typeof row.label === "string" ? row.label : null,
		message: typeof row.message === "string" ? row.message : null,
		isSecret: row.is_secret === true,
		createdAt: row.created_at,
	};
}

function mapDetails(value: unknown): TableRollDetails | null {
	const row = asRecord(value);
	if (!row || typeof row.formula !== "string") return null;
	const rolls = Array.isArray(row.rolls)
		? row.rolls.filter((die): die is number => typeof die === "number")
		: [];
	return {
		formula: row.formula,
		count: typeof row.count === "number" ? row.count : rolls.length,
		faces: typeof row.faces === "number" ? row.faces : 0,
		modifier: typeof row.modifier === "number" ? row.modifier : 0,
		rolls,
	};
}

export function mapRollResult(value: unknown): TableRollResult | null {
	const row = asRecord(value);
	if (!row || typeof row.roll_id !== "string" || typeof row.total !== "number")
		return null;
	const details = mapDetails(row.details);
	if (!details) return null;
	return { rollId: row.roll_id, total: row.total, details };
}

function readRollRpc(data: Json | null): {
	id: string;
	total: number;
	formula: string;
	isSecret: boolean;
} | null {
	const row = asRecord(data);
	if (!row || typeof row.id !== "string" || typeof row.total !== "number")
		return null;
	return {
		id: row.id,
		total: row.total,
		formula: typeof row.formula === "string" ? row.formula : "",
		isSecret: row.is_secret === true,
	};
}

function storageKey(campaignId: string): string {
	return `${SESSION_KEY}:${campaignId}`;
}

function readStoredIds(campaignId: string): string[] {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = JSON.parse(
			localStorage.getItem(storageKey(campaignId)) ?? "[]",
		);
		return Array.isArray(raw)
			? raw.filter((id): id is string => typeof id === "string")
			: [];
	} catch {
		return [];
	}
}

function writeStoredIds(campaignId: string, ids: string[]) {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(storageKey(campaignId), JSON.stringify(ids));
}

function absorbRolls(entries: readonly TableFeedEntry[], sound: boolean) {
	for (const entry of entries) {
		if (entry.kind !== "roll") continue;
		if (sound && primed && !knownRolls.has(entry.id)) playDiceAudio();
		knownRolls.add(entry.id);
	}
	primed = true;
}

function viewerMaySeeResult(isSecret: boolean): boolean {
	return useVTTStore.getState().isGM || !isSecret;
}

function notifySession(number: number | null) {
	if (ignoreSessionToast || number === null) return;
	if (useRollStore.getState().panelOpen) return;
	if (typeof window === "undefined" || typeof window.matchMedia !== "function")
		return;
	if (!window.matchMedia("(max-width: 639px)").matches) return;
	showToast("info", { title: sessionToastText(number) });
}

export async function loadFeed(
	campaignId: string,
	options?: { quiet?: boolean },
): Promise<void> {
	const requestId = ++loadRequest;
	const client = getSupabase();
	const hadReady = useRollStore.getState().status === "ready";
	if (!client) {
		if (!hadReady) useRollStore.getState().setStatus("error");
		return;
	}
	try {
		const [campaignRes, sessionRes, rollRes] = await Promise.all([
			client
				.from("campaigns")
				.select("current_feed_session_id")
				.eq("id", campaignId)
				.maybeSingle(),
			client
				.from("vtt_feed_sessions")
				.select("id, started_at")
				.eq("campaign_id", campaignId)
				.order("started_at", { ascending: true }),
			client
				.from("vtt_rolls")
				.select("*")
				.eq("campaign_id", campaignId)
				.order("created_at", { ascending: true }),
		]);
		if (requestId !== loadRequest) return;
		const missing =
			isMissingFeedTable(campaignRes.error) ||
			isMissingFeedTable(sessionRes.error) ||
			isMissingFeedTable(rollRes.error);
		if (missing) {
			useRollStore.getState().setStatus("unavailable");
			return;
		}
		if (campaignRes.error || sessionRes.error || rollRes.error) {
			if (!hadReady) useRollStore.getState().setStatus("error");
			return;
		}
		const sessionId = campaignRes.data?.current_feed_session_id ?? null;
		const sessions: FeedSessionRow[] = (sessionRes.data ?? []).map((row) => ({
			id: row.id,
			startedAt: row.started_at,
		}));
		const entries = (rollRes.data ?? [])
			.map((row) => mapFeedEntry(row))
			.filter((row): row is TableFeedEntry => row !== null)
			.filter((row) => !sessionId || row.sessionId === sessionId);
		const rollIds = entries
			.filter((row) => row.kind === "roll")
			.map((row) => row.id);
		const results: Record<string, TableRollResult> = {};
		if (rollIds.length > 0) {
			const resultRes = await client
				.from("vtt_roll_results")
				.select("roll_id, total, details")
				.in("roll_id", rollIds);
			if (requestId !== loadRequest) return;
			if (!resultRes.error) {
				for (const row of resultRes.data ?? []) {
					const mapped = mapRollResult(row);
					if (!mapped) continue;
					const entry = entries.find((item) => item.id === mapped.rollId);
					if (entry && !viewerMaySeeResult(entry.isSecret)) continue;
					results[mapped.rollId] = mapped;
				}
			}
		}
		const previous = useRollStore.getState().sessionId;
		const ordinal = trackSessionOrdinal(
			readStoredIds(campaignId),
			sessions,
			sessionId,
		);
		writeStoredIds(campaignId, ordinal.ids);
		const snapshot: FeedSnapshot = {
			entries,
			results,
			sessionId,
			sessionStartedAt:
				sessions.find((row) => row.id === sessionId)?.startedAt ?? null,
			sessionNumber: ordinal.number,
		};
		useRollStore.getState().applyFeed(snapshot);
		absorbRolls(entries, Boolean(options?.quiet));
		if (previous && sessionId && previous !== sessionId) {
			notifySession(ordinal.number);
		}
	} catch {
		if (requestId !== loadRequest) return;
		if (!hadReady) useRollStore.getState().setStatus("error");
	}
}

async function refreshIfSessionMoved(campaignId: string) {
	const client = getSupabase();
	if (!client) return;
	const { data, error } = await client
		.from("campaigns")
		.select("current_feed_session_id")
		.eq("id", campaignId)
		.maybeSingle();
	if (error || isMissingFeedTable(error)) return;
	const next = data?.current_feed_session_id ?? null;
	if (next !== useRollStore.getState().sessionId) {
		await loadFeed(campaignId, { quiet: true });
	}
}

async function attachResult(rollId: string, isSecret: boolean) {
	if (!viewerMaySeeResult(isSecret)) return;
	const client = getSupabase();
	if (!client) return;
	const { data, error } = await client
		.from("vtt_roll_results")
		.select("roll_id, total, details")
		.eq("roll_id", rollId)
		.maybeSingle();
	if (error || !data) return;
	const mapped = mapRollResult(data);
	if (!mapped || !viewerMaySeeResult(isSecret)) return;
	useRollStore.getState().setResult(mapped);
}

function acceptEntry(entry: TableFeedEntry) {
	const sessionId = useRollStore.getState().sessionId;
	if (sessionId && entry.sessionId !== sessionId) return;
	useRollStore.getState().upsertEntry(entry);
	if (entry.kind === "roll") {
		if (primed && !knownRolls.has(entry.id)) playDiceAudio();
		knownRolls.add(entry.id);
		void attachResult(entry.id, entry.isSecret);
	}
}

export function subscribeFeed(campaignId: string): () => void {
	knownRolls.clear();
	primed = false;
	useRollStore.getState().setStatus("loading");
	void loadFeed(campaignId);
	const client = getSupabase();
	if (!client) return () => {};
	let stopped = false;
	let sawDrop = false;
	const channel = client
		.channel(`vtt-rolls:${campaignId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "vtt_rolls",
				filter: `campaign_id=eq.${campaignId}`,
			},
			(payload) => {
				if (stopped) return;
				if (payload.eventType !== "INSERT" && payload.eventType !== "UPDATE")
					return;
				const entry = mapFeedEntry(payload.new);
				if (entry) acceptEntry(entry);
			},
		)
		.subscribe((status) => {
			if (stopped) return;
			if (status === "SUBSCRIBED") {
				if (!sawDrop) return;
				sawDrop = false;
				void loadFeed(campaignId, { quiet: true });
				return;
			}
			if (
				status === "CHANNEL_ERROR" ||
				status === "TIMED_OUT" ||
				status === "CLOSED"
			) {
				sawDrop = true;
			}
		});
	const poll = window.setInterval(() => {
		void refreshIfSessionMoved(campaignId);
	}, POLL_MS);
	return () => {
		stopped = true;
		window.clearInterval(poll);
		void client.removeChannel(channel);
	};
}

export async function rollOnTable(input: {
	campaignId: string;
	sceneId: string | null;
	formula: string;
	secret: boolean;
	characterId: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
	const parsed = tryParseDiceFormula(input.formula);
	if (!parsed) {
		return {
			ok: false,
			message: "Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.",
		};
	}
	if (input.secret && !useVTTStore.getState().isGM) {
		return { ok: false, message: "Só o mestre pode rolar em segredo." };
	}
	const client = getSupabase();
	if (!client) return { ok: false, message: "Não foi possível rolar." };
	const { data, error } = await client.rpc("roll_dice", {
		p_campaign_id: input.campaignId,
		p_scene_id: input.sceneId,
		p_formula: parsed.formula,
		p_secret: input.secret,
		p_label: null,
		p_character_id: input.characterId,
	});
	if (error) {
		return { ok: false, message: error.message || "Não foi possível rolar." };
	}
	const rolled = readRollRpc(data);
	if (!rolled) return { ok: false, message: "Não foi possível rolar." };
	const { data: row, error: rowError } = await client
		.from("vtt_rolls")
		.select("*")
		.eq("id", rolled.id)
		.maybeSingle();
	const entry = rowError ? null : mapFeedEntry(row);
	if (entry) acceptEntry(entry);
	if (viewerMaySeeResult(rolled.isSecret)) {
		useRollStore.getState().setResult({
			rollId: rolled.id,
			total: rolled.total,
			details: {
				formula: rolled.formula,
				count: parsed.count,
				faces: parsed.faces,
				modifier: parsed.modifier,
				rolls: [],
			},
		});
		await attachResult(rolled.id, rolled.isSecret);
	}
	if (!useRollStore.getState().sessionId) {
		await loadFeed(input.campaignId, { quiet: true });
	}
	return { ok: true };
}

export async function postChat(input: {
	campaignId: string;
	sceneId: string | null;
	message: string;
	characterId: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
	const client = getSupabase();
	if (!client) return { ok: false, message: "Não foi possível enviar." };
	const { data, error } = await client.rpc("post_table_message", {
		p_campaign_id: input.campaignId,
		p_scene_id: input.sceneId,
		p_message: input.message.trim(),
		p_character_id: input.characterId,
	});
	if (error || !data) {
		return {
			ok: false,
			message: error?.message || "Não foi possível enviar.",
		};
	}
	const { data: row } = await client
		.from("vtt_rolls")
		.select("*")
		.eq("id", data)
		.maybeSingle();
	const entry = mapFeedEntry(row);
	if (entry) acceptEntry(entry);
	if (!useRollStore.getState().sessionId) {
		await loadFeed(input.campaignId, { quiet: true });
	}
	return { ok: true };
}

export async function beginFeedSession(
	campaignId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const client = getSupabase();
	if (!client) return { ok: false, message: SESSION_FAILED_TEXT };
	ignoreSessionToast = true;
	try {
		const { data, error } = await client.rpc("start_feed_session", {
			p_campaign_id: campaignId,
		});
		if (error || !data) return { ok: false, message: SESSION_FAILED_TEXT };
		await loadFeed(campaignId, { quiet: true });
		return { ok: true };
	} catch {
		return { ok: false, message: SESSION_FAILED_TEXT };
	} finally {
		ignoreSessionToast = false;
	}
}
