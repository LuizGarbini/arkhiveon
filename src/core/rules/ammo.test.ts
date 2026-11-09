import { describe, expect, it } from "vitest";
import type {
	InventoryItem,
	InventoryWeaponStats,
	Item,
} from "@/lib/store/types";
import {
	AMMO_QUANTITY_MAX,
	applyAmmoToAttack,
	canMutateAmmoQuantity,
	canSpendAmmo,
	emptyAmmoStats,
	isValidAmmoQuantity,
	readItemAmmo,
	weaponUsesAmmunition,
} from "./ammo";
import { linkKindOf } from "./item-links";
import {
	copyItemMechanics,
	ITEM_CATEGORIES,
	itemCategoryKind,
	validateItemDraft,
} from "./item-mechanics";
import { buildWeaponAttack } from "./weapon-damage";

const shortbow: InventoryItem & { weapon: InventoryWeaponStats } = {
	id: "bow",
	name: "Arco curto",
	quantity: 1,
	weightLbs: 2,
	location: "equipped",
	category: "weapon",
	weapon: {
		damageDice: "1d6",
		damageType: "piercing",
		ability: "dexterity",
		proficient: true,
		extraDamage: [],
	},
};

const scores = { strength: 10, dexterity: 16 };

const flamingAmmo = emptyAmmoStats();
flamingAmmo.unitLabel = "flecha";
flamingAmmo.damage = { amount: "1d4", type: "piercing" };
flamingAmmo.extraDamage = [
	{ id: "fire", label: "Chama", amount: "1d8", type: "fire" },
];
flamingAmmo.conditions = [
	{ id: "c1", name: "Em chamas", notes: "O mestre aplica na mesa." },
];

describe("categoria Munição", () => {
	it("reconhece Munição como kind ammo sem virar arma", () => {
		expect(itemCategoryKind("Munição")).toBe("ammo");
		expect(itemCategoryKind("municao")).toBe("ammo");
		expect(itemCategoryKind("ammo")).toBe("ammo");
		expect(itemCategoryKind("Arma")).toBe("weapon");
		expect(itemCategoryKind("Poção")).toBe("other");
	});

	it("lista canônica inclui Munição", () => {
		expect(ITEM_CATEGORIES).toContain("Munição");
	});

	it("vínculo trata Munição como consumível, não arma", () => {
		expect(linkKindOf({ type: "Munição" })).toBe("consumable");
		expect(linkKindOf({ type: "Arma" })).toBe("weapon");
		expect(linkKindOf({ type: "Poção" })).toBe("consumable");
	});
});

describe("serialização do bloco ammo", () => {
	it("round-trip de dano próprio, extra e condição textual", () => {
		const json = JSON.parse(JSON.stringify(flamingAmmo)) as unknown;
		const read = readItemAmmo(json);
		expect(read).toEqual(flamingAmmo);
	});

	it("ignora lixo e itens antigos sem bloco", () => {
		expect(readItemAmmo(undefined)).toBeUndefined();
		expect(readItemAmmo(null)).toBeUndefined();
		expect(readItemAmmo("flecha")).toBeUndefined();
		const partial = readItemAmmo({
			unitLabel: "tiro",
			damage: { amount: "nope", type: "fire" },
			extraDamage: [{ id: "x", label: "X", amount: "1d6", type: "fire" }, 3],
			conditions: [{ id: "c", name: "Preso", notes: "" }, "nope"],
		});
		expect(partial?.unitLabel).toBe("tiro");
		expect(partial?.damage).toBeUndefined();
		expect(partial?.extraDamage).toEqual([
			{ id: "x", label: "X", amount: "1d6", type: "fire" },
		]);
		expect(partial?.conditions).toEqual([
			{ id: "c", name: "Preso", notes: "" },
		]);
	});
});

describe("composição pura arma + munição", () => {
	it("soma dano próprio e adicional da munição à fórmula da arma", () => {
		const weapon = buildWeaponAttack(shortbow, scores, 2);
		expect(weapon.formula).toBe("1d6+3");
		const merged = applyAmmoToAttack(weapon, flamingAmmo);
		expect(merged.formula).toBe("1d8+1d6+1d4+3");
		expect(merged.byType.map((t) => [t.type, t.formula])).toEqual([
			["piercing", "1d6+1d4+3"],
			["fire", "1d8"],
		]);
		expect(merged.attackBonus).toBe(weapon.attackBonus);
		expect(
			merged.damageParts
				.filter((p) => p.origin === "extra")
				.map((p) => p.label),
		).toEqual(["flecha", "Chama"]);
	});

	it("sem munição especial devolve o ataque da arma intacto", () => {
		const weapon = buildWeaponAttack(shortbow, scores, 2);
		expect(applyAmmoToAttack(weapon, undefined)).toEqual(weapon);
		expect(applyAmmoToAttack(weapon, emptyAmmoStats()).formula).toBe(
			weapon.formula,
		);
	});
});

describe("estoque não-negativo (regra pura, sem débito)", () => {
	it("aceita 0 e inteiros até o teto; recusa negativo, fração e lixo", () => {
		expect(isValidAmmoQuantity(0)).toBe(true);
		expect(isValidAmmoQuantity(1)).toBe(true);
		expect(isValidAmmoQuantity(AMMO_QUANTITY_MAX)).toBe(true);
		expect(isValidAmmoQuantity(-1)).toBe(false);
		expect(isValidAmmoQuantity(1.5)).toBe(false);
		expect(isValidAmmoQuantity(Number.NaN)).toBe(false);
		expect(isValidAmmoQuantity(AMMO_QUANTITY_MAX + 1)).toBe(false);
	});

	it("gastar exige quantidade >= 1; 0 não gasta", () => {
		expect(canSpendAmmo(0)).toBe(false);
		expect(canSpendAmmo(1)).toBe(true);
		expect(canSpendAmmo(-1)).toBe(false);
	});

	it("quantity é somente leitura enquanto o RPC não existir", () => {
		expect(canMutateAmmoQuantity(false)).toBe(false);
		expect(canMutateAmmoQuantity(true)).toBe(true);
	});
});

describe("elegibilidade", () => {
	it("arma com ammunition ou loading usa munição; corpo a corpo não exige", () => {
		expect(weaponUsesAmmunition(["ammunition"])).toBe(true);
		expect(weaponUsesAmmunition(["loading"])).toBe(true);
		expect(weaponUsesAmmunition(["ammunition", "loading"])).toBe(true);
		expect(weaponUsesAmmunition(["finesse", "light"])).toBe(false);
		expect(weaponUsesAmmunition(undefined)).toBe(false);
	});
});

describe("validação de draft Munição", () => {
	it("persiste draft com dano próprio, extra e condição; recusa fórmula inválida", () => {
		const ok = validateItemDraft({
			name: "Flecha flamejante",
			type: "Munição",
			ammo: flamingAmmo,
		});
		expect(ok.ok).toBe(true);
		const bad = validateItemDraft({
			name: "Flecha",
			type: "Munição",
			ammo: {
				...emptyAmmoStats(),
				damage: { amount: "xx", type: "fire" },
				extraDamage: [{ id: "e", label: "", amount: "nope", type: "fire" }],
			},
		});
		expect(bad.ok).toBe(false);
		expect(bad.errors.ammoDamage).toBeTruthy();
		expect(bad.errors.extraDamage?.e).toBeTruthy();
	});

	it("Poção continua sem validar bloco de arma", () => {
		expect(
			validateItemDraft({
				name: "Poção",
				type: "Poção",
				weapon: {
					damageDice: "abc",
					damageType: "fire",
					ability: "strength",
					weaponCategory: "simple",
					properties: [],
					customProperties: [],
					extraDamage: [],
				},
			}).ok,
		).toBe(true);
	});
});

describe("Item.ammo no catálogo", () => {
	it("campo opcional não quebra item antigo", () => {
		const legacy = { type: "Poção", name: "Cura" } as Pick<
			Item,
			"type" | "name"
		>;
		expect(itemCategoryKind(legacy.type)).toBe("other");
		expect("ammo" in legacy).toBe(false);
	});

	it("cópia independente do bloco ammo", () => {
		const source = {
			id: "src-ammo",
			name: "Flecha flamejante",
			type: "Munição",
			subtype: "flecha",
			rarity: "incomum",
			ammo: structuredClone(flamingAmmo),
		};
		const copy = copyItemMechanics(source);
		expect(copy.type).toBe("Munição");
		expect(copy.ammo?.damage).toEqual(flamingAmmo.damage);
		expect(copy.ammo?.extraDamage[0].amount).toBe("1d8");
		expect(copy.ammo?.extraDamage[0].id).not.toBe("fire");
		expect(copy.ammo?.conditions[0].name).toBe("Em chamas");
		expect(copy.ammo?.conditions[0].id).not.toBe("c1");
		source.ammo.extraDamage[0].amount = "9d9";
		expect(copy.ammo?.extraDamage[0].amount).toBe("1d8");
	});
});
