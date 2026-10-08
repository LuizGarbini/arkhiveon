import { describe, expect, it } from "vitest";
import { calculateGridDistance, rulerTickPoints } from "./grid-math";

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
