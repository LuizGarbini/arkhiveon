import { describe, expect, it } from "vitest";
import {
	conditionSelectOptions,
	DND_5E_CONDITION_KEYS,
	DND_5E_CONDITIONS,
	firstUnusedConditionKey,
	isDnDConditionKey,
	matchDnDCondition,
} from "./conditions";

describe("condições oficiais D&D 5e", () => {
	it("tem as 14 do apêndice + Exaustão, sem Em chamas", () => {
		expect(DND_5E_CONDITION_KEYS).toHaveLength(15);
		expect(DND_5E_CONDITIONS.map((c) => c.key)).toEqual([
			...DND_5E_CONDITION_KEYS,
		]);
		expect(DND_5E_CONDITIONS.map((c) => c.label)).toEqual([
			"Envenenado",
			"Contido",
			"Caído",
			"Inconsciente",
			"Cego",
			"Amedrontado",
			"Surdo",
			"Atordoado",
			"Enfeitiçado",
			"Agarrado",
			"Incapacitado",
			"Invisível",
			"Paralisado",
			"Petrificado",
			"Exaustão",
		]);
		expect(DND_5E_CONDITIONS.some((c) => /chamas/i.test(c.label))).toBe(false);
	});

	it("flecha/rede/dardo: Envenenado e Contido vêm primeiro", () => {
		const typical = DND_5E_CONDITIONS.filter((c) => c.typicalOnAmmo).map(
			(c) => c.key,
		);
		expect(typical[0]).toBe("poisoned");
		expect(typical[1]).toBe("restrained");
		expect(typical).toContain("unconscious");
	});

	it("casa rótulo, chave e apelido; Em chamas não é oficial", () => {
		expect(matchDnDCondition("Envenenado")).toBe("poisoned");
		expect(matchDnDCondition("envenenado")).toBe("poisoned");
		expect(matchDnDCondition("poisoned")).toBe("poisoned");
		expect(matchDnDCondition("Caído")).toBe("prone");
		expect(matchDnDCondition("Preso")).toBe("restrained");
		expect(matchDnDCondition("Em chamas")).toBeUndefined();
		expect(matchDnDCondition("")).toBeUndefined();
		expect(isDnDConditionKey("poisoned")).toBe(true);
		expect(isDnDConditionKey("chamas")).toBe(false);
	});

	it("próxima vaga pula as já usadas; seletor esconde duplicata", () => {
		expect(firstUnusedConditionKey([])).toBe("poisoned");
		expect(firstUnusedConditionKey(["poisoned"])).toBe("restrained");
		expect(firstUnusedConditionKey([...DND_5E_CONDITION_KEYS])).toBeUndefined();
		const options = conditionSelectOptions("prone", ["poisoned", "prone"]);
		expect(options.map((c) => c.key)).not.toContain("poisoned");
		expect(options.map((c) => c.key)).toContain("prone");
	});
});
