import { describe, expect, it } from "vitest";
import {
	normalizeRotation,
	planRotation,
	ROTATE_FINE_STEP_DEGREES,
	ROTATE_STEP_DEGREES,
	rotationDelta,
} from "./token-rotate";

describe("rotationDelta", () => {
	it("E gira para a direita e Q para a esquerda, 45° por toque", () => {
		expect(rotationDelta("e", false)).toBe(45);
		expect(rotationDelta("q", false)).toBe(-45);
		expect(ROTATE_STEP_DEGREES).toBe(45);
	});

	it("Shift gira 15° (acerto fino); maiúscula, que é como a tecla chega com Shift, vale igual", () => {
		expect(rotationDelta("E", true)).toBe(15);
		expect(rotationDelta("Q", true)).toBe(-15);
		expect(ROTATE_FINE_STEP_DEGREES).toBe(15);
		expect(rotationDelta("E", false)).toBe(45);
	});

	it("outras teclas não giram", () => {
		for (const k of ["a", "w", "r", "Enter", "ArrowLeft", " ", "", "ee"]) {
			expect(rotationDelta(k, false)).toBeNull();
			expect(rotationDelta(k, true)).toBeNull();
		}
	});
});

describe("normalizeRotation", () => {
	it("mantém entre 0 e 359, também com negativos e voltas inteiras", () => {
		expect(normalizeRotation(0)).toBe(0);
		expect(normalizeRotation(359)).toBe(359);
		expect(normalizeRotation(360)).toBe(0);
		expect(normalizeRotation(405)).toBe(45);
		expect(normalizeRotation(-45)).toBe(315);
		expect(normalizeRotation(-360)).toBe(0);
		expect(normalizeRotation(-725)).toBe(355);
	});

	it("arredonda para inteiro", () => {
		expect(normalizeRotation(44.6)).toBe(45);
		expect(normalizeRotation(-0.4)).toBe(0);
	});
});

describe("planRotation", () => {
	it("cada token gira pelo mesmo tanto a partir do seu próprio ângulo", () => {
		expect(
			planRotation(
				[
					{ id: "a", rotation: 0 },
					{ id: "b", rotation: 90 },
					{ id: "c", rotation: 270 },
				],
				45,
			),
		).toEqual([
			{ id: "a", rotation: 45 },
			{ id: "b", rotation: 135 },
			{ id: "c", rotation: 315 },
		]);
	});

	it("dá a volta em 360 nos dois sentidos", () => {
		expect(planRotation([{ id: "a", rotation: 315 }], 45)[0]?.rotation).toBe(0);
		expect(planRotation([{ id: "a", rotation: 0 }], -45)[0]?.rotation).toBe(
			315,
		);
	});

	it("token sem ângulo conta como 0", () => {
		expect(
			planRotation([{ id: "a" }, { id: "b", rotation: null }], 45).map(
				(m) => m.rotation,
			),
		).toEqual([45, 45]);
	});

	it("oito toques de 45° voltam ao ângulo de partida", () => {
		let rotation = 90;
		for (let i = 0; i < 8; i++)
			rotation = planRotation([{ id: "a", rotation }], 45)[0]?.rotation ?? 0;
		expect(rotation).toBe(90);
	});

	it("lista vazia: nada", () => {
		expect(planRotation([], 45)).toEqual([]);
	});
});
