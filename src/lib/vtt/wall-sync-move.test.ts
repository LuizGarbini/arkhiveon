import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVTTStore } from "./vtt-store";
import type { VTTWall, WallMove } from "./walls";

type Row = {
	id: string;
	scene_id: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	kind?: string;
	is_open?: boolean;
};

const mock = vi.hoisted(() => ({
	update: vi.fn(),
	insert: vi.fn(),
	toast: vi.fn(),
	selectAnswer: Promise.resolve({ data: [] as unknown[], error: null }),
}));
vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: () => ({
			update: (values: unknown) => ({
				eq: (_col: string, id: string) => ({
					select: () => mock.update(values, id),
				}),
			}),
			insert: (rows: unknown) => mock.insert(rows),
			select: () => ({ eq: () => ({ order: () => mock.selectAnswer }) }),
		}),
	}),
}));
vi.mock("@/components/ui/toast", () => ({
	showToast: (...args: unknown[]) => mock.toast(...args),
}));

import {
	commitWallMoves,
	flushWallNudge,
	handleWallKey,
	loadWalls,
	nudgeSelectedWalls,
	redoWall,
	runWallOp,
	undoWall,
} from "./wall-sync";

const wall = (id: string, over: Partial<VTTWall> = {}): VTTWall => ({
	id,
	sceneId: "s",
	x1: 0,
	y1: 0,
	x2: 70,
	y2: 0,
	...over,
});
const get = (id: string) =>
	useVTTStore.getState().walls.find((w) => w.id === id);
const row = (w: VTTWall): Row => ({
	id: w.id,
	scene_id: w.sceneId,
	x1: w.x1,
	y1: w.y1,
	x2: w.x2,
	y2: w.y2,
});
const move = (id: string, to: Partial<VTTWall>): WallMove => {
	const w = get(id) as VTTWall;
	return {
		id,
		from: { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 },
		to: {
			x1: to.x1 ?? w.x1,
			y1: to.y1 ?? w.y1,
			x2: to.x2 ?? w.x2,
			y2: to.y2 ?? w.y2,
		},
	};
};
const key = (k: string, over: Partial<KeyboardEvent> = {}) =>
	({
		key: k,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		shiftKey: false,
		repeat: false,
		...over,
	}) as KeyboardEvent;

beforeEach(() => {
	vi.useFakeTimers();
	mock.update
		.mockReset()
		.mockResolvedValue({ data: [{ id: "x" }], error: null });
	mock.insert.mockReset().mockResolvedValue({ error: null });
	mock.toast.mockReset();
	// O que o banco tem (as paredes iniciais): é o que uma recarga devolve.
	mock.selectAnswer = Promise.resolve({
		data: [
			{ id: "a", scene_id: "s", x1: 0, y1: 0, x2: 70, y2: 0 },
			{
				id: "door",
				scene_id: "s",
				x1: 100,
				y1: 0,
				x2: 100,
				y2: 70,
				kind: "door",
				is_open: true,
			},
		],
		error: null,
	});
	useVTTStore.setState({
		activeSceneId: "s",
		isGM: true,
		activeTool: "wall",
		scenes: [],
		walls: [
			wall("a"),
			wall("door", {
				x1: 100,
				y1: 0,
				x2: 100,
				y2: 70,
				kind: "door",
				isOpen: true,
			}),
		],
		wallsStatus: "ready",
		wallDraft: [],
		wallUndo: [],
		wallRedo: [],
		selectedWallIds: [],
	});
});
afterEach(() => {
	flushWallNudge();
	vi.runOnlyPendingTimers();
	vi.useRealTimers();
});

describe("mover paredes (op move)", () => {
	it("aplica na hora, grava UMA vez por parede e entra no desfazer", async () => {
		const ok = await runWallOp(
			{ kind: "move", moves: [move("a", { x1: 5.5, x2: 75.5, y1: 3, y2: 3 })] },
			"do",
		);
		expect(ok).toBe(true);
		expect(get("a")).toMatchObject({ x1: 5.5, y1: 3, x2: 75.5, y2: 3 });
		expect(mock.update).toHaveBeenCalledTimes(1);
		expect(mock.update).toHaveBeenCalledWith(
			{ x1: 5.5, y1: 3, x2: 75.5, y2: 3 },
			"a",
		);
		expect(useVTTStore.getState().wallUndo).toHaveLength(1);
	});

	it("porta movida mantém tipo e estado; o ícone vai para o meio do novo vão", async () => {
		await runWallOp(
			{
				kind: "move",
				moves: [move("door", { x1: 200, x2: 200, y1: 10, y2: 90 })],
			},
			"do",
		);
		const d = get("door") as VTTWall;
		expect(d).toMatchObject({ kind: "door", isOpen: true });
		const { doorIconCenter } = await import("./walls");
		expect(doorIconCenter(d)).toEqual({ x: 200, y: 50 });
	});

	it("várias paredes: uma gravação cada, todas no mesmo passo do desfazer", async () => {
		await commitWallMoves([
			move("a", { x1: 10, x2: 80 }),
			move("door", { x1: 110, x2: 110 }),
		]);
		await vi.advanceTimersByTimeAsync(0);
		expect(mock.update).toHaveBeenCalledTimes(2);
		expect(useVTTStore.getState().wallUndo).toHaveLength(1);
	});

	it("Ctrl+Z volta o movimento (local e banco) e Shift+Ctrl+Z refaz", async () => {
		await runWallOp(
			{ kind: "move", moves: [move("a", { x1: 9, x2: 79 })] },
			"do",
		);
		mock.update.mockClear();
		undoWall();
		await vi.advanceTimersByTimeAsync(0);
		expect(get("a")).toMatchObject({ x1: 0, x2: 70 });
		expect(mock.update).toHaveBeenLastCalledWith(
			{ x1: 0, y1: 0, x2: 70, y2: 0 },
			"a",
		);
		expect(useVTTStore.getState().wallRedo).toHaveLength(1);
		redoWall();
		await vi.advanceTimersByTimeAsync(0);
		expect(get("a")).toMatchObject({ x1: 9, x2: 79 });
	});

	it("o banco recusa: a parede volta, o histórico também, e avisa", async () => {
		mock.update.mockResolvedValue({ data: null, error: { message: "boom" } });
		const ok = await runWallOp(
			{ kind: "move", moves: [move("a", { x1: 9, x2: 79 })] },
			"do",
		);
		expect(ok).toBe(false);
		expect(get("a")).toMatchObject({ x1: 0, x2: 70 });
		expect(useVTTStore.getState().wallUndo).toHaveLength(0);
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: "Não foi possível mover a parede" }),
		);
	});

	it("0 linhas atualizadas (política de segurança) também conta como recusa", async () => {
		mock.update.mockResolvedValue({ data: [], error: null });
		const ok = await runWallOp(
			{ kind: "move", moves: [move("a", { x1: 9, x2: 79 })] },
			"do",
		);
		expect(ok).toBe(false);
		expect(get("a")).toMatchObject({ x1: 0 });
	});

	it("as gravações saem em ordem (desfazer não passa na frente do movimento)", async () => {
		const order: string[] = [];
		let releaseFirst!: () => void;
		mock.update.mockImplementation((values: { x1: number }) => {
			if (values.x1 === 9)
				return new Promise((r) => {
					releaseFirst = () => {
						order.push("move");
						r({ data: [{ id: "a" }], error: null });
					};
				});
			order.push("undo");
			return Promise.resolve({ data: [{ id: "a" }], error: null });
		});
		void runWallOp(
			{ kind: "move", moves: [move("a", { x1: 9, x2: 79 })] },
			"do",
		);
		undoWall();
		await vi.advanceTimersByTimeAsync(0);
		expect(order).toEqual([]);
		releaseFirst();
		await vi.advanceTimersByTimeAsync(0);
		expect(order).toEqual(["move", "undo"]);
	});
});

describe("recarga do Realtime no meio de um movimento", () => {
	it("não devolve a parede ao lugar antigo enquanto a gravação não terminou", async () => {
		let finish!: (v: unknown) => void;
		mock.update.mockReturnValue(
			new Promise((r) => {
				finish = r;
			}),
		);
		const original = get("a") as VTTWall;
		const pending = runWallOp(
			{ kind: "move", moves: [move("a", { x1: 40, x2: 110 })] },
			"do",
		);
		// a recarga traz o que o banco ainda tem (o lugar antigo)
		mock.selectAnswer = Promise.resolve({
			data: [row(original), row(get("door") as VTTWall)],
			error: null,
		});
		await loadWalls("s");
		expect(get("a")).toMatchObject({ x1: 40, x2: 110 });
		finish({ data: [{ id: "a" }], error: null });
		await pending;
	});

	it("uma consulta que saiu antes da gravação também não desfaz (período de graça)", async () => {
		const original = get("a") as VTTWall;
		await runWallOp(
			{ kind: "move", moves: [move("a", { x1: 40, x2: 110 })] },
			"do",
		);
		mock.selectAnswer = Promise.resolve({
			data: [row(original), row(get("door") as VTTWall)],
			error: null,
		});
		await loadWalls("s");
		expect(get("a")).toMatchObject({ x1: 40, x2: 110 });
		// passada a graça, o banco manda
		await vi.advanceTimersByTimeAsync(2500);
		await loadWalls("s");
		expect(get("a")).toMatchObject({ x1: 0, x2: 70 });
	});

	it("falha na gravação: solta a posição e confere com o banco", async () => {
		mock.update.mockResolvedValue({ data: null, error: { message: "boom" } });
		const original = get("a") as VTTWall;
		mock.selectAnswer = Promise.resolve({
			data: [row(original), row(get("door") as VTTWall)],
			error: null,
		});
		await runWallOp(
			{ kind: "move", moves: [move("a", { x1: 40, x2: 110 })] },
			"do",
		);
		await vi.advanceTimersByTimeAsync(0);
		expect(get("a")).toMatchObject({ x1: 0, x2: 70 });
	});
});

describe("setas com a seleção de paredes", () => {
	beforeEach(() => useVTTStore.setState({ selectedWallIds: ["a", "door"] }));

	it("1 px; Shift 10 px; ajuste anda na hora", () => {
		expect(handleWallKey(key("ArrowRight"))).toBe(true);
		expect(get("a")).toMatchObject({ x1: 1, x2: 71 });
		expect(get("door")).toMatchObject({ x1: 101, kind: "door", isOpen: true });
		handleWallKey(key("ArrowDown", { shiftKey: true }));
		expect(get("a")).toMatchObject({ y1: 10, y2: 10 });
	});

	it("Alt anda a casa inteira da grade", () => {
		useVTTStore.setState({
			scenes: [{ id: "s", gridSize: 50 } as never],
		});
		handleWallKey(key("ArrowLeft", { altKey: true }));
		expect(get("a")).toMatchObject({ x1: -50, x2: 20 });
	});

	it("sem seleção, as setas não são das paredes", () => {
		useVTTStore.setState({ selectedWallIds: [] });
		expect(handleWallKey(key("ArrowRight"))).toBe(false);
	});

	it("vários toques viram UMA gravação e UM passo no desfazer", async () => {
		for (let i = 0; i < 5; i++) {
			handleWallKey(key("ArrowRight"));
			await vi.advanceTimersByTimeAsync(50);
		}
		expect(mock.update).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(400);
		expect(mock.update).toHaveBeenCalledTimes(2); // 2 paredes, 1 lote
		expect(mock.update).toHaveBeenCalledWith(
			{ x1: 5, y1: 0, x2: 75, y2: 0 },
			"a",
		);
		expect(useVTTStore.getState().wallUndo).toHaveLength(1);
		undoWall();
		await vi.advanceTimersByTimeAsync(0);
		expect(get("a")).toMatchObject({ x1: 0, x2: 70 });
	});

	it("repetição da tecla apertada tem intervalo mínimo", () => {
		expect(nudgeSelectedWalls(1, 0, false, 1000)).toBe(true);
		expect(nudgeSelectedWalls(1, 0, true, 1010)).toBe(true); // dentro do intervalo: ignora
		expect(get("a")?.x1).toBe(1);
		nudgeSelectedWalls(1, 0, true, 1100);
		expect(get("a")?.x1).toBe(2);
	});

	it("Ctrl+Z no meio do lote fecha o lote antes e desfaz o ajuste", async () => {
		handleWallKey(key("ArrowRight"));
		handleWallKey(key("z", { ctrlKey: true }));
		await vi.advanceTimersByTimeAsync(0);
		expect(get("a")).toMatchObject({ x1: 0, x2: 70 });
	});

	it("foi e voltou: nada a gravar nem registrar", async () => {
		nudgeSelectedWalls(1, 0, false, 1000);
		nudgeSelectedWalls(-1, 0, false, 2000);
		await vi.advanceTimersByTimeAsync(400);
		expect(mock.update).not.toHaveBeenCalled();
		expect(useVTTStore.getState().wallUndo).toHaveLength(0);
	});

	it("uma recarga no meio do lote não desfaz os toques", async () => {
		const original = get("a") as VTTWall;
		handleWallKey(key("ArrowRight"));
		mock.selectAnswer = Promise.resolve({
			data: [row(original), row(get("door") as VTTWall)],
			error: null,
		});
		await loadWalls("s");
		expect(get("a")).toMatchObject({ x1: 1, x2: 71 });
	});
});
