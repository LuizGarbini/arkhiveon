import { describe, expect, it } from "vitest";
import {
	normalizeRotation,
	planRotation,
	pointerHitsRotateHandle,
	pointerHitsRotateHandleWorld,
	ROTATE_FINE_STEP_DEGREES,
	ROTATE_HANDLE_HIT_PX,
	ROTATE_STEP_DEGREES,
	rotateHandleDistance,
	rotateHandleHitRadius,
	rotationDelta,
	rotationFromLocalPointer,
	steeredRotation,
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

describe("alça de giro", () => {
	const radius = 35;
	const dist = rotateHandleDistance(radius);

	it("a alça fica fora do disco, na direção que o token olha", () => {
		expect(dist).toBeGreaterThan(radius);
		expect(pointerHitsRotateHandle(0, -dist, 0, radius, 22)).toBe(true);
		expect(pointerHitsRotateHandle(dist, 0, 90, radius, 22)).toBe(true);
		expect(pointerHitsRotateHandle(0, dist, 180, radius, 22)).toBe(true);
		expect(pointerHitsRotateHandle(-dist, 0, 270, radius, 22)).toBe(true);
	});

	it("o centro do token e o vazio do mapa não são a alça", () => {
		expect(pointerHitsRotateHandle(0, 0, 0, radius, 22)).toBe(false);
		expect(pointerHitsRotateHandle(0, -radius, 0, radius, 8)).toBe(false);
		expect(pointerHitsRotateHandle(400, 400, 0, radius, 22)).toBe(false);
		expect(pointerHitsRotateHandle(0, -dist, 0, 0, 22)).toBe(false);
		expect(pointerHitsRotateHandle(Number.NaN, 0, 0, radius, 22)).toBe(false);
	});

	it("no mapa, o alvo tem 44px de tela e acompanha o zoom", () => {
		expect(ROTATE_HANDLE_HIT_PX).toBe(22);
		expect(rotateHandleHitRadius(1)).toBe(22);
		expect(rotateHandleHitRadius(0.5)).toBe(44);
		expect(rotateHandleHitRadius(0)).toBe(22);
		const token = { x: 175, y: 315, rotation: 0, sizeCells: 1 };
		expect(
			pointerHitsRotateHandleWorld(token, { x: 175, y: 315 - dist }, 70, 1),
		).toBe(true);
		expect(pointerHitsRotateHandleWorld(token, { x: 175, y: 315 }, 70, 1)).toBe(
			false,
		);
		expect(
			pointerHitsRotateHandleWorld(token, { x: 175, y: 315 - dist }, 0, 1),
		).toBe(false);
	});

	it("o ângulo do dedo: cima 0, direita 90, baixo 180, esquerda 270", () => {
		expect(rotationFromLocalPointer(0, -10)).toBe(0);
		expect(rotationFromLocalPointer(10, 0)).toBe(90);
		expect(rotationFromLocalPointer(0, 10)).toBe(180);
		expect(rotationFromLocalPointer(-10, 0)).toBe(270);
		expect(rotationFromLocalPointer(0, 0)).toBeNull();
		expect(rotationFromLocalPointer(Number.NaN, 1)).toBeNull();
	});

	it("gruda em 15° e 45° quando chega perto, e fica livre no meio", () => {
		expect(steeredRotation(0)).toBe(0);
		expect(steeredRotation(4)).toBe(0);
		expect(steeredRotation(5)).toBe(0);
		expect(steeredRotation(6)).toBe(6);
		expect(steeredRotation(9)).toBe(9);
		expect(steeredRotation(10)).toBe(15);
		expect(steeredRotation(12)).toBe(15);
		expect(steeredRotation(45)).toBe(45);
		expect(steeredRotation(90.4)).toBe(90);
		expect(steeredRotation(359)).toBe(0);
		expect(steeredRotation(-3)).toBe(0);
		expect(steeredRotation(Number.NaN)).toBe(0);
	});

	it("girar a alça de um token gira o grupo pelo mesmo tanto, sem mudar a conta de lugar", () => {
		const start = [
			{ id: "a", rotation: 0 },
			{ id: "b", rotation: 20 },
		];
		const next = steeredRotation(rotationFromLocalPointer(10, 0) ?? 0);
		const delta = next - (start[0]?.rotation ?? 0);
		expect(planRotation(start, delta)).toEqual([
			{ id: "a", rotation: 90 },
			{ id: "b", rotation: 110 },
		]);
	});
});
