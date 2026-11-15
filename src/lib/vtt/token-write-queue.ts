/**
 * Fila de gravação da POSIÇÃO dos tokens (seta do teclado, arrasto, "devolver").
 *
 * Antes cada passo era uma requisição própria, todas em voo ao mesmo tempo: elas
 * podiam chegar ao banco FORA DE ORDEM (a posição final gravada era uma antiga) e
 * cada uma gerava um eco do Realtime com a posição velha, que puxava o token de
 * volta. Agora, por token:
 *  - no máximo UMA gravação em voo (a próxima só sai quando a anterior termina);
 *  - o que chega durante o voo ou antes do intervalo mínimo é FUNDIDO (vale a
 *    posição mais recente) e sai numa única gravação;
 *  - a primeira gravação sai na hora; a ÚLTIMA nunca se perde (sempre há uma
 *    gravação pendente até a posição final ser enviada);
 *  - falha: o que estava em voo e o que esperava voltam `false` juntos e a fila do
 *    token esvazia (quem chamou restaura o estado do servidor).
 * Cada promessa devolvida resolve com o resultado da gravação que levou o
 * movimento dela (movimentos fundidos compartilham o resultado).
 */
export interface MoveUpdates {
	x?: number;
	y?: number;
	rotation?: number;
}

export interface TokenWriteQueueOptions {
	send: (tokenId: string, updates: MoveUpdates) => Promise<boolean>;
	minIntervalMs?: number;
	now?: () => number;
	setTimer?: (fn: () => void, ms: number) => unknown;
	/** Por quanto tempo uma posição enviada ainda conta como "minha" (para o eco). */
	ownTtlMs?: number;
}

export interface TokenWriteQueue {
	enqueue: (tokenId: string, updates: MoveUpdates) => Promise<boolean>;
	/** Há gravação esperando para sair (o que a mesa mostra já é mais novo que ela). */
	hasPending: (tokenId: string) => boolean;
	/** Há gravação em voo ou esperando. */
	isBusy: (tokenId: string) => boolean;
	/** Quantos tokens têm gravação em voo ou esperando (para sondas e testes). */
	busyCount: () => number;
	/** Esta posição foi enviada por MIM há pouco? (eco do Realtime do meu próprio passo) */
	ownsPosition: (tokenId: string, x: number, y: number) => boolean;
}

interface TokenState {
	pending: { updates: MoveUpdates; waiters: ((ok: boolean) => void)[] } | null;
	inFlight: { waiters: ((ok: boolean) => void)[] } | null;
	lastStart: number;
	timer: unknown;
	sent: { x: number; y: number; at: number }[];
}

export const TOKEN_WRITE_MIN_INTERVAL_MS = 120;
const OWN_TTL_MS = 15000;
const MAX_SENT = 16;
const MOVE_KEYS = new Set(["x", "y", "rotation"]);

/** Só posição/direção? Esses vão pela fila; o resto (HP, status...) grava direto. */
export function isMoveOnlyUpdate(updates: Record<string, unknown>): boolean {
	let hasPosition = false;
	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined) continue;
		if (!MOVE_KEYS.has(key)) return false;
		if (key === "x" || key === "y") hasPosition = true;
	}
	return hasPosition;
}

export function createTokenWriteQueue(
	options: TokenWriteQueueOptions,
): TokenWriteQueue {
	const minInterval = options.minIntervalMs ?? TOKEN_WRITE_MIN_INTERVAL_MS;
	const now = options.now ?? (() => Date.now());
	const setTimer =
		options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
	const ownTtl = options.ownTtlMs ?? OWN_TTL_MS;
	const states = new Map<string, TokenState>();

	const stateOf = (tokenId: string): TokenState => {
		let state = states.get(tokenId);
		if (!state) {
			state = {
				pending: null,
				inFlight: null,
				lastStart: Number.NEGATIVE_INFINITY,
				timer: null,
				sent: [],
			};
			states.set(tokenId, state);
		}
		return state;
	};

	const pump = (tokenId: string) => {
		const state = stateOf(tokenId);
		if (state.inFlight || !state.pending || state.timer !== null) return;
		const wait = state.lastStart + minInterval - now();
		if (wait > 0) {
			state.timer = setTimer(() => {
				state.timer = null;
				pump(tokenId);
			}, wait);
			return;
		}
		const batch = state.pending;
		state.pending = null;
		state.inFlight = { waiters: batch.waiters };
		state.lastStart = now();
		const { x, y } = batch.updates;
		if (x !== undefined && y !== undefined) {
			state.sent.push({ x, y, at: state.lastStart });
			if (state.sent.length > MAX_SENT) state.sent.shift();
		}
		const finish = (ok: boolean) => {
			state.inFlight = null;
			for (const waiter of batch.waiters) waiter(ok);
			if (!ok && state.pending) {
				// O servidor recusou: a mesa volta ao que ele tem, então o que
				// esperava (mais novo) não pode ser enviado por cima.
				const dropped = state.pending;
				state.pending = null;
				for (const waiter of dropped.waiters) waiter(false);
			}
			pump(tokenId);
		};
		let sending: Promise<boolean>;
		try {
			sending = options.send(tokenId, batch.updates);
		} catch {
			finish(false);
			return;
		}
		sending.then(finish, () => finish(false));
	};

	return {
		enqueue(tokenId, updates) {
			const state = stateOf(tokenId);
			return new Promise<boolean>((resolve) => {
				if (state.pending) {
					state.pending.updates = { ...state.pending.updates, ...updates };
					state.pending.waiters.push(resolve);
				} else {
					state.pending = { updates: { ...updates }, waiters: [resolve] };
				}
				pump(tokenId);
			});
		},
		hasPending: (tokenId) => Boolean(states.get(tokenId)?.pending),
		isBusy(tokenId) {
			const state = states.get(tokenId);
			return Boolean(state && (state.pending || state.inFlight));
		},
		busyCount() {
			let busy = 0;
			for (const state of states.values()) {
				if (state.pending || state.inFlight) busy++;
			}
			return busy;
		},
		ownsPosition(tokenId, x, y) {
			const state = states.get(tokenId);
			if (!state) return false;
			const cutoff = now() - ownTtl;
			return state.sent.some(
				(item) => item.at >= cutoff && item.x === x && item.y === y,
			);
		},
	};
}
