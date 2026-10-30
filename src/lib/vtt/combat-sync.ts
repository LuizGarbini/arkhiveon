import { getSupabase } from "@/lib/supabase";
import type { Combatant } from "./combat";
import { useCombatStore } from "./combat-store";

let loadRequest = 0;

/** Tabela ou coluna do combate ainda não está no schema. */
export function isMissingCombatTable(
	error: { code?: string; message?: string } | null | undefined,
): boolean {
	if (!error) return false;
	if (
		error.code === "42P01" ||
		error.code === "PGRST205" ||
		error.code === "42703" ||
		error.code === "PGRST204"
	) {
		return true;
	}
	const message = error.message ?? "";
	return (
		/vtt_combatants|combat_round|combat_turn_id/.test(message) &&
		/exist|schema cache|column/i.test(message)
	);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function combatantFrom(value: unknown): Combatant | null {
	const row = asRecord(value);
	if (!row) return null;
	if (typeof row.id !== "string" || typeof row.token_id !== "string")
		return null;
	if (typeof row.sort_key !== "number") return null;
	return {
		id: row.id,
		tokenId: row.token_id,
		initiative: typeof row.initiative === "number" ? row.initiative : null,
		dex: typeof row.dex === "number" ? row.dex : null,
		sortKey: row.sort_key,
	};
}

function idFrom(value: unknown): string | null {
	const row = asRecord(value);
	return row && typeof row.id === "string" ? row.id : null;
}

function turnFrom(
	value: unknown,
): { round: number | null; turnId: string | null } | null {
	const row = asRecord(value);
	if (!row) return null;
	if (!("combat_round" in row) && !("combat_turn_id" in row)) return null;
	return {
		round: typeof row.combat_round === "number" ? row.combat_round : null,
		turnId: typeof row.combat_turn_id === "string" ? row.combat_turn_id : null,
	};
}

/** Busca a fila e a vez. Não zera a cena: quem chama é que prepara o loading. */
export async function loadCombat(sceneId: string): Promise<void> {
	const requestId = ++loadRequest;
	const client = getSupabase();
	const started = useCombatStore.getState();
	if (started.sceneId !== sceneId) return;
	if (!client) {
		started.setStatus("error");
		return;
	}
	const hadReady = started.status === "ready";
	try {
		const [combatantsRes, sceneRes] = await Promise.all([
			client
				.from("vtt_combatants")
				.select("id, scene_id, token_id, initiative, dex, sort_key")
				.eq("scene_id", sceneId),
			client
				.from("vtt_scenes")
				.select("combat_round, combat_turn_id")
				.eq("id", sceneId)
				.maybeSingle(),
		]);
		if (requestId !== loadRequest) return;
		const now = useCombatStore.getState();
		if (now.sceneId !== sceneId || now.busy) return;
		if (
			isMissingCombatTable(combatantsRes.error) ||
			isMissingCombatTable(sceneRes.error)
		) {
			now.setUnavailable();
			return;
		}
		if (combatantsRes.error || sceneRes.error) {
			if (!hadReady) now.setStatus("error");
			return;
		}
		const combatants = (combatantsRes.data ?? [])
			.map((row) => combatantFrom(row))
			.filter((row): row is Combatant => row !== null);
		const turn = turnFrom(sceneRes.data) ?? { round: null, turnId: null };
		now.applyLoaded(sceneId, combatants, turn.round, turn.turnId);
	} catch {
		if (requestId !== loadRequest) return;
		const now = useCombatStore.getState();
		if (now.sceneId === sceneId && !now.busy && !hadReady)
			now.setStatus("error");
	}
}

/**
 * Fetch inicial + realtime de `vtt_combatants` e da vez na cena.
 * SUBSCRIBED depois de uma queda busca de novo. O primeiro SUBSCRIBED não
 * repete o fetch que já está em andamento.
 */
export function subscribeCombat(sceneId: string): () => void {
	const store = useCombatStore.getState();
	store.prepareScene(sceneId);
	const client = getSupabase();
	if (!client) {
		store.setStatus("error");
		return () => {};
	}
	let stopped = false;
	let sawDrop = false;
	void loadCombat(sceneId);
	const channel = client
		.channel(`vtt-combat:${sceneId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "vtt_combatants",
				filter: `scene_id=eq.${sceneId}`,
			},
			(payload) => {
				if (stopped || useCombatStore.getState().sceneId !== sceneId) return;
				const kind = payload.eventType;
				if (kind !== "INSERT" && kind !== "UPDATE" && kind !== "DELETE") return;
				useCombatStore
					.getState()
					.applyRemoteCombatant(
						kind,
						kind === "DELETE" ? null : combatantFrom(payload.new),
						idFrom(kind === "DELETE" ? payload.old : payload.new),
					);
			},
		)
		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "vtt_scenes",
				filter: `id=eq.${sceneId}`,
			},
			(payload) => {
				if (stopped) return;
				const turn = turnFrom(payload.new);
				if (!turn) return;
				useCombatStore
					.getState()
					.applyRemoteTurn(sceneId, turn.round, turn.turnId);
			},
		)
		.subscribe((status) => {
			if (stopped) return;
			if (status === "SUBSCRIBED") {
				if (!sawDrop) return;
				sawDrop = false;
				void loadCombat(sceneId);
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
	return () => {
		stopped = true;
		void client.removeChannel(channel);
	};
}
