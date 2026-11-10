import { describe, expect, it } from "vitest";
import { calculateGridDistance } from "./grid-math";
import {
	formatCells,
	formatDistance,
	measureRulerPath,
	type RulerContext,
	rulerAddPoint,
	rulerFrom,
	rulerMoveLive,
	rulerPathCells,
	rulerPathPoints,
	rulerPin,
	rulerRemeasure,
	rulerUndo,
} from "./ruler-path";

const G = 70;
const at = (col: number, row: number) => ({
	x: (col + 0.5) * G,
	y: (row + 0.5) * G,
});
const ctx: RulerContext = {
	gridSize: G,
	scaleDistance: 1.5,
	unit: "m",
	diagonalRule: "5105",
};

describe("measureRulerPath", () => {
	it("um trecho bate com calculateGridDistance em todas as regras", () => {
		for (const rule of ["5105", "chebyshev", "euclidean"] as const) {
			const path = measureRulerPath([at(0, 0), at(5, 3)], G, 1.5, rule);
			expect(path.distance).toBe(
				calculateGridDistance(at(0, 0), at(5, 3), G, 1.5, "m", rule).distance,
			);
		}
	});

	it("soma os trechos e devolve a distância de cada um", () => {
		const path = measureRulerPath(
			[at(0, 0), at(4, 0), at(4, 3)],
			G,
			1.5,
			"5105",
		);
		expect(path.segments.map((s) => s.distance)).toEqual([6, 4.5]);
		expect(path.cells).toBe(7);
		expect(path.distance).toBe(10.5);
	});

	it("5-10-5: a paridade das diagonais segue de um trecho para o outro", () => {
		// Uma diagonal em cada trecho: 1 + 2 casas, não 1 + 1.
		const split = measureRulerPath(
			[at(0, 0), at(1, 1), at(2, 2)],
			G,
			1.5,
			"5105",
		);
		const straight = measureRulerPath([at(0, 0), at(2, 2)], G, 1.5, "5105");
		expect(split.segments.map((s) => s.cells)).toEqual([1, 2]);
		expect(split.cells).toBe(straight.cells);
		expect(split.distance).toBe(4.5);
	});

	it("simples (5e): diagonal custa 1 casa", () => {
		const path = measureRulerPath([at(0, 0), at(3, 3)], G, 1.5, "chebyshev");
		expect(path.cells).toBe(3);
		expect(path.distance).toBe(4.5);
	});

	it("sem trecho ou sem grid, mede zero", () => {
		expect(measureRulerPath([at(0, 0)], G, 1.5, "5105").distance).toBe(0);
		expect(
			measureRulerPath([at(0, 0), at(1, 0)], 0, 1.5, "5105").distance,
		).toBe(0);
	});
});

describe("régua com pontos", () => {
	it("clique começa, clique fixa ponto, o cursor estica o último trecho", () => {
		let m = rulerAddPoint(null, at(0, 0), ctx);
		m = rulerMoveLive(m, at(4, 0), ctx);
		expect(m?.distance).toBe(6);
		m = rulerAddPoint(m, at(4, 0), ctx);
		m = rulerMoveLive(m, at(4, 2), ctx);
		expect(m?.waypoints).toEqual([at(0, 0), at(4, 0)]);
		expect(m?.segments).toEqual([6, 3]);
		expect(m?.distance).toBe(9);
		expect(m && rulerPathPoints(m)).toEqual([at(0, 0), at(4, 0), at(4, 2)]);
	});

	it("ponto repetido no mesmo lugar não cria trecho vazio", () => {
		let m = rulerAddPoint(null, at(1, 1), ctx);
		m = rulerAddPoint(m, at(1, 1), ctx);
		expect(m?.waypoints).toEqual([at(1, 1)]);
	});

	it("desfazer tira o último ponto e, só com a origem, apaga a régua", () => {
		let m = rulerFrom([at(0, 0), at(2, 0)], at(2, 2), ctx);
		m = rulerUndo(m, ctx);
		expect(m?.waypoints).toEqual([at(0, 0)]);
		expect(m?.distance).toBe(4.5);
		expect(rulerUndo(m, ctx)).toBeNull();
	});

	it("fixar para de seguir o cursor; novo clique começa outra régua", () => {
		let m = rulerFrom([at(0, 0), at(3, 0)], at(9, 9), ctx);
		m = rulerPin(m, ctx);
		expect(m?.pinned).toBe(true);
		expect(m?.distance).toBe(4.5);
		expect(rulerMoveLive(m, at(5, 5), ctx)).toBe(m);
		const next = rulerAddPoint(m, at(7, 7), ctx);
		expect(next?.waypoints).toEqual([at(7, 7)]);
		expect(next?.pinned).toBe(false);
	});

	it("fixar só com a origem não deixa régua", () => {
		expect(rulerPin(rulerFrom([at(0, 0)], at(4, 4), ctx), ctx)).toBeNull();
	});

	it("trocar a regra de diagonal recalcula os mesmos pontos", () => {
		const m = rulerFrom([at(0, 0), at(2, 2)], at(4, 4), ctx);
		const simple = rulerRemeasure(m, { ...ctx, diagonalRule: "chebyshev" });
		expect(m?.distance).toBe(9);
		expect(simple?.distance).toBe(6);
		expect(simple?.waypoints).toEqual(m?.waypoints);
	});
});

describe("rulerPathCells", () => {
	it("pinta casa a casa, sem repetir no ponto de virada", () => {
		const cells = rulerPathCells([at(0, 0), at(3, 0), at(3, 2)], "square", G);
		expect(cells).toHaveLength(6);
		expect(cells[0]).toEqual({ x: 0, y: 0 });
		expect(cells.at(-1)).toEqual({ x: 3 * G, y: 2 * G });
	});

	it("diagonal anda uma casa por passo", () => {
		expect(rulerPathCells([at(0, 0), at(3, 3)], "square", G)).toEqual([
			{ x: 0, y: 0 },
			{ x: G, y: G },
			{ x: 2 * G, y: 2 * G },
			{ x: 3 * G, y: 3 * G },
		]);
	});

	it("respeita o offset do grid e não pinta em hex ou sem grid", () => {
		const origin = { x: 10, y: 20 };
		const cells = rulerPathCells(
			[{ x: 10 + G / 2, y: 20 + G / 2 }],
			"square",
			G,
			origin,
		);
		expect(cells).toEqual([origin]);
		expect(rulerPathCells([at(0, 0), at(2, 0)], "hex_flat", G)).toEqual([]);
		expect(rulerPathCells([at(0, 0), at(2, 0)], "none", G)).toEqual([]);
	});
});

describe("formatação", () => {
	it("usa vírgula decimal e uma casa", () => {
		expect(formatDistance(4.5, "m")).toBe("4,5 m");
		expect(formatDistance(21, "m")).toBe("21 m");
		expect(formatDistance(12.345, "ft")).toBe("12,3 ft");
	});

	it("casas só quando a conta é inteira", () => {
		expect(formatCells(14, "5105")).toBe("14 casas");
		expect(formatCells(1, "chebyshev")).toBe("1 casa");
		expect(formatCells(3.6, "euclidean")).toBeNull();
		expect(formatCells(3.6)).toBeNull();
	});
});
