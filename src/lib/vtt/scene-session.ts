import { clampMapScaleForScene, scaleSceneEntities } from "./map-scale";
import {
	createPersistenceQueue,
	type PersistenceWriter,
} from "./persistence-queue";
import {
	createScenePersistence,
	type ScenePatch,
	scenePersistenceKey,
} from "./scene-persistence";
import {
	createSceneScaleCoordinator,
	type SceneScaleTransport,
} from "./scene-scale";
import type { VTTScene, VTTToken } from "./types";
import { useVTTStore } from "./vtt-store";
import type { VTTWall } from "./walls";

export interface SceneGeometry {
	scene: VTTScene;
	tokens: VTTToken[];
	walls: VTTWall[];
}
export interface SceneSessionOptions {
	userId: string;
	campaignId: string;
	sessionId: string;
	writeScene: PersistenceWriter;
	scaleScene: SceneScaleTransport;
	readGeometry(sceneId: string): Promise<SceneGeometry | null>;
	onReadError?(): void;
}
/** One P1 instance per mounted user/campaign, never a global singleton. */
export function createSceneSession(options: SceneSessionOptions) {
	let live = true;
	let lifecycle = 0,
		readRevision = 0;
	const sceneReads = new Map<string, number>();
	const locallyScaled = new Set<string>();
	const getReadGeneration = (id?: string) =>
		`${lifecycle}:${id ? (sceneReads.get(id) ?? 0) : readRevision}`;
	const invalidateReads = (id: string) => {
		sceneReads.set(id, ++readRevision);
	};
	// One atomic store publication: subscribers may dispose/switch scenes synchronously.
	const applyGeometry = (
		id: string,
		mapScale: number,
		geometry: { tokens: VTTToken[]; walls: VTTWall[] },
	) => {
		if (!belongs(id)) return;
		invalidateReads(id);
		useVTTStore.setState((state) => ({
			scenes: state.scenes.map((scene) =>
				scene.id === id ? { ...scene, mapScale } : scene,
			),
			...(state.activeSceneId === id
				? {
						tokens: geometry.tokens,
						walls: geometry.walls,
						wallsStatus: "ready" as const,
					}
				: {}),
		}));
	};
	const belongs = (id: string) =>
		live &&
		options.userId !== "signed-out" &&
		useVTTStore
			.getState()
			.scenes.some((s) => s.id === id && s.campaignId === options.campaignId);
	const persistence = createScenePersistence({
		sessionId: options.sessionId,
		writeScene: (write) =>
			live
				? options.writeScene(write)
				: Promise.resolve({ kind: "session", message: "Sessão encerrada" }),
		queueFactory: (writer) =>
			createPersistenceQueue({
				userId: options.userId,
				sessionId: options.sessionId,
				writer,
				clock: Date.now,
			}),
		onStore: (id, patch) => {
			if (belongs(id)) useVTTStore.getState().updateScene(id, patch);
		},
	});
	const scale = createSceneScaleCoordinator({
		persistence,
		capture: (id) => {
			const state = useVTTStore.getState(),
				scene = state.scenes.find((s) => s.id === id);
			if (!belongs(id) || !scene || state.activeSceneId !== id)
				return undefined;
			return { scene, tokens: state.tokens, walls: state.walls };
		},
		apply: ({ snapshot, factor }) => {
			locallyScaled.add(snapshot.scene.id);
			applyGeometry(
				snapshot.scene.id,
				snapshot.scene.mapScale * factor,
				scaleSceneEntities(
					snapshot.scene.id,
					factor,
					snapshot.tokens as VTTToken[],
					snapshot.walls as VTTWall[],
				),
			);
		},
		restore: (snapshot) =>
			applyGeometry(snapshot.scene.id, snapshot.scene.mapScale, {
				tokens: snapshot.tokens as VTTToken[],
				walls: snapshot.walls as VTTWall[],
			}),
		scaleScene: (...args) => options.scaleScene(...args),
	});
	persistence.setScaleGate(scale);
	const isReadCurrent = (revision: string, id?: string) =>
		live &&
		getReadGeneration(id) === revision &&
		(id
			? belongs(id) && !scale.isScaleLocked(id)
			: !useVTTStore
					.getState()
					.scenes.some((scene) => scale.isScaleLocked(scene.id)));
	const refreshGeometry = async (id: string) => {
		const revision = getReadGeneration(id);
		const seal = persistence.queue.inspect(scenePersistenceKey(id));
		try {
			const remote = await options.readGeometry(id);
			const valid = () =>
				isReadCurrent(revision, id) &&
				persistence.queue.inspect(scenePersistenceKey(id))?.seq === seal?.seq &&
				persistence.queue.inspect(scenePersistenceKey(id))?.generation ===
					seal?.generation;
			if (
				!remote ||
				remote.scene.id !== id ||
				remote.scene.campaignId !== options.campaignId ||
				!valid()
			)
				return false;
			persistence.setRemote(remote.scene);
			if (!valid()) return false;
			applyGeometry(id, remote.scene.mapScale, remote);
			return live;
		} catch {
			return false;
		}
	};

	return {
		persistence,
		scale,
		isLive: () => live,
		getReadGeneration,
		isReadCurrent,
		// A resource subscription, including React StrictMode setup/cleanup/setup.
		mount() {
			live = true;
			persistence.queue.resume(options.userId);
			return () => {
				live = false;
				lifecycle++;
				scale.abort("Sessão desmontada");
				persistence.queue.signOut();
			};
		},
		acceptRemote(scene: VTTScene) {
			if (!live || scene.campaignId !== options.campaignId) return scene;
			persistence.setRemote(scene);
			const snapshot = persistence.getSceneSnapshot(scene.id);
			const current = useVTTStore
				.getState()
				.scenes.find((s) => s.id === scene.id);
			return {
				...scene,
				...snapshot.confirmed,
				...snapshot.pendingPatch,
				...(current &&
				(locallyScaled.has(scene.id) || scale.isScaleLocked(scene.id))
					? { mapScale: current.mapScale }
					: {}),
			};
		},
		update(id: string, patch: ScenePatch) {
			if (!belongs(id) || !useVTTStore.getState().isGM)
				return Promise.resolve(false);
			// Preview tooling can inject a scene after the route's initial empty GET.
			if (!persistence.getSceneSnapshot(id).base) {
				const scene = useVTTStore.getState().scenes.find((s) => s.id === id);
				if (scene) persistence.setRemote(scene);
			}
			return persistence.update(id, patch);
		},
		async resize(id: string, next: number) {
			if (!belongs(id) || !useVTTStore.getState().isGM) return false;
			if (!persistence.getSceneSnapshot(id).base) {
				const scene = useVTTStore.getState().scenes.find((s) => s.id === id);
				if (scene) persistence.setRemote(scene);
			}
			const current = useVTTStore
				.getState()
				.scenes.find((scene) => scene.id === id);
			if (
				current &&
				!scale.isScaleLocked(id) &&
				current.mapScale > 0 &&
				clampMapScaleForScene(next, current.width, current.height) ===
					current.mapScale
			)
				return true;
			const operation = scale.prepareScale(id, next);
			if (!operation) return false;
			invalidateReads(id);
			const result = await operation.execute();
			invalidateReads(id);
			if (
				live &&
				result.status === "succeeded" &&
				!(await refreshGeometry(id)) &&
				live
			)
				options.onReadError?.();
			return (
				live && (result.status === "succeeded" || result.status === "no-op")
			);
		},
		async reconcile(id: string) {
			const operation = scale.getScaleSnapshot(id);
			return scale.finishScale(id, {
				status: "reconcile",
				read: async (expected) => {
					const revision = persistence.getSceneSnapshot(id).entity.seq;
					const remote = await options.readGeometry(id);
					const current = scale.getReconciliation(id);
					const snapshot = persistence.getSceneSnapshot(id);
					if (
						!live ||
						scale.getScaleSnapshot(id) !== operation ||
						snapshot.entity.seq !== revision ||
						snapshot.scope.sceneId !== id ||
						!remote ||
						remote.scene.id !== id ||
						remote.scene.campaignId !== options.campaignId ||
						current?.generation !== expected.generation ||
						snapshot.entity.generation !== expected.generation ||
						current.campaignId !== expected.campaignId ||
						snapshot.scope.campaignId !== expected.campaignId
					)
						return { status: "unknown" };
					persistence.setRemote(remote.scene);
					const after = persistence.queue.inspect(scenePersistenceKey(id));
					if (
						!belongs(id) ||
						scale.getScaleSnapshot(id) !== operation ||
						after?.seq !== revision ||
						after?.generation !== expected.generation ||
						after?.scope?.sceneId !== expected.sceneId ||
						after?.scope?.campaignId !== expected.campaignId
					)
						return { status: "unknown" };
					applyGeometry(id, remote.scene.mapScale, remote);
					return { status: "confirmed", snapshot: expected };
				},
			});
		},
		async dismissFailure(id: string) {
			const dismissed = await scale.finishScale(id, "failed");
			if (dismissed && live && !(await refreshGeometry(id)) && live)
				options.onReadError?.();
		},
		canDelete(id: string) {
			const s = persistence.getSceneSnapshot(id);
			return (
				!scale.isScaleLocked(id) &&
				!s.entity.queued &&
				!s.entity.inFlight &&
				!Object.keys(s.pendingPatch).length
			);
		},
		dispose() {
			live = false;
			lifecycle++;
			scale.dispose();
			persistence.queue.signOut();
		},
	};
}
export type SceneSession = ReturnType<typeof createSceneSession>;
