import { describe, expect, it } from "vitest";
import { convertDistance, formatSpeed } from "./units";

describe("convertDistance (convenção do D&D)", () => {
	it("30 pés são 9 metros e 6 quadrados", () => {
		expect(convertDistance(30, "ft", "m")).toBeCloseTo(9, 10);
		expect(convertDistance(30, "ft", "sq")).toBe(6);
		expect(convertDistance(30, "ft", "ft")).toBe(30);
	});

	it("9 metros são 30 pés e 6 quadrados", () => {
		expect(convertDistance(9, "m", "ft")).toBeCloseTo(30, 10);
		expect(convertDistance(9, "m", "sq")).toBeCloseTo(6, 10);
		expect(convertDistance(9, "m", "m")).toBe(9);
	});

	it("5 pés = 1,5 m = 1 quadrado", () => {
		expect(convertDistance(5, "ft", "m")).toBeCloseTo(1.5, 10);
		expect(convertDistance(1.5, "m", "sq")).toBeCloseTo(1, 10);
	});

	it("unidade da ficha desconhecida ou valor inválido não converte", () => {
		expect(convertDistance(30, "casas", "m")).toBeNull();
		expect(convertDistance(Number.NaN, "ft", "m")).toBeNull();
	});
});

describe("formatSpeed", () => {
	it("a ficha em pés aparece em metros quando a cena é em metros", () => {
		expect(formatSpeed(30, "ft", "m")).toBe("9m");
	});

	it("a ficha em metros aparece em pés quando a cena é em pés", () => {
		expect(formatSpeed(9, "m", "ft")).toBe("30ft");
	});

	it("em quadrados", () => {
		expect(formatSpeed(30, "ft", "sq")).toBe("6sq");
		expect(formatSpeed(9, "m", "sq")).toBe("6sq");
	});

	it("mesma unidade não muda o número", () => {
		expect(formatSpeed(30, "ft", "ft")).toBe("30ft");
		expect(formatSpeed(9, "m", "m")).toBe("9m");
	});

	it("sem cena (ficha fora da mesa) mostra como a ficha guarda", () => {
		expect(formatSpeed(30, "ft")).toBe("30ft");
		expect(formatSpeed(30, "ft", null)).toBe("30ft");
		expect(formatSpeed(30, "ft", undefined)).toBe("30ft");
	});

	it("unidade da cena inválida ou da ficha desconhecida mostra como está", () => {
		expect(formatSpeed(30, "ft", "xx")).toBe("30ft");
		expect(formatSpeed(6, "casas", "m")).toBe("6casas");
	});

	it("arredonda em uma casa decimal sem zero à direita", () => {
		expect(formatSpeed(35, "ft", "m")).toBe("10.5m");
		expect(formatSpeed(33, "ft", "m")).toBe("9.9m");
		expect(formatSpeed(31, "ft", "m")).toBe("9.3m");
	});

	it("bônus com sinal: botas +10 pés viram +3m", () => {
		expect(formatSpeed(10, "ft", "m", { signed: true })).toBe("+3m");
		expect(formatSpeed(-10, "ft", "m", { signed: true })).toBe("-3m");
		expect(formatSpeed(0, "ft", "m", { signed: true })).toBe("0m");
	});

	it("sem 'signed' o positivo não leva sinal", () => {
		expect(formatSpeed(10, "ft", "m")).toBe("3m");
	});
});
