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

/** Tabela do histórico ainda não existe no banco (migração 0068 pendente). */
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

/**
 * Quando cada linha terminou de gravar. Uma carga que começou ANTES disso pode
 * voltar sem a linha (leu o banco antes do insert); essa linha não pode sumir.
 */
const savedAt = new Map<string, number>();

function noteSaved(id: string): void {
	const now = Date.now();
	savedAt.set(id, now);
	for (const [key, at] of savedAt) {
		if (now - at > 120_000) savedAt.delete(key);
	}
	useMoveStore.getState().markSaved(id);
}

/** Linhas trazidas por carga (as mais novas da cena). */
const MOVES_PAGE = 1000;

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
	const startedAt = Date.now();
	let data: unknown[] | null = null;
	let error: DbError = null;
	try {
		const result = await client
			.from("vtt_token_moves")
			.select("*")
			.eq("scene_id", sceneId)
			// As 1000 mais NOVAS: em ordem crescente o corte pegava as mais velhas
			// e o movimento novo sumia ao recarregar.
			.order("created_at", { ascending: false })
			.limit(MOVES_PAGE);
		data = result.data;
		error = result.error;
	} catch {
		// Falha inesperada (rede, cliente): o histórico some da tela, a mesa não.
		if (requestId === loadRequest) useMoveStore.getState().setStatus("error");
		return;
	}
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
		.filter((move): move is TokenMove => move !== null)
		.reverse();
	const loadedIds = new Set(loaded.map((move) => move.id));
	// Só continua na tela o que o banco ainda não devolveu porque está sendo
	// gravado ou porque a gravação falhou. O resto que não voltou foi apagado
	// por outro mestre (ou a tabela foi limpa): não pode ficar como fantasma.
	const keep = new Set([...now.unsavedIds, ...now.failedIds]);
	for (const [id, at] of savedAt) {
		if (at >= startedAt) keep.add(id);
	}
	const pending = now.moves.filter(
		(move) =>
			move.sceneId === sceneId && !loadedIds.has(move.id) && keep.has(move.id),
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
				event: "INSERT",
				schema: "public",
				table: "vtt_token_moves",
				filter: `scene_id=eq.${sceneId}`,
			},
			(payload) => {
				if (stopped) return;
				const move = mapMoveRow(payload.new);
				if (move) useMoveStore.getState().pushMove(move);
			},
		)
		// O Realtime não entrega DELETE com filtro por coluna (a linha apagada só
		// traz o id): sem filtro, e só mexe no que já está na tela.
		.on(
			"postgres_changes",
			{ event: "DELETE", schema: "public", table: "vtt_token_moves" },
			(payload) => {
				if (stopped) return;
				const id = (payload.old as { id?: string } | null)?.id;
				if (!id) return;
				const store = useMoveStore.getState();
				if (store.moves.some((move) => move.id === id))
					store.setMoves(store.moves.filter((move) => move.id !== id));
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
	const distance = moveDistance(input.from, input.to, scene, vtt.diagonalRule);
	// Encaixar o token no centro da mesma casa não é andar: sem linha de 0 m.
	if (!(distance > 0)) return null;
	const combat = useCombatStore.getState();
	const move: TokenMove = {
		id: crypto.randomUUID(),
		sceneId: input.sceneId,
		tokenId: input.tokenId,
		tokenName: input.tokenName,
		from: input.from,
		to: input.to,
		distance,
		unit: scene.gridScaleUnit,
		round:
			combat.status === "ready" && combat.round !== null ? combat.round : null,
		kind: input.kind ?? "move",
		authorId: input.authorId,
		authorName: input.authorName,
		createdAt: new Date().toISOString(),
	};
	const store = useMoveStore.getState();
	if (viewerIsStaff()) store.pushMove(move);
	store.markUnsaved(move.id);
	void (async () => {
		// Gravação do token recusada: o token voltou, então não houve movimento.
		const ok = confirmed
			? await Promise.resolve(confirmed).catch(() => false)
			: true;
		if (ok === false) {
			const current = useMoveStore.getState();
			current.setMoves(current.moves.filter((item) => item.id !== move.id));
			current.markSaved(move.id);
			return;
		}
		await saveMove(move);
	})();
	return move;
}

/** Esperas entre as tentativas de gravar (rede instável, queda breve). */
const SAVE_RETRY_DELAYS_MS = [600, 2500];

/** Erro do Postgres que não adianta repetir: permissão, regra ou formato. */
function isPermanentSaveError(error: NonNullable<DbError>): boolean {
	return /^(42|22|23)/.test(error.code ?? "");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveMove(move: TokenMove): Promise<void> {
	const store = () => useMoveStore.getState();
	if (store().status === "missing") {
		noteSaved(move.id);
		return;
	}
	const client = getSupabase();
	if (!client) {
		store().markFailed(move.id);
		return;
	}
	const row = {
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
		// Sem created_at: a hora vale a do servidor. A do computador de cada
		// pessoa difere (relógio errado) e embaralhava a ordem do histórico.
	};
	for (let attempt = 0; ; attempt += 1) {
		let error: DbError;
		try {
			error = (await client.from("vtt_token_moves").insert(row)).error;
		} catch (thrown) {
			error = { message: thrown instanceof Error ? thrown.message : "rede" };
		}
		// 23505: o id já está no banco, uma tentativa anterior chegou.
		if (!error || error.code === "23505") {
			noteSaved(move.id);
			return;
		}
		if (isMissingMovesTable(error)) {
			store().setStatus("missing");
			noteSaved(move.id);
			return;
		}
		const wait = SAVE_RETRY_DELAYS_MS[attempt];
		if (isPermanentSaveError(error) || wait === undefined) {
			store().markFailed(move.id);
			return;
		}
		await sleep(wait);
	}
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
