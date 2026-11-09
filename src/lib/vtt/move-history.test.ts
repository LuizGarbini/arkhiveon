import { describe, expect, it } from "vitest";
import {
	addMove,
	cellLabel,
	cellOf,
	didMove,
	distanceByToken,
	groupByRound,
	mapMoveRow,
	moveDistance,
	movesForScene,
	pointLabel,
	type TokenMove,
} from "./move-history";

const G = 70;
const scene = {
	gridType: "square" as const,
	gridSize: G,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m" as const,
	gridOffsetX: 0,
	gridOffsetY: 0,
};
const at = (col: number, row: number) => ({
	x: (col - 0.5) * G,
	y: (row - 0.5) * G,
});

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

describe("distância e casas", () => {
	it("mede de casa a casa na unidade da cena", () => {
		expect(moveDistance(at(1, 1), at(4, 1), scene, "5105")).toBe(4.5);
		// 5-10-5: a 1ª diagonal custa 1 casa e a 2ª custa 2.
		expect(moveDistance(at(1, 1), at(3, 3), scene, "5105")).toBe(4.5);
		expect(moveDistance(at(1, 1), at(3, 3), scene, "chebyshev")).toBe(3);
		expect(moveDistance(at(1, 1), at(4, 4), scene, "5105")).toBe(6);
	});

	it("sem grade, mede pelo tamanho da célula", () => {
		expect(
			moveDistance(
				{ x: 0, y: 0 },
				{ x: G * 2, y: 0 },
				{ ...scene, gridType: "none" },
				"5105",
			),
		).toBe(3);
	});

	it("só conta como movimento acima de 1 px", () => {
		expect(didMove(at(2, 2), at(2, 2))).toBe(false);
		expect(didMove({ x: 10, y: 10 }, { x: 10.4, y: 10 })).toBe(false);
		expect(didMove(at(2, 2), at(3, 2))).toBe(true);
	});

	it("casa como no xadrez: coluna em letra e linha em número", () => {
		expect(cellOf(at(3, 4), "square", G)).toEqual({ col: 3, row: 4 });
		expect(cellLabel(3, 4)).toBe("C4");
		expect(cellLabel(26, 1)).toBe("Z1");
		expect(cellLabel(27, 2)).toBe("AA2");
		expect(pointLabel(at(8, 5), scene)).toBe("H5");
	});

	it("respeita o deslocamento da grade e some em hex ou sem grade", () => {
		expect(
			pointLabel(
				{ x: 10 + G / 2, y: 20 + G / 2 },
				{
					...scene,
					gridOffsetX: 10,
					gridOffsetY: 20,
				},
			),
		).toBe("A1");
		expect(pointLabel(at(2, 2), { ...scene, gridType: "hex_flat" })).toBeNull();
		expect(pointLabel(at(2, 2), { ...scene, gridType: "none" })).toBeNull();
	});
});

describe("lista do histórico", () => {
	it("não repete o mesmo movimento e mantém a ordem de hora", () => {
		const a = move();
		const b = move();
		let log = addMove([], b);
		log = addMove(log, a);
		log = addMove(log, a);
		expect(log.map((m) => m.id)).toEqual([a.id, b.id]);
	});

	it("filtra por cena e por token, do mais novo para o mais velho", () => {
		const a = move({ tokenId: "t1" });
		const b = move({ tokenId: "t2", tokenName: "Elara" });
		const c = move({ sceneId: "outra" });
		const log = [a, b, c];
		expect(movesForScene(log, "s1").map((m) => m.id)).toEqual([b.id, a.id]);
		expect(movesForScene(log, "s1", "t1").map((m) => m.id)).toEqual([a.id]);
		expect(movesForScene(log, null)).toEqual([]);
	});

	it("agrupa por rodada sem trocar a ordem", () => {
		const list = [
			move({ round: 3 }),
			move({ round: 3 }),
			move({ round: 2 }),
			move({ round: null }),
		];
		expect(groupByRound(list).map((g) => [g.round, g.moves.length])).toEqual([
			[3, 2],
			[2, 1],
			[null, 1],
		]);
	});

	it("soma o que cada token andou, sem contar as devoluções", () => {
		const log = [
			move({ distance: 4.5 }),
			move({ distance: 3 }),
			move({ tokenId: "t2", tokenName: "Elara", distance: 9 }),
			move({ distance: 4.5, kind: "undo" }),
		];
		expect(distanceByToken(log)).toEqual([
			{ tokenId: "t2", tokenName: "Elara", distance: 9, moves: 1 },
			{ tokenId: "t1", tokenName: "Thorin", distance: 7.5, moves: 2 },
		]);
	});
});

describe("linha do banco", () => {
	const row = {
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
		round: 2,
		kind: "undo",
		author_id: "u1",
		author_name: "Luiz",
		created_at: "2026-11-09T22:00:00.000Z",
	};

	it("converte e aceita números vindos como texto", () => {
		expect(mapMoveRow({ ...row, from_x: "35", to_x: "245" })).toMatchObject({
			from: { x: 35, y: 35 },
			to: { x: 245, y: 35 },
			round: 2,
			kind: "undo",
			authorName: "Luiz",
		});
	});

	it("rejeita linha quebrada em vez de inventar posição", () => {
		expect(mapMoveRow(null)).toBeNull();
		expect(mapMoveRow({ ...row, id: undefined })).toBeNull();
		expect(mapMoveRow({ ...row, to_x: "abc" })).toBeNull();
	});

	it("tipo desconhecido vira movimento comum", () => {
		expect(mapMoveRow({ ...row, kind: "x", round: null })).toMatchObject({
			kind: "move",
			round: null,
		});
	});
});
