// @vitest-environment jsdom
import type { Graphics } from "pixi.js";
import { describe, expect, it, vi } from "vitest";
import {
	drawWallPreview,
	drawWalls,
	selectedWallVertices,
	WALL_HANDLE_SIZE,
	WALL_PREVIEW_TOKEN,
} from "./vtt-draw";

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

describe("cor da prévia do desenho", () => {
	it("vem do token do DS (lido no body, onde fica o .dark), não de um azul fixo", () => {
		const fill = vi.fn();
		const getContext = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockImplementation((() => ({
				fillRect: fill,
				set fillStyle(v: string) {
					fill(v);
				},
				getImageData: () => ({ data: [0x12, 0x34, 0x56, 255] }),
			})) as unknown as HTMLCanvasElement["getContext"]);
		document.body.style.setProperty(WALL_PREVIEW_TOKEN, "oklch(0.79 0.1 290)");
		const { g, raw } = fakeLayer();
		drawWallPreview(
			g,
			[
				{ x: 0, y: 0 },
				{ x: 70, y: 0 },
			],
			{ x: 140, y: 0 },
		);
		expect(WALL_PREVIEW_TOKEN).toBe("--chart-1");
		expect(fill).toHaveBeenCalledWith("oklch(0.79 0.1 290)");
		const colors = [
			...(raw.stroke.mock.calls as unknown as [{ color: number }][]).map(
				(c) => c[0].color,
			),
			...(raw.fill.mock.calls as unknown as [{ color: number }][]).map(
				(c) => c[0].color,
			),
		];
		expect(colors.length).toBe(3);
		for (const c of colors) {
			expect(c).toBe(0x123456);
			expect(c).not.toBe(0x38bdf8);
		}
		document.body.style.removeProperty(WALL_PREVIEW_TOKEN);
		getContext.mockRestore();
	});
});
