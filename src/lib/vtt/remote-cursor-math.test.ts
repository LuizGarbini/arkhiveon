import { describe, expect, it } from "vitest";
import {
	chipBox,
	chipLabel,
	cursorOpacity,
	cursorScale,
	shouldTeleport,
	smoothStep,
} from "./remote-cursor-math";

describe("tamanho do cursor com o zoom", () => {
	it("zoom 1 é o tamanho normal", () => {
		expect(cursorScale(1)).toBe(1);
	});

	it("aproximando, o cursor encolhe no mundo mas cresce pouco na tela", () => {
		const world = cursorScale(2);
		expect(world).toBeLessThan(1);
		// Na tela (mundo × zoom) cresce, mas bem menos que o zoom (2×).
		expect(world * 2).toBeGreaterThan(1);
		expect(world * 2).toBeLessThan(1.6);
	});

	it("afastando, o cursor cresce no mundo e não vira um ponto", () => {
		expect(cursorScale(0.25) * 0.25).toBeGreaterThan(0.4);
		expect(cursorScale(0.5)).toBeGreaterThan(1);
	});

	it("tem limites e aguenta valor ruim", () => {
		expect(cursorScale(100)).toBe(0.5);
		expect(cursorScale(0.0001)).toBe(2.5);
		for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			const value = cursorScale(bad);
			expect(value).toBeGreaterThanOrEqual(0.5);
			expect(value).toBeLessThanOrEqual(2.5);
		}
	});
});

describe("suavizado do movimento", () => {
	it("anda em direção ao alvo sem passar dele", () => {
		let x = 0;
		for (let i = 0; i < 20; i++) {
			const next = smoothStep(x, 100, 16);
			expect(next).toBeGreaterThan(x - 1e-9);
			expect(next).toBeLessThanOrEqual(100);
			x = next;
		}
		expect(x).toBeGreaterThan(95);
	});

	it("independe da taxa de quadros: 60 Hz e 120 Hz chegam no mesmo ponto", () => {
		let a = 0;
		let b = 0;
		for (let i = 0; i < 6; i++) a = smoothStep(a, 100, 1000 / 60);
		for (let i = 0; i < 12; i++) b = smoothStep(b, 100, 1000 / 120);
		expect(Math.abs(a - b)).toBeLessThan(0.5);
	});

	it("perto o bastante encaixa no alvo (o ticker pode parar)", () => {
		expect(smoothStep(99.98, 100, 16)).toBe(100);
		expect(smoothStep(5, 5, 16)).toBe(5);
	});

	it("tempo zero ou negativo não anda nem volta", () => {
		expect(smoothStep(0, 100, 0)).toBe(0);
		expect(smoothStep(0, 100, -50)).toBe(0);
	});

	it("salto grande teleporta; movimento normal desliza", () => {
		expect(shouldTeleport(null, { x: 5, y: 5 })).toBe(true);
		expect(shouldTeleport({ x: 0, y: 0 }, { x: 50, y: 40 })).toBe(false);
		expect(shouldTeleport({ x: 0, y: 0 }, { x: 2000, y: 0 })).toBe(true);
	});
});

describe("cursor parado some aos poucos", () => {
	it("cheio enquanto se mexe, some em 10 a 12 s sem mexer", () => {
		expect(cursorOpacity(0)).toBe(1);
		expect(cursorOpacity(9_999)).toBe(1);
		expect(cursorOpacity(11_000)).toBeCloseTo(0.5);
		expect(cursorOpacity(12_000)).toBe(0);
		expect(cursorOpacity(60_000)).toBe(0);
	});
});

describe("etiqueta com o nome", () => {
	it("nome curto fica inteiro", () => {
		expect(chipLabel("  Ana  ")).toBe("Ana");
	});

	it("nome longo é cortado com reticências, sem quebrar emoji", () => {
		const label = chipLabel("Aventureiro Muito Mas Muito Longo da Silva");
		expect(Array.from(label)).toHaveLength(20);
		expect(label.endsWith("…")).toBe(true);
		const emoji = chipLabel("🐉".repeat(30));
		expect(Array.from(emoji)).toHaveLength(20);
		expect(emoji).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
	});

	it("a caixa envolve o texto com folga e cantos arredondados", () => {
		const box = chipBox(40, 12);
		expect(box.width).toBe(54);
		expect(box.height).toBe(18);
		expect(box.radius).toBe(9);
	});
});
