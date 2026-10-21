import { describe, expect, it } from "vitest";
import {
	clampSheetRect,
	defaultSheetRect,
	loadSheetRect,
	SHEET_MIN_W,
} from "./floating-sheet";

describe("geometria da ficha flutuante", () => {
	it("cascata: cada ficha nova abre um pouco deslocada", () => {
		const a = defaultSheetRect(0, 1440, 900);
		const b = defaultSheetRect(1, 1440, 900);
		expect(b.x).toBeLessThan(a.x);
		expect(b.y).toBeGreaterThan(a.y);
	});
	it("janela pequena: cabe dentro, respeitando o mínimo", () => {
		const r = clampSheetRect({ x: 900, y: 900, w: 100, h: 5000 }, 800, 600);
		expect(r.w).toBe(SHEET_MIN_W);
		expect(r.x + r.w).toBeLessThanOrEqual(800 - 8);
		expect(r.y).toBe(8);
		expect(r.h).toBe(600 - 16);
	});
	it("localStorage inválido é ignorado", () => {
		const store = (v: string | null) => ({ getItem: () => v });
		expect(loadSheetRect("k", store("{x"))).toBeNull();
		expect(loadSheetRect("k", store('{"x":1}'))).toBeNull();
		expect(loadSheetRect("k", store('{"x":1,"y":2,"w":3,"h":4}'))).toEqual({
			x: 1,
			y: 2,
			w: 3,
			h: 4,
		});
	});
});
