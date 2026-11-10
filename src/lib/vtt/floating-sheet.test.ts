import { describe, expect, it } from "vitest";
import {
	clampMiniPos,
	clampSheetRect,
	defaultSheetRect,
	dockMiniPos,
	loadSheetMini,
	loadSheetRect,
	moveMiniPos,
	SHEET_DEFAULT_X,
	SHEET_MIN_W,
	SHEET_MINI_H,
	SHEET_MINI_W,
	saveSheetMini,
} from "./floating-sheet";

describe("ficha minimizada", () => {
	it("a doca empilha os cartões de baixo para cima, à direita da toolbar", () => {
		const first = dockMiniPos(0, 1440, 900);
		const second = dockMiniPos(1, 1440, 900);
		expect(first).toEqual({ x: 72, y: 900 - 16 - SHEET_MINI_H });
		expect(second.x).toBe(first.x);
		expect(first.y - second.y).toBe(SHEET_MINI_H + 8);
	});

	it("o cartão vai até a borda pela medida dele", () => {
		const r = moveMiniPos({ x: 1000, y: 120 }, 900, 900, 1440, 900);
		expect(r.x).toBe(1440 - SHEET_MINI_W - 8);
		expect(r.y).toBe(900 - SHEET_MINI_H - 8);
		expect(clampMiniPos({ x: -50, y: -50 }, 1440, 900)).toEqual({ x: 8, y: 8 });
	});

	it("lembra a posição do cartão neste navegador; restaurar apaga", () => {
		const data = new Map<string, string>();
		const storage = {
			getItem: (k: string) => data.get(k) ?? null,
			setItem: (k: string, v: string) => void data.set(k, v),
			removeItem: (k: string) => void data.delete(k),
		};
		expect(loadSheetMini("k", storage)).toBeNull();
		saveSheetMini("k", { x: 72, y: 800 }, storage);
		expect(loadSheetMini("k", storage)).toEqual({ x: 72, y: 800 });
		saveSheetMini("k", null, storage);
		expect(loadSheetMini("k", storage)).toBeNull();
		data.set("k:min", "{x");
		expect(loadSheetMini("k", storage)).toBeNull();
	});
});

describe("geometria da ficha flutuante", () => {
	it("abre à esquerda (a direita é do chat) e em cascata", () => {
		const a = defaultSheetRect(0, 1440, 900);
		const b = defaultSheetRect(1, 1440, 900);
		expect(a.x).toBe(SHEET_DEFAULT_X);
		expect(b.x).toBeGreaterThan(a.x);
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
