// @vitest-environment jsdom
import type { Graphics } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import { drawWalls, selectedWallVertices, WALL_HANDLE_SIZE } from "./vtt-draw";

const walls = [
	{ id: "a", x1: 0, y1: 0, x2: 70, y2: 0 },
	{ id: "b", x1: 70, y1: 0, x2: 70, y2: 70 },
	{ id: "c", x1: 140, y1: 0, x2: 210, y2: 0 },
];

function fakeLayer() {
	const calls: string[] = [];
	const g = {
		clear: vi.fn(() => calls.push("clear")),
		moveTo: vi.fn(() => calls.push("moveTo")),
		lineTo: vi.fn(() => calls.push("lineTo")),
		rect: vi.fn(() => calls.push("rect")),
		circle: vi.fn(() => calls.push("circle")),
		stroke: vi.fn(() => calls.push("stroke")),
		fill: vi.fn(() => calls.push("fill")),
	};
	return { g: g as unknown as Graphics, raw: g, calls };
}

describe("handles das paredes selecionadas", () => {
	it("vértices sem repetir o ponto compartilhado", () => {
		expect(selectedWallVertices(walls, ["a", "b"])).toEqual([
			{ x: 0, y: 0 },
			{ x: 70, y: 0 },
			{ x: 70, y: 70 },
		]);
		expect(selectedWallVertices(walls, [])).toEqual([]);
	});

	it("sem seleção: nenhum handle", () => {
		const { g, raw } = fakeLayer();
		drawWalls(g, walls, []);
		expect(raw.rect).not.toHaveBeenCalled();
		expect(raw.stroke).toHaveBeenCalledTimes(1);
	});

	it("com seleção: um handle quadrado por vértice, centrado, e strokes fixos", () => {
		const { g, raw } = fakeLayer();
		drawWalls(g, walls, ["a", "b"]);
		const h = WALL_HANDLE_SIZE;
		expect(raw.rect).toHaveBeenCalledTimes(3);
		expect(raw.rect).toHaveBeenCalledWith(70 - h / 2, 70 - h / 2, h, h);
		// normais + selecionadas + borda dos handles: 3 strokes, 1 fill,
		// qualquer que seja o número de paredes.
		expect(raw.stroke).toHaveBeenCalledTimes(3);
		expect(raw.fill).toHaveBeenCalledTimes(1);
		// Handles não usam círculo (círculo é a prévia do desenho).
		expect(raw.circle).not.toHaveBeenCalled();
	});
});
