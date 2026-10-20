import { describe, expect, it } from "vitest";
import { characterAttributeScore } from "./ability-scores";

const KEYS = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
] as const;

describe("characterAttributeScore", () => {
	it("ficha antiga com tudo 0 → 10 (como a ficha exibe)", () => {
		const old = Object.fromEntries(KEYS.map((k) => [k, 0]));
		for (const k of KEYS) expect(characterAttributeScore(old, k)).toBe(10);
	});

	it("ausente, null, vazio ou inválido → 10", () => {
		const c = { strength: null, dexterity: "", constitution: "abc" };
		expect(characterAttributeScore(c, "strength")).toBe(10);
		expect(characterAttributeScore(c, "dexterity")).toBe(10);
		expect(characterAttributeScore(c, "constitution")).toBe(10);
		expect(characterAttributeScore({}, "wisdom")).toBe(10);
	});

	it("ficha nova devolve cada valor distinto", () => {
		const c = {
			strength: 8,
			dexterity: 14,
			constitution: 12,
			intelligence: 18,
			wisdom: 10,
			charisma: 3,
		};
		expect(KEYS.map((k) => characterAttributeScore(c, k))).toEqual([
			8, 14, 12, 18, 10, 3,
		]);
	});

	it("string numérica vira número", () => {
		expect(characterAttributeScore({ strength: "15" }, "strength")).toBe(15);
	});

	it("chaves padrão extras e systemAttributes", () => {
		expect(characterAttributeScore({ power: 65 }, "power")).toBe(65);
		expect(
			characterAttributeScore({ systemAttributes: { agility: 7 } }, "agility"),
		).toBe(7);
		expect(
			characterAttributeScore({ systemAttributes: { agility: 0 } }, "agility"),
		).toBe(10);
		expect(characterAttributeScore({}, "agility")).toBe(10);
	});
});
