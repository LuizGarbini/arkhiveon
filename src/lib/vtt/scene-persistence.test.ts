import { describe, expect, it, vi } from "vitest";
import {
	createPersistenceQueue,
	type PersistenceWrite,
	type WriteFailure,
} from "./persistence-queue";
import {
	createScenePersistence,
	type ScenePatch,
	scenePatchFromDb,
	scenePatchToDb,
	scenePersistenceKey,
} from "./scene-persistence";
import type { VTTScene } from "./types";

const scene: VTTScene = {
	id: "scene-a",
	campaignId: "campaign",
	name: "Salão",
	gridType: "square",
	gridSize: 70,
	gridColor: "#fff",
	gridOpacity: 0.5,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	gridOffsetX: 0,
	gridOffsetY: 0,
	mapScale: 1,
	width: 1400,
	height: 900,
	fogEnabled: true,
	fogExploration: true,
	isActive: true,
	orderIndex: 0,
};
const flushed = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}
function setup(
	write: (item: PersistenceWrite) => Promise<WriteFailure | undefined> = () =>
		Promise.resolve(undefined),
) {
	const onStore = vi.fn();
	const adapter = createScenePersistence({
		sessionId: "tab",
		onStore,
		writeScene: write,
		queueFactory: (writer) =>
			createPersistenceQueue({
				userId: "user",
				sessionId: "tab",
				clock: () => 1,
				writer,
			}),
	});
	return { adapter, queue: adapter.queue, onStore };
}
describe("P2a — contrato puro", () => {
	it("converte todos os campos usados pelo grid e modo de névoa", () => {
		const patch: ScenePatch = {
			gridType: "square",
			gridSize: 10.5,
			gridColor: "hsl(0 0% 10%)",
			gridOpacity: 0.4,
			gridOffsetX: 2,
			gridOffsetY: -1,
			gridScaleDistance: 1.5,
			gridScaleUnit: "m",
			fogEnabled: false,
			fogExploration: true,
		};
		expect(scenePatchToDb(patch)).toEqual({
			grid_type: "square",
			grid_size: 10.5,
			grid_color: "hsl(0 0% 10%)",
			grid_opacity: 0.4,
			grid_offset_x: 2,
			grid_offset_y: -1,
			grid_scale_distance: 1.5,
			grid_scale_unit: "m",
			fog_enabled: false,
			fog_exploration: true,
		});
		expect(scenePatchFromDb(scenePatchToDb(patch))).toEqual(patch);
	});

	it("emite a todos os inscritos e mantém o snapshot vazio estável", async () => {
		const { adapter } = setup();
		const unknown = adapter.getSceneSnapshot("não-instalada");
		expect(adapter.getSceneSnapshot("não-instalada")).toBe(unknown);
		const listener = vi.fn();
		const unsubscribe = adapter.subscribe(listener);
		adapter.setRemote(scene);
		await adapter.update(scene.id, { gridSize: 65 });
		expect(listener).toHaveBeenCalled();
		const previous = listener.mock.calls.length;
		unsubscribe();
		adapter.setRemote({ ...scene, name: "Sem listener" });
		expect(listener).toHaveBeenCalledTimes(previous);
	});

	it("preserva B e campos independentes quando o ACK de A chega", async () => {
		const writes: PersistenceWrite[] = [];
		const releases: Array<
			ReturnType<typeof deferred<WriteFailure | undefined>>
		> = [];
		const { adapter, onStore } = setup(async (write) => {
			writes.push(write);
			const next = deferred<WriteFailure | undefined>();
			releases.push(next);
			return next.promise;
		});
		adapter.setRemote(scene);
		const a = adapter.update(scene.id, { gridSize: 64, gridOffsetX: 4 });
		await flushed();
		const b = adapter.update(scene.id, { gridSize: 65 });
		const c = adapter.update(scene.id, { gridColor: "hsl(0 0% 80%)" });
		const results = Promise.all([a, b, c]);
		expect(writes).toHaveLength(1);
		releases[0].resolve(undefined);
		await flushed();
		expect(writes[1].patch).toMatchObject({
			grid_size: 65,
			grid_color: "hsl(0 0% 80%)",
		});
		expect(adapter.getSceneSnapshot(scene.id).pendingPatch).toMatchObject({
			gridSize: 65,
			gridColor: "hsl(0 0% 80%)",
		});
		releases[1].resolve(undefined);
		await expect(results).resolves.toEqual([true, true, true]);
		expect(onStore).toHaveBeenLastCalledWith(scene.id, {
			gridColor: "hsl(0 0% 80%)",
		});
		expect(adapter.getSceneSnapshot(scene.id).confirmed).toMatchObject({
			gridSize: 65,
			gridOffsetX: 4,
			gridColor: "hsl(0 0% 80%)",
		});
		expect(adapter.getSceneSnapshot(scene.id).pendingPatch).toEqual({});
		expect(writes.map(({ scope, seq }) => [scope, seq])).toEqual([
			[{ campaignId: "campaign", sceneId: "scene-a" }, 1],
			[{ campaignId: "campaign", sceneId: "scene-a" }, 3],
		]);
	});

	it("aceita o bootstrap uma vez e não sobrescreve grid/fog com remotos seguintes", async () => {
		const { adapter } = setup();
		adapter.setRemote(scene);
		expect(adapter.getSceneSnapshot(scene.id).confirmed.gridSize).toBe(70);
		await adapter.update(scene.id, { gridSize: 65, fogEnabled: false });
		adapter.setRemote({
			...scene,
			name: "Nova",
			gridSize: 30,
			fogEnabled: true,
		});
		const current = adapter.getSceneSnapshot(scene.id);
		expect(current.base?.name).toBe("Nova");
		expect(current.confirmed).toMatchObject({
			gridSize: 65,
			fogEnabled: false,
		});
		expect(scenePersistenceKey(scene.id)).toBe("scene:scene-a");
	});

	it("bootstrap atrasado não reinicializa base ou intenção com P1 ocupado", async () => {
		const first = deferred<WriteFailure | undefined>();
		const writes: PersistenceWrite[] = [];
		const { adapter, queue } = setup(async (write) => {
			writes.push(write);
			return first.promise;
		});
		adapter.setRemote(scene);
		const a = adapter.update(scene.id, {
			gridSize: 64,
			gridOffsetX: 4,
			fogEnabled: false,
		});
		await flushed();
		const b = adapter.update(scene.id, { gridSize: 65 });
		const before = adapter.getSceneSnapshot(scene.id);
		expect(before.entity.inFlight).toBeDefined();
		expect(queue.inspect(scenePersistenceKey(scene.id))?.pendingPatch).toEqual({
			grid_size: 65,
			grid_offset_x: 4,
			fog_enabled: false,
		});
		adapter.setRemote({
			...scene,
			name: "Remoto atrasado",
			gridSize: 30,
			gridOffsetX: 99,
			fogEnabled: true,
		});
		expect(queue.inspect(scenePersistenceKey(scene.id))).toEqual(before.entity);
		const during = adapter.getSceneSnapshot(scene.id);
		expect(during.base).toBe(before.base);
		expect(before.base?.gridSize).toBe(70);
		expect(queue.inspect(scenePersistenceKey(scene.id))).toEqual(before.entity);
		expect(before.entity.seq).toBe(2);
		expect(during.confirmed).toMatchObject({
			gridSize: 70,
			gridOffsetX: 0,
			fogEnabled: true,
		});
		expect(during.pendingPatch).toMatchObject({
			gridSize: 65,
			gridOffsetX: 4,
			fogEnabled: false,
		});
		expect(queue.inspect(scenePersistenceKey(scene.id))?.queued).toBeDefined();
		first.resolve(undefined);
		await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
		const after = adapter.getSceneSnapshot(scene.id);
		expect(after.base?.gridSize).toBe(70);
		expect(after.confirmed).toMatchObject({
			gridSize: 65,
			gridOffsetX: 4,
			fogEnabled: false,
		});
		const settled = queue.inspect(scenePersistenceKey(scene.id));
		expect(settled?.queued).toBeUndefined();
		expect(settled?.inFlight).toBeUndefined();
		expect(settled?.lastAcked?.patch).toEqual({ grid_size: 65 });
	});

	it("bloqueia só a cena, preserva delta e retenta explicitamente", async () => {
		let fail = true;
		const writes: PersistenceWrite[] = [];
		const { adapter } = setup(async (write) => {
			writes.push(write);
			if (fail && write.scope.sceneId === scene.id)
				return { kind: "permanent", message: "RLS" };
		});
		adapter.setRemote(scene);
		await expect(adapter.update(scene.id, { gridSize: 64 })).resolves.toBe(
			false,
		);
		await expect(adapter.update(scene.id, { fogEnabled: false })).resolves.toBe(
			false,
		);
		adapter.setRemote({ ...scene, id: "scene-b" });
		await expect(adapter.update("scene-b", { gridSize: 40 })).resolves.toBe(
			true,
		);
		fail = false;
		await expect(adapter.retry(scene.id)).resolves.toMatchObject({
			status: "saved",
			seq: 1,
		});
		expect(writes).toHaveLength(3);
		expect(writes[2].patch).toEqual({ grid_size: 64 });
	});

	it("erro transitório de A mantém B já enfileirado no P1", async () => {
		const first = deferred<WriteFailure | undefined>();
		const calls: PersistenceWrite[] = [];
		const { adapter } = setup(async (write) => {
			calls.push(write);
			return calls.length === 1 ? first.promise : undefined;
		});
		adapter.setRemote(scene);
		const a = adapter.update(scene.id, { gridSize: 64 });
		await flushed();
		const b = adapter.update(scene.id, { gridSize: 65 });
		expect(calls).toHaveLength(1);
		first.resolve({ kind: "transient", message: "offline" });
		await expect(a).resolves.toBe(false);
		await expect(b).resolves.toBe(true);
		await flushed();
		expect(calls.map((write) => [write.seq, write.patch])).toEqual([
			[1, { grid_size: 64 }],
			[2, { grid_size: 65 }],
		]);
		expect(adapter.getSceneSnapshot(scene.id).confirmed.gridSize).toBe(65);
		expect(adapter.getSceneSnapshot(scene.id).pendingPatch).toEqual({});
	});

	it("cache por cena é estável e erro de A enquanto B aguarda não perde B", async () => {
		const writes: PersistenceWrite[] = [];
		const first = deferred<WriteFailure | undefined>();
		const deferredRetry = deferred<WriteFailure | undefined>();
		const { adapter, queue } = setup(async (write) => {
			writes.push(write);
			if (writes.length === 1) return first.promise;
			return deferredRetry.promise;
		});
		adapter.setRemote(scene);
		const a = adapter.update(scene.id, { gridSize: 64, fogEnabled: false });
		await flushed();
		const b = adapter.update(scene.id, { gridSize: 65 });
		expect(queue.inspect(scenePersistenceKey(scene.id))?.pendingPatch).toEqual({
			grid_size: 65,
			fog_enabled: false,
		});
		expect(queue.inspect(scenePersistenceKey(scene.id))?.queued?.seq).toBe(2);
		first.resolve({ kind: "permanent", message: "RLS" });
		await expect(a).resolves.toBe(false);
		const cache = adapter.getSceneSnapshot(scene.id);
		const engineEntity = queue.inspect(scenePersistenceKey(scene.id));
		expect(adapter.getSceneSnapshot(scene.id)).toBe(cache);
		expect(cache.error?.kind).toBe("permanent");
		expect(queue.inspect(scenePersistenceKey(scene.id))?.pendingPatch).toEqual({
			grid_size: 65,
			fog_enabled: false,
		});
		expect(cache.entity).toEqual(engineEntity);
		expect(cache.pendingPatch).toMatchObject({
			gridSize: 65,
			fogEnabled: false,
		});
		const retry = adapter.retry(scene.id);
		deferredRetry.resolve(undefined);
		await expect(retry).resolves.toMatchObject({
			status: "saved",
		});
		await expect(b).resolves.toBe(true);
		expect(writes).toHaveLength(2);
		expect(writes[0].patch).toEqual({ grid_size: 64, fog_enabled: false });
		expect(writes[1]).toMatchObject({
			seq: 2,
			patch: { grid_size: 65, fog_enabled: false },
		});
		expect(adapter.getSceneSnapshot(scene.id).confirmed.gridSize).toBe(65);
		expect(adapter.getSceneSnapshot(scene.id).pendingPatch).toEqual({});
		const settled = queue.inspect(scenePersistenceKey(scene.id));
		expect(settled?.queued).toBeUndefined();
		expect(settled?.inFlight).toBeUndefined();
		expect(settled?.lastAcked?.patch).toEqual({
			grid_size: 65,
			fog_enabled: false,
		});
	});

	it("expiração congela a fila sem descartar a intenção local", async () => {
		const { adapter, queue } = setup(async () => ({
			kind: "session",
			message: "JWT expired",
		}));
		adapter.setRemote(scene);
		await expect(adapter.update(scene.id, { gridSize: 64 })).resolves.toBe(
			false,
		);
		expect(adapter.getSceneSnapshot(scene.id).pendingPatch).toEqual({
			gridSize: 64,
		});
		expect(queue.getState().sessionWarning).toBe("signed-out");
	});
	it("trava grid/fog na cena da escala sem alterar outras cenas", async () => {
		const { adapter } = setup();
		const gate = { isScaleLocked: (id: string) => id === scene.id };
		adapter.setRemote(scene);
		adapter.setRemote({ ...scene, id: "scene-b" });
		adapter.setScaleGate(gate);
		expect(adapter.getSceneSnapshot(scene.id).scaleLocked).toBe(true);
		await expect(adapter.update(scene.id, { fogEnabled: false })).resolves.toBe(
			false,
		);
		await expect(adapter.update("scene-b", { gridSize: 32 })).resolves.toBe(
			true,
		);
	});
});
