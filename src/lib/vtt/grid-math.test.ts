import { describe, expect, it } from "vitest";
import {
	calculateGridDistance,
	findFreeCell,
	flatHexCenters,
	gridSizeFromCellCount,
	normalizeGridOffset,
	type OccupiedFootprint,
	pointyHexCenters,
	rulerTickPoints,
	snapToGrid,
	squareGridLines,
	ZERO_ORIGIN,
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

describe("snapToGrid com origem", () => {
	const gridOrigin = { x: 12, y: 7 };

	it("quadrado: a primeira casa com célula 50 fica em 37/32", () => {
		expect(snapToGrid({ x: 20, y: 20 }, "square", 50, 1, gridOrigin)).toEqual({
			x: 37,
			y: 32,
		});
	});

	it.each(["square", "hex_pointy", "hex_flat"] as const)(
		"%s: encaixar de novo não move, e difere do grid sem offset",
		(gridType) => {
			const point = { x: gridOrigin.x + 4, y: gridOrigin.y + 3 };
			const snapped = snapToGrid(point, gridType, 60, 1, gridOrigin);
			const again = snapToGrid(snapped, gridType, 60, 1, gridOrigin);
			expect(again.x).toBeCloseTo(snapped.x, 5);
			expect(again.y).toBeCloseTo(snapped.y, 5);
			const bare = snapToGrid(point, gridType, 60, 1);
			expect(
				Math.hypot(bare.x - snapped.x, bare.y - snapped.y),
			).toBeGreaterThan(1);
		},
	);

	it("casa livre com origem encaixa no grid deslocado", () => {
		const p = findFreeCell({ x: 200, y: 200 }, [], {
			gridType: "square",
			gridSize: 50,
			bounds: { width: 2000, height: 1500 },
			origin: gridOrigin,
		});
		expect(p).toEqual(
			snapToGrid({ x: 200, y: 200 }, "square", 50, 1, gridOrigin),
		);
	});
});

describe("squareGridLines", () => {
	it("offset zero repete as linhas antigas, do canto até a borda", () => {
		expect(squareGridLines(200, 140, 70, ZERO_ORIGIN)).toEqual({
			xs: [0, 70, 140],
			ys: [0, 70, 140],
		});
	});

	it("offset 12/7 começa as linhas em 12 e 7", () => {
		expect(squareGridLines(200, 150, 50, { x: 12, y: 7 })).toEqual({
			xs: [12, 62, 112, 162],
			ys: [7, 57, 107],
		});
	});

	it("célula minúscula num mapa enorme não trava a aba", () => {
		const started = Date.now();
		const lines = squareGridLines(4096 * 8, 4096 * 8, 0.001);
		expect(Date.now() - started).toBeLessThan(50);
		expect(lines.xs.length).toBeLessThanOrEqual(4_000);
		expect(lines.ys.length).toBeLessThanOrEqual(4_000);
		expect(lines.xs.length).toBeGreaterThan(0);
	});
});

describe("centros de hex com origem", () => {
	it("hex pontudo sem offset inclui a origem e o vizinho ímpar", () => {
		const centers = pointyHexCenters(180, 180, 60, ZERO_ORIGIN);
		expect(centers).toContainEqual({ x: 0, y: 0 });
		const r = 30;
		const h = r * Math.sqrt(3);
		const odd = centers.find(
			(c) => Math.abs(c.x - 1.5 * r) < 1e-6 && Math.abs(c.y - h / 2) < 1e-6,
		);
		expect(odd).toBeDefined();
	});

	it("hex plano sem offset inclui a origem", () => {
		expect(flatHexCenters(180, 180, 60, ZERO_ORIGIN)).toContainEqual({
			x: 0,
			y: 0,
		});
	});

	it("mapa de 4096 px ampliado 8 vezes com célula de 10 px não trava", () => {
		const started = Date.now();
		const centers = pointyHexCenters(4096 * 8, 4096 * 8, 10);
		expect(Date.now() - started).toBeLessThan(50);
		expect(centers.length).toBeGreaterThan(0);
		expect(centers.length).toBeLessThanOrEqual(40_000);
	});

	it.each([
		["hex_pointy", pointyHexCenters],
		["hex_flat", flatHexCenters],
	] as const)("%s desloca o lattice pela origem", (_name, centersOf) => {
		const origin = { x: 12, y: 7 };
		const shifted = centersOf(180, 180, 60, origin);
		expect(
			shifted.some(
				(c) =>
					Math.abs(c.x - origin.x) < 1e-6 && Math.abs(c.y - origin.y) < 1e-6,
			),
		).toBe(true);
	});
});

describe("normalizeGridOffset", () => {
	it("fica em 0 <= offset < célula, como o CHECK da 0058", () => {
		const gridSize = 70;
		const samples = [-1, 0, 12, 69.999, 70, 80, 140, -0.01, Number.NaN];
		for (const value of samples) {
			const offset = normalizeGridOffset(value, gridSize);
			expect(offset).toBeGreaterThanOrEqual(0);
			expect(offset).toBeLessThan(gridSize);
		}
		expect(normalizeGridOffset(80, gridSize)).toBe(10);
		expect(normalizeGridOffset(-1, gridSize)).toBe(69);
		expect(normalizeGridOffset(gridSize, gridSize)).toBe(0);
		expect(normalizeGridOffset(12.345, 50)).toBe(12.35);
		expect(normalizeGridOffset(3, Number.NaN)).toBe(0);
		expect(normalizeGridOffset(3, 0)).toBe(0);
	});
});

describe("gridSizeFromCellCount", () => {
	it("contar 40×30 num mapa 2000×1500 dá célula de 50", () => {
		expect(gridSizeFromCellCount(2000, 1500, 40, 30, "square")).toBe(50);
	});

	it("rejeita contagem inválida", () => {
		expect(gridSizeFromCellCount(2000, 1500, 0, 30, "square")).toBeNull();
		expect(gridSizeFromCellCount(0, 1500, 40, 30, "square")).toBeNull();
	});
});

describe("régua com offset", () => {
	it("6 células a 1,5 m medem 9 m mesmo com o grid deslocado", () => {
		const gridOrigin = { x: 12, y: 7 };
		const cell = 50;
		const start = { x: gridOrigin.x, y: gridOrigin.y };
		const end = { x: gridOrigin.x + cell * 6, y: gridOrigin.y };
		const ticks = rulerTickPoints(
			start,
			end,
			cell,
			1.5,
			"m",
			"euclidean",
			gridOrigin,
		);
		expect(ticks).toHaveLength(6);
		expect(ticks[0]).toMatchObject({
			x: start.x + cell,
			y: start.y,
			distance: 1.5,
		});
		expect(ticks[5]?.distance).toBe(9);
	});
});
