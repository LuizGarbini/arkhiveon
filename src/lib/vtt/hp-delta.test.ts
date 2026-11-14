import { describe, expect, it } from "vitest";
import { planHpDelta } from "./hp-delta";

const base = { current: 20, max: 30, temp: 0, canTemp: true };

describe("planHpDelta", () => {
	it("cura soma, mas não passa do máximo", () => {
		expect(planHpDelta(5, base)).toEqual({ current: 25 });
		expect(planHpDelta(5, { ...base, current: 28 })).toEqual({ current: 30 });
	});

	it("sem máximo definido, a cura soma direto", () => {
		expect(planHpDelta(5, { ...base, max: 0 })).toEqual({ current: 25 });
	});

	it("dano tira do PV e nunca fica negativo", () => {
		expect(planHpDelta(-5, base)).toEqual({ current: 15 });
		expect(planHpDelta(-5, { ...base, current: 3 })).toEqual({ current: 0 });
	});

	it("a vida temporária absorve o dano primeiro", () => {
		expect(planHpDelta(-5, { ...base, temp: 15 })).toEqual({ temp: 10 });
		expect(planHpDelta(-1, { ...base, temp: 1 })).toEqual({ temp: 0 });
	});

	it("dano maior que a temporária zera ela e o resto vai no PV", () => {
		expect(planHpDelta(-5, { ...base, temp: 2 })).toEqual({
			temp: 0,
			current: 17,
		});
	});

	it("sem como gravar a temporária, o dano vai direto no PV", () => {
		expect(planHpDelta(-5, { ...base, temp: 15, canTemp: false })).toEqual({
			current: 15,
		});
	});

	it("cura não mexe na vida temporária", () => {
		expect(planHpDelta(1, { ...base, temp: 15 })).toEqual({ current: 21 });
	});
});
