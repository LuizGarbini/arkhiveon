import { describe, expect, it, vi } from "vitest";
import {
	createPersistenceQueue,
	type PersistenceWrite,
	type WriteFailure,
} from "./persistence-queue";
import { createScenePersistence } from "./scene-persistence";
import {
	createSceneScaleCoordinator,
	SceneScaleAmbiguousError,
	type SceneScaleSnapshot,
} from "./scene-scale";
import type { VTTScene } from "./types";

const scene: VTTScene = {
	id: "scene-a",
	campaignId: "campaign",
	name: "Salão",
	gridType: "square",
	gridSize: 70,
	gridColor: "hsl(0 0% 40%)",
	gridOpacity: 0.5,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	gridOffsetX: 4,
	gridOffsetY: 2,
	mapScale: 1,
	width: 1400,
	height: 900,
	fogEnabled: true,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
};
const tokens = [
	{ id: "token-a", sceneId: scene.id, x: 30, y: 40 },
	{ id: "token-b", sceneId: "scene-b", x: 50, y: 60 },
];
const walls = [
	{ id: "wall-a", sceneId: scene.id, x1: 1, y1: 2, x2: 3, y2: 4 },
	{ id: "wall-b", sceneId: "scene-b", x1: 1, y1: 1, x2: 2, y2: 2 },
];
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
async function queueSettled(): Promise<void> {
	for (let turn = 0; turn < 6; turn += 1) await settle();
}

function setup(
	write: (
		item: PersistenceWrite,
	) => Promise<WriteFailure | undefined> = async () => undefined,
) {
	const sceneById = new Map<string, VTTScene>();
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
	const setRemote = (current: VTTScene) => {
		sceneById.set(current.id, current);
		adapter.setRemote(current);
	};
	setRemote(scene);
	setRemote({ ...scene, id: "scene-b" });
	const apply = vi.fn();
	const restore = vi.fn();
	const scaleScene = vi.fn(async () => {});
	const coordinator = createSceneScaleCoordinator({
		persistence: adapter,
		capture: (id) => {
			const current = sceneById.get(id);
			return current ? { scene: current, tokens, walls } : undefined;
		},
		apply({ snapshot, factor }) {
			apply(snapshot, factor);
			sceneById.set(snapshot.scene.id, {
				...snapshot.scene,
				mapScale: snapshot.scene.mapScale * factor,
			});
		},
		restore(snapshot) {
			restore(snapshot);
			sceneById.set(snapshot.scene.id, snapshot.scene);
		},
		scaleScene,
	});
	adapter.setScaleGate(coordinator);
	return {
		adapter,
		apply,
		restore,
		scaleScene,
		coordinator,
		setRemote,
		onStore,
	};
}
function expectIntact(read: SceneScaleSnapshot): void {
	expect(read).toEqual({ scene, tokens, walls });
	expect(read.scene.name).toBe("Salão");
	expect(read.scene.fogEnabled).toBe(true);
	expect(read.scene.gridOffsetX).toBe(4);
}

describe("P2a2 — barreira de escala", () => {
	it("drena antes de multiplicar, usa next/current uma vez e só trava A", async () => {
		const { adapter, apply, scaleScene, coordinator } = setup();
		const gate = coordinator.prepareScale(scene.id, 2);
		expect(coordinator.getStatus(scene.id)).toBe("draining");
		expect(coordinator.getStatus("scene-b")).toBe("idle");
		await expect(adapter.update(scene.id, { gridSize: 32 })).resolves.toBe(
			false,
		);
		await expect(adapter.update("scene-b", { gridSize: 32 })).resolves.toBe(
			true,
		);
		await expect(gate?.execute()).resolves.toMatchObject({
			status: "succeeded",
		});
		expect(apply).toHaveBeenCalledWith({ scene, tokens, walls }, 2);
		expect(scaleScene).toHaveBeenCalledTimes(1);
		expect(scaleScene).toHaveBeenCalledWith(scene.id, 2 / 1);
		expect(coordinator.getStatus(scene.id)).toBe("idle");
	});

	it("double click e grid/fog durante o voo não multiplicam de novo", async () => {
		const { adapter, apply, scaleScene, coordinator } = setup();
		const response = deferred<void>();
		scaleScene.mockReturnValueOnce(response.promise);
		const gate = coordinator.prepareScale(scene.id, 2);
		const execution = gate?.execute();
		expect(gate?.execute()).toBe(execution);
		expect(coordinator.prepareScale(scene.id, 4)).toBeNull();
		await expect(adapter.update(scene.id, { fogEnabled: false })).resolves.toBe(
			false,
		);
		expect(apply).toHaveBeenCalledTimes(1);
		response.resolve();
		await expect(execution).resolves.toMatchObject({ status: "succeeded" });
		expect(apply).toHaveBeenCalledTimes(1);
		expect(scaleScene).toHaveBeenCalledTimes(1);
	});

	it("espera A+coalesced B antes da otimista, sem perder offset/cor", async () => {
		const writes: PersistenceWrite[] = [];
		const responses: Array<
			ReturnType<typeof deferred<WriteFailure | undefined>>
		> = [];
		const { adapter, apply, scaleScene, coordinator } = setup(async (item) => {
			writes.push(item);
			const response = deferred<WriteFailure | undefined>();
			responses.push(response);
			return response.promise;
		});
		const a = adapter.update(scene.id, { gridSize: 64, gridOffsetX: 7 });
		await settle();
		const b = adapter.update(scene.id, { gridSize: 65 });
		const c = adapter.update(scene.id, { gridColor: "hsl(0 0% 80%)" });
		const execution = coordinator.prepareScale(scene.id, 1.5)?.execute();
		await settle();
		expect(apply).not.toHaveBeenCalled();
		expect(scaleScene).not.toHaveBeenCalled();
		responses[0].resolve(undefined);
		await settle();
		expect(writes[1].patch).toEqual({
			grid_size: 65,
			grid_color: "hsl(0 0% 80%)",
		});
		expect(apply).not.toHaveBeenCalled();
		responses[1].resolve(undefined);
		await expect(Promise.all([a, b, c])).resolves.toEqual([true, true, true]);
		await expect(execution).resolves.toMatchObject({ status: "succeeded" });
		expect(adapter.getSceneSnapshot(scene.id).confirmed).toMatchObject({
			gridSize: 65,
			gridOffsetX: 7,
			gridColor: "hsl(0 0% 80%)",
		});
		expect(apply).toHaveBeenCalledWith({ scene, tokens, walls }, 1.5);
		expect(scaleScene).toHaveBeenCalledTimes(1);
	});

	it("falha no drain entra em recuperação sem otimista, RPC ou falso flush", async () => {
		const pending = deferred<WriteFailure | undefined>();
		const { adapter, apply, scaleScene, coordinator } = setup(
			async () => pending.promise,
		);
		const saving = adapter.update(scene.id, { fogEnabled: false });
		const execution = coordinator.prepareScale(scene.id, 2)?.execute();
		pending.resolve({ kind: "permanent", message: "RLS" });
		await expect(saving).resolves.toBe(false);
		await expect(execution).resolves.toMatchObject({ status: "recovering" });
		expect(apply).not.toHaveBeenCalled();
		expect(scaleScene).not.toHaveBeenCalled();
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		expect(adapter.getSceneSnapshot(scene.id).pendingPatch).toEqual({
			fogEnabled: false,
		});
		await expect(adapter.update(scene.id, { gridSize: 32 })).resolves.toBe(
			false,
		);
	});

	it("falha definitiva devolve escala, geometrias e todas as flags intactas", async () => {
		const { apply, restore, scaleScene, coordinator } = setup();
		scaleScene.mockRejectedValueOnce(new Error("RPC recusada"));
		const gate = coordinator.prepareScale(scene.id, 2);
		await expect(gate?.execute()).resolves.toMatchObject({ status: "failed" });
		expect(apply).toHaveBeenCalledWith({ scene, tokens, walls }, 2);
		expect(restore).toHaveBeenCalledTimes(1);
		expectIntact(restore.mock.calls[0][0]);
		await expect(gate?.execute()).resolves.toMatchObject({ status: "failed" });
		expect(restore).toHaveBeenCalledTimes(1);
		expect(scaleScene).toHaveBeenCalledTimes(1);
		expect(coordinator.getScaleSnapshot(scene.id)?.snapshot).toEqual({
			scene,
			tokens,
			walls,
		});
		await expect(coordinator.finishScale(scene.id, "failed")).resolves.toBe(
			true,
		);
		expect(coordinator.getStatus(scene.id)).toBe("idle");
	});

	it("RPC resolve/response:false não repete nem chama rollback", async () => {
		const { restore, scaleScene, coordinator } = setup();
		scaleScene.mockResolvedValueOnce(undefined);
		await expect(
			coordinator.prepareScale(scene.id, 2)?.execute(),
		).resolves.toMatchObject({ status: "succeeded" });
		expect(scaleScene).toHaveBeenCalledTimes(1);
		expect(restore).not.toHaveBeenCalled();
	});

	it("resposta ambígua mantém otimista e lock até a leitura autorizada", async () => {
		const { apply, restore, scaleScene, coordinator, setRemote } = setup();
		scaleScene.mockRejectedValueOnce(new SceneScaleAmbiguousError("timeout"));
		const gate = coordinator.prepareScale(scene.id, 2);
		await expect(gate?.execute()).resolves.toMatchObject({
			status: "recovering",
		});
		await expect(gate?.execute()).resolves.toMatchObject({
			status: "recovering",
		});
		expect(apply).toHaveBeenCalledTimes(1);
		expect(scaleScene).toHaveBeenCalledTimes(1);
		expect(restore).not.toHaveBeenCalled();
		const reading = deferred<void>();
		const finishing = coordinator.finishScale(scene.id, {
			status: "reconcile",
			read: () => reading.promise,
		});
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		setRemote({ ...scene, mapScale: 2, name: "Leitura confirmada" });
		reading.resolve();
		await expect(finishing).resolves.toBe(true);
		expect(coordinator.getStatus(scene.id)).toBe("idle");
		expect(coordinator.getScaleSnapshot(scene.id)).toBeNull();
	});

	it("no-op é válido e escala legada inválida exige leitura sem RPC", async () => {
		const first = setup();
		expect(first.coordinator.prepareScale(scene.id, 1)).toBeNull();
		expect(first.scaleScene).not.toHaveBeenCalled();
		expect(first.apply).not.toHaveBeenCalled();

		const { apply, scaleScene, coordinator, setRemote } = setup();
		setRemote({ ...scene, mapScale: 0 });
		const invalid = coordinator.prepareScale(scene.id, 2);
		await expect(invalid?.execute()).resolves.toMatchObject({
			status: "recovering",
		});
		expect(apply).not.toHaveBeenCalled();
		expect(scaleScene).not.toHaveBeenCalled();
	});

	it("dreno ocupado bloqueia nova escala e não permite liberação prematura", async () => {
		const pending = deferred<WriteFailure | undefined>();
		const { adapter, coordinator, scaleScene } = setup(
			async () => pending.promise,
		);
		const saving = adapter.update(scene.id, { gridSize: 64 });
		await settle();
		const gate = coordinator.prepareScale(scene.id, 2);
		expect(coordinator.prepareScale(scene.id, 4)).toBeNull();
		const execution = gate?.execute();
		await settle();
		await expect(coordinator.finishScale(scene.id, "recovering")).resolves.toBe(
			false,
		);
		expect(coordinator.getStatus(scene.id)).toBe("draining");
		expect(scaleScene).not.toHaveBeenCalled();
		pending.resolve(undefined);
		await expect(saving).resolves.toBe(true);
		await expect(execution).resolves.toMatchObject({ status: "succeeded" });
	});

	it("visão ativa é substituída a cada transição; unsubscribe para notificações", async () => {
		const { adapter, coordinator } = setup();
		const listener = vi.fn();
		const unsubscribe = coordinator.subscribe(listener);
		const gate = coordinator.prepareScale(scene.id, 2);
		const initial = coordinator.getScaleSnapshot(scene.id);
		expect(initial).toBe(coordinator.getScaleSnapshot(scene.id));
		const running = gate?.execute();
		await queueSettled();
		const scaling = coordinator.getScaleSnapshot(scene.id);
		expect(scaling).not.toBe(initial);
		await running;
		expect(listener).toHaveBeenCalled();
		expect(coordinator.getScaleSnapshot(scene.id)).toBeNull();
		await expect(adapter.update(scene.id, { gridSize: 32 })).resolves.toBe(
			true,
		);
		const calls = listener.mock.calls.length;
		unsubscribe();
		coordinator.prepareScale("scene-b", 2);
		expect(listener).toHaveBeenCalledTimes(calls);
	});

	it("reconciliação sem sucesso mantém recuperação e não libera a escala", async () => {
		const { coordinator, scaleScene } = setup();
		scaleScene.mockRejectedValueOnce(new SceneScaleAmbiguousError("timeout"));
		const gate = coordinator.prepareScale(scene.id, 2);
		await gate?.execute();
		await expect(
			coordinator.finishScale(scene.id, {
				status: "reconcile",
				read: async () => {
					throw new Error("leitura falhou");
				},
			}),
		).rejects.toThrow("leitura falhou");
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		expect(scaleScene).toHaveBeenCalledTimes(1);
	});
});
