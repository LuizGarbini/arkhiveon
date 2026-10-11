import { describe, expect, it } from "vitest";
import type { Item, ItemWeaponStats } from "@/lib/store/types";
import {
	copyItemMechanics,
	describeItemLine,
	isValidDamageDice,
	itemCategoryKind,
	summarizeItemForSheet,
	tabStatus,
	validateItemDraft,
} from "./item-mechanics";

const aurora: ItemWeaponStats = {
	damageDice: "1d8",
	damageType: "radiant",
	magicBonus: 1,
	ability: "strength",
	weaponCategory: "martial",
	range: "1,5 m",
	countsAs: "Espada longa",
	properties: ["versatile"],
	versatileDice: "1d10",
	customProperties: ["Luz 6 m"],
	extraDamage: [
		{ id: "x1", label: "Contra mortos-vivos", amount: "1d6", type: "radiant" },
	],
};

describe("isValidDamageDice", () => {
	it("aceita dados NdM", () => {
		expect(isValidDamageDice("1d8")).toBe(true);
		expect(isValidDamageDice("2d6")).toBe(true);
		expect(isValidDamageDice(" 1d4 + 1d6 ")).toBe(true);
	});
	it("recusa texto, dado sem lados e número solto", () => {
		expect(isValidDamageDice("d")).toBe(false);
		expect(isValidDamageDice("abc")).toBe(false);
		expect(isValidDamageDice("3")).toBe(false);
		expect(isValidDamageDice("1d8+1")).toBe(false);
		expect(isValidDamageDice("")).toBe(false);
	});
});

describe("itemCategoryKind", () => {
	it("mapeia categoria para a aba mecânica", () => {
		expect(itemCategoryKind("Arma")).toBe("weapon");
		expect(itemCategoryKind("arma")).toBe("weapon");
		expect(itemCategoryKind("Armadura")).toBe("armor");
		expect(itemCategoryKind("Escudo")).toBe("armor");
		expect(itemCategoryKind("Poção")).toBe("other");
		expect(itemCategoryKind(undefined)).toBe("other");
	});
});

describe("validateItemDraft", () => {
	it("exige nome", () => {
		expect(validateItemDraft({ name: "  " }).errors.name).toBeTruthy();
		expect(validateItemDraft({ name: "Lâmina" }).ok).toBe(true);
	});
	it("valida dado, versátil e dano extra só em arma", () => {
		const bad: ItemWeaponStats = {
			...aurora,
			damageDice: "abc",
			versatileDice: "d",
			extraDamage: [{ id: "e", label: "", amount: "xx", type: "fire" }],
		};
		const res = validateItemDraft({ name: "X", type: "Arma", weapon: bad });
		expect(res.ok).toBe(false);
		expect(res.errors.damageDice).toBeTruthy();
		expect(res.errors.versatileDice).toBeTruthy();
		expect(res.errors.extraDamage?.e).toBeTruthy();
		expect(
			validateItemDraft({ name: "X", type: "Poção", weapon: bad }).ok,
		).toBe(true);
	});
	it("dado vazio não bloqueia salvar", () => {
		expect(
			validateItemDraft({
				name: "X",
				type: "Arma",
				weapon: { ...aurora, damageDice: "" },
			}).ok,
		).toBe(true);
	});
});

describe("summarizeItemForSheet", () => {
	it("resume a Lâmina da Aurora", () => {
		expect(summarizeItemForSheet(aurora)).toEqual({
			attack: "Prof+FOR+1",
			damage: "1d8+FOR+1",
			extra: "+1d6 rad.",
		});
	});
	it("Acuidade vira DES/FOR e sem bônus some o +N", () => {
		const s = summarizeItemForSheet({
			...aurora,
			ability: "finesse",
			magicBonus: undefined,
			extraDamage: [],
		});
		expect(s).toEqual({
			attack: "Prof+DES/FOR",
			damage: "1d8+DES/FOR",
			extra: undefined,
		});
	});
	it("sem dado válido não resume", () => {
		expect(summarizeItemForSheet(undefined)).toBeNull();
		expect(summarizeItemForSheet({ ...aurora, damageDice: "" })).toBeNull();
	});
});

describe("copyItemMechanics", () => {
	it("gera cópia independente e marca a origem", () => {
		const source = {
			id: "src-1",
			name: "Espada longa",
			type: "Arma",
			subtype: "espada",
			rarity: "comum",
			weapon: structuredClone(aurora),
			armor: undefined,
			bonuses: [{ id: "b1", target: "attack" as const, value: 1 }],
		} satisfies Pick<
			Item,
			| "id"
			| "name"
			| "type"
			| "subtype"
			| "rarity"
			| "weapon"
			| "armor"
			| "bonuses"
		>;
		const copy = copyItemMechanics(source);
		expect(copy.origin).toEqual({
			kind: "copy",
			fromItemId: "src-1",
			fromName: "Espada longa",
		});
		source.weapon.damageDice = "2d6";
		source.weapon.properties.push("heavy");
		source.weapon.extraDamage[0].amount = "9d9";
		expect(copy.weapon?.damageDice).toBe("1d8");
		expect(copy.weapon?.properties).toEqual(["versatile"]);
		expect(copy.weapon?.extraDamage[0].amount).toBe("1d6");
		expect(copy.weapon?.extraDamage[0].id).not.toBe("x1");
		expect(copy.bonuses?.[0].id).not.toBe("b1");
	});
});

describe("tabStatus", () => {
	it("edição completa: ✓ / 1d8+1 / — / ✓", () => {
		const s = tabStatus(
			{
				name: "Lâmina da Aurora",
				type: "Arma",
				weapon: aurora,
				description: "Forjada na aurora.",
			},
			"edit",
		);
		expect(s.identity).toEqual({ kind: "done" });
		expect(s.mechanics).toEqual({ kind: "summary", text: "1d8+1" });
		expect(s.bonus).toEqual({ kind: "empty" });
		expect(s.description).toEqual({ kind: "done" });
	});
	it("criação vazia: obrigatório / obrigatório / opcional / opcional", () => {
		const s = tabStatus({ name: "", type: "Arma" }, "create");
		expect(s.identity).toEqual({ kind: "required" });
		expect(s.mechanics).toEqual({ kind: "required" });
		expect(s.bonus).toEqual({ kind: "optional" });
		expect(s.description).toEqual({ kind: "optional" });
	});
	it("item antigo sem weapon abre sem erro", () => {
		const legacy = { name: "Anel velho", type: "Anel", description: "" };
		expect(() => tabStatus(legacy, "edit")).not.toThrow();
		expect(summarizeItemForSheet(undefined)).toBeNull();
		expect(describeItemLine(legacy)).toBe("Anel");
	});
});

describe("describeItemLine", () => {
	it("arma marcial corpo a corpo", () => {
		expect(describeItemLine({ type: "Arma", weapon: aurora })).toBe(
			"Marcial · corpo a corpo",
		);
	});
});
