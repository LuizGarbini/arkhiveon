import type { VTTPingEvent } from "./types";

/** Tempo em que o anel ainda é desenhado. No instante do TTL ele sai. */
export const PING_TTL_MS = 3000;
/** Um ping aceito por usuário neste intervalo. O som usa o mesmo intervalo. */
export const PING_THROTTLE_MS = 150;
export const PING_MAX_ACTIVE = 12;

export type ActivePing = VTTPingEvent & { id: string };

export interface PingInput {
	id?: string;
	x: number;
	y: number;
	userId: string;
	userName: string;
	color: string;
	timestamp: number;
}

export interface PingAdmission {
	lastAcceptedAt: Readonly<Record<string, number>>;
	seq: number;
}

export interface PingQueueState extends PingAdmission {
	pings: ActivePing[];
}

export interface PingVisual {
	alive: boolean;
	radius: number;
	alpha: number;
}

export interface PingLoopStats {
	attached: boolean;
	ticks: number;
	adds: number;
	removes: number;
	maxActive: number;
	lastActive: number;
	lastRadius: number;
	lastAlpha: number;
}

export type PingIdFactory = (userId: string, seq: number) => string;

export function emptyPingQueue(): PingQueueState {
	return { pings: [], lastAcceptedAt: {}, seq: 1 };
}

export function initialPingAdmission(): PingAdmission {
	return { lastAcceptedAt: {}, seq: 1 };
}

export function defaultPingId(userId: string, seq: number): string {
	const entropy =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: String(seq);
	return `${userId}:${seq}:${entropy}`;
}

function finite(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/** Payload de broadcast. Sem `id`, o receptor gera um id local. */
export function incomingPing(
	payload:
		| {
				id?: unknown;
				x?: unknown;
				y?: unknown;
				userId?: unknown;
				userName?: unknown;
				color?: unknown;
				timestamp?: unknown;
		  }
		| null
		| undefined,
): PingInput | null {
	if (!payload) return null;
	if (!finite(payload.x) || !finite(payload.y) || !finite(payload.timestamp)) {
		return null;
	}
	if (typeof payload.userId !== "string" || payload.userId.length === 0) {
		return null;
	}
	const ping: PingInput = {
		x: payload.x,
		y: payload.y,
		userId: payload.userId,
		userName:
			typeof payload.userName === "string" && payload.userName.length > 0
				? payload.userName
				: "Aventureiro",
		color:
			typeof payload.color === "string" && payload.color.length > 0
				? payload.color
				: "#a855f7",
		timestamp: payload.timestamp,
	};
	if (typeof payload.id === "string" && payload.id.length > 0)
		ping.id = payload.id;
	return ping;
}

export function pingVisual(
	timestamp: number,
	now: number,
	ttl = PING_TTL_MS,
): PingVisual {
	const elapsed = now - timestamp;
	if (elapsed >= ttl) return { alive: false, radius: 80, alpha: 0 };
	const progress = Math.max(0, elapsed) / ttl;
	return {
		alive: true,
		radius: 20 + progress * 60,
		alpha: Math.max(0, 1 - progress),
	};
}

export function expirePings(
	state: PingQueueState,
	now: number,
): { state: PingQueueState; removedIds: string[] } {
	const removedIds: string[] = [];
	for (const ping of state.pings) {
		if (!pingVisual(ping.timestamp, now).alive) removedIds.push(ping.id);
	}
	if (removedIds.length === 0) return { state, removedIds };
	const drop = new Set(removedIds);
	return {
		state: {
			...state,
			pings: state.pings.filter((ping) => !drop.has(ping.id)),
		},
		removedIds,
	};
}

export function removePingById(
	state: PingQueueState,
	id: string,
): PingQueueState {
	if (!state.pings.some((ping) => ping.id === id)) return state;
	return {
		...state,
		pings: state.pings.filter((ping) => ping.id !== id),
	};
}

function allocateId(
	userId: string,
	seq: number,
	taken: ReadonlySet<string>,
	createId: PingIdFactory,
): { id: string; seq: number } {
	let next = seq;
	let id = createId(userId, next);
	let guard = 0;
	while (taken.has(id) && guard < 8) {
		next += 1;
		guard += 1;
		id = createId(userId, next);
	}
	if (taken.has(id)) id = `${userId}:${next}:${guard}`;
	return { id, seq: next + 1 };
}

/**
 * Aceita no máximo um ping por usuário a cada 150 ms, guarda no máximo 12
 * e, no teto, solta o admitido há mais tempo. `now` é o relógio do teste.
 */
export function admitPing(
	state: PingQueueState,
	input: PingInput,
	now: number,
	createId: PingIdFactory = defaultPingId,
): { state: PingQueueState; ping: ActivePing | null } {
	const base = expirePings(state, now).state;
	if (!pingVisual(input.timestamp, now).alive)
		return { state: base, ping: null };

	const provided =
		typeof input.id === "string" && input.id.length > 0 ? input.id : undefined;
	if (provided && base.pings.some((ping) => ping.id === provided)) {
		return { state: base, ping: null };
	}

	const last = base.lastAcceptedAt[input.userId];
	if (last !== undefined && now - last < PING_THROTTLE_MS) {
		return { state: base, ping: null };
	}

	let id = provided;
	let seq = base.seq;
	if (!id) {
		const taken = new Set(base.pings.map((ping) => ping.id));
		const allocated = allocateId(input.userId, seq, taken, createId);
		id = allocated.id;
		seq = allocated.seq;
	}

	const ping: ActivePing = {
		id,
		x: input.x,
		y: input.y,
		userId: input.userId,
		userName: input.userName,
		color: input.color,
		timestamp: input.timestamp,
	};
	const kept =
		base.pings.length >= PING_MAX_ACTIVE
			? base.pings.slice(base.pings.length - (PING_MAX_ACTIVE - 1))
			: base.pings;

	return {
		state: {
			pings: [...kept, ping],
			lastAcceptedAt: { ...base.lastAcceptedAt, [input.userId]: now },
			seq,
		},
		ping,
	};
}

export function createPingAnimationLoop(deps: {
	now: () => number;
	getPings: () => readonly ActivePing[];
	removeIds: (ids: readonly string[]) => void;
	draw: (pings: readonly ActivePing[], now: number) => void;
	clear: () => void;
	addTicker: (tick: () => void) => void;
	removeTicker: (tick: () => void) => void;
	onStats?: (stats: PingLoopStats) => void;
}) {
	let attached = false;
	let inTick = false;
	const stats: PingLoopStats = {
		attached: false,
		ticks: 0,
		adds: 0,
		removes: 0,
		maxActive: 0,
		lastActive: 0,
		lastRadius: 0,
		lastAlpha: 0,
	};

	const publish = () => {
		stats.attached = attached;
		stats.lastActive = deps.getPings().length;
		deps.onStats?.({ ...stats });
	};

	const tick = () => {
		if (!attached) return;
		inTick = true;
		stats.ticks += 1;
		try {
			const now = deps.now();
			const pings = deps.getPings();
			if (pings.length > stats.maxActive) stats.maxActive = pings.length;
			const removed: string[] = [];
			for (const ping of pings) {
				if (!pingVisual(ping.timestamp, now).alive) removed.push(ping.id);
			}
			if (removed.length > 0) deps.removeIds(removed);
			const remaining = deps.getPings();
			if (remaining.length > stats.maxActive) {
				stats.maxActive = remaining.length;
			}
			if (remaining.length === 0) {
				detach();
				return;
			}
			const frame = pingVisual(remaining[0].timestamp, now);
			stats.lastRadius = frame.radius;
			stats.lastAlpha = frame.alpha;
			deps.draw(remaining, now);
		} finally {
			inTick = false;
			publish();
		}
	};

	const detach = () => {
		if (!attached) return;
		deps.removeTicker(tick);
		attached = false;
		stats.removes += 1;
		deps.clear();
	};

	const sync = () => {
		if (inTick) return;
		const count = deps.getPings().length;
		if (count > stats.maxActive) stats.maxActive = count;
		if (count > 0 && !attached) {
			deps.addTicker(tick);
			attached = true;
			stats.adds += 1;
		} else if (count === 0 && attached) {
			detach();
		}
		publish();
	};

	const stop = () => {
		detach();
		publish();
	};

	return {
		sync,
		stop,
		stats: () => ({ ...stats, attached }),
	};
}

/** Contadores do preview local. Fora de localhost não escreve na janela. */
export function publishPingLoopStats(stats: PingLoopStats) {
	if (typeof window === "undefined") return;
	const host = window.location?.hostname;
	if (host !== "localhost" && host !== "127.0.0.1") return;
	const win = window as Window & { __vttPingMetrics?: PingLoopStats };
	if (!win.__vttPingMetrics) {
		win.__vttPingMetrics = { ...stats };
		return;
	}
	Object.assign(win.__vttPingMetrics, stats);
}
