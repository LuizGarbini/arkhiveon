import { describe, expect, it } from "vitest";
import {
	pointInPolygon,
	templatePolygon,
	templateReachCells,
} from "./template-math";

const origin = { x: 0, y: 0 };
const cell = 70;

describe("templateReachCells", () => {
	it("rounds the drag length to whole grid cells", () => {
		expect(templateReachCells(origin, { x: cell * 4, y: 0 }, cell)).toBe(4);
		expect(templateReachCells(origin, { x: cell * 2.4, y: 0 }, cell)).toBe(2);
	});

	it("never returns less than 1 cell once the pointer has moved", () => {
		expect(templateReachCells(origin, { x: 10, y: 0 }, cell)).toBe(1);
	});
});

describe("templatePolygon", () => {
	it("builds a 15° cone that covers a cell on the aim line but not a cell 45° off", () => {
		const polygon = templatePolygon(
			"cone15",
			origin,
			{ x: cell * 6, y: 0 },
			cell,
		);
		expect(pointInPolygon({ x: cell * 4, y: 0 }, polygon)).toBe(true);
		expect(pointInPolygon({ x: cell * 4, y: cell * 4 }, polygon)).toBe(false);
	});

	it("builds a 60° cone wide enough to include a cell 30° off the aim line", () => {
		const polygon = templatePolygon(
			"cone60",
			origin,
			{ x: cell * 6, y: 0 },
			cell,
		);
		const thirtyDeg = {
			x: cell * 4 * Math.cos(Math.PI / 6),
			y: cell * 4 * Math.sin(Math.PI / 6),
		};
		expect(pointInPolygon(thirtyDeg, polygon)).toBe(true);
	});

	it("builds a sphere whose radius equals the dragged cell count", () => {
		const polygon = templatePolygon(
			"sphere",
			origin,
			{ x: cell * 3, y: 0 },
			cell,
		);
		expect(pointInPolygon({ x: cell * 2, y: 0 }, polygon)).toBe(true);
		expect(pointInPolygon({ x: cell * 4, y: 0 }, polygon)).toBe(false);
	});

	it("builds a 5-ft-wide lightning line along the drag", () => {
		const polygon = templatePolygon(
			"line",
			origin,
			{ x: cell * 8, y: 0 },
			cell,
		);
		expect(pointInPolygon({ x: cell * 4, y: 0 }, polygon)).toBe(true);
		expect(pointInPolygon({ x: cell * 4, y: cell * 2 }, polygon)).toBe(false);
	});

	it("builds an axis-aligned cube from the origin toward the drag", () => {
		const polygon = templatePolygon(
			"cube",
			origin,
			{ x: cell * 3, y: cell },
			cell,
		);
		expect(pointInPolygon({ x: cell * 1.5, y: cell * 1.5 }, polygon)).toBe(
			true,
		);
		expect(pointInPolygon({ x: -cell, y: -cell }, polygon)).toBe(false);
	});
});
