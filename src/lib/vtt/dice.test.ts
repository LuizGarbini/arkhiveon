import { describe, expect, it } from "vitest";
import { parseDiceFormula, tryParseDiceFormula } from "./dice";

describe("parseDiceFormula", () => {
	it("aceita XdY+Z e devolve a forma canônica", () => {
		expect(parseDiceFormula("2d6+3")).toEqual({
			count: 2,
			faces: 6,
			modifier: 3,
			formula: "2d6+3",
		});
		expect(parseDiceFormula("  2D6 + 0 ").formula).toBe("2d6");
		expect(parseDiceFormula("d20")).toEqual({
			count: 1,
			faces: 20,
			modifier: 0,
			formula: "1d20",
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
			"2d6+1d4",
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

	it("não sorteia valor", () => {
		const parsed = parseDiceFormula("1d20+5");
		expect(parsed).not.toHaveProperty("total");
		expect(parsed).not.toHaveProperty("rolls");
	});
});
