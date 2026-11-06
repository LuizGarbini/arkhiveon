import { describe, expect, it, vi } from "vitest";
import {
	createPersistenceQueue,
	type PersistenceWrite,
	type WriteFailure,
} from "./persistence-queue";
import {
	createScenePersistence,
	type SceneSnapshot,
	scenePersistenceKey,
} from "./scene-persistence";
import {
	createSceneScaleCoordinator,
	SceneScaleAmbiguousError,
	type SceneScaleRead,
	type SceneScaleReconciliation,
	type SceneScaleSnapshot,
	type SceneScaleTransportOutcome,
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
	scaleOptions: {
		timeoutMs?: number;
		clock?: import("./scene-scale").ScaleClock;
		persistence?: (sceneId: string) => SceneSnapshot;
	} = {},
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
	const scaleScene = vi.fn<
		(
			sceneId: string,
			factor: number,
			context: { signal: AbortSignal },
		) => Promise<SceneScaleTransportOutcome>
	>(async () => ({ kind: "confirmed" }));
	let snapshotView: ((id: string) => SceneSnapshot) | undefined =
		scaleOptions.persistence;
	const persistence = new Proxy(adapter, {
		get(target, prop, receiver) {
			if (prop === "getSceneSnapshot")
				return (id: string) =>
					snapshotView?.(id) ?? adapter.getSceneSnapshot(id);
			if (prop === "queue")
				return new Proxy(adapter.queue, {
					get(queue, member, queueReceiver) {
						if (member === "inspect")
							return (key: string) => {
								const id = key.slice("scene:".length);
								return (
									snapshotView?.(id)?.entity ??
									Reflect.get(queue, member, queueReceiver)(key)
								);
							};
						return Reflect.get(queue, member, queueReceiver);
					},
				});
			return Reflect.get(target, prop, receiver);
		},
	});
	const coordinator = createSceneScaleCoordinator({
		persistence,
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
		timeoutMs: scaleOptions.timeoutMs,
		clock: scaleOptions.clock,
	});
	adapter.setScaleGate(coordinator);
	return {
		adapter,
		apply,
		restore,
		scaleScene,
		coordinator,
		setPersistenceSnapshot(view: (id: string) => SceneSnapshot) {
			snapshotView = view;
		},
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
		expect(scaleScene).toHaveBeenCalledWith(
			scene.id,
			2 / 1,
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
		expect(coordinator.getStatus(scene.id)).toBe("idle");
	});

	it("double click e grid/fog durante o voo não multiplicam de novo", async () => {
		const { adapter, apply, scaleScene, coordinator } = setup();
		const response = deferred<SceneScaleTransportOutcome>();
		scaleScene.mockReturnValueOnce(response.promise);
		const gate = coordinator.prepareScale(scene.id, 2);
		const execution = gate?.execute();
		expect(gate?.execute()).toBe(execution);
		expect(coordinator.prepareScale(scene.id, 4)).toBeNull();
		await expect(adapter.update(scene.id, { fogEnabled: false })).resolves.toBe(
			false,
		);
		expect(apply).toHaveBeenCalledTimes(1);
		response.resolve({ kind: "confirmed" });
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

	it("recusa definitiva devolve escala, geometrias e todas as flags intactas", async () => {
		const { apply, restore, scaleScene, coordinator } = setup();
		scaleScene.mockResolvedValueOnce({
			kind: "rejected",
			error: new Error("RPC recusada"),
		});
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

	it("finishScale recovering e succeeded não liberam sem reconciliação válida", async () => {
		const { coordinator, scaleScene } = setup();
		scaleScene.mockResolvedValueOnce({ kind: "unknown" });
		await coordinator.prepareScale(scene.id, 2)?.execute();
		await expect(coordinator.finishScale(scene.id, "recovering")).resolves.toBe(
			false,
		);
		await expect(coordinator.finishScale(scene.id, "succeeded")).resolves.toBe(
			false,
		);
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		coordinator.dispose();
	});

	it("Promise<void> resolvida é resposta ausente e não repete nem chama rollback", async () => {
		const { restore, scaleScene, coordinator } = setup();
		scaleScene.mockResolvedValueOnce(
			undefined as unknown as SceneScaleTransportOutcome,
		);
		await expect(
			coordinator.prepareScale(scene.id, 2)?.execute(),
		).resolves.toMatchObject({ status: "recovering" });
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
		const reading = deferred<SceneScaleRead>();
		const finishing = coordinator.finishScale(scene.id, {
			status: "reconcile",
			read: (expected) =>
				reading.promise.finally(() => {
					expect(expected).toEqual(coordinator.getReconciliation(scene.id));
				}),
		});
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		setRemote({ ...scene, mapScale: 2, name: "Leitura confirmada" });
		reading.resolve({
			status: "confirmed",
			snapshot: coordinator.getReconciliation(scene.id) ?? undefined,
		});
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
		).resolves.toBe(false);
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		expect(scaleScene).toHaveBeenCalledTimes(1);
	});
	describe("P2a2 revisão — timeout/abort/dispose", () => {
		function injectedClock() {
			return {
				now: () => Date.now(),
				setTimeout: (callback: () => void, delayMs: number) =>
					setTimeout(callback, delayMs),
				clearTimeout: (id: unknown) =>
					clearTimeout(id as ReturnType<typeof setTimeout>),
			};
		}
		function drainSetup(timeoutMs = 30_000) {
			const writerPending = deferred<WriteFailure | undefined>();
			const state = setup(async () => writerPending.promise, {
				timeoutMs,
				clock: injectedClock(),
			});
			const saving = state.adapter.update(scene.id, { fogEnabled: false });
			void saving.catch(() => undefined);
			return { state, saving, writerPending };
		}
		it("control clock timeout termina dreno sem perder pendência", async () => {
			vi.useFakeTimers();
			try {
				const { state, writerPending, saving } = drainSetup();
				await vi.advanceTimersByTimeAsync(0);
				const operation = state.coordinator
					.prepareScale(scene.id, 2)
					?.execute();
				await vi.advanceTimersByTimeAsync(31_000);
				await expect(operation).resolves.toMatchObject({
					status: "recovering",
				});
				expect(vi.getTimerCount()).toBe(0);
				expect(state.coordinator.getActiveOperationCount()).toBe(0);
				expect(state.scaleScene).not.toHaveBeenCalled();
				expect(
					state.adapter.getSceneSnapshot(scene.id).pendingPatch,
				).toMatchObject({ fogEnabled: false });
				expect(state.adapter.getSceneSnapshot(scene.id).base?.mapScale).toBe(1);
				await expect(
					state.coordinator.finishScale(scene.id, {
						status: "reconcile",
						read: async () => ({ status: "confirmed", snapshot: undefined }),
					}),
				).resolves.toBe(false);
				state.coordinator.dispose();
				writerPending.resolve(undefined);
				await expect(saving).resolves.toBe(true);
			} finally {
				vi.useRealTimers();
			}
		});

		it("abort encerra expectativa antes do RPC e mantém pendências locais", async () => {
			const { state, writerPending, saving } = drainSetup();
			await settle();
			const gate = state.coordinator.prepareScale(scene.id, 2);
			const execution = gate?.execute();
			const signals: AbortSignal[] = [];
			gate?.subscribeAbort((signal) => signals.push(signal));
			state.coordinator.abort("cancel explicit");
			await expect(execution).resolves.toEqual({ status: "no-op" });
			expect(signals).toHaveLength(1);
			expect(signals[0]?.reason).toBe("cancel explicit");
			expect(state.coordinator.getActiveOperationCount()).toBe(0);
			expect(
				state.adapter.getSceneSnapshot(scene.id).pendingPatch,
			).toMatchObject({ fogEnabled: false });
			expect(state.scaleScene).not.toHaveBeenCalled();
			writerPending.resolve(undefined);
			await expect(saving).resolves.toBe(true);
			state.coordinator.dispose();
		});
		it("dispose durante writer pendurado zera espera sem apagar pendência da sessão", async () => {
			const { state, writerPending, saving } = drainSetup();
			await settle();
			const execution = state.coordinator.prepareScale(scene.id, 2)?.execute();
			await settle();
			expect(
				state.adapter.queue.inspect(scenePersistenceKey(scene.id))?.inFlight,
			).toBeDefined();
			state.coordinator.dispose();
			await expect(execution).resolves.toEqual({ status: "no-op" });
			expect(state.coordinator.getActiveOperationCount()).toBe(0);
			expect(state.scaleScene).not.toHaveBeenCalled();
			expect(
				state.adapter.getSceneSnapshot(scene.id).pendingPatch,
			).toMatchObject({ fogEnabled: false });
			writerPending.resolve(undefined);
			await expect(saving).resolves.toBe(true);
		});

		it("dispose após otimista ignora confirmação tardia sem alterar sessão seguinte", async () => {
			const answer = deferred<SceneScaleTransportOutcome>();
			let signal: AbortSignal | undefined;
			const old = setup();
			old.scaleScene.mockImplementationOnce(
				async (_sceneId, _factor, context) => {
					signal = context.signal;
					return answer.promise;
				},
			);
			const execution = old.coordinator.prepareScale(scene.id, 2)?.execute();
			await settle();
			old.coordinator.dispose();
			await expect(execution).resolves.toEqual({ status: "no-op" });
			expect(signal?.aborted).toBe(true);
			const next = setup();
			next.scaleScene.mockResolvedValueOnce({ kind: "unknown" });
			await expect(
				next.coordinator.prepareScale(scene.id, 2)?.execute(),
			).resolves.toMatchObject({ status: "recovering" });
			answer.resolve({ kind: "confirmed" });
			await settle();
			expect(next.coordinator.getStatus(scene.id)).toBe("recovering");
			expect(next.coordinator.isScaleLocked(scene.id)).toBe(true);
			expect(old.restore).not.toHaveBeenCalled();
			next.coordinator.dispose();
		});

		it("dispose durante dreno e troca de sessão zeram trabalho préexistente", async () => {
			const { state, writerPending, saving } = drainSetup();
			await settle();
			const execution = state.coordinator.prepareScale(scene.id, 2)?.execute();
			state.coordinator.dispose();
			await expect(execution).resolves.toEqual({ status: "no-op" });
			expect(state.coordinator.getActiveOperationCount()).toBe(0);
			const next = setup();
			await expect(
				next.coordinator.prepareScale(scene.id, 2)?.execute(),
			).resolves.toMatchObject({ status: "succeeded" });
			await expect(
				state.coordinator.finishScale(scene.id, {
					status: "reconcile",
					read: async () => ({
						status: "confirmed",
						snapshot: next.coordinator.getReconciliation(scene.id),
					}),
				}),
			).resolves.toBe(false);
			expect(next.coordinator.getStatus(scene.id)).toBe("idle");
			writerPending.resolve(undefined);
			await expect(saving).resolves.toBe(true);
			next.coordinator.dispose();
		});
	});
});

function setupWithTimer() {
	const active = new Set<unknown>();
	const injectedClock = {
		now: () => Date.now(),
		setTimeout: (callback: () => void, delayMs: number) => {
			const timer = setTimeout(() => {
				active.delete(timer);
				callback();
			}, delayMs);
			active.add(timer);
			return timer;
		},
		clearTimeout: (timer: unknown) => {
			active.delete(timer);
			clearTimeout(timer as ReturnType<typeof setTimeout>);
		},
		activeTimers: () => active.size,
	};
	return {
		...setup(async () => undefined, { clock: injectedClock }),
		injectedClock,
	};
}

describe("P2a2 revisão — transporte perdeu resposta", () => {
	it("transporte perde resposta rejeitada após aplicar remoto e não faz rollback", async () => {
		let remote = 1;
		const { coordinator, scaleScene, apply, restore } = setup();
		scaleScene.mockImplementationOnce(async () => {
			remote *= 2;
			throw new Error("conexão perdida após aplicar");
		});
		const operation = coordinator.prepareScale(scene.id, 2);
		await expect(operation?.execute()).resolves.toMatchObject({
			status: "recovering",
		});
		expect(remote).toBe(2);
		expect(apply).toHaveBeenCalledTimes(1);
		expect(scaleScene).toHaveBeenCalledTimes(1);
		expect(restore).not.toHaveBeenCalled();
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		expect(coordinator.prepareScale(scene.id, 2)).toBeNull();
		await expect(operation?.execute()).resolves.toMatchObject({
			status: "recovering",
		});
		expect(remote).toBe(2);
		coordinator.dispose();
	});
	it("exceção genérica não é classificação de recusa definitiva", async () => {
		const { coordinator, scaleScene, restore } = setup();
		scaleScene.mockRejectedValueOnce(new Error("queda de resposta"));
		await expect(
			coordinator.prepareScale(scene.id, 2)?.execute(),
		).resolves.toMatchObject({ status: "recovering" });
		expect(restore).not.toHaveBeenCalled();
		coordinator.dispose();
	});
	it("timeout do transporte após aplicação remota retorna recovering fator uma vez", async () => {
		vi.useFakeTimers();
		try {
			let remote = 1;
			const { coordinator, scaleScene, restore, injectedClock } =
				setupWithTimer();
			scaleScene.mockImplementationOnce(async (_id, factor) => {
				remote *= factor;
				return new Promise<SceneScaleTransportOutcome>(() => undefined);
			});
			const execution = coordinator.prepareScale(scene.id, 2)?.execute();
			await vi.advanceTimersByTimeAsync(15_000);
			await expect(execution).resolves.toMatchObject({ status: "recovering" });
			expect(remote).toBe(2);
			expect(restore).not.toHaveBeenCalled();
			expect(scaleScene).toHaveBeenCalledTimes(1);
			expect(scaleScene.mock.calls[0]?.[2].signal.aborted).toBe(true);
			expect(vi.getTimerCount()).toBe(0);
			expect(injectedClock.activeTimers()).toBe(0);
			expect(coordinator.prepareScale(scene.id, 2)).toBeNull();
			await expect(execution).resolves.toMatchObject({ status: "recovering" });
			expect(remote).toBe(2);
			const expected = coordinator.getReconciliation(scene.id);
			await expect(
				coordinator.finishScale(scene.id, {
					status: "reconcile",
					read: async () => ({ status: "confirmed", snapshot: expected }),
				}),
			).resolves.toBe(true);
			coordinator.dispose();
		} finally {
			vi.useRealTimers();
		}
	});
	it("transporte rejeitado definitivamente restaura única vez e libera só failed", async () => {
		const { coordinator, scaleScene, restore } = setup();
		scaleScene.mockResolvedValueOnce({ kind: "rejected", error: "RLS" });
		const operation = coordinator.prepareScale(scene.id, 2);
		await expect(operation?.execute()).resolves.toMatchObject({
			status: "failed",
		});
		await expect(operation?.execute()).resolves.toMatchObject({
			status: "failed",
		});
		expect(restore).toHaveBeenCalledTimes(1);
		expect(scaleScene).toHaveBeenCalledTimes(1);
		expect(coordinator.isScaleLocked(scene.id)).toBe(true);
		await expect(coordinator.finishScale(scene.id, "failed")).resolves.toBe(
			true,
		);
		expect(coordinator.isScaleLocked(scene.id)).toBe(false);
		coordinator.dispose();
	});
	it("unknown não resolve duplica RPC mesmo com subsequent execute", async () => {
		const { coordinator, scaleScene, restore } = setup();
		scaleScene.mockResolvedValueOnce({ kind: "unknown" });
		const operation = coordinator.prepareScale(scene.id, 2);
		await expect(operation?.execute()).resolves.toMatchObject({
			status: "recovering",
		});
		await expect(operation?.execute()).resolves.toMatchObject({
			status: "recovering",
		});
		expect(scaleScene).toHaveBeenCalledTimes(1);
		expect(restore).not.toHaveBeenCalled();
	});
});

describe("P2a2 revisão — reconciliação autorizada", () => {
	async function recoveringState() {
		const state = setup();
		state.scaleScene.mockResolvedValueOnce({ kind: "unknown" });
		await expect(
			state.coordinator.prepareScale(scene.id, 2)?.execute(),
		).resolves.toMatchObject({ status: "recovering" });
		const expected = state.coordinator.getReconciliation(scene.id);
		if (!expected) throw new Error("geração capturada ausente");
		return { ...state, expected };
	}
	function snapshot(expected: SceneScaleReconciliation) {
		return { ...expected };
	}
	function read(
		snapshot: SceneScaleReconciliation | null | undefined,
	): SceneScaleRead {
		return { status: "confirmed", snapshot };
	}
	it("finishScale recovering sozinho não libera e ausência/erro seguram lock", async () => {
		const { coordinator, expected, scaleScene } = await recoveringState();
		expect(expected).toEqual({
			sceneId: scene.id,
			campaignId: scene.campaignId,
			scope: "grid-scene",
			generation: 1,
		});
		await expect(coordinator.finishScale(scene.id, "recovering")).resolves.toBe(
			false,
		);
		for (const value of [undefined, null]) {
			await expect(
				coordinator.finishScale(scene.id, {
					status: "reconcile",
					read: async () => read(value),
				}),
			).resolves.toBe(false);
		}
		await expect(
			coordinator.finishScale(scene.id, {
				status: "reconcile",
				read: async () => {
					throw new Error("offline");
				},
			}),
		).resolves.toBe(false);
		await expect(
			coordinator.finishScale(scene.id, {
				status: "reconcile",
				read: async () => ({ status: "unknown" }),
			}),
		).resolves.toBe(false);
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		expect(scaleScene).toHaveBeenCalledTimes(1);
	});
	it.each([
		["outra scene", { sceneId: "scene-b" }],
		["outra campanha", { campaignId: "campaign-b" }],
		["outro scope", { scope: "token" }],
		["geração zero", { generation: 0 }],
		["geração anterior", { generation: -1 }],
	])("rejeita reconciliação inválida por %s", async (_, mutation) => {
		const { coordinator, expected } = await recoveringState();
		await expect(
			coordinator.finishScale(scene.id, {
				status: "reconcile",
				read: async () => ({
					status: "confirmed",
					snapshot: {
						...snapshot(expected),
						...mutation,
					} as SceneScaleReconciliation,
				}),
			}),
		).resolves.toBe(false);
		expect(coordinator.isScaleLocked(scene.id)).toBe(true);
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
	});
	it("validação de session revalida geração no await", async () => {
		const { coordinator, expected, adapter } = await recoveringState();
		const response = deferred<SceneScaleRead>();
		const finishing = coordinator.finishScale(scene.id, {
			status: "reconcile",
			read: () => response.promise,
		});
		expect(coordinator.isScaleLocked(scene.id)).toBe(true);
		adapter.queue.invalidate(scenePersistenceKey(scene.id));
		response.resolve(read(snapshot(expected)));
		await expect(finishing).resolves.toBe(false);
		expect(coordinator.getStatus(scene.id)).toBe("recovering");
		coordinator.dispose();
	});
	it("read válida do mesmo snapshot libera e outra read velha rejeita", async () => {
		const { coordinator, expected } = await recoveringState();
		await expect(
			coordinator.finishScale(scene.id, {
				status: "reconcile",
				read: async () => read(snapshot(expected)),
			}),
		).resolves.toBe(true);
		expect(coordinator.getStatus(scene.id)).toBe("idle");
		await expect(
			coordinator.finishScale(scene.id, {
				status: "reconcile",
				read: async () =>
					read({ ...expected, generation: expected.generation - 1 }),
			}),
		).resolves.toBe(false);
		coordinator.dispose();
	});
});

describe("P2a2 r3 — fechamento e coerência da sessão", () => {
	it("listener dispose durante notify e duplo dispose são idempotentes", () => {
		const state = setup();
		state.coordinator.prepareScale(scene.id, 2);
		let calls = 0;
		state.coordinator.subscribe(() => {
			calls += 1;
			if (calls === 1) state.coordinator.dispose();
		});
		expect(() => state.coordinator.abort("listener fecha")).not.toThrow();
		expect(calls).toBe(1);
		expect(() => state.coordinator.dispose()).not.toThrow();
		expect(() => state.coordinator.dispose()).not.toThrow();
	});

	it("finishScale succeeded não libera enquanto RPC pendente", async () => {
		const state = setup();
		const answer = deferred<SceneScaleTransportOutcome>();
		state.scaleScene.mockReturnValueOnce(answer.promise);
		const execution = state.coordinator.prepareScale(scene.id, 2)?.execute();
		await settle();
		expect(state.coordinator.getStatus(scene.id)).toBe("scaling");
		await expect(
			state.coordinator.finishScale(scene.id, "succeeded"),
		).resolves.toBe(false);
		expect(state.coordinator.isScaleLocked(scene.id)).toBe(true);
		answer.resolve({ kind: "confirmed" });
		await expect(execution).resolves.toMatchObject({ status: "succeeded" });
		state.coordinator.dispose();
	});

	it("rejected após edição mais nova não restaura snapshot antigo", async () => {
		const state = setup();
		const answer = deferred<SceneScaleTransportOutcome>();
		state.scaleScene.mockReturnValueOnce(answer.promise);
		const execution = state.coordinator.prepareScale(scene.id, 2)?.execute();
		await settle();
		const sealed = state.adapter.getSceneSnapshot(scene.id);
		const updated: SceneSnapshot = {
			...sealed,
			entity: { ...sealed.entity, seq: sealed.entity.seq + 1 },
		};
		state.setPersistenceSnapshot(() => updated);
		answer.resolve({ kind: "rejected", error: "recusa tardia" });
		await expect(execution).resolves.toMatchObject({ status: "recovering" });
		expect(state.restore).not.toHaveBeenCalled();
		expect(state.coordinator.getStatus(scene.id)).toBe("recovering");
		expect(state.coordinator.prepareScale(scene.id, 2)).toBeNull();
		state.coordinator.dispose();
	});

	it.each(["generation", "campaign", "scope"])(
		"dreno detecta %s alterada antes do apply sem descartar fila",
		async (kind) => {
			const pending = deferred<WriteFailure | undefined>();
			const state = setup(() => pending.promise);
			const saving = state.adapter.update(scene.id, { fogEnabled: false });
			await settle();
			const original = state.adapter.getSceneSnapshot(scene.id);
			const execution = state.coordinator.prepareScale(scene.id, 2)?.execute();
			state.setPersistenceSnapshot((id) => {
				const captured = state.adapter.getSceneSnapshot(id);
				if (kind === "generation")
					return {
						...captured,
						entity: {
							...captured.entity,
							generation: captured.entity.generation + 1,
						},
					};
				if (kind === "campaign")
					return {
						...captured,
						scope: { ...captured.scope, campaignId: "campaign-new" },
						base: {
							...(captured.base ?? scene),
							campaignId: "campaign-new",
						},
					};
				return {
					...captured,
					scope: { ...captured.scope, sceneId: "scene-new" },
				};
			});
			pending.resolve(undefined);
			await expect(execution).resolves.toMatchObject({ status: "recovering" });
			expect(state.coordinator.prepareScale(scene.id, 2)).toBeNull();
			await vi.waitFor(() =>
				expect(state.coordinator.getStatus(scene.id)).toBe("recovering"),
			);
			expect(state.apply).not.toHaveBeenCalled();
			expect(state.scaleScene).not.toHaveBeenCalled();
			expect(
				state.adapter.queue.inspect(scenePersistenceKey(scene.id))?.seq,
			).toBe(original.entity.seq);
			state.setPersistenceSnapshot(() => original);
			state.coordinator.dispose();
			await expect(saving).resolves.toBe(true);
			expect(
				state.adapter.queue.inspect(scenePersistenceKey(scene.id))?.status,
			).toBe("synced");
			await expect(
				state.adapter.update(scene.id, { fogExploration: true }),
			).resolves.toBe(true);
		},
	);

	it("cancel duplo e listener reentrante não notificam de novo nem perdem fila", async () => {
		const pending = deferred<WriteFailure | undefined>();
		const state = setup(() => pending.promise);
		const saving = state.adapter.update(scene.id, { fogEnabled: false });
		await settle();
		state.coordinator.prepareScale(scene.id, 2);
		const listener = vi.fn(() =>
			state.coordinator.abort("listener reentrante"),
		);
		state.coordinator.subscribe(listener);
		expect(() => state.coordinator.abort("primeiro cancel")).not.toThrow();
		expect(() => state.coordinator.abort("segundo cancel")).not.toThrow();
		expect(() => state.coordinator.dispose()).not.toThrow();
		expect(listener).toHaveBeenCalledTimes(1);
		expect(
			state.adapter.getSceneSnapshot(scene.id).entity.inFlight,
		).toMatchObject({ seq: 1 });
		expect(state.adapter.getSceneSnapshot(scene.id).pendingPatch).toEqual({
			fogEnabled: false,
		});
		pending.resolve(undefined);
		await expect(saving).resolves.toBe(true);
	});

	it.each(["generation", "campaign", "scope"])(
		"ACK confirmado com %s alterada mantém recovering e lock",
		async (kind) => {
			const state = setup();
			const answer = deferred<SceneScaleTransportOutcome>();
			state.scaleScene.mockReturnValueOnce(answer.promise);
			const execution = state.coordinator.prepareScale(scene.id, 2)?.execute();
			await settle();
			state.setPersistenceSnapshot((id) => {
				const captured = state.adapter.getSceneSnapshot(id);
				if (kind === "generation")
					return {
						...captured,
						entity: {
							...captured.entity,
							generation: captured.entity.generation + 1,
						},
					};
				if (kind === "campaign")
					return {
						...captured,
						scope: { ...captured.scope, campaignId: "campaign-new" },
						base: { ...(captured.base ?? scene), campaignId: "campaign-new" },
					};
				return {
					...captured,
					scope: { ...captured.scope, sceneId: "scene-new" },
				};
			});
			answer.resolve({ kind: "confirmed" });
			await expect(execution).resolves.toMatchObject({ status: "recovering" });
			expect(state.coordinator.isScaleLocked(scene.id)).toBe(true);
			expect(state.restore).not.toHaveBeenCalled();
			state.coordinator.dispose();
		},
	);

	it("rejected após dispose é ignorado e não toca sessão seguinte", async () => {
		const state = setup();
		const answer = deferred<SceneScaleTransportOutcome>();
		state.scaleScene.mockReturnValueOnce(answer.promise);
		const execution = state.coordinator.prepareScale(scene.id, 2)?.execute();
		await settle();
		state.coordinator.dispose();
		answer.resolve({ kind: "rejected", error: "callback velho" });
		await expect(execution).resolves.toEqual({ status: "no-op" });
		const next = setup();
		next.scaleScene.mockResolvedValueOnce({ kind: "confirmed" });
		await expect(
			next.coordinator.prepareScale(scene.id, 2)?.execute(),
		).resolves.toMatchObject({ status: "succeeded" });
		await settle();
		expect(state.restore).not.toHaveBeenCalled();
		expect(next.coordinator.getStatus(scene.id)).toBe("idle");
		next.coordinator.dispose();
	});

	it("recovery após cancel não é reativada por timeout, e callback tardio ignora", async () => {
		vi.useFakeTimers();
		try {
			const state = setup(async () => undefined, { timeoutMs: 1_000 });
			const answer = deferred<SceneScaleTransportOutcome>();
			state.scaleScene.mockReturnValueOnce(answer.promise);
			const operation = state.coordinator.prepareScale(scene.id, 2);
			const execution = operation?.execute();
			await vi.advanceTimersByTimeAsync(1_000);
			await expect(execution).resolves.toMatchObject({ status: "recovering" });
			const captured = state.coordinator.getReconciliation(scene.id);
			state.coordinator.abort("cancel usuário");
			expect(state.coordinator.getStatus(scene.id)).toBe("idle");
			expect(state.coordinator.isScaleLocked(scene.id)).toBe(false);
			await expect(operation?.execute()).resolves.toEqual({ status: "no-op" });
			const expected = state.coordinator.getReconciliation(scene.id);
			const read = vi.fn(async () => ({
				status: "confirmed" as const,
				snapshot: captured,
			}));
			await expect(
				state.coordinator.finishScale(scene.id, {
					status: "reconcile",
					read,
				}),
			).resolves.toBe(false);
			expect(read).not.toHaveBeenCalled();
			expect(expected).toBeNull();
			answer.resolve({ kind: "confirmed" });
			await vi.advanceTimersByTimeAsync(0);
			expect(state.coordinator.getStatus(scene.id)).toBe("idle");
			expect(state.coordinator.isScaleLocked(scene.id)).toBe(false);
			expect(state.scaleScene).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});
