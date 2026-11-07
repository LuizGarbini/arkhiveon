import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PersistenceWrite, WriteFailure } from "./persistence-queue";
import type { SceneScaleTransport } from "./scene-scale";
import {
	createSceneSession,
	type SceneGeometry,
	type SceneSession,
} from "./scene-session";
import type { VTTScene } from "./types";
import { useVTTStore } from "./vtt-store";

const scene: VTTScene = {
	id: "a",
	campaignId: "c",
	name: "A",
	gridType: "square",
	gridSize: 70,
	gridOffsetX: 0,
	gridOffsetY: 0,
	gridColor: "#ffffff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	mapScale: 1,
	width: 1000,
	height: 1000,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
};
function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { resolve, promise };
}
const sessions: SceneSession[] = [];
beforeEach(() => {
	vi.useFakeTimers();
	useVTTStore.setState({
		isGM: true,
		scenes: [scene, { ...scene, id: "b", name: "B" }],
		activeSceneId: "a",
		tokens: [],
		walls: [],
	});
});
afterEach(() => {
	for (const session of sessions.splice(0)) session.dispose();
	vi.useRealTimers();
});
function setup() {
	const writes: Array<{
		write: PersistenceWrite;
		answer: ReturnType<typeof deferred<WriteFailure | undefined>>;
	}> = [];
	const transport = vi.fn<SceneScaleTransport>(async () => ({
		kind: "confirmed" as const,
	}));
	const read = vi.fn<(id: string) => Promise<SceneGeometry | null>>(
		async () => ({
			scene: { ...scene, mapScale: 2 },
			tokens: [],
			walls: [],
		}),
	);
	const session = createSceneSession({
		userId: "user",
		campaignId: "c",
		sessionId: "tab",
		writeScene: async (write) => {
			const answer = deferred<WriteFailure | undefined>();
			writes.push({ write, answer });
			return answer.promise;
		},
		scaleScene: transport,
		readGeometry: read,
	});
	sessions.push(session);
	for (const s of useVTTStore.getState().scenes) session.acceptRemote(s);
	return { session, writes, transport, read };
}
const current = (id = "a") =>
	useVTTStore.getState().scenes.find((s) => s.id === id);
describe("P2b session wiring", () => {
	it("A inFlight + B + cor/offset/fog conserva intenção e scope/seq em dois ACKs", async () => {
		const { session, writes } = setup();
		const a = session.update("a", { gridSize: 71, gridOffsetX: 4 });
		await vi.advanceTimersByTimeAsync(0);
		const b = session.update("a", { gridSize: 72 });
		const c = session.update("a", { gridColor: "#000000", fogEnabled: true });
		expect(writes).toHaveLength(1);
		expect(current()).toMatchObject({
			gridSize: 72,
			gridOffsetX: 4,
			gridColor: "#000000",
			fogEnabled: true,
		});
		writes[0].answer.resolve(undefined);
		await vi.advanceTimersByTimeAsync(0);
		expect(writes).toHaveLength(2);
		expect(writes[0].write).toMatchObject({
			scope: { campaignId: "c", sceneId: "a" },
			seq: 1,
			patch: { grid_size: 71, grid_offset_x: 4 },
		});
		expect(writes[1].write).toMatchObject({
			scope: { campaignId: "c", sceneId: "a" },
			seq: 3,
			patch: { grid_size: 72, grid_color: "#000000", fog_enabled: true },
		});
		expect(current()?.gridSize).toBe(72);
		writes[1].answer.resolve(undefined);
		await Promise.all([a, b, c]);
		expect(session.persistence.getSceneSnapshot("a").pendingPatch).toEqual({});
		expect(current()?.gridOffsetX).toBe(4);
	});
	it("falha A retém B; retry usa delta novo, não descarta ao trocar cena", async () => {
		const { session, writes } = setup();
		const a = session.update("a", { gridSize: 71 });
		await vi.advanceTimersByTimeAsync(0);
		const b = session.update("a", { gridSize: 72, fogEnabled: true });
		writes[0].answer.resolve({ kind: "permanent", message: "negado" });
		await a;
		expect(current()?.gridSize).toBe(72);
		expect(session.canDelete("a")).toBe(false);
		useVTTStore.getState().setActiveSceneId("b");
		expect(session.persistence.getSceneSnapshot("b").error).toBeUndefined();
		expect(await session.update("a", { gridSize: 90 })).toBe(false);
		const retry = session.persistence.retry("a");
		await vi.advanceTimersByTimeAsync(0);
		expect(writes).toHaveLength(2);
		expect(writes[1].write.patch).toEqual({ grid_size: 72, fog_enabled: true });
		writes[1].answer.resolve(undefined);
		await retry;
		await b;
		await vi.advanceTimersByTimeAsync(0);
		expect(current()?.gridSize).toBe(72);
	});
	it("scale drena P1 uma vez, bloqueia só A e mantém target após troca para B", async () => {
		const { session, writes, transport } = setup();
		const saving = session.update("a", { gridSize: 80 });
		const scaling = session.resize("a", 2);
		expect(transport).toHaveBeenCalledTimes(0);
		expect(await session.update("a", { fogEnabled: true })).toBe(false);
		useVTTStore.getState().setActiveSceneId("b");
		writes[0].answer.resolve(undefined);
		await vi.advanceTimersByTimeAsync(0);
		expect(await scaling).toBe(true);
		await saving;
		expect(transport).toHaveBeenCalledTimes(1);
		expect(transport.mock.calls[0]).toEqual(["a", 2, expect.anything()]);
		expect(current()?.mapScale).toBe(2);
		expect(current("b")?.mapScale).toBe(1);
	});
	it("dispose congela P1 sem perder queued e ignora leitura tardia da sessão antiga", async () => {
		const { session, writes } = setup();
		const a = session.update("a", { gridSize: 71 });
		await vi.advanceTimersByTimeAsync(0);
		void session.update("a", { gridSize: 72 });
		session.dispose();
		writes[0].answer.resolve(undefined);
		await a;
		await vi.advanceTimersByTimeAsync(0);
		expect(writes).toHaveLength(1);
		expect(
			session.persistence.queue.inspect("scene:a")?.pendingPatch,
		).toMatchObject({ grid_size: 72 });
		expect(await session.update("a", { gridSize: 90 })).toBe(false);
	});
	it("mount/cleanup/mount de StrictMode mantém sessão utilizável e ACK não vira refetch", async () => {
		const { session, writes } = setup();
		const detach = session.mount();
		detach();
		session.mount();
		const saving = session.update("a", { gridSize: 81 });
		await vi.advanceTimersByTimeAsync(0);
		expect(writes).toHaveLength(1);
		expect(
			session.acceptRemote({ ...scene, name: "renomeada", gridSize: 10 })
				.gridSize,
		).toBe(81);
		writes[0].answer.resolve(undefined);
		await saving;
		expect(current()?.gridSize).toBe(81);
	});
});

it("recovery lê sem repetir RPC e leitura após dispose não aplica geometria velha", async () => {
	const { session, transport, read } = setup();
	transport.mockResolvedValueOnce({ kind: "unknown" });
	expect(await session.resize("a", 2)).toBe(false);
	const remote = deferred<SceneGeometry | null>();
	read.mockReturnValueOnce(remote.promise);
	const recovering = session.reconcile("a");
	session.dispose();
	remote.resolve({ scene: { ...scene, mapScale: 9 }, tokens: [], walls: [] });
	expect(await recovering).toBe(false);
	expect(current()?.mapScale).toBe(2);
	expect(transport).toHaveBeenCalledTimes(1);
});

it("jogador/campanha divergente e sessão sem usuário não enviam writes nem escala", async () => {
	const { session, writes, transport } = setup();
	useVTTStore.setState({ isGM: false });
	expect(await session.update("a", { gridSize: 99 })).toBe(false);
	expect(await session.resize("a", 2)).toBe(false);
	useVTTStore.setState({
		isGM: true,
		scenes: [{ ...scene, campaignId: "other" }],
	});
	expect(await session.update("a", { gridSize: 99 })).toBe(false);
	expect(await session.resize("a", 2)).toBe(false);
	expect(writes).toHaveLength(0);
	expect(transport).toHaveBeenCalledTimes(0);
});

it("subscriber dispose durante apply não sobrescreve geometria da sessão/cena B", async () => {
	const { session, transport } = setup();
	let changed = false;
	useVTTStore.setState({
		tokens: [
			{
				id: "token-a",
				sceneId: "a",
				name: "A",
				layer: "token",
				x: 10,
				y: 20,
				sizeCells: 1,
				rotation: 0,
				elevation: 0,
				conditions: [],
				auras: [],
				visionRange: 0,
				isLocked: false,
				isHidden: false,
				controlledBy: [],
			},
		],
	});
	const unsubscribe = useVTTStore.subscribe((state) => {
		if (changed || state.scenes.find((s) => s.id === "a")?.mapScale !== 2)
			return;
		changed = true;
		session.dispose();
		useVTTStore.getState().setActiveSceneId("b");
		useVTTStore.setState({ tokens: [] });
	});
	try {
		expect(await session.resize("a", 2)).toBe(false);
		expect(transport).toHaveBeenCalledTimes(0);
		expect(useVTTStore.getState().activeSceneId).toBe("b");
		expect(useVTTStore.getState().tokens).toEqual([]);
	} finally {
		unsubscribe();
	}
});

it("leituras pré-escala e pré-unmount são invalidadas; ACK relê geometria sem repetir fator", async () => {
	const { session, read, transport } = setup();
	const old = session.getReadGeneration("a");
	const metadata = session.getReadGeneration();
	expect(session.isReadCurrent(old, "a")).toBe(true);
	expect(await session.resize("a", 2)).toBe(true);
	expect(session.isReadCurrent(old, "a")).toBe(false);
	expect(session.isReadCurrent(metadata)).toBe(false);
	expect(read).toHaveBeenCalledTimes(1);
	expect(transport).toHaveBeenCalledTimes(1);
	const restored = session.acceptRemote({ ...scene, mapScale: 1 });
	expect(restored.mapScale).toBe(2);
	const currentRevision = session.getReadGeneration("a");
	const detach = session.mount();
	detach();
	session.mount();
	expect(session.isReadCurrent(currentRevision, "a")).toBe(false);
});

it("no-op válido não repete transporte nem lê geometria", async () => {
	const { session, transport, read } = setup();
	expect(await session.resize("a", 1)).toBe(true);
	expect(transport).toHaveBeenCalledTimes(0);
	expect(read).toHaveBeenCalledTimes(0);
});
it("listener do read remoto invalida geração antes de aplicar recovery", async () => {
	const { session, transport, read } = setup();
	transport.mockResolvedValueOnce({ kind: "unknown" });
	expect(await session.resize("a", 2)).toBe(false);
	read.mockResolvedValueOnce({
		scene: { ...scene, mapScale: 9 },
		tokens: [],
		walls: [],
	});
	const unsubscribe = session.persistence.subscribe(() =>
		session.persistence.queue.invalidate("scene:a"),
	);
	try {
		expect(await session.reconcile("a")).toBe(false);
		expect(current()?.mapScale).toBe(2);
		expect(transport).toHaveBeenCalledTimes(1);
	} finally {
		unsubscribe();
	}
});
