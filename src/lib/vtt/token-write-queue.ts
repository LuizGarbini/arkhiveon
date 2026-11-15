/**
 * Fila de gravação da POSIÇÃO e da DIREÇÃO dos tokens (seta do teclado, giro Q/E,
 * arrasto, "devolver" do histórico).
 *
 * Antes cada passo era uma requisição própria, todas em voo ao mesmo tempo: elas
 * podiam chegar ao banco FORA DE ORDEM (a posição final gravada era uma antiga) e
 * cada uma gerava um eco do Realtime com a posição velha, que puxava o token de
 * volta. Agora, por token:
 *  - no máximo UMA gravação em voo (a próxima só sai quando a anterior termina);
 *  - o que chega durante o voo ou antes do intervalo mínimo é FUNDIDO (vale o mais
 *    recente de cada campo) e sai numa única gravação;
 *  - a primeira gravação sai na hora; a ÚLTIMA nunca se perde (sempre há uma
 *    gravação pendente até o estado final ser enviado);
 *  - falha: o que estava em voo e o que esperava voltam `false` juntos e a fila do
 *    token esvazia (quem chamou restaura o estado do servidor).
 * Cada promessa devolvida resolve com o resultado da gravação que levou o
 * movimento dela (movimentos fundidos compartilham o resultado).
 *
 * Eco: cada gravação guarda o ESTADO COMPLETO (x, y, rotation) que a mesa terá
 * quando ela chegar ao banco. `isStaleEcho` só reconhece como eco velho uma linha
 * do Realtime cujo estado inteiro é um que ESTE cliente enviou e que já foi
 * ultrapassado; uma mudança de outro usuário (qualquer campo diferente) nunca bate.
 */
export interface MoveUpdates {
	x?: number;
	y?: number;
	rotation?: number;
}

/** O estado de posição/direção de um token numa gravação. */
export interface TokenPoseState {
	x: number;
	y: number;
	rotation: number;
}

export interface TokenWriteQueueOptions {
	send: (tokenId: string, updates: MoveUpdates) => Promise<boolean>;
	minIntervalMs?: number;
	now?: () => number;
	setTimer?: (fn: () => void, ms: number) => unknown;
	/** Por quanto tempo um estado enviado ainda conta como "meu" (para o eco). */
	ownTtlMs?: number;
}

export interface TokenWriteQueue {
	/**
	 * `expected`: o estado completo do token depois desta atualização (a mesa já o
	 * tem, ou terá quando a gravação confirmar). Sem ele o eco dela não é reconhecido.
	 */
	enqueue: (
		tokenId: string,
		updates: MoveUpdates,
		expected?: TokenPoseState,
	) => Promise<boolean>;
	/** Há gravação esperando para sair (o que a mesa mostra já é mais novo que ela). */
	hasPending: (tokenId: string) => boolean;
	/** Há gravação em voo ou esperando. */
	isBusy: (tokenId: string) => boolean;
	/** Quantos tokens têm gravação em voo ou esperando (para sondas e testes). */
	busyCount: () => number;
	/**
	 * Esta linha do Realtime é o eco VELHO de uma gravação minha? Só vale quando o
	 * estado inteiro é um que eu enviei e (há gravação mais nova esperando ou ele não
	 * é o último que enviei). O eco do último estado enviado, com a fila vazia, é
	 * aplicado normalmente (corrige qualquer divergência e não muda nada se igual).
	 */
	isStaleEcho: (tokenId: string, state: TokenPoseState) => boolean;
}

interface Sent extends TokenPoseState {
	at: number;
}

interface TokenQueueState {
	pending: {
		updates: MoveUpdates;
		expected: TokenPoseState | null;
		waiters: ((ok: boolean) => void)[];
	} | null;
	inFlight: { waiters: ((ok: boolean) => void)[] } | null;
	lastStart: number;
	timer: unknown;
	sent: Sent[];
}

export const TOKEN_WRITE_MIN_INTERVAL_MS = 120;
const OWN_TTL_MS = 15000;
const MAX_SENT = 16;
const MOVE_KEYS = new Set(["x", "y", "rotation"]);

/** Só posição/direção? Esses vão pela fila; o resto (HP, status...) grava direto. */
export function isMoveOnlyUpdate(updates: Record<string, unknown>): boolean {
	let hasMove = false;
	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined) continue;
		if (!MOVE_KEYS.has(key)) return false;
		hasMove = true;
	}
	return hasMove;
}

const sameState = (a: TokenPoseState, b: TokenPoseState) =>
	a.x === b.x && a.y === b.y && a.rotation === b.rotation;

export function createTokenWriteQueue(
	options: TokenWriteQueueOptions,
): TokenWriteQueue {
	const minInterval = options.minIntervalMs ?? TOKEN_WRITE_MIN_INTERVAL_MS;
	const now = options.now ?? (() => Date.now());
	const setTimer =
		options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
	const ownTtl = options.ownTtlMs ?? OWN_TTL_MS;
	const states = new Map<string, TokenQueueState>();

	const stateOf = (tokenId: string): TokenQueueState => {
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
		if (batch.expected) {
			state.sent.push({ ...batch.expected, at: state.lastStart });
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
		enqueue(tokenId, updates, expected) {
			const state = stateOf(tokenId);
			return new Promise<boolean>((resolve) => {
				if (state.pending) {
					state.pending.updates = { ...state.pending.updates, ...updates };
					state.pending.expected = expected ?? null;
					state.pending.waiters.push(resolve);
				} else {
					state.pending = {
						updates: { ...updates },
						expected: expected ?? null,
						waiters: [resolve],
					};
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
		isStaleEcho(tokenId, echo) {
			const state = states.get(tokenId);
			if (!state) return false;
			const cutoff = now() - ownTtl;
			let latestMatch = -1;
			for (let i = state.sent.length - 1; i >= 0; i--) {
				const item = state.sent[i] as Sent;
				if (item.at >= cutoff && sameState(item, echo)) {
					latestMatch = i;
					break;
				}
			}
			if (latestMatch < 0) return false;
			return latestMatch < state.sent.length - 1 || Boolean(state.pending);
		},
	};
}
