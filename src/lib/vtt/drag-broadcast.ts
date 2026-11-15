/**
 * Broadcast do arrasto de tokens (a posição "ao vivo" que os outros veem).
 *
 * Arrastar um grupo mandava uma mensagem por token a cada tick: 10 tokens
 * eram ~330 mensagens/s de uma pessoa só, contra os 100/s do plano gratuito do
 * Realtime. Agora um tick vira UMA mensagem com todos os tokens do grupo, e o
 * custo não cresce com o tamanho do grupo.
 */
export const DRAG_BROADCAST_INTERVAL_MS = 66;

/**
 * Orçamento do Realtime: o plano gratuito aceita 100 eventos/s e conta cada
 * mensagem enviada E cada entrega a um cliente. Quem arrasta, visto por 4
 * pessoas, gasta ~60/s; o resto do orçamento fica com os cursores.
 */
export const CURSOR_EVENT_BUDGET = 40;
export const CURSOR_BROADCAST_MIN_MS = 100;
export const CURSOR_BROADCAST_MAX_MS = 400;

export interface DragMove {
	tokenId: string;
	x: number;
	y: number;
}

/** Já passou o intervalo desde o último broadcast do arrasto? */
export function dragBroadcastDue(now: number, last: number): boolean {
	return now - last >= DRAG_BROADCAST_INTERVAL_MS;
}

/** Só o que a pessoa pode mover sai no broadcast. */
export function controllableMoves(
	moves: readonly DragMove[],
	canControl: (tokenId: string) => boolean,
): DragMove[] {
	return moves.filter((move) => canControl(move.tokenId));
}

/** Lê o lote recebido, ignorando o que não for uma posição válida. */
export function readDragBatch(payload: unknown): DragMove[] {
	if (!payload || typeof payload !== "object") return [];
	const moves = (payload as { moves?: unknown }).moves;
	if (!Array.isArray(moves)) return [];
	const valid: DragMove[] = [];
	for (const item of moves) {
		if (!item || typeof item !== "object") continue;
		const { tokenId, x, y } = item as Partial<DragMove>;
		if (
			typeof tokenId === "string" &&
			typeof x === "number" &&
			typeof y === "number" &&
			Number.isFinite(x) &&
			Number.isFinite(y)
		) {
			valid.push({ tokenId, x, y });
		}
	}
	return valid;
}

/**
 * Intervalo do cursor ao vivo. Com N pessoas mexendo o mouse, os eventos por
 * segundo crescem com N² (N enviam, cada mensagem tem N − 1 entregas), então
 * o intervalo cresce junto para a soma ficar dentro do orçamento.
 */
export function cursorBroadcastIntervalMs(users: number): number {
	const n = Math.max(1, users);
	const ms = Math.round((1000 * n * n) / CURSOR_EVENT_BUDGET);
	return Math.min(
		CURSOR_BROADCAST_MAX_MS,
		Math.max(CURSOR_BROADCAST_MIN_MS, ms),
	);
}

/** Hora de mandar o cursor? Sozinho na mesa, não há para quem mandar. */
export function cursorBroadcastDue(
	now: number,
	last: number,
	users: number,
): boolean {
	if (users <= 1) return false;
	return now - last >= cursorBroadcastIntervalMs(users);
}
