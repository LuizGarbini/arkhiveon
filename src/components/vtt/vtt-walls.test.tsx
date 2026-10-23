// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import type { VTTWall } from "@/lib/vtt/walls";

const db = vi.hoisted(() => ({
	rows: [] as Record<string, unknown>[],
	selectError: null as null | { code: string; message: string },
	failWrites: false,
	inserts: 0,
	deletes: 0,
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/toast", () => ({ showToast: toast }));
vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: () => {
			const q = {
				select: () => q,
				eq: () => q,
				order: () =>
					Promise.resolve({
						data: db.selectError ? null : db.rows,
						error: db.selectError,
					}),
				insert: () => {
					db.inserts++;
					return Promise.resolve({
						error: db.failWrites ? { code: "42501", message: "rls" } : null,
					});
				},
				delete: () => ({
					in: () => {
						db.deletes++;
						return Promise.resolve({
							error: db.failWrites ? { code: "42501", message: "rls" } : null,
						});
					},
				}),
			};
			return q;
		},
	}),
}));

import { finishWallDraft, loadWalls } from "@/lib/vtt/wall-sync";
import { VTTToolbar, wallToolDisabledReason } from "./vtt-toolbar";

const wall = (id: string, x1 = 0): VTTWall => ({
	id,
	sceneId: "scene-1",
	x1,
	y1: 0,
	x2: x1 + 70,
	y2: 0,
});
const st = () => useVTTStore.getState();
const key = (k: string, extra: Record<string, unknown> = {}) =>
	act(() => {
		fireEvent.keyDown(document.body, { key: k, ...extra });
	});
const flush = () => act(async () => {});

beforeEach(() => {
	db.rows = [];
	db.selectError = null;
	db.failWrites = false;
	db.inserts = 0;
	db.deletes = 0;
	toast.mockReset();
	useVTTStore.setState({
		isGM: true,
		activeSceneId: "scene-1",
		activeTool: "select",
		showRosterDrawer: false,
		walls: [],
		wallsStatus: "ready",
		selectedWallIds: [],
		wallDraft: [],
		wallUndo: [],
		wallRedo: [],
	});
});
afterEach(cleanup);

describe("ferramenta Parede na toolbar", () => {
	it("W liga a Parede para o mestre", () => {
		render(<VTTToolbar />);
		key("w");
		expect(st().activeTool).toBe("wall");
		expect(
			screen
				.getByRole("button", { name: "Parede" })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});

	it("jogador não vê o botão e W não faz nada", () => {
		useVTTStore.setState({ isGM: false });
		render(<VTTToolbar />);
		expect(screen.queryByRole("button", { name: "Parede" })).toBeNull();
		key("w");
		expect(st().activeTool).toBe("select");
	});

	it("tabela ausente: botão desabilitado com o texto do Designer e W não liga", async () => {
		db.selectError = {
			code: "PGRST205",
			message:
				"Could not find the table 'public.vtt_walls' in the schema cache",
		};
		await act(() => loadWalls("scene-1"));
		expect(st().wallsStatus).toBe("missing");
		render(<VTTToolbar />);
		const btn = screen.getByRole("button", { name: "Parede" });
		expect(btn.getAttribute("aria-disabled")).toBe("true");
		expect(btn.getAttribute("title")).toBeNull();
		fireEvent.click(btn);
		key("w");
		expect(st().activeTool).toBe("select");
		// Texto do Tooltip do DS (o hover aparece na prova Playwright).
		expect(wallToolDisabledReason("missing", false)).toBe(
			"Paredes chegam quando a atualização do banco for aplicada",
		);
		expect(wallToolDisabledReason("ready", true)).toBe(
			"Desenhe paredes no computador",
		);
		expect(wallToolDisabledReason("ready", false)).toBeNull();
	});

	it("com foco num campo, W, Ctrl+Z e Backspace não mexem nas paredes", () => {
		useVTTStore.setState({
			activeTool: "wall",
			walls: [wall("a")],
			selectedWallIds: ["a"],
			wallUndo: [{ kind: "create", walls: [wall("a")] }],
		});
		render(
			<>
				<VTTToolbar />
				<input aria-label="busca" />
			</>,
		);
		const input = screen.getByLabelText("busca");
		input.focus();
		for (const [k, extra] of [
			["Backspace", {}],
			["Delete", {}],
			["z", { ctrlKey: true }],
			["z", { metaKey: true, shiftKey: true }],
		] as const) {
			act(() => {
				fireEvent.keyDown(input, { key: k, ...extra });
			});
		}
		expect(st().walls.map((w) => w.id)).toEqual(["a"]);
		expect(db.deletes).toBe(0);
	});
});

describe("desenho, apagar e desfazer", () => {
	beforeEach(() => {
		useVTTStore.setState({ activeTool: "wall" });
	});

	it("Backspace no desenho tira o último ponto; Esc encerra e salva os segmentos", async () => {
		render(<VTTToolbar />);
		useVTTStore.setState({
			wallDraft: [
				{ x: 0, y: 0 },
				{ x: 70, y: 0 },
				{ x: 70, y: 70 },
			],
		});
		key("Backspace");
		expect(st().wallDraft).toHaveLength(2);
		key("Escape");
		await flush();
		expect(st().wallDraft).toEqual([]);
		expect(st().walls).toHaveLength(1);
		expect(st().activeTool).toBe("wall");
		expect(db.inserts).toBe(1);
	});

	it("Delete apaga a selecionada; Ctrl+Z volta; Ctrl+Shift+Z refaz", async () => {
		useVTTStore.setState({
			walls: [wall("a"), wall("b", 70)],
			selectedWallIds: ["a"],
		});
		render(<VTTToolbar />);
		key("Delete");
		await flush();
		expect(st().walls.map((w) => w.id)).toEqual(["b"]);
		key("z", { ctrlKey: true });
		await flush();
		expect(
			st()
				.walls.map((w) => w.id)
				.sort(),
		).toEqual(["a", "b"]);
		key("z", { metaKey: true, shiftKey: true });
		await flush();
		expect(st().walls.map((w) => w.id)).toEqual(["b"]);
		expect(db.deletes).toBe(2);
		expect(db.inserts).toBe(1);
	});

	it("Backspace fora do desenho apaga a parede selecionada", async () => {
		useVTTStore.setState({ walls: [wall("a")], selectedWallIds: ["a"] });
		render(<VTTToolbar />);
		key("Backspace");
		await flush();
		expect(st().walls).toEqual([]);
	});

	it("falha ao salvar: a parede some, o histórico volta e aparece o toast", async () => {
		db.failWrites = true;
		useVTTStore.setState({
			wallDraft: [
				{ x: 0, y: 0 },
				{ x: 140, y: 0 },
			],
		});
		const pending = act(async () => finishWallDraft());
		expect(st().walls).toHaveLength(1); // otimista
		await pending;
		await flush();
		expect(st().walls).toEqual([]);
		expect(st().wallUndo).toEqual([]);
		expect(toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: "Não foi possível salvar a parede" }),
		);
	});

	it("falha ao apagar: a parede volta selecionável e o toast avisa", async () => {
		db.failWrites = true;
		useVTTStore.setState({ walls: [wall("a")], selectedWallIds: ["a"] });
		render(<VTTToolbar />);
		key("Delete");
		await flush();
		expect(st().walls.map((w) => w.id)).toEqual(["a"]);
		expect(toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: "Não foi possível apagar a parede" }),
		);
	});

	it("falha ao apagar: a parede volta ainda selecionada e Delete tenta de novo", async () => {
		db.failWrites = true;
		useVTTStore.setState({
			walls: [wall("a"), wall("b")],
			selectedWallIds: ["a"],
		});
		render(<VTTToolbar />);
		key("Delete");
		expect(st().selectedWallIds).toEqual([]);
		await flush();
		expect(
			st()
				.walls.map((w) => w.id)
				.sort(),
		).toEqual(["a", "b"]);
		expect(st().selectedWallIds).toEqual(["a"]);
		db.failWrites = false;
		key("Delete");
		await flush();
		expect(st().walls.map((w) => w.id)).toEqual(["b"]);
		expect(st().selectedWallIds).toEqual([]);
	});

	it("sair da ferramenta descarta o desenho e a seleção", () => {
		useVTTStore.setState({
			wallDraft: [{ x: 0, y: 0 }],
			selectedWallIds: ["a"],
		});
		render(<VTTToolbar />);
		key("v");
		expect(st().activeTool).toBe("select");
		expect(st().wallDraft).toEqual([]);
		expect(st().selectedWallIds).toEqual([]);
	});
});

describe("carregar paredes", () => {
	it("mestre recebe as paredes da cena", async () => {
		db.rows = [{ id: "a", scene_id: "scene-1", x1: "0", y1: 0, x2: 70, y2: 0 }];
		await act(() => loadWalls("scene-1"));
		expect(st().wallsStatus).toBe("ready");
		expect(st().walls[0]).toMatchObject({ id: "a", x1: 0, x2: 70 });
	});
	it("trocar de cena limpa paredes, seleção e histórico", () => {
		useVTTStore.setState({
			walls: [wall("a")],
			selectedWallIds: ["a"],
			wallUndo: [{ kind: "create", walls: [wall("a")] }],
		});
		act(() => st().setActiveSceneId("scene-2"));
		expect(st().walls).toEqual([]);
		expect(st().selectedWallIds).toEqual([]);
		expect(st().wallUndo).toEqual([]);
	});
});
