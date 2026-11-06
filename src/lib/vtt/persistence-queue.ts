import type { EntityRevision, EntityScope } from "./persistence-reconcile";

export type PersistenceWriteKind = "create" | "update" | "delete" | "snapshot";
export type WriteFailureKind = "transient" | "permanent" | "session";
export type QueueErrorKind =
	| WriteFailureKind
	| "entity-limit"
	| "payload-limit"
	| "offline-create"
	| "create-in-flight";
export type SessionWarning = "signed-out" | "user-mismatch";

export interface WriteFailure {
	kind: QueueErrorKind;
	message: string;
}

/** The adapter classifies errors; unknown throws are transient, never retried in a loop. */
export class PersistenceWriteError extends Error {
	constructor(
		readonly kind: WriteFailureKind,
		message: string,
	) {
		super(message);
		this.name = "PersistenceWriteError";
	}
}

export interface PersistenceWrite extends EntityRevision {
	sessionId: string;
	kind: PersistenceWriteKind;
	patch?: Readonly<Record<string, unknown>>;
	snapshot?: unknown;
	attempt: number;
	/** Metadata for UI/backoff only; seq/generation, never clocks, determine ordering. */
	sentAt: number;
}

export type PersistenceWriter = (
	write: PersistenceWrite,
) => Promise<WriteFailure | undefined>;

export interface EnqueueIntent {
	key: string;
	scope: EntityScope;
	kind: PersistenceWriteKind;
	patch?: Readonly<Record<string, unknown>>;
	snapshot?: unknown;
	online?: boolean;
}

export interface PersistenceLimits {
	maxEntities: number;
	maxPayloadBytes: number;
	maxConcurrentWriters: number;
}

export const DEFAULT_PERSISTENCE_LIMITS: Readonly<PersistenceLimits> = {
	maxEntities: 50,
	maxPayloadBytes: 512 * 1024,
	maxConcurrentWriters: 4,
};

export type Completion =
	| { status: "saved"; key: string; seq: number }
	| { status: "superseded"; key: string; seq: number }
	| { status: "failed"; key: string; seq: number; error: WriteFailure };

export interface EnqueueReceipt {
	/** false: held locally for an explicit action; it is not an HTTP success/failure. */
	accepted: boolean;
	key: string;
	seq: number;
	completion: Promise<Completion>;
}

export interface QueuedRevision extends EntityRevision {
	kind: PersistenceWriteKind;
	attempt: number;
}

export interface EntitySnapshot extends EntityRevision {
	status: "synced" | "queued" | "saving" | "recovering" | "error" | "conflict";
	queued?: QueuedRevision;
	inFlight?: QueuedRevision;
	pendingPatch?: Readonly<Record<string, unknown>>;
	pendingSnapshot?: unknown;
	pendingGeneration?: number;
	error?: WriteFailure;
	limitOverflow: boolean;
}

export interface PersistenceState {
	userId: string;
	sessionWarning: SessionWarning | null;
	activeWriters: number;
	pendingEntities: number;
	errorEntities: number;
	conflictEntities: number;
	synced: boolean;
	entities: EntitySnapshot[];
}

export interface PersistenceQueue {
	enqueue(intent: EnqueueIntent): EnqueueReceipt;
	/** Starts one HTTP request, subject to recovery/single-flight guards, after an error. */
	retry(key: string): EnqueueReceipt | null;
	/** Registers a confirmed readable base; required before an online create. */
	markBase(key: string, scope?: EntityScope): void;
	beginReconnect(scope: EntityScope): number;
	invalidate(key: string): number;
	finishRefetch(
		key: string,
		generation: number,
		remote: "present" | "missing-confirmed" | "unknown",
	): boolean;
	/** Required when a scene round includes no queue entry. */
	finishReconnect(scope: EntityScope, generation: number): boolean;
	failRefetch(key: string, generation: number, error: WriteFailure): boolean;
	resolveMissing(key: string, action: "discard" | "restore"): boolean;
	resolveLimit(key: string, action: "discard" | "restore"): boolean;
	signOut(): void;
	resume(userId: string): void;
	discardAfterUserMismatch(): boolean;
	inspect(key: string): EntitySnapshot | undefined;
	getState(): PersistenceState;
}

export interface PersistenceQueueOptions {
	userId: string;
	/** One instance per tab: no durable queue, module singleton or shared writer. */
	sessionId: string;
	writer: (write: PersistenceWrite) => Promise<WriteFailure | undefined>;
	clock: () => number;
	limits?: Partial<PersistenceLimits>;
}

interface Waiter {
	promise: Promise<Completion>;
	resolve: (result: Completion) => void;
}

interface Write extends EnqueueIntent {
	inFlight: boolean;
	seq: number;
	generation: number;
	attempt: number;
	waiter: Waiter;
}

interface Entity {
	key: string;
	campaignId: string;
	scope: EntityScope;
	seq: number;
	generation: number;
	queued?: Write;
	inFlight?: Write;
	/** An over-limit gesture is retained, not silently dropped or counted as a delta. */
	overflow?: Write;
	error?: WriteFailure;
	recovering?: number;
	conflict: boolean;
	confirmedAbsent: boolean;
	basePresent: boolean;
}

function waiter(key: string, seq: number): Waiter {
	let resolve = (_result: Completion): void => undefined;
	const promise = new Promise<Completion>((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve: (result: Completion) => resolve({ ...result, key, seq }),
	};
}

function mergePatch(
	...patches: Array<Readonly<Record<string, unknown>> | undefined>
): Readonly<Record<string, unknown>> {
	return Object.assign({}, ...patches);
}

function scopeId(scope: EntityScope): string {
	return `${scope.campaignId}\u0000${scope.sceneId}`;
}

function payloadIsValid(write: EnqueueIntent, maxBytes: number): boolean {
	if (write.kind === "delete") return true;
	try {
		const value = write.kind === "snapshot" ? write.snapshot : write.patch;
		return (
			new TextEncoder().encode(JSON.stringify(value)).byteLength <= maxBytes
		);
	} catch {
		return false;
	}
}

export function createPersistenceQueue(
	options: PersistenceQueueOptions,
): PersistenceQueue {
	const limits = { ...DEFAULT_PERSISTENCE_LIMITS, ...options.limits };
	for (const [name, value] of Object.entries(limits)) {
		if (!Number.isInteger(value) || value < 1) {
			throw new Error(`Limite de persistência inválido: ${name}`);
		}
	}
	const entities = new Map<string, Entity>();
	const generations = new Map<string, number>();
	const recoveryScopes = new Map<string, Set<string>>();
	let activeWriters = 0;
	let sessionWarning: SessionWarning | null = null;
	let suspended = false;

	const generationOf = (scope: EntityScope) =>
		generations.get(scopeId(scope)) ?? 1;
	const blocked = (entity: Entity): boolean =>
		entity.conflict ||
		(entity.error !== undefined && entity.error.kind !== "transient");
	const receipt = (write: Write, accepted = true): EnqueueReceipt => ({
		accepted,
		key: write.key,
		seq: write.seq,
		completion: write.waiter.promise,
	});
	const failedReceipt = (
		entity: Entity,
		error: WriteFailure,
	): EnqueueReceipt => {
		entity.seq += 1;
		entity.error = error;
		const next = waiter(entity.key, entity.seq);
		next.resolve({ status: "failed", key: entity.key, seq: entity.seq, error });
		return {
			accepted: false,
			key: entity.key,
			seq: entity.seq,
			completion: next.promise,
		};
	};

	function entityOf(intent: EnqueueIntent): Entity {
		const existing = entities.get(intent.key);
		if (existing) {
			if (existing.campaignId !== intent.scope.campaignId) {
				throw new Error("Uma fila não mistura campanhas");
			}
			existing.scope = intent.scope;
			existing.generation = generationOf(intent.scope);
			return existing;
		}
		const entity: Entity = {
			key: intent.key,
			campaignId: intent.scope.campaignId,
			scope: intent.scope,
			seq: 0,
			generation: generationOf(intent.scope),
			conflict: false,
			confirmedAbsent: false,
			basePresent: false,
		};
		entities.set(entity.key, entity);
		return entity;
	}

	function hasIntent(write?: Write): boolean {
		return (
			write !== undefined &&
			(write.kind !== "update" || Object.keys(write.patch ?? {}).length > 0)
		);
	}

	function deltaCount(): number {
		let count = 0;
		for (const entity of entities.values()) {
			if (hasIntent(entity.queued) || hasIntent(entity.inFlight)) count += 1;
		}
		return count;
	}

	function intentFromWrite(write: Write): EnqueueIntent {
		return {
			key: write.key,
			scope: write.scope,
			kind: write.kind,
			patch: write.patch,
			snapshot: write.snapshot,
			online: write.online,
		};
	}

	function makeWrite(
		entity: Entity,
		intent: EnqueueIntent,
		previous?: Write,
	): Write {
		entity.seq += 1;
		if (previous && !previous.inFlight) {
			previous.waiter.resolve({
				status: "superseded",
				key: entity.key,
				seq: previous.seq,
			});
		}
		const patch =
			intent.kind === "update" || intent.kind === "create"
				? mergePatch(previous?.patch, intent.patch)
				: undefined;
		return {
			...intent,
			inFlight: false,
			seq: entity.seq,
			generation: generationOf(entity.scope),
			attempt: 0,
			patch,
			snapshot: intent.kind === "snapshot" ? intent.snapshot : undefined,
			waiter: waiter(entity.key, entity.seq),
		};
	}

	function writeFailure(cause: unknown): WriteFailure {
		if (cause instanceof PersistenceWriteError) {
			return { kind: cause.kind, message: cause.message };
		}
		return {
			kind: "transient",
			message: cause instanceof Error ? cause.message : "Falha na gravação",
		};
	}

	function dispatch(): void {
		if (sessionWarning) return;
		for (const entity of entities.values()) {
			if (activeWriters >= limits.maxConcurrentWriters) return;
			const write = entity.queued;
			if (
				!write ||
				!hasIntent(write) ||
				entity.inFlight ||
				blocked(entity) ||
				entity.recovering === write.generation ||
				write.generation !== generationOf(entity.scope)
			) {
				continue;
			}
			entity.queued = undefined;
			write.inFlight = true;
			entity.inFlight = write;
			write.attempt += 1;
			activeWriters += 1;
			const request: PersistenceWrite = {
				key: write.key,
				scope: write.scope,
				sessionId: options.sessionId,
				seq: write.seq,
				generation: write.generation,
				kind: write.kind,
				patch: write.patch,
				snapshot: write.snapshot,
				attempt: write.attempt,
				sentAt: options.clock(),
			};
			void Promise.resolve()
				.then(() => options.writer(request))
				.then(
					(error: undefined | WriteFailure) => error,
					(cause: unknown) => writeFailure(cause),
				)
				.then((error: WriteFailure | undefined) => {
					activeWriters = Math.max(0, activeWriters - 1);
					if (
						entities.get(entity.key) !== entity ||
						entity.inFlight !== write
					) {
						dispatch();
						return;
					}
					write.inFlight = false;
					entity.inFlight = undefined;
					const stale =
						entity.generation !== write.generation ||
						generationOf(entity.scope) !== write.generation;
					if (stale) {
						if (
							write.kind !== "create" &&
							write.generation !== generationOf(entity.scope) &&
							!entity.queued
						) {
							entity.queued = {
								...intentFromWrite(write),
								inFlight: false,
								seq: write.seq,
								generation: generationOf(entity.scope),
								attempt: write.attempt,
								waiter: waiter(entity.key, write.seq),
							};
						}
						write.waiter.resolve({
							status: "superseded",
							key: entity.key,
							seq: write.seq,
						});
					} else if (!error) {
						const status =
							entity.queued || entity.seq !== write.seq
								? "superseded"
								: "saved";
						write.waiter.resolve({ status, key: entity.key, seq: write.seq });
						if (write.kind === "delete") entity.confirmedAbsent = true;
						if (write.kind === "create") entity.basePresent = true;
						if (
							write.kind === "update" &&
							entity.seq === write.seq &&
							write.patch &&
							Object.keys(write.patch).length > 0
						) {
							entity.queued = {
								...intentFromWrite(write),
								inFlight: false,
								seq: write.seq,
								generation: write.generation,
								attempt: 0,
								patch: {},
								waiter: waiter(entity.key, write.seq),
							};
						}
					} else {
						const latest = entity.queued;
						if (latest && write.kind === "update" && latest.kind === "update") {
							latest.patch = mergePatch(write.patch, latest.patch);
						}
						entity.queued = latest ?? {
							...intentFromWrite(write),
							inFlight: false,
							seq: write.seq,
							generation: write.generation,
							attempt: 0,
							waiter: waiter(entity.key, write.seq),
						};
						entity.error = error;
						write.waiter.resolve({
							status: "failed",
							key: entity.key,
							seq: write.seq,
							error,
						});
						if (error.kind === "session") sessionWarning = "signed-out";
					}
					dispatch();
				});
		}
	}

	function enqueue(intent: EnqueueIntent): EnqueueReceipt {
		const entity = entityOf(intent);
		if (entity.confirmedAbsent && intent.kind === "update") {
			entity.conflict = true;
		}
		if (entity.conflict) {
			// An unavailable row is never recreated or merged into a new base.
			// Only resolveMissing's explicit discard/restore action unlocks it.
			const next = makeWrite(entity, intent, entity.queued);
			entity.queued = next;
			return receipt(next, false);
		}
		const duplicateDelete = [
			entity.overflow,
			entity.inFlight,
			entity.queued,
		].find((write) => write?.kind === intent.kind && intent.kind === "delete");
		if (duplicateDelete) return receipt(duplicateDelete, !entity.error);
		if (intent.kind === "delete" && entity.confirmedAbsent) {
			const next = makeWrite(entity, intent);
			next.waiter.resolve({ status: "saved", key: entity.key, seq: next.seq });
			return receipt(next);
		}
		if (intent.kind === "create") {
			const duplicate = entity.inFlight ?? entity.queued;
			if (duplicate) {
				let same = false;
				try {
					same =
						JSON.stringify(duplicate.patch) === JSON.stringify(intent.patch);
				} catch {
					same = false;
				}
				if (same) return receipt(duplicate, !entity.error);
				const error: WriteFailure = {
					kind: "create-in-flight",
					message: "Criação aguarda leitura confirmada; não será duplicada",
				};
				const failed = waiter(intent.key, entity.seq + 1);
				failed.resolve({
					status: "failed",
					key: intent.key,
					seq: entity.seq,
					error,
				});
				return {
					accepted: false,
					key: intent.key,
					seq: entity.seq,
					completion: failed.promise,
				};
			}
			if (
				!intent.online ||
				!entity.basePresent ||
				sessionWarning ||
				entity.recovering !== undefined
			) {
				return failedReceipt(entity, {
					kind: "offline-create",
					message: "Criação exige conexão e base confirmada; nada foi enviado",
				});
			}
		}
		if (
			!entity.queued &&
			!entity.inFlight &&
			!entity.overflow &&
			deltaCount() >= limits.maxEntities
		) {
			const held = makeWrite(entity, intent);
			entity.overflow = held;
			entity.error = {
				kind: "entity-limit",
				message: `Máximo de ${limits.maxEntities} entidades com delta; o último gesto foi mantido`,
			};
			held.waiter.resolve({
				status: "failed",
				key: entity.key,
				seq: held.seq,
				error: entity.error,
			});
			return receipt(held, false);
		}
		if (entity.overflow) {
			const next = makeWrite(entity, intent, entity.overflow);
			entity.overflow = next;
			entity.error = {
				kind: "payload-limit",
				message: "Payload excede o limite; gesto anterior preservado",
			};
			return receipt(next, false);
		}
		const write = makeWrite(entity, intent, entity.queued);
		if (!payloadIsValid(write, limits.maxPayloadBytes)) {
			entity.overflow = write;
			entity.error = {
				kind: "payload-limit",
				message: `Máximo de ${limits.maxPayloadBytes} bytes por gravação; o gesto foi mantido`,
			};
			write.waiter.resolve({
				status: "failed",
				key: entity.key,
				seq: write.seq,
				error: entity.error,
			});
			return receipt(write, false);
		}
		entity.overflow = undefined;
		entity.queued = write;
		dispatch();
		return receipt(
			write,
			!blocked(entity) && !sessionWarning && entity.recovering === undefined,
		);
	}

	function invalidate(key: string): number {
		const entity = entities.get(key);
		if (!entity) return 0;
		const generation = generationOf(entity.scope) + 1;
		generations.set(scopeId(entity.scope), generation);
		recoveryScopes.delete(scopeId(entity.scope));
		entity.generation = generation;
		entity.error = undefined;
		entity.recovering = generation;
		if (entity.queued) entity.queued.generation = generation;
		return generation;
	}

	function recoverScope(entity: Entity, generation: number): void {
		const id = scopeId(entity.scope);
		const waiting = recoveryScopes.get(id);
		if (!waiting) return;
		waiting.delete(entity.key);
		if (waiting.size === 0 && generationOf(entity.scope) === generation) {
			recoveryScopes.delete(id);
		}
	}

	function finishRound(scope: EntityScope, generation: number): boolean {
		if (generationOf(scope) !== generation) return false;
		for (const entity of entities.values()) {
			if (
				scopeId(entity.scope) === scopeId(scope) &&
				entity.recovering === generation
			)
				return false;
		}
		recoveryScopes.delete(scopeId(scope));
		return true;
	}

	function inspect(entity: Entity): EntitySnapshot {
		const revision = (write?: Write): QueuedRevision | undefined =>
			write
				? {
						key: entity.key,
						scope: entity.scope,
						seq: write.seq,
						generation: write.generation,
						kind: write.kind,
						attempt: write.attempt,
					}
				: undefined;
		const held = entity.overflow ?? entity.queued;
		const pendingPatch = mergePatch(
			entity.inFlight?.kind === "update" ? entity.inFlight.patch : undefined,
			held?.kind === "update" ? held.patch : undefined,
		);
		return {
			key: entity.key,
			scope: entity.scope,
			seq: entity.seq,
			generation: entity.generation,
			status: entity.conflict
				? "conflict"
				: entity.error
					? "error"
					: entity.recovering !== undefined
						? "recovering"
						: entity.inFlight
							? "saving"
							: entity.queued
								? "queued"
								: "synced",
			queued: revision(hasIntent(entity.queued) ? entity.queued : undefined),
			inFlight: revision(entity.inFlight),
			pendingPatch: Object.keys(pendingPatch).length ? pendingPatch : undefined,
			pendingSnapshot: held?.kind === "snapshot" ? held.snapshot : undefined,
			pendingGeneration: held?.generation ?? entity.inFlight?.generation,
			error: entity.error,
			limitOverflow: entity.overflow !== undefined,
		};
	}

	return {
		enqueue,
		markBase: (key, scope) => {
			if (scope && !entities.has(key)) {
				entityOf({ key, scope, kind: "update", patch: {} });
			}
			const entity = entities.get(key);
			if (entity && !sessionWarning && entity.recovering === undefined) {
				entity.basePresent = true;
			}
		},
		retry: (key) => {
			const entity = entities.get(key);
			if (!entity || suspended) return null;
			if (entity.inFlight) return receipt(entity.inFlight);
			if (!entity.queued) return null;
			entity.error = undefined;
			entity.recovering = undefined;
			const current = entity.queued;
			current.attempt = 0;
			dispatch();
			return receipt(current, !entity.conflict && !sessionWarning);
		},
		beginReconnect: (scope) => {
			const generation = generationOf(scope) + 1;
			generations.set(scopeId(scope), generation);
			const waiting = new Set<string>();
			recoveryScopes.set(scopeId(scope), waiting);
			for (const entity of entities.values()) {
				if (scopeId(entity.scope) !== scopeId(scope)) continue;
				entity.generation = generation;
				entity.recovering = generation;
				if (entity.queued) entity.queued.generation = generation;
				waiting.add(entity.key);
			}
			return generation;
		},
		invalidate,
		finishReconnect: (scope, generation) => finishRound(scope, generation),
		failRefetch: (key, generation, error) => {
			const entity = entities.get(key);
			if (
				!entity ||
				entity.generation !== generation ||
				entity.recovering !== generation ||
				generationOf(entity.scope) !== generation
			) {
				return false;
			}
			entity.error = error;
			entity.recovering = undefined;
			recoverScope(entity, generation);
			return true;
		},
		finishRefetch: (key, generation, remote) => {
			const entity = entities.get(key);
			if (!entity || remote === "unknown") return false;
			if (
				entity.generation !== generation ||
				generationOf(entity.scope) !== generation ||
				entity.recovering !== generation ||
				entity.error
			) {
				return false;
			}
			entity.recovering = undefined;
			entity.basePresent = remote === "present";
			if (remote === "missing-confirmed") entity.confirmedAbsent = true;
			recoverScope(entity, generation);
			if (
				remote === "missing-confirmed" &&
				(hasIntent(entity.queued) || hasIntent(entity.inFlight))
			) {
				if (!entity.inFlight && entity.queued?.kind === "delete") {
					entity.queued.waiter.resolve({
						status: "saved",
						key,
						seq: entity.queued.seq,
					});
					entity.queued = undefined;
					entity.confirmedAbsent = true;
				} else {
					entity.conflict = true;
				}
			}
			dispatch();
			return true;
		},
		resolveMissing: (key, action) => {
			const entity = entities.get(key);
			if (!entity?.conflict || entity.inFlight) return false;
			if (action === "discard") {
				entity.queued?.waiter.resolve({
					status: "superseded",
					key,
					seq: entity.queued.seq,
				});
				entities.delete(key);
				return true;
			}
			entity.conflict = false;
			entity.error = undefined;
			dispatch();
			return true;
		},
		resolveLimit: (key, action) => {
			const entity = entities.get(key);
			if (!entity?.overflow) return false;
			if (action === "discard") {
				entity.overflow.waiter.resolve({
					status: "superseded",
					key,
					seq: entity.overflow.seq,
				});
				entities.delete(key);
				return true;
			}
			if (deltaCount() >= limits.maxEntities) return false;
			entity.queued?.waiter.resolve({
				status: "superseded",
				key,
				seq: entity.queued.seq,
			});
			entity.queued = entity.overflow;
			entity.overflow = undefined;
			entity.error = payloadIsValid(entity.queued, limits.maxPayloadBytes)
				? undefined
				: {
						kind: "payload-limit",
						message: "Payload excede o limite por gravação",
					};
			dispatch();
			return true;
		},
		signOut: () => {
			suspended = true;
			sessionWarning = "signed-out";
			for (const entity of entities.values()) {
				if (entity.queued && !entity.inFlight)
					entity.recovering = entity.queued.generation;
			}
		},
		resume: (userId) => {
			if (userId !== options.userId) {
				suspended = true;
				sessionWarning = "user-mismatch";
				return;
			}
			if (sessionWarning === "user-mismatch") return;
			if (suspended) {
				for (const entity of entities.values()) {
					if (entity.queued && !entity.inFlight)
						entity.recovering = entity.queued.generation;
				}
			}
			suspended = false;
			sessionWarning = null;
			for (const entity of entities.values()) {
				if (entity.queued && !entity.inFlight)
					entity.recovering = entity.queued.generation;
			}
			dispatch();
		},
		discardAfterUserMismatch: () => {
			if (sessionWarning !== "user-mismatch") return false;
			for (const entity of entities.values()) {
				entity.queued?.waiter.resolve({
					status: "superseded",
					key: entity.key,
					seq: entity.queued.seq,
				});
				entity.inFlight?.waiter.resolve({
					status: "superseded",
					key: entity.key,
					seq: entity.inFlight.seq,
				});
			}
			entities.clear();
			generations.clear();
			recoveryScopes.clear();
			return true;
		},
		inspect: (key) => {
			const entity = entities.get(key);
			return entity ? inspect(entity) : undefined;
		},
		getState: () => {
			let pendingEntities = 0;
			let errorEntities = 0;
			let conflictEntities = 0;
			let recovering = false;
			for (const entity of entities.values()) {
				if (
					hasIntent(entity.queued) ||
					hasIntent(entity.inFlight) ||
					hasIntent(entity.overflow)
				)
					pendingEntities += 1;
				if (entity.error) errorEntities += 1;
				if (entity.conflict) conflictEntities += 1;
				if (entity.recovering !== undefined) recovering = true;
			}
			return {
				userId: options.userId,
				sessionWarning,
				activeWriters,
				pendingEntities,
				errorEntities,
				conflictEntities,
				synced:
					!sessionWarning &&
					!recovering &&
					recoveryScopes.size === 0 &&
					pendingEntities === 0 &&
					errorEntities === 0 &&
					conflictEntities === 0,
				entities: Array.from(entities.values(), inspect),
			};
		},
	};
}
