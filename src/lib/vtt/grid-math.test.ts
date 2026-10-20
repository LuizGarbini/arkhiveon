import { describe, expect, it } from "vitest";
import {
	calculateGridDistance,
	findFreeCell,
	type OccupiedFootprint,
	rulerTickPoints,
	snapToGrid,
} from "./grid-math";

const origin = { x: 0, y: 0 };
const cell = 70;

describe("calculateGridDistance", () => {
	it("returns 0 when the two points are the same cell", () => {
		expect(
			calculateGridDistance(origin, origin, cell, 5, "ft", "5105").distance,
		).toBe(0);
	});

	it("counts a cardinal 3-cell move as 15 ft under the 5-10-5 rule", () => {
		const result = calculateGridDistance(
			origin,
			{ x: cell * 3, y: 0 },
			cell,
			5,
			"ft",
			"5105",
		);
		expect(result.distance).toBe(15);
		expect(result.formatted).toBe("15 ft");
	});

	it("counts a 3-cell diagonal as 20 ft (5-10-5: 5 + 10 + 5)", () => {
		const result = calculateGridDistance(
			origin,
			{ x: cell * 3, y: cell * 3 },
			cell,
			5,
			"ft",
			"5105",
		);
		expect(result.distance).toBe(20);
	});

	it("counts a 2-east 1-north knight step as 10 ft under 5-10-5", () => {
		const result = calculateGridDistance(
			origin,
			{ x: cell * 2, y: cell },
			cell,
			5,
			"ft",
			"5105",
		);
		expect(result.distance).toBe(10);
	});

	it("uses Euclidean length when the diagonal rule is euclidean", () => {
		const result = calculateGridDistance(
			origin,
			{ x: cell * 3, y: cell * 4 },
			cell,
			1.5,
			"m",
			"euclidean",
		);
		expect(result.distance).toBe(7.5);
		expect(result.formatted).toBe("7.5 m");
	});

	it("applies the scene scale so 1 cell at 1.5 m is 1.5 m", () => {
		const result = calculateGridDistance(
			origin,
			{ x: cell, y: 0 },
			cell,
			1.5,
			"m",
			"5105",
		);
		expect(result.distance).toBe(1.5);
	});
});

describe("rulerTickPoints", () => {
	it("places a tick at every full cell along a cardinal line, including the end", () => {
		const ticks = rulerTickPoints(origin, { x: cell * 4, y: 0 }, cell);
		expect(ticks.map((tick) => tick.cells)).toEqual([1, 2, 3, 4]);
		expect(ticks[0]).toMatchObject({ x: cell, y: 0 });
		expect(ticks[3]).toMatchObject({ x: cell * 4, y: 0 });
	});

	it("returns no ticks when the line is shorter than one cell", () => {
		expect(rulerTickPoints(origin, { x: 20, y: 0 }, cell)).toEqual([]);
	});

	it("labels a 2-east 1-north knight step as 10 ft under 5-10-5, not Euclidean length", () => {
		const ticks = rulerTickPoints(
			origin,
			{ x: cell * 2, y: cell },
			cell,
			5,
			"ft",
			"5105",
		);
		expect(ticks.at(-1)?.distance).toBe(10);
	});
});

describe("findFreeCell", () => {
	const square = {
		gridType: "square" as const,
		gridSize: 70,
		bounds: { width: 1400, height: 1400 },
	};
	const origin = { x: 700, y: 700 };

	it("devolve a própria casa quando está livre", () => {
		expect(findFreeCell(origin, [], square)).toEqual({ x: 735, y: 735 });
	});

	it("com a casa ocupada, devolve um vizinho colado", () => {
		const p = findFreeCell(origin, [{ x: 735, y: 735, sizeCells: 1 }], square);
		expect(p).not.toEqual({ x: 735, y: 735 });
		expect(Math.max(Math.abs(p.x - 735), Math.abs(p.y - 735))).toBe(70);
	});

	it("3 tokens seguidos caem em 3 casas diferentes", () => {
		const placed: OccupiedFootprint[] = [];
		for (let i = 0; i < 3; i++) {
			placed.push({ ...findFreeCell(origin, placed, square), sizeCells: 1 });
		}
		const keys = new Set(placed.map((p) => `${p.x}:${p.y}`));
		expect(keys.size).toBe(3);
	});

	it("token 2x2 não sobrepõe token 1x1 vizinho", () => {
		const occupied = [{ x: 735, y: 735, sizeCells: 1 }];
		const p = findFreeCell(origin, occupied, { ...square, sizeCells: 2 });
		// 2x2 encaixa no vértice; pegada [x-70, x+70]
		expect(p.x % 70).toBe(0);
		const overlaps =
			Math.abs(p.x - 735) < 105 - 0.7 && Math.abs(p.y - 735) < 105 - 0.7;
		expect(overlaps).toBe(false);
	});

	it("respeita a borda da cena", () => {
		const bounds = { width: 140, height: 70 };
		const p = findFreeCell({ x: 35, y: 35 }, [{ x: 35, y: 35, sizeCells: 1 }], {
			...square,
			bounds,
		});
		expect(p).toEqual({ x: 105, y: 35 });
	});

	it("sem espaço no raio, devolve a origem", () => {
		const bounds = { width: 70, height: 70 };
		const p = findFreeCell({ x: 35, y: 35 }, [{ x: 35, y: 35, sizeCells: 1 }], {
			...square,
			bounds,
		});
		expect(p).toEqual({ x: 35, y: 35 });
	});

	it.each(["hex_pointy", "hex_flat"] as const)(
		"%s: vizinho é um centro de hex válido e colado",
		(gridType) => {
			const opts = { gridType, gridSize: 60, bounds: square.bounds };
			const first = findFreeCell(origin, [], opts);
			const second = findFreeCell(origin, [{ ...first, sizeCells: 1 }], opts);
			expect(snapToGrid(second, gridType, 60)).toEqual(second);
			expect(Math.hypot(second.x - first.x, second.y - first.y)).toBeCloseTo(
				30 * Math.sqrt(3),
				5,
			);
		},
	);
});
