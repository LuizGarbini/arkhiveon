// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenMove } from "@/lib/vtt/move-history";
import { useMoveStore } from "@/lib/vtt/move-store";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const sync = vi.hoisted(() => ({
	recordMove: vi.fn(),
	clearMoves: vi.fn(async () => true),
	loadMoves: vi.fn(async () => {}),
}));
vi.mock("@/lib/vtt/move-sync", () => sync);
vi.mock("@/lib/auth", () => ({
	useAuth: () => ({
		user: { id: "u1", email: "mestre@arkhiveon.app", user_metadata: {} },
	}),
}));

import { VTTMoveHistoryPanel } from "./vtt-move-history-panel";

const G = 70;
const at = (col: number, row: number) => ({
	x: (col - 0.5) * G,
	y: (row - 0.5) * G,
});

const scene = {
	id: "s1",
	campaignId: "c1",
	name: "Cripta",
	gridType: "square" as const,
	gridSize: G,
	gridColor: "#fff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m" as const,
	gridOffsetX: 0,
	gridOffsetY: 0,
	mapScale: 1,
	width: 1400,
	height: 900,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
};

const token = (id: string, name: string, col: number): VTTToken =>
	({
		id,
		sceneId: "s1",
		name,
		layer: "token",
		x: at(col, 1).x,
		y: at(col, 1).y,
		sizeCells: 1,
		rotation: 0,
		elevation: 0,
		conditions: [],
		auras: [],
		visionRange: 0,
		isLocked: false,
		isHidden: false,
		controlledBy: [],
	}) as VTTToken;

let seq = 0;
const move = (over: Partial<TokenMove> = {}): TokenMove => {
	seq += 1;
	return {
		id: `m${seq}`,
		sceneId: "s1",
		tokenId: "t1",
		tokenName: "Thorin",
		from: at(1, 1),
		to: at(4, 1),
		distance: 4.5,
		unit: "m",
		round: null,
		kind: "move",
		authorId: "u1",
		authorName: "Luiz",
		createdAt: `2026-11-09T22:${String(seq).padStart(2, "0")}:00.000Z`,
		...over,
	};
};

function open(
	moves: TokenMove[],
	over: { isGM?: boolean; isCoGM?: boolean } = {},
) {
	useVTTStore.setState({
		isGM: over.isGM ?? true,
		isCoGM: over.isCoGM ?? false,
		scenes: [scene],
		activeSceneId: "s1",
		tokens: [token("t1", "Thorin", 4), token("t2", "Elara", 6)],
		viewport: { x: 0, y: 0, scale: 1 },
	});
	useMoveStore.setState({
		moves,
		status: "ready",
		panelOpen: true,
		focusedMoveId: null,
		filterTokenId: null,
	});
	const onUpdateToken = vi.fn(async () => true);
	render(<VTTMoveHistoryPanel onUpdateToken={onUpdateToken} />);
	return { onUpdateToken };
}

beforeEach(() => {
	Object.assign(window, { innerWidth: 1440, innerHeight: 900 });
	window.matchMedia = ((q: string) => ({
		matches: false,
		media: q,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
	sync.recordMove.mockClear();
	sync.clearMoves.mockClear();
	useMoveStore.getState().reset();
});
afterEach(cleanup);

describe("painel de movimentos", () => {
	it("mostra de onde saiu, para onde foi, a distância e quem moveu", () => {
		open([move()]);
		const log = screen.getByRole("log", { name: "Movimentos dos tokens" });
		expect(log.textContent).toContain("Thorin");
		expect(log.textContent).toContain("A1");
		expect(log.textContent).toContain("D1");
		expect(log.textContent).toContain("4,5 m");
		expect(log.textContent).toContain("Luiz");
	});

	it("agrupa por rodada e separa o que foi fora de combate", () => {
		open([
			move({ round: 1 }),
			move({ round: 2 }),
			move({ round: 2 }),
			move({ round: null }),
		]);
		expect(screen.getByText("Rodada 2")).toBeTruthy();
		expect(screen.getByText("Rodada 1")).toBeTruthy();
		expect(screen.getByText("Fora de combate")).toBeTruthy();
	});

	it("soma quanto cada token andou e o filtro mostra só um", async () => {
		open([
			move({ distance: 4.5 }),
			move({ distance: 3 }),
			move({ tokenId: "t2", tokenName: "Elara", distance: 9 }),
		]);
		const totals = screen.getByRole("list", {
			name: "Quanto cada token andou",
		});
		expect(totals.textContent).toContain("Thorin");
		expect(totals.textContent).toContain("7,5 m");
		expect(totals.textContent).toContain("Elara");

		await act(async () => {
			fireEvent.click(
				screen.getByRole("combobox", { name: "Filtrar por token" }),
			);
		});
		const option = await screen.findByRole("option", { name: "Elara" });
		// Base UI só confirma o item destacado (hover/teclado), como no browser.
		await act(async () => {
			fireEvent.mouseMove(option);
		});
		await act(async () => {
			fireEvent.click(option);
		});
		const log = screen.getByRole("log", { name: "Movimentos dos tokens" });
		expect(log.textContent).toContain("Elara");
		expect(log.textContent).not.toContain("Thorin");
	});

	it("clicar numa linha destaca o movimento no mapa e centraliza a câmera", () => {
		const m = move();
		open([m]);
		const row = () =>
			screen.getByRole("button", { name: /Thorin.*A1.*D1/ }) as HTMLElement;
		fireEvent.click(row());
		expect(useMoveStore.getState().focusedMoveId).toBe(m.id);
		const vp = useVTTStore.getState().viewport;
		expect(vp.scale).toBeGreaterThan(0.29);
		// O ponto médio do trecho cai dentro da tela, fora do painel da direita.
		const screenX = vp.x + ((m.from.x + m.to.x) / 2) * vp.scale;
		expect(screenX).toBeGreaterThan(80);
		expect(screenX).toBeLessThan(1440 - 340);
		fireEvent.click(row());
		expect(useMoveStore.getState().focusedMoveId).toBeNull();
	});

	it("devolver leva o token ao ponto de origem e anota a devolução", async () => {
		const m = move();
		const { onUpdateToken } = open([m]);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Devolver Thorin ao ponto de origem",
			}),
		);
		expect(onUpdateToken).toHaveBeenCalledWith("t1", {
			x: m.from.x,
			y: m.from.y,
		});
		await vi.waitFor(() => expect(sync.recordMove).toHaveBeenCalledTimes(1));
		expect(sync.recordMove.mock.calls[0][0]).toMatchObject({
			tokenId: "t1",
			kind: "undo",
			to: m.from,
		});
	});

	it("token que saiu da mesa não tem o botão de devolver", () => {
		open([move({ tokenId: "sumiu", tokenName: "Fantasma" })]);
		expect(screen.queryByRole("button", { name: /Devolver/ })).toBeNull();
	});

	it("limpar pede confirmação antes de apagar", async () => {
		open([move()]);
		fireEvent.click(screen.getByRole("button", { name: "Limpar histórico" }));
		expect(sync.clearMoves).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirmar: limpar tudo" }),
		);
		await vi.waitFor(() =>
			expect(sync.clearMoves).toHaveBeenCalledWith("s1", null),
		);
	});

	it("vazio explica o que aparece aqui", () => {
		open([]);
		expect(screen.getByText(/Ninguém moveu um token ainda/)).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Limpar/ })).toBeNull();
	});

	it("sem a tabela no banco, avisa que vale só nesta sessão", () => {
		open([move()]);
		cleanup();
		useMoveStore.setState({ status: "missing" });
		render(<VTTMoveHistoryPanel onUpdateToken={async () => true} />);
		expect(screen.getByText(/só nesta sessão do navegador/)).toBeTruthy();
	});

	it("jogador não vê o painel, mesmo com ele aberto", () => {
		open([move()], { isGM: false, isCoGM: false });
		expect(screen.queryByTestId("move-history-panel")).toBeNull();
	});

	it("co-mestre vê o painel", () => {
		open([move()], { isGM: false, isCoGM: true });
		expect(screen.getByTestId("move-history-panel")).toBeTruthy();
	});
});
