import { describe, expect, it } from "vitest";
import {
	easeOutCubic,
	STEP_TWEEN_MS,
	sampleStepTween,
	startStepTween,
	stepTweenDuration,
	tweenTargets,
} from "./step-tween";

describe("easeOutCubic", () => {
	it("começa em 0, termina em 1 e nunca passa dos limites", () => {
		expect(easeOutCubic(0)).toBe(0);
		expect(easeOutCubic(1)).toBe(1);
		expect(easeOutCubic(-3)).toBe(0);
		expect(easeOutCubic(7)).toBe(1);
	});

	it("é ease-out: anda mais no começo do que no fim", () => {
		expect(easeOutCubic(0.25)).toBeGreaterThan(0.25);
		expect(easeOutCubic(0.5) - easeOutCubic(0.25)).toBeGreaterThan(
			easeOutCubic(1) - easeOutCubic(0.75),
		);
	});
});

describe("stepTweenDuration", () => {
	it("some com prefers-reduced-motion", () => {
		expect(stepTweenDuration(true)).toBe(0);
		expect(stepTweenDuration(false)).toBe(STEP_TWEEN_MS);
		expect(STEP_TWEEN_MS).toBeGreaterThanOrEqual(80);
		expect(STEP_TWEEN_MS).toBeLessThanOrEqual(120);
	});
});

describe("startStepTween", () => {
	it("sem duração ou já no destino, não anima (posiciona direto)", () => {
		expect(startStepTween({ x: 0, y: 0 }, { x: 70, y: 0 }, 0, 0)).toBeNull();
		expect(startStepTween({ x: 70, y: 0 }, { x: 70, y: 0 }, 0, 100)).toBeNull();
	});

	it("parte da posição ATUAL do desenho (meio do passo anterior), não do destino antigo", () => {
		const first = startStepTween({ x: 0, y: 0 }, { x: 0, y: -70 }, 0, 100);
		if (!first) throw new Error("devia animar");
		const mid = sampleStepTween(first, 40);
		// vira para baixo no meio do passo: parte de onde o desenho está agora
		const second = startStepTween(mid, { x: 0, y: 0 }, 40, 100);
		if (!second) throw new Error("devia animar");
		expect(second.fromY).toBe(mid.y);
		expect(sampleStepTween(second, 40).y).toBe(mid.y);
		expect(sampleStepTween(second, 140).y).toBe(0);
	});
});

describe("sampleStepTween", () => {
	const tween = startStepTween({ x: 0, y: 0 }, { x: 70, y: 140 }, 1000, 100);
	if (!tween) throw new Error("devia animar");

	it("começa na origem, termina exatamente no destino e marca done", () => {
		expect(sampleStepTween(tween, 1000)).toEqual({ x: 0, y: 0, done: false });
		expect(sampleStepTween(tween, 1100)).toEqual({ x: 70, y: 140, done: true });
		expect(sampleStepTween(tween, 5000)).toEqual({ x: 70, y: 140, done: true });
	});

	it("nunca recua nem ultrapassa o destino no caminho", () => {
		let lastY = -1;
		for (let t = 1000; t <= 1100; t += 4) {
			const sample = sampleStepTween(tween, t);
			expect(sample.y).toBeGreaterThanOrEqual(lastY);
			expect(sample.y).toBeLessThanOrEqual(140);
			lastY = sample.y;
		}
	});

	it("o primeiro quadro (16 ms) não anda a casa inteira", () => {
		const first = sampleStepTween(tween, 1016);
		expect(first.y).toBeGreaterThan(0);
		expect(first.y).toBeLessThan(140 * 0.75);
	});
});

describe("tweenTargets", () => {
	it("só vale para o destino para o qual foi criado", () => {
		const tween = startStepTween({ x: 0, y: 0 }, { x: 70, y: 0 }, 0, 100);
		if (!tween) throw new Error("devia animar");
		expect(tweenTargets(tween, { x: 70, y: 0 })).toBe(true);
		expect(tweenTargets(tween, { x: 70, y: 70 })).toBe(false);
	});
});
