import { clampMapScaleForScene, mapScaleFactor } from "./map-scale";
import type { ScenePersistence, SceneScaleGate } from "./scene-persistence";
import { scenePersistenceKey } from "./scene-persistence";
import type { VTTScene } from "./types";

/** Capture only: P2a2 does not persist token, wall or fog-path changes. */
export interface SceneScaleSnapshot {
	scene: VTTScene;
	tokens: readonly unknown[];
	walls: readonly unknown[];
}
export type SceneScaleStatus =
	| "idle"
	| "draining"
	| "scaling"
	| "recovering"
	| "failed";
export interface OptimisticScale {
	snapshot: SceneScaleSnapshot;
	factor: number;
}
export type SceneScaleResult =
	| { status: "no-op" }
	| { status: "succeeded" }
	| { status: "failed"; error: unknown }
	| { status: "recovering"; error: unknown };
export interface SceneScaleOperation {
	execute: () => Promise<SceneScaleResult>;
	subscribeAbort: (listener: (signal: AbortSignal) => void) => () => void;
}
export interface ScaleClock {
	now: () => number;
	setTimeout: (callback: () => void, delayMs: number) => unknown;
	clearTimeout: (id: unknown) => void;
}
export interface SceneScaleView {
	sceneId: string;
	status: SceneScaleStatus;
	snapshot: SceneScaleSnapshot;
	mapScale: number;
	factor: number | null;
	error?: unknown;
}
export type SceneScaleTransportOutcome =
	| { kind: "confirmed" }
	| { kind: "rejected"; error?: unknown }
	| { kind: "unknown"; error?: unknown };
export type SceneScaleTransport = (
	sceneId: string,
	factor: number,
	context: { signal: AbortSignal },
) => Promise<SceneScaleTransportOutcome>;
export interface SceneScaleReconciliation {
	sceneId: string;
	campaignId: string;
	scope: "grid-scene";
	generation: number;
}
export type SceneScaleRead =
	| {
			status: "confirmed";
			snapshot: SceneScaleReconciliation | null | undefined;
	  }
	| { status: "unknown" | "rejected" };
export interface SceneScaleOptions {
	persistence: ScenePersistence;
	capture: (sceneId: string) => SceneScaleSnapshot | undefined;
	apply: (scale: OptimisticScale) => void;
	restore: (snapshot: SceneScaleSnapshot) => void;
	scaleScene: SceneScaleTransport;
	clock?: ScaleClock;
	timeoutMs?: number;
}
export type SceneScaleFinish =
	| "succeeded"
	| "failed"
	| "recovering"
	| {
			status: "reconcile";
			read: (
				context: Readonly<SceneScaleReconciliation>,
			) => Promise<SceneScaleRead>;
	  };
export interface SceneScaleCoordinator extends SceneScaleGate {
	prepareScale(sceneId: string, nextScale: number): SceneScaleOperation | null;
	finishScale(sceneId: string, outcome: SceneScaleFinish): Promise<boolean>;
	getStatus(sceneId: string): SceneScaleStatus;
	getReconciliation(sceneId: string): SceneScaleReconciliation | null;
	/** Abort retained recovering/draining records; permanently end this gate. */
	abort: (reason?: unknown) => void;
	dispose: () => void;
	/** Diagnostics: active clocks/waits only, not retained recovery locks. */
	getActiveOperationCount: () => number;
	getScaleSnapshot(sceneId: string): SceneScaleView | null;
	subscribe(listener: () => void): () => void;
}
/** A throw is always delivered as unknown, never as definitive rejection. */
export class SceneScaleAmbiguousError extends Error {
	constructor(
		message = "Resultado da escala desconhecido; reconcilie antes de repetir",
	) {
		super(message);
		this.name = "SceneScaleAmbiguousError";
	}
}
interface ScaleRecord {
	view: SceneScaleView;
	reconciliation: SceneScaleReconciliation;
	controller: AbortController;
	execution?: Promise<SceneScaleResult>;
	canceled?: boolean;
	transportAbandoned?: boolean;
	cancelWait?: () => void;
	unsubscribe?: () => void;
	abortUnsubscribers: Set<() => void>;
}
const systemClock: ScaleClock = {
	now: Date.now,
	setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
	clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};
const disposedResult: SceneScaleResult = { status: "no-op" };
function isConfirmed(
	snapshot: SceneScaleReconciliation | null | undefined,
	expected: SceneScaleReconciliation,
): boolean {
	return (
		snapshot !== null &&
		snapshot !== undefined &&
		typeof snapshot.sceneId === "string" &&
		typeof snapshot.campaignId === "string" &&
		snapshot.scope === "grid-scene" &&
		Number.isSafeInteger(snapshot.generation) &&
		snapshot.sceneId === expected.sceneId &&
		snapshot.campaignId === expected.campaignId &&
		snapshot.scope === expected.scope &&
		snapshot.generation === expected.generation
	);
}

/** Injected gate only: never changes or cancels P1's physical writer or retained deltas. */
export function createSceneScaleCoordinator(
	options: SceneScaleOptions,
): SceneScaleCoordinator {
	const clock = options.clock ?? systemClock;
	const timeoutMs = options.timeoutMs ?? 15_000;
	const records = new Map<string, ScaleRecord>();
	const listeners = new Set<() => void>();
	const timers = new Set<unknown>();
	const pendingWaits = new Set<ScaleRecord>();
	let disposed = false;
	function close(record: ScaleRecord): void {
		if (records.get(record.view.sceneId) !== record) return;
		record.cancelWait?.();
		record.unsubscribe?.();
		record.unsubscribe = undefined;
		records.delete(record.view.sceneId);
		for (const listener of listeners) listener();
	}
	function status(
		record: ScaleRecord,
		next: SceneScaleStatus,
		error?: unknown,
	): void {
		if (records.get(record.view.sceneId) !== record) return;
		record.view = { ...record.view, status: next, error };
		for (const listener of listeners) listener();
	}
	function cancel(record: ScaleRecord, reason: unknown): void {
		record.canceled = true;
		record.controller.abort(reason);
		for (const unsubscribe of record.abortUnsubscribers) unsubscribe();
		record.abortUnsubscribers.clear();
		record.cancelWait?.();
		record.unsubscribe?.();
		record.unsubscribe = undefined;
	}
	function cancelAll(reason: unknown): void {
		for (const record of [...records.values()]) {
			cancel(record, reason);
			close(record);
		}
		timers.clear();
	}
	/** Abort/dispose settles only this coordinator's local Promise, not the P1 write. */
	function wait<T>(
		record: ScaleRecord,
		work: Promise<T>,
		delay: number,
	): Promise<{ value?: T; timedOut?: boolean }> {
		pendingWaits.add(record);
		return new Promise((resolve) => {
			let ended = false;
			let tick: unknown;
			const finish = (value: { value?: T; timedOut?: boolean }) => {
				if (ended) return;
				ended = true;
				if (tick !== undefined) {
					clock.clearTimeout(tick);
					timers.delete(tick);
				}
				record.cancelWait = undefined;
				pendingWaits.delete(record);
				record.controller.signal.removeEventListener("abort", abort);
				resolve(value);
			};
			const abort = () => finish({});
			tick = clock.setTimeout(
				() => finish({ timedOut: true }),
				Math.max(0, delay),
			);
			timers.add(tick);
			record.cancelWait = () => finish({});
			if (record.controller.signal.aborted) abort();
			else
				record.controller.signal.addEventListener("abort", abort, {
					once: true,
				});
			void Promise.resolve(work).then(
				(value) => finish({ value }),
				() => finish({}),
			);
		});
	}
	async function drain(record: ScaleRecord): Promise<boolean> {
		const { queue } = options.persistence;
		const sceneId = record.view.sceneId;
		const deadline = clock.now() + timeoutMs;
		while (records.get(sceneId) === record) {
			if (record.controller.signal.aborted) return false;
			const entity = queue.inspect(scenePersistenceKey(sceneId));
			if (
				!entity ||
				entity.error ||
				entity.limitOverflow ||
				entity.status === "recovering" ||
				entity.status === "conflict" ||
				queue.getState().sessionWarning
			) {
				throw new Error("Dreno exige leitura; escala não será chamada");
			}
			if (!entity.queued && !entity.inFlight) {
				await Promise.resolve();
				const stable = queue.inspect(scenePersistenceKey(sceneId));
				if (
					stable &&
					!stable.queued &&
					!stable.inFlight &&
					!stable.error &&
					stable.status === "synced" &&
					!queue.getState().sessionWarning
				)
					return true;
			}
			const remaining = deadline - clock.now();
			if (remaining <= 0) throw new Error("Tempo do dreno esgotado");
			let resolveTick: (() => void) | undefined;
			const tick = new Promise<void>((resolve) => {
				resolveTick = resolve;
			});
			const unsubscribe = options.persistence.subscribe(() => resolveTick?.());
			const abort = () => resolveTick?.();
			record.controller.signal.addEventListener("abort", abort, { once: true });
			record.unsubscribe = () => {
				record.controller.signal.removeEventListener("abort", abort);
				unsubscribe();
			};
			try {
				await wait(record, tick, Math.min(250, remaining));
				if (clock.now() >= deadline) throw new Error("Tempo do dreno esgotado");
			} finally {
				record.controller.signal.removeEventListener("abort", abort);
				unsubscribe();
				record.unsubscribe = undefined;
			}
		}
		return false;
	}
	return {
		prepareScale(sceneId, nextScale) {
			if (disposed || records.has(sceneId)) return null;
			const captured = options.capture(sceneId);
			const base = options.persistence.getSceneSnapshot(sceneId).base;
			if (captured?.scene.id !== sceneId || !base) return null;
			const snapshot: SceneScaleSnapshot = {
				scene: { ...captured.scene },
				tokens: captured.tokens,
				walls: captured.walls,
			};
			const mapScale = clampMapScaleForScene(
				nextScale,
				snapshot.scene.width,
				snapshot.scene.height,
			);
			const factor = mapScaleFactor(snapshot.scene.mapScale, mapScale);
			if (snapshot.scene.mapScale > 0 && snapshot.scene.mapScale === mapScale)
				return null;
			const entity = options.persistence.queue.inspect(
				scenePersistenceKey(sceneId),
			);
			if (!entity) return null;
			const record: ScaleRecord = {
				view: { sceneId, status: "draining", snapshot, mapScale, factor },
				reconciliation: {
					sceneId,
					campaignId: base.campaignId,
					scope: "grid-scene",
					generation: entity.generation,
				},
				controller: new AbortController(),
				abortUnsubscribers: new Set(),
			};
			records.set(sceneId, record);
			for (const listener of listeners) listener();
			return {
				subscribeAbort(listener) {
					const receive = () => {
						unsubscribe();
						listener(record.controller.signal);
					};
					const unsubscribe = () => {
						record.controller.signal.removeEventListener("abort", receive);
						record.abortUnsubscribers.delete(unsubscribe);
					};
					if (record.controller.signal.aborted) receive();
					else {
						record.controller.signal.addEventListener("abort", receive, {
							once: true,
						});
						record.abortUnsubscribers.add(unsubscribe);
					}
					return unsubscribe;
				},
				execute() {
					if (record.execution) return record.execution;
					if (disposed || record.controller.signal.aborted)
						return Promise.resolve(disposedResult);
					record.execution = (async (): Promise<SceneScaleResult> => {
						if (factor == null) {
							const error = new SceneScaleAmbiguousError(
								"Escala atual inválida; leia a cena antes de salvar",
							);
							status(record, "recovering", error);
							return { status: "recovering", error };
						}
						try {
							if (!(await drain(record))) {
								close(record);
								return disposedResult;
							}
						} catch (error) {
							status(record, "recovering", error);
							return { status: "recovering", error };
						}
						if (
							disposed ||
							record.canceled ||
							record.controller.signal.aborted ||
							records.get(sceneId) !== record
						) {
							close(record);
							return disposedResult;
						}
						status(record, "scaling");
						options.apply({ snapshot, factor });
						let answer: SceneScaleTransportOutcome;
						try {
							const work = options.scaleScene(sceneId, factor, {
								signal: record.controller.signal,
							});
							const result = await wait(
								record,
								work.then(
									(outcome) => ({ outcome }),
									(error: unknown) => ({
										outcome: { kind: "unknown" as const, error },
									}),
								),
								timeoutMs,
							);
							if (result.timedOut) {
								record.transportAbandoned = true;
								answer = {
									kind: "unknown",
									error: new SceneScaleAmbiguousError("Timeout do transporte"),
								};
								cancel(record, answer.error);
							} else
								answer = result.value?.outcome ?? {
									kind: "unknown",
									error: new SceneScaleAmbiguousError(
										"Resposta ausente do transporte",
									),
								};
						} catch (error) {
							answer = { kind: "unknown", error };
						}
						if (
							disposed ||
							(record.canceled && !record.transportAbandoned) ||
							(record.controller.signal.aborted &&
								!record.transportAbandoned) ||
							records.get(sceneId) !== record
						)
							return disposedResult;
						if (answer.kind === "confirmed") {
							close(record);
							for (const unsubscribe of record.abortUnsubscribers)
								unsubscribe();
							record.abortUnsubscribers.clear();
							return { status: "succeeded" };
						}
						if (answer.kind === "rejected") {
							options.restore(snapshot);
							status(record, "failed", answer.error);
							return { status: "failed", error: answer.error };
						}
						status(record, "recovering", answer.error);
						return { status: "recovering", error: answer.error };
					})();
					return record.execution;
				},
			};
		},
		async finishScale(sceneId, outcome) {
			const record = records.get(sceneId);
			if (
				!record ||
				disposed ||
				(record.canceled && !record.transportAbandoned)
			)
				return false;
			if (outcome === "succeeded" && record.view.status === "scaling") {
				close(record);
				return true;
			}
			if (outcome === "failed" && record.view.status === "failed") {
				close(record);
				return true;
			}
			if (
				typeof outcome !== "object" ||
				outcome.status !== "reconcile" ||
				record.view.status !== "recovering"
			)
				return false;
			const expected = { ...record.reconciliation };
			const generation = options.persistence.queue.inspect(
				scenePersistenceKey(sceneId),
			)?.generation;
			if (generation !== expected.generation) return false;
			let read: SceneScaleRead;
			try {
				read = await outcome.read(expected);
			} catch {
				return false;
			}
			const latest = options.persistence.queue.inspect(
				scenePersistenceKey(sceneId),
			)?.generation;
			if (
				disposed ||
				(record.canceled && !record.transportAbandoned) ||
				records.get(sceneId) !== record ||
				record.view.status !== "recovering" ||
				latest !== generation ||
				read.status !== "confirmed" ||
				!isConfirmed(read.snapshot, expected)
			)
				return false;
			close(record);
			return true;
		},
		abort(reason = "cancelled") {
			cancelAll(reason);
		},
		dispose() {
			disposed = true;
			cancelAll("disposed");
			listeners.clear();
		},
		getActiveOperationCount() {
			if (pendingWaits.size !== timers.size)
				throw new Error("Inconsistência de espera do gate");
			return timers.size;
		},
		getStatus(sceneId) {
			return records.get(sceneId)?.view.status ?? "idle";
		},
		getReconciliation(sceneId) {
			const context = records.get(sceneId)?.reconciliation;
			return context ? { ...context } : null;
		},
		getScaleSnapshot(sceneId) {
			return records.get(sceneId)?.view ?? null;
		},
		isScaleLocked(sceneId) {
			return records.has(sceneId);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
