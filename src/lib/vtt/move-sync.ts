import { getSupabase } from "@/lib/supabase";
import { useCombatStore } from "./combat-store";
import type { Point } from "./grid-math";
import {
	didMove,
	mapMoveRow,
	moveDistance,
	type TokenMove,
} from "./move-history";
import { useMoveStore } from "./move-store";
import { useVTTStore } from "./vtt-store";

type DbError = { code?: string; message?: string } | null | undefined;

/** Tabela do histórico ainda não existe no banco (migração 0066 pendente). */
export function isMissingMovesTable(error: DbError): boolean {
	if (!error) return false;
	if (
		error.code === "42P01" ||
		error.code === "PGRST205" ||
		error.code === "42703" ||
		error.code === "PGRST204"
	)
		return true;
	return (
		/vtt_token_moves/.test(error.message ?? "") &&
		/exist|schema cache|column/i.test(error.message ?? "")
	);
}

let loadRequest = 0;

/** Só mestre e co-mestre veem o histórico (a RLS também nega aos demais). */
function viewerIsStaff(): boolean {
	const { isGM, isCoGM } = useVTTStore.getState();
	return isGM || isCoGM;
}

export async function loadMoves(sceneId: string): Promise<void> {
	const requestId = ++loadRequest;
	const store = useMoveStore.getState();
	if (!viewerIsStaff()) {
		store.setMoves([]);
		store.setStatus("idle");
		return;
	}
	const client = getSupabase();
	if (!client) {
		store.setStatus("error");
		return;
	}
	store.setStatus("loading");
	const { data, error } = await client
		.from("vtt_token_moves")
		.select("*")
		.eq("scene_id", sceneId)
		.order("created_at", { ascending: true })
		.limit(1000);
	if (
		requestId !== loadRequest ||
		useVTTStore.getState().activeSceneId !== sceneId
	)
		return;
	const now = useMoveStore.getState();
	if (error) {
		// Sem a tabela, o que já foi anotado nesta sessão continua na tela.
		now.setStatus(isMissingMovesTable(error) ? "missing" : "error");
		return;
	}
	const loaded = (data ?? [])
		.map(mapMoveRow)
		.filter((move): move is TokenMove => move !== null);
	const loadedIds = new Set(loaded.map((move) => move.id));
	// Mantém o que acabou de ser anotado e ainda não voltou do banco.
	const pending = now.moves.filter(
		(move) => move.sceneId === sceneId && !loadedIds.has(move.id),
	);
	now.setMoves([
		...now.moves.filter((move) => move.sceneId !== sceneId),
		...loaded,
		...pending,
	]);
	now.setStatus("ready");
}

/** Carrega o histórico da cena e acompanha os novos movimentos em tempo real. */
export function subscribeMoves(sceneId: string): () => void {
	void loadMoves(sceneId);
	const client = getSupabase();
	if (!client || !viewerIsStaff()) return () => {};
	let stopped = false;
	let sawDrop = false;
	const channel = client
		.channel(`vtt-token-moves:${sceneId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "vtt_token_moves",
				filter: `scene_id=eq.${sceneId}`,
			},
			(payload) => {
				if (stopped) return;
				const store = useMoveStore.getState();
				if (payload.eventType === "INSERT") {
					const move = mapMoveRow(payload.new);
					if (move) store.pushMove(move);
				} else if (payload.eventType === "DELETE") {
					const id = (payload.old as { id?: string } | null)?.id;
					if (id) store.setMoves(store.moves.filter((move) => move.id !== id));
				}
			},
		)
		.subscribe((status) => {
			if (stopped) return;
			if (status === "SUBSCRIBED") {
				if (!sawDrop) return;
				sawDrop = false;
				void loadMoves(sceneId);
				return;
			}
			if (
				status === "CHANNEL_ERROR" ||
				status === "TIMED_OUT" ||
				status === "CLOSED"
			)
				sawDrop = true;
		});
	return () => {
		stopped = true;
		void client.removeChannel(channel);
	};
}

export interface RecordMoveInput {
	sceneId: string;
	tokenId: string;
	tokenName: string;
	from: Point;
	to: Point;
	authorId: string;
	authorName: string | null;
	kind?: "move" | "undo";
}

/**
 * Anota um movimento: aparece na hora para o mestre e é gravado no banco
 * depois que o servidor aceita a nova posição do token (`confirmed`).
 * Falha de rede ou tabela ausente não atrapalha o jogo; o histórico vale
 * então só nesta sessão do navegador.
 */
export function recordMove(
	input: RecordMoveInput,
	/** Resultado da gravação do token: `false` retira o movimento do histórico. */
	confirmed?: Promise<unknown>,
): TokenMove | null {
	if (!didMove(input.from, input.to)) return null;
	const vtt = useVTTStore.getState();
	const scene = vtt.scenes.find((item) => item.id === input.sceneId);
	if (!scene) return null;
	const combat = useCombatStore.getState();
	const move: TokenMove = {
		id: crypto.randomUUID(),
		sceneId: input.sceneId,
		tokenId: input.tokenId,
		tokenName: input.tokenName,
		from: input.from,
		to: input.to,
		distance: moveDistance(input.from, input.to, scene, vtt.diagonalRule),
		unit: scene.gridScaleUnit,
		round:
			combat.status === "ready" && combat.round !== null ? combat.round : null,
		kind: input.kind ?? "move",
		authorId: input.authorId,
		authorName: input.authorName,
		createdAt: new Date().toISOString(),
	};
	if (viewerIsStaff()) useMoveStore.getState().pushMove(move);
	void (async () => {
		// Gravação do token recusada: o token voltou, então não houve movimento.
		const ok = confirmed
			? await Promise.resolve(confirmed).catch(() => false)
			: true;
		if (ok === false) {
			const store = useMoveStore.getState();
			store.setMoves(store.moves.filter((item) => item.id !== move.id));
			return;
		}
		await saveMove(move);
	})();
	return move;
}

async function saveMove(move: TokenMove): Promise<void> {
	if (useMoveStore.getState().status === "missing") return;
	const client = getSupabase();
	if (!client) return;
	const { error } = await client.from("vtt_token_moves").insert({
		id: move.id,
		scene_id: move.sceneId,
		token_id: move.tokenId,
		token_name: move.tokenName.slice(0, 120),
		from_x: move.from.x,
		from_y: move.from.y,
		to_x: move.to.x,
		to_y: move.to.y,
		distance: move.distance,
		unit: move.unit,
		round: move.round,
		kind: move.kind,
		author_id: move.authorId,
		author_name: move.authorName?.slice(0, 120) ?? null,
		created_at: move.createdAt,
	});
	if (error && isMissingMovesTable(error))
		useMoveStore.getState().setStatus("missing");
}

/** Apaga o histórico da cena (ou de um token). Devolve se o banco aceitou. */
export async function clearMoves(
	sceneId: string,
	tokenId?: string | null,
): Promise<boolean> {
	const store = useMoveStore.getState();
	if (store.status === "missing") {
		store.removeMoves(sceneId, tokenId);
		return true;
	}
	const client = getSupabase();
	if (!client) return false;
	let query = client.from("vtt_token_moves").delete().eq("scene_id", sceneId);
	if (tokenId) query = query.eq("token_id", tokenId);
	const { error } = await query;
	if (error) return false;
	useMoveStore.getState().removeMoves(sceneId, tokenId);
	return true;
}
