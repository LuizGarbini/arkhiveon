import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVTTStore } from "./vtt-store";
import type { VTTWall } from "./walls";

const mock = vi.hoisted(() => ({
	rpc: vi.fn(),
	update: vi.fn(),
	insert: vi.fn(),
	toast: vi.fn(),
	offline: false,
}));
vi.mock("@/lib/supabase", () => ({
	getSupabase: () =>
		mock.offline
			? null
			: {
					rpc: mock.rpc,
					from: () => ({
						update: (values: unknown) => ({
							in: (_col: string, ids: string[]) => mock.update(values, ids),
						}),
						insert: (rows: unknown) => mock.insert(rows),
					}),
				},
}));
vi.mock("@/components/ui/toast", () => ({
	showToast: (...args: unknown[]) => mock.toast(...args),
}));

import {
	finishWallDraft,
	runWallOp,
	setWallsKind,
	toggleDoor,
} from "./wall-sync";

const plain: VTTWall = { id: "w", sceneId: "s", x1: 0, y1: 0, x2: 70, y2: 0 };
const door = (over: Partial<VTTWall> = {}): VTTWall => ({
	id: "d",
	sceneId: "s",
	x1: 100,
	y1: 0,
	x2: 100,
	y2: 70,
	kind: "door",
	isOpen: false,
	...over,
});
const doorNow = (id = "d") =>
	useVTTStore.getState().walls.find((w) => w.id === id);

beforeEach(() => {
	mock.rpc.mockReset().mockResolvedValue({ data: true, error: null });
	mock.update.mockReset().mockResolvedValue({ error: null });
	mock.insert.mockReset().mockResolvedValue({ error: null });
	mock.toast.mockReset();
	mock.offline = false;
	useVTTStore.setState({
		activeSceneId: "s",
		walls: [plain, door()],
		wallsStatus: "ready",
		wallKind: "wall",
		wallDraft: [],
		wallUndo: [],
		wallRedo: [],
		selectedWallIds: [],
	});
});

describe("toggleDoor", () => {
	it("a porta abre NA HORA e o banco recebe o pedido", async () => {
		let release: (v: unknown) => void = () => {};
		mock.rpc.mockReturnValue(
			new Promise((resolve) => {
				release = resolve;
			}),
		);
		const pending = toggleDoor("d", true);
		expect(doorNow()?.isOpen).toBe(true); // antes do banco responder
		expect(mock.rpc).toHaveBeenCalledWith("toggle_wall_door", {
			p_wall_id: "d",
			p_open: true,
		});
		release({ data: true, error: null });
		expect(await pending).toBe(true);
		expect(doorNow()?.isOpen).toBe(true);
		expect(mock.toast).not.toHaveBeenCalled();
	});

	it("fecha uma porta aberta", async () => {
		useVTTStore.setState({ walls: [plain, door({ isOpen: true })] });
		expect(await toggleDoor("d", false)).toBe(true);
		expect(doorNow()?.isOpen).toBe(false);
		expect(mock.rpc).toHaveBeenCalledWith("toggle_wall_door", {
			p_wall_id: "d",
			p_open: false,
		});
	});

	it("o banco recusa: a porta VOLTA e o aviso explica", async () => {
		mock.rpc.mockResolvedValue({
			data: null,
			error: { code: "42501", message: "Esta cena não está em jogo." },
		});
		expect(await toggleDoor("d", true)).toBe(false);
		expect(doorNow()?.isOpen).toBe(false);
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível abrir a porta",
				description: "Esta cena não está em jogo.",
			}),
		);
	});

	it("sem conexão, função ausente e porta apagada têm mensagens próprias", async () => {
		mock.offline = true;
		expect(await toggleDoor("d", true)).toBe(false);
		expect(doorNow()?.isOpen).toBe(false);
		mock.offline = false;
		mock.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
		await toggleDoor("d", true);
		expect(mock.toast).toHaveBeenLastCalledWith(
			"error",
			expect.objectContaining({
				description:
					"Portas e janelas ainda não estão disponíveis no servidor.",
			}),
		);
		mock.rpc.mockResolvedValue({ data: null, error: { code: "P0002" } });
		await toggleDoor("d", true);
		expect(mock.toast).toHaveBeenLastCalledWith(
			"error",
			expect.objectContaining({ description: "Essa porta não existe mais." }),
		);
	});

	it("falhou ao FECHAR: o aviso fala em fechar e a porta continua aberta", async () => {
		useVTTStore.setState({ walls: [plain, door({ isOpen: true })] });
		mock.rpc.mockRejectedValue(new Error("rede"));
		expect(await toggleDoor("d", false)).toBe(false);
		expect(doorNow()?.isOpen).toBe(true);
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: "Não foi possível fechar a porta" }),
		);
	});

	it("parede comum, porta inexistente e estado igual: sem chamar o banco", async () => {
		expect(await toggleDoor("w", true)).toBe(false);
		expect(await toggleDoor("nao-existe", true)).toBe(false);
		expect(await toggleDoor("d", false)).toBe(true); // já estava fechada
		expect(mock.rpc).not.toHaveBeenCalled();
	});
});

describe("setWallsKind · parede ↔ porta (mestre)", () => {
	it("parede vira porta FECHADA e o banco recebe kind e is_open", async () => {
		expect(await setWallsKind(["w"], "door")).toBe(true);
		expect(doorNow("w")).toMatchObject({ kind: "door", isOpen: false });
		expect(mock.update).toHaveBeenCalledWith({ kind: "door", is_open: false }, [
			"w",
		]);
	});

	it("porta vira parede e perde o estado (mesmo se estava aberta)", async () => {
		useVTTStore.setState({ walls: [plain, door({ isOpen: true })] });
		expect(await setWallsKind(["d"], "wall")).toBe(true);
		const now = doorNow("d");
		expect(now?.kind).toBeUndefined();
		expect(now?.isOpen).toBeUndefined();
		expect(mock.update).toHaveBeenCalledWith({ kind: "wall", is_open: false }, [
			"d",
		]);
	});

	it("só manda o que muda: o que já é do tipo pedido fica de fora", async () => {
		await setWallsKind(["w", "d"], "door");
		expect(mock.update).toHaveBeenCalledWith({ kind: "door", is_open: false }, [
			"w",
		]);
	});

	it("tudo já no tipo pedido ou lista vazia: nada acontece", async () => {
		expect(await setWallsKind(["d"], "door")).toBe(true);
		expect(await setWallsKind([], "door")).toBe(true);
		expect(mock.update).not.toHaveBeenCalled();
	});

	it("o banco recusa: tudo volta como estava e avisa", async () => {
		mock.update.mockResolvedValue({ error: { code: "42501" } });
		expect(await setWallsKind(["w"], "door")).toBe(false);
		expect(doorNow("w")).toEqual(plain);
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível transformar em porta",
			}),
		);
	});

	it("as outras paredes não são tocadas", async () => {
		const other: VTTWall = {
			id: "o",
			sceneId: "s",
			x1: 5,
			y1: 5,
			x2: 9,
			y2: 9,
		};
		useVTTStore.setState({ walls: [plain, other] });
		await setWallsKind(["w"], "door");
		expect(doorNow("o")).toEqual(other);
	});
});

describe("desenhar com a ferramenta em modo porta", () => {
	const draw = () =>
		useVTTStore.setState({
			wallDraft: [
				{ x: 0, y: 0 },
				{ x: 70, y: 0 },
			],
		});

	it("modo parede grava parede comum (kind 'wall', fechada)", async () => {
		draw();
		finishWallDraft();
		await Promise.resolve();
		expect(mock.insert).toHaveBeenCalledTimes(1);
		expect(mock.insert.mock.calls[0]?.[0]).toEqual([
			expect.objectContaining({ kind: "wall", is_open: false }),
		]);
	});

	it("modo porta grava porta fechada", async () => {
		useVTTStore.setState({ wallKind: "door" });
		draw();
		finishWallDraft();
		await Promise.resolve();
		expect(mock.insert.mock.calls[0]?.[0]).toEqual([
			expect.objectContaining({ kind: "door", is_open: false }),
		]);
		expect(
			useVTTStore
				.getState()
				.walls.some((w) => w.kind === "door" && w.isOpen === false),
		).toBe(true);
	});
});

describe("janelas no sync", () => {
	const win = (over: Partial<VTTWall> = {}): VTTWall => ({
		id: "j",
		sceneId: "s",
		x1: 200,
		y1: 0,
		x2: 200,
		y2: 70,
		kind: "window",
		isOpen: false,
		...over,
	});

	it("abrir a janela é na hora e usa a mesma função do banco da porta", async () => {
		useVTTStore.setState({ walls: [win()] });
		expect(await toggleDoor("j", true)).toBe(true);
		expect(doorNow("j")?.isOpen).toBe(true);
		expect(mock.rpc).toHaveBeenCalledWith("toggle_wall_door", {
			p_wall_id: "j",
			p_open: true,
		});
	});

	it("falha ao abrir: a janela volta a fechar e o aviso fala em janela", async () => {
		useVTTStore.setState({ walls: [win()] });
		mock.rpc.mockResolvedValue({
			data: null,
			error: { code: "42501", message: "" },
		});
		expect(await toggleDoor("j", true)).toBe(false);
		expect(doorNow("j")?.isOpen).toBe(false);
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível abrir a janela",
				description: "Você não pode abrir esta janela agora.",
			}),
		);
	});

	it("o aviso da porta continua falando em porta", async () => {
		mock.rpc.mockResolvedValue({ data: null, error: { code: "P0002" } });
		await toggleDoor("d", true);
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível abrir a porta",
				description: "Essa porta não existe mais.",
			}),
		);
	});

	it("parede comum não abre", async () => {
		expect(await toggleDoor("w", true)).toBe(false);
		expect(mock.rpc).not.toHaveBeenCalled();
	});

	it("virar janela: a parede vira janela fechada e o banco recebe kind window", async () => {
		expect(await setWallsKind(["w"], "window")).toBe(true);
		expect(doorNow("w")).toMatchObject({ kind: "window", isOpen: false });
		expect(mock.update).toHaveBeenCalledWith(
			{ kind: "window", is_open: false },
			["w"],
		);
	});

	it("virar janela uma que já é janela não grava nada", async () => {
		useVTTStore.setState({ walls: [win()] });
		expect(await setWallsKind(["j"], "window")).toBe(true);
		expect(mock.update).not.toHaveBeenCalled();
	});

	it("porta aberta que vira janela fecha (janela nasce fechada)", async () => {
		useVTTStore.setState({ walls: [door({ isOpen: true })] });
		await setWallsKind(["d"], "window");
		expect(doorNow("d")).toMatchObject({ kind: "window", isOpen: false });
	});

	it("falha ao virar janela: volta ao que era e avisa", async () => {
		mock.update.mockResolvedValue({ error: { code: "42501" } });
		expect(await setWallsKind(["w"], "window")).toBe(false);
		expect(doorNow("w")?.kind).toBeUndefined();
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível transformar em janela",
			}),
		);
	});

	it("recriar uma janela ABERTA (desfazer uma exclusão) grava o estado aberto; parede não", async () => {
		useVTTStore.setState({ walls: [] });
		await runWallOp(
			{
				kind: "create",
				walls: [
					win({ id: "j1", isOpen: true }),
					door({ id: "d1", isOpen: true }),
					{ id: "p1", sceneId: "s", x1: 0, y1: 0, x2: 1, y2: 1 },
				],
			},
			"do",
		);
		const rows = mock.insert.mock.calls[0]?.[0] as {
			id: string;
			kind: string;
			is_open: boolean;
		}[];
		expect(rows.find((r) => r.id === "j1")).toMatchObject({
			kind: "window",
			is_open: true,
		});
		expect(rows.find((r) => r.id === "d1")).toMatchObject({
			kind: "door",
			is_open: true,
		});
		expect(rows.find((r) => r.id === "p1")).toMatchObject({
			kind: "wall",
			is_open: false,
		});
	});

	it("desenhar com a ferramenta em Janela grava janelas fechadas", async () => {
		useVTTStore.setState({
			walls: [],
			wallKind: "window",
			wallDraft: [
				{ x: 0, y: 0 },
				{ x: 70, y: 0 },
			],
		});
		finishWallDraft();
		await vi.waitFor(() => expect(mock.insert).toHaveBeenCalled());
		const rows = mock.insert.mock.calls[0]?.[0] as {
			kind: string;
			is_open: boolean;
		}[];
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ kind: "window", is_open: false });
	});
});
