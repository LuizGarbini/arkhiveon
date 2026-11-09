import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
	inserts: [] as Record<string, unknown>[],
	insertError: null as { code?: string; message?: string } | null,
	selectRows: [] as Record<string, unknown>[],
	selectError: null as { code?: string; message?: string } | null,
	deletes: 0,
}));

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: () => ({
			insert: async (row: Record<string, unknown>) => {
				db.inserts.push(row);
				return { error: db.insertError };
			},
			select: () => ({
				eq: () => ({
					order: () => ({
						limit: async () => ({
							data: db.selectRows,
							error: db.selectError,
						}),
					}),
				}),
			}),
			delete: () => {
				db.deletes += 1;
				const chain: Promise<{ error: null }> & { eq?: () => unknown } =
					Promise.resolve({ error: null });
				chain.eq = () => chain;
				return chain;
			},
		}),
	}),
}));

import { useMoveStore } from "./move-store";
import {
	clearMoves,
	isMissingMovesTable,
	loadMoves,
	recordMove,
} from "./move-sync";
import { useVTTStore } from "./vtt-store";

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
const input = {
	sceneId: "s1",
	tokenId: "t1",
	tokenName: "Thorin",
	from: at(1, 1),
	to: at(4, 1),
	authorId: "u1",
	authorName: "Luiz",
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	db.inserts = [];
	db.insertError = null;
	db.selectRows = [];
	db.selectError = null;
	db.deletes = 0;
	useMoveStore.getState().reset();
	useVTTStore.setState({
		isGM: true,
		isCoGM: false,
		scenes: [scene],
		activeSceneId: "s1",
		diagonalRule: "5105",
	});
});

describe("anotar movimento", () => {
	it("aparece na hora, com a distância, e grava no banco", async () => {
		const move = recordMove(input);
		expect(move?.distance).toBe(4.5);
		expect(move?.unit).toBe("m");
		expect(useMoveStore.getState().moves).toHaveLength(1);
		await flush();
		expect(db.inserts).toHaveLength(1);
		expect(db.inserts[0]).toMatchObject({
			id: move?.id,
			scene_id: "s1",
			token_id: "t1",
			token_name: "Thorin",
			from_x: input.from.x,
			to_x: input.to.x,
			distance: 4.5,
			kind: "move",
			author_id: "u1",
		});
	});

	it("não anota quando o token ficou onde estava", async () => {
		expect(recordMove({ ...input, to: input.from })).toBeNull();
		await flush();
		expect(useMoveStore.getState().moves).toHaveLength(0);
		expect(db.inserts).toHaveLength(0);
	});

	it("servidor recusou a posição: a linha sai do histórico e nada é gravado", async () => {
		recordMove(input, Promise.resolve(false));
		expect(useMoveStore.getState().moves).toHaveLength(1);
		await flush();
		expect(useMoveStore.getState().moves).toHaveLength(0);
		expect(db.inserts).toHaveLength(0);
	});

	it("só grava depois que o servidor confirmou a posição", async () => {
		let confirm: (value: unknown) => void = () => {};
		recordMove(
			input,
			new Promise((resolve) => {
				confirm = resolve;
			}),
		);
		await flush();
		expect(db.inserts).toHaveLength(0);
		confirm(true);
		await flush();
		expect(db.inserts).toHaveLength(1);
	});

	it("guarda a rodada do combate quando há combate em andamento", async () => {
		const { useCombatStore } = await import("./combat-store");
		useCombatStore.setState({ status: "ready", round: 3 });
		expect(recordMove(input)?.round).toBe(3);
		useCombatStore.setState({ status: "idle", round: null });
		expect(recordMove(input)?.round).toBeNull();
	});

	it("jogador grava mas não guarda o histórico na própria tela", async () => {
		useVTTStore.setState({ isGM: false, isCoGM: false });
		recordMove(input);
		await flush();
		expect(useMoveStore.getState().moves).toHaveLength(0);
		expect(db.inserts).toHaveLength(1);
	});

	it("sem a tabela no banco, o histórico vale na sessão e para de tentar gravar", async () => {
		db.insertError = { code: "PGRST205", message: "relation does not exist" };
		recordMove(input);
		await flush();
		expect(useMoveStore.getState().status).toBe("missing");
		expect(useMoveStore.getState().moves).toHaveLength(1);
		recordMove({ ...input, to: at(6, 1) });
		await flush();
		expect(db.inserts).toHaveLength(1);
		expect(useMoveStore.getState().moves).toHaveLength(2);
	});
});

describe("carregar e limpar", () => {
	it("só mestre e co-mestre carregam o histórico", async () => {
		useVTTStore.setState({ isGM: false, isCoGM: false });
		await loadMoves("s1");
		expect(useMoveStore.getState().status).toBe("idle");
	});

	it("co-mestre carrega as linhas do banco", async () => {
		useVTTStore.setState({ isGM: false, isCoGM: true });
		db.selectRows = [
			{
				id: "r1",
				scene_id: "s1",
				token_id: "t1",
				token_name: "Thorin",
				from_x: 35,
				from_y: 35,
				to_x: 245,
				to_y: 35,
				distance: 4.5,
				unit: "m",
				round: null,
				kind: "move",
				author_id: "u1",
				author_name: "Luiz",
				created_at: "2026-11-09T22:00:00.000Z",
			},
			{ id: "quebrada" },
		];
		await loadMoves("s1");
		expect(useMoveStore.getState().status).toBe("ready");
		expect(useMoveStore.getState().moves.map((m) => m.id)).toEqual(["r1"]);
	});

	it("o que acabou de ser anotado não some quando o banco ainda não devolveu", async () => {
		const move = recordMove(input);
		await loadMoves("s1");
		expect(useMoveStore.getState().moves.map((m) => m.id)).toEqual([move?.id]);
	});

	it("tabela ausente na carga vira aviso de sessão, sem erro", async () => {
		db.selectError = { code: "42P01", message: "x" };
		await loadMoves("s1");
		expect(useMoveStore.getState().status).toBe("missing");
		expect(isMissingMovesTable({ code: "PGRST205" })).toBe(true);
		expect(isMissingMovesTable({ code: "23505" })).toBe(false);
	});

	it("limpar apaga no banco e na tela, só o token escolhido quando há filtro", async () => {
		recordMove(input);
		recordMove({ ...input, tokenId: "t2", tokenName: "Elara", to: at(3, 1) });
		useMoveStore.getState().setStatus("ready");
		expect(await clearMoves("s1", "t1")).toBe(true);
		expect(db.deletes).toBe(1);
		expect(useMoveStore.getState().moves.map((m) => m.tokenId)).toEqual(["t2"]);
		expect(await clearMoves("s1")).toBe(true);
		expect(useMoveStore.getState().moves).toHaveLength(0);
	});
});
