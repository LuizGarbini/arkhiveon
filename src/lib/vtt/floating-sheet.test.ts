import { describe, expect, it } from "vitest";
import {
	clampMiniPos,
	clampSheetRect,
	defaultSheetRect,
	dockMiniPos,
	loadSheetMini,
	loadSheetRect,
	moveMiniPos,
	nextDockPos,
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

describe("doca de cartões minimizados sem limite", () => {
	const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
		Math.abs(a.x - b.x) < SHEET_MINI_W - 4 &&
		Math.abs(a.y - b.y) < SHEET_MINI_H - 4;

	it("as vagas sobem e, com a coluna cheia, seguem numa coluna nova à direita", () => {
		// 900 de altura: (900 - 128 - 16 + 8) / 68 = 11 cartões por coluna
		const lastOfFirstColumn = dockMiniPos(10, 1440, 900);
		const firstOfSecondColumn = dockMiniPos(11, 1440, 900);
		expect(lastOfFirstColumn.x).toBe(72);
		expect(firstOfSecondColumn.x).toBe(72 + SHEET_MINI_W + 8);
		expect(firstOfSecondColumn.y).toBe(dockMiniPos(0, 1440, 900).y);
	});

	it("40 vagas seguidas, até onde a tela comporta, não se sobrepõem e ficam na tela", () => {
		const slots = Array.from({ length: 33 }, (_, s) =>
			dockMiniPos(s, 1440, 900),
		);
		for (const p of slots) {
			expect(p.y).toBeGreaterThanOrEqual(8);
			expect(p.x + SHEET_MINI_W).toBeLessThanOrEqual(1440);
		}
		for (let i = 0; i < slots.length; i++)
			for (let j = i + 1; j < slots.length; j++)
				expect(
					overlap(slots[i] as never, slots[j] as never),
					`${i} x ${j}`,
				).toBe(false);
	});

	it("tela baixa: pelo menos 1 por coluna, sem travar", () => {
		const p = dockMiniPos(3, 800, 220);
		expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
	});

	it("nextDockPos: sem ninguém, a primeira vaga", () => {
		expect(nextDockPos([], 1440, 900)).toEqual(dockMiniPos(0, 1440, 900));
	});

	it("nextDockPos pula as vagas ocupadas, mesmo fora de ordem", () => {
		const taken = [dockMiniPos(0, 1440, 900), dockMiniPos(2, 1440, 900)];
		expect(nextDockPos(taken, 1440, 900)).toEqual(dockMiniPos(1, 1440, 900));
		const more = [...taken, dockMiniPos(1, 1440, 900)];
		expect(nextDockPos(more, 1440, 900)).toEqual(dockMiniPos(3, 1440, 900));
	});

	it("respeita um cartão que o mestre arrastou para uma vaga", () => {
		const dragged = {
			x: dockMiniPos(0, 1440, 900).x + 10,
			y: dockMiniPos(0, 1440, 900).y - 5,
		};
		const pos = nextDockPos([dragged], 1440, 900);
		expect(overlap(pos, dragged)).toBe(false);
	});

	it("preenche a coluna e passa para a seguinte conforme ocupa", () => {
		const occupied: { x: number; y: number }[] = [];
		for (let i = 0; i < 25; i++)
			occupied.push(nextDockPos(occupied, 1440, 900));
		const xs = new Set(occupied.map((p) => p.x));
		expect(xs.size).toBe(3);
		for (let i = 0; i < occupied.length; i++)
			for (let j = i + 1; j < occupied.length; j++)
				expect(overlap(occupied[i] as never, occupied[j] as never)).toBe(false);
	});

	it("tela cheia de cartões: ainda devolve uma posição válida (não quebra)", () => {
		const occupied: { x: number; y: number }[] = [];
		for (let i = 0; i < 80; i++)
			occupied.push(nextDockPos(occupied, 1440, 900));
		const p = nextDockPos(occupied, 1440, 900);
		expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
	});
});

describe("cascata das janelas abertas", () => {
	it("a cascata recomeça depois de 8 janelas (não se acumula no canto)", () => {
		const first = defaultSheetRect(0, 1440, 900);
		const ninth = defaultSheetRect(8, 1440, 900);
		expect(ninth.x).toBe(first.x);
		expect(ninth.y).toBe(first.y);
		const second = defaultSheetRect(1, 1440, 900);
		expect(second.x).toBeGreaterThan(first.x);
		expect(second.y).toBeGreaterThan(first.y);
	});
});
