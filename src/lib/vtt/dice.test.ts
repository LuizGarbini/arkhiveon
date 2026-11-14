import { describe, expect, it } from "vitest";
import { parseDiceFormula, rollDiceLocally, tryParseDiceFormula } from "./dice";

describe("parseDiceFormula", () => {
	it("aceita XdY+Z e devolve a forma canônica", () => {
		expect(parseDiceFormula("2d6+3")).toEqual({
			count: 2,
			faces: 6,
			modifier: 3,
			formula: "2d6+3",
			pools: [{ count: 2, faces: 6 }],
		});
		expect(parseDiceFormula("  2D6 + 0 ").formula).toBe("2d6");
		expect(parseDiceFormula("d20")).toEqual({
			count: 1,
			faces: 20,
			modifier: 0,
			formula: "1d20",
			pools: [{ count: 1, faces: 20 }],
		});
		expect(parseDiceFormula("1d20-1")).toMatchObject({
			modifier: -1,
			formula: "1d20-1",
		});
		expect(parseDiceFormula("100d2").formula).toBe("100d2");
		expect(parseDiceFormula("1d1000").formula).toBe("1d1000");
		expect(parseDiceFormula("1d20+1000000").modifier).toBe(1_000_000);
		expect(parseDiceFormula("1d20-1000000").modifier).toBe(-1_000_000);
	});

	it("recusa o que o servidor também recusa", () => {
		const invalid = [
			"",
			"   ",
			"101d6",
			"0d6",
			"1d1",
			"1d1001",
			"2d6+1000001",
			"2d6-1000001",
			"delete",
			"2d6+3=18",
			"1d20;",
		];
		for (const formula of invalid) {
			expect(tryParseDiceFormula(formula), formula).toBeNull();
			expect(() => parseDiceFormula(formula)).toThrow();
		}
	});

	it("aceita fórmula mesclada sem achatar os dados", () => {
		expect(parseDiceFormula("1d8+1d6+3")).toEqual({
			count: 2,
			faces: 8,
			modifier: 3,
			formula: "1d8+1d6+3",
			pools: [
				{ count: 1, faces: 8 },
				{ count: 1, faces: 6 },
			],
		});
		expect(parseDiceFormula("2d6+1d4").formula).toBe("2d6+1d4");
	});

	it("não sorteia valor", () => {
		const parsed = parseDiceFormula("1d20+5");
		expect(parsed).not.toHaveProperty("total");
		expect(parsed).not.toHaveProperty("rolls");
	});
});

describe("rollDiceLocally", () => {
	it("soma os dados e o modificador", () => {
		// rng 0 → 1 em todo dado; 0.999 → o máximo
		expect(rollDiceLocally("1d6+6", () => 0)?.total).toBe(7);
		expect(rollDiceLocally("1d6+6", () => 0.999)?.total).toBe(12);
		expect(rollDiceLocally("2d6+3", () => 0.999)).toMatchObject({
			total: 15,
			rolls: [6, 6],
		});
	});

	it("aceita dados de tipos diferentes e modificador negativo", () => {
		const r = rollDiceLocally("1d8+1d4-1", () => 0.999);
		expect(r).toMatchObject({ rolls: [8, 4], total: 11 });
	});

	it("fórmula inválida devolve null, sem lançar", () => {
		expect(rollDiceLocally("banana")).toBeNull();
		expect(rollDiceLocally("")).toBeNull();
	});

	it("rng fora de [0,1) ou inválido não gera dado impossível", () => {
		const r = rollDiceLocally("1d20", () => 5);
		expect(r?.rolls[0]).toBeGreaterThanOrEqual(1);
		expect(r?.rolls[0]).toBeLessThanOrEqual(20);
		expect(rollDiceLocally("1d20", () => Number.NaN)?.rolls[0]).toBe(1);
	});

	it("devolve a fórmula canônica", () => {
		expect(rollDiceLocally("2D6 + 3")?.formula).toBe("2d6+3");
	});
});
