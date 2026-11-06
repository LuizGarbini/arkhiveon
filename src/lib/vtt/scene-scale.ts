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
	/** Double clicks receive the original promise, never another multiplication. */
	execute: () => Promise<SceneScaleResult>;
}
export interface SceneScaleView {
	sceneId: string;
	status: SceneScaleStatus;
	snapshot: SceneScaleSnapshot;
	mapScale: number;
	factor: number | null;
	error?: unknown;
}
export interface SceneScaleOptions {
	persistence: ScenePersistence;
	capture: (sceneId: string) => SceneScaleSnapshot | undefined;
	/** Reuse mapScale/scaleSceneEntities only after the physical writes settle. */
	apply: (scale: OptimisticScale) => void;
	/** Restore the whole captured scene and both coordinate arrays, not other scenes. */
	restore: (snapshot: SceneScaleSnapshot) => void;
	scaleScene: (sceneId: string, factor: number) => Promise<void>;
}
export type SceneScaleFinish =
	| "succeeded"
	| "failed"
	| "recovering"
	| { status: "reconcile"; read: () => Promise<void> };
export interface SceneScaleCoordinator extends SceneScaleGate {
	prepareScale(sceneId: string, nextScale: number): SceneScaleOperation | null;
	finishScale(sceneId: string, outcome: SceneScaleFinish): Promise<boolean>;
	getStatus(sceneId: string): SceneScaleStatus;
	getScaleSnapshot(sceneId: string): SceneScaleView | null;
	subscribe(listener: () => void): () => void;
}
/** Only this explicit classification retains unresolved optimistic geometry. */
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
	execution?: Promise<SceneScaleResult>;
}
const settled = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Injected transport/store only: no real RPC, UI nor changes to the P1 queue. */
export function createSceneScaleCoordinator(
	options: SceneScaleOptions,
): SceneScaleCoordinator {
	const records = new Map<string, ScaleRecord>();
	const listeners = new Set<() => void>();
	function notify(): void {
		for (const listener of listeners) listener();
	}
	function status(
		sceneId: string,
		next: SceneScaleStatus,
		error?: unknown,
	): void {
		const record = records.get(sceneId);
		if (!record) return;
		record.view = { ...record.view, status: next, error };
		notify();
	}
	function close(sceneId: string): void {
		records.delete(sceneId);
		notify();
	}
	async function drain(sceneId: string): Promise<void> {
		const { queue } = options.persistence;
		while (true) {
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
				// Observe the P1 ACK after its microtask before starting optimistic scale.
				await Promise.resolve();
				const stable = queue.inspect(scenePersistenceKey(sceneId));
				if (
					stable &&
					!stable.queued &&
					!stable.inFlight &&
					!stable.error &&
					stable.status === "synced" &&
					!queue.getState().sessionWarning
				) {
					return;
				}
			}
			// P1 exposes no drain callback. This is not a render/frame loop.
			await settled();
		}
	}
	return {
		prepareScale(sceneId, nextScale) {
			if (records.has(sceneId)) return null;
			const captured = options.capture(sceneId);
			const base = options.persistence.getSceneSnapshot(sceneId).base;
			if (captured?.scene.id !== sceneId || !base) return null;
			const snapshot: SceneScaleSnapshot = {
				scene: { ...captured.scene },
				tokens: captured.tokens,
				walls: captured.walls,
			};
			const { scene } = snapshot;
			const mapScale = clampMapScaleForScene(
				nextScale,
				scene.width,
				scene.height,
			);
			const factor = mapScaleFactor(scene.mapScale, mapScale);
			// Valid no-op: neither a lock nor an RPC. <=0 is not a valid no-op.
			if (scene.mapScale > 0 && scene.mapScale === mapScale) return null;
			const record: ScaleRecord = {
				view: { sceneId, status: "draining", snapshot, mapScale, factor },
			};
			records.set(sceneId, record);
			notify();
			return {
				execute() {
					if (record.execution) return record.execution;
					record.execution = (async (): Promise<SceneScaleResult> => {
						if (factor == null) {
							const error = new SceneScaleAmbiguousError(
								"Escala atual inválida; leia a cena antes de salvar",
							);
							status(sceneId, "recovering", error);
							return { status: "recovering", error };
						}
						try {
							await drain(sceneId);
						} catch (error) {
							status(sceneId, "recovering", error);
							return { status: "recovering", error };
						}
						if (records.get(sceneId) !== record) return { status: "no-op" };
						status(sceneId, "scaling");
						options.apply({ snapshot, factor });
						try {
							await options.scaleScene(sceneId, factor);
							close(sceneId);
							return { status: "succeeded" };
						} catch (error) {
							const ambiguous = error instanceof SceneScaleAmbiguousError;
							if (!ambiguous) options.restore(snapshot);
							status(sceneId, ambiguous ? "recovering" : "failed", error);
							return { status: ambiguous ? "recovering" : "failed", error };
						}
					})();
					return record.execution;
				},
			};
		},
		async finishScale(sceneId, outcome) {
			const record = records.get(sceneId);
			if (
				!record ||
				record.view.status === "draining" ||
				record.view.status === "scaling" ||
				(typeof outcome === "object" && record.view.status !== "recovering")
			) {
				return false;
			}
			if (typeof outcome === "object") {
				// Read with the lock still held. SceneRequest/sequence guards belong to the route.
				// This gate never retries a possibly-applied multiplicative RPC automatically.
				await outcome.read();
			}
			if (records.get(sceneId) !== record) return false;
			close(sceneId);
			return true;
		},
		getStatus(sceneId) {
			return records.get(sceneId)?.view.status ?? "idle";
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
