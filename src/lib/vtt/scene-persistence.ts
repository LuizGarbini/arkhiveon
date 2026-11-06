import type {
	Completion,
	EntitySnapshot,
	PersistenceQueue,
	PersistenceWriter,
} from "./persistence-queue";
import type { EntityScope } from "./persistence-reconcile";
import type { VTTScene, VTTSceneSettingsPatch } from "./types";

export type ScenePatch = VTTSceneSettingsPatch &
	Partial<Pick<VTTScene, "fogEnabled" | "fogExploration">>;
export interface SceneSnapshot {
	scope: EntityScope;
	base: VTTScene | null;
	confirmed: Readonly<ScenePatch>;
	pendingPatch: Readonly<ScenePatch>;
	entity: EntitySnapshot;
	error?: EntitySnapshot["error"];
}
export interface ScenePersistence {
	/** Failed receipt returns false; superseded follows P1 semantics, not a saved badge. */
	update(sceneId: string, patch: ScenePatch): Promise<boolean>;
	retry(sceneId: string): Promise<Completion | null>;
	/** D5: only bootstrap changes grid/fog. Later reads refresh unsupervised metadata. */
	setRemote(scene: VTTScene): void;
	getSceneSnapshot(sceneId: string): SceneSnapshot;
	subscribe(listener: () => void): () => void;
	/** P2b and P4 share this P1 instance; no second queue is created. */
	queue: PersistenceQueue;
}
export interface ScenePersistenceOptions {
	/** Session id is created and owned by the injected P1 instance. */
	sessionId: string;
	writeScene: PersistenceWriter;
	onStore: (sceneId: string, patch: ScenePatch) => void;
	queueFactory: (writer: PersistenceWriter) => PersistenceQueue;
}
interface SceneRecord {
	scope: EntityScope;
	base: VTTScene;
	confirmed: ScenePatch;
	cache?: SceneSnapshot;
	byField: Partial<Record<keyof ScenePatch, number>>;
	intent: ScenePatch;
}
const MAPPING = [
	["gridType", "grid_type"],
	["gridSize", "grid_size"],
	["gridColor", "grid_color"],
	["gridOpacity", "grid_opacity"],
	["gridScaleDistance", "grid_scale_distance"],
	["gridScaleUnit", "grid_scale_unit"],
	["gridOffsetX", "grid_offset_x"],
	["gridOffsetY", "grid_offset_y"],
	["fogEnabled", "fog_enabled"],
	["fogExploration", "fog_exploration"],
] as const;
function assign(target: object, field: keyof ScenePatch, value: unknown): void {
	Object.assign(target, { [field]: value });
}
export function scenePatchFromSource(scene: VTTScene): ScenePatch {
	return Object.fromEntries(
		MAPPING.map(([field]) => [field, scene[field]]),
	) as ScenePatch;
}
export function scenePatchFromDb(
	patch: Readonly<Record<string, unknown>>,
): ScenePatch {
	const result: ScenePatch = {};
	for (const [field, column] of MAPPING)
		if (patch[column] !== undefined) assign(result, field, patch[column]);
	return result;
}
export function scenePatchToDb(
	patch: ScenePatch,
): Readonly<Record<string, unknown>> {
	const result: Record<string, unknown> = {};
	for (const [field, column] of MAPPING)
		if (patch[field] !== undefined) result[column] = patch[field];
	return result;
}
export function scenePersistenceKey(sceneId: string): string {
	return `scene:${sceneId}`;
}

/** Baseline/cache adapter. P1 alone owns physical patches, retries and sequencing. */
export function createScenePersistence(
	options: ScenePersistenceOptions,
): ScenePersistence {
	const records = new Map<string, SceneRecord>();
	const listeners = new Set<() => void>();
	const emptySnapshots = new Map<string, SceneSnapshot>();
	function publish(sceneId: string): void {
		const record = records.get(sceneId);
		const entity = queue.inspect(scenePersistenceKey(sceneId));
		if (!record || !entity) return;
		const pendingPatch: ScenePatch = {};
		for (const [field, seq] of Object.entries(record.byField))
			if (seq !== undefined)
				assign(
					pendingPatch,
					field as keyof ScenePatch,
					record.intent[field as keyof ScenePatch],
				);
		record.cache = {
			scope: record.scope,
			base: record.base,
			confirmed: { ...record.confirmed },
			pendingPatch,
			entity,
			error: entity.error,
		};
		for (const listener of listeners) listener();
	}
	const writer: PersistenceWriter = async (write) => {
		const record = records.get(write.scope.sceneId);
		const error = record
			? await options.writeScene(write)
			: { kind: "permanent" as const, message: "Cena fora desta sessão" };
		if (record && !error) {
			const patch = scenePatchFromDb(write.patch ?? {});
			Object.assign(record.confirmed, patch);
			for (const field of Object.keys(patch) as (keyof ScenePatch)[])
				if (Object.is(record.intent[field], patch[field]))
					delete record.byField[field];
		}
		queueMicrotask(() => publish(write.scope.sceneId));
		return error;
	};
	const queue = options.queueFactory(writer);
	return {
		queue,
		update(sceneId, patch) {
			const record = records.get(sceneId);
			const key = scenePersistenceKey(sceneId);
			const entity = queue.inspect(key);
			if (
				!record ||
				Object.keys(patch).length === 0 ||
				!entity ||
				entity.error ||
				queue.getState().sessionWarning ||
				entity.status === "recovering" ||
				entity.status === "conflict"
			)
				return Promise.resolve(false);
			options.onStore(sceneId, patch);
			const receipt = queue.enqueue({
				key,
				scope: record.scope,
				kind: "update",
				patch: scenePatchToDb(patch),
			});
			for (const field of Object.keys(patch) as (keyof ScenePatch)[])
				record.byField[field] = receipt.seq;
			Object.assign(record.intent, patch);
			publish(sceneId);
			return receipt.completion.then(async (result) => {
				await Promise.resolve();
				publish(sceneId);
				return result.status !== "failed";
			});
		},
		async retry(sceneId) {
			const receipt = queue.retry(scenePersistenceKey(sceneId));
			if (!receipt) return null;
			const result = await receipt.completion;
			queueMicrotask(() => publish(sceneId));
			return result;
		},
		setRemote(scene) {
			const record = records.get(scene.id);
			if (!record) {
				const scope = { campaignId: scene.campaignId, sceneId: scene.id };
				records.set(scene.id, {
					scope,
					base: scene,
					confirmed: scenePatchFromSource(scene),
					byField: {},
					intent: {},
				});
				queue.markBase(scenePersistenceKey(scene.id), scope);
			} else {
				const {
					name,
					mapImageUrl,
					mapScale,
					width,
					height,
					isActive,
					orderIndex,
					updatedAt,
				} = scene;
				record.base = {
					...record.base,
					name,
					mapImageUrl,
					mapScale,
					width,
					height,
					isActive,
					orderIndex,
					updatedAt,
				};
			}
			publish(scene.id);
		},
		getSceneSnapshot(sceneId) {
			const record = records.get(sceneId);
			if (!record) {
				const cached = emptySnapshots.get(sceneId);
				if (cached) return cached;
				const snapshot: SceneSnapshot = {
					scope: { campaignId: "", sceneId },
					base: null,
					confirmed: {},
					pendingPatch: {},
					entity: {
						key: scenePersistenceKey(sceneId),
						scope: { campaignId: "", sceneId },
						seq: 0,
						generation: 0,
						status: "synced",
						limitOverflow: false,
					},
				};
				emptySnapshots.set(sceneId, snapshot);
				return snapshot;
			}
			if (!record.cache) publish(sceneId);
			return record.cache as SceneSnapshot;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
