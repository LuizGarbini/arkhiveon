import { describe, expect, it } from "vitest";
import type {
	InventoryItem,
	InventoryWeaponStats,
	WeaponAbility,
} from "@/lib/store/types";
import {
	averageDamage,
	buildWeaponAttack,
	formatDamageFormula,
	getEquippedWeaponAttacks,
	isEquippedWeapon,
	parseDamageFormula,
	weaponAbilityScores,
} from "./weapon-damage";

const longswordStats = {
	damageDice: "1d8",
	damageType: "slashing",
	ability: "strength",
	magicBonus: 1,
	proficient: true,
	extraDamage: [
		{ id: "rune", label: "Runa da tempestade", amount: "2", type: "lightning" },
		{ id: "oil", label: "Óleo de veneno", amount: "0", type: "poison" },
	],
} satisfies InventoryWeaponStats;

const longsword: InventoryItem & { weapon: InventoryWeaponStats } = {
	id: "sword",
	name: "Espada Longa da Tempestade",
	quantity: 1,
	weightLbs: 3,
	location: "equipped",
	category: "weapon",
	weapon: longswordStats,
};

// FOR 20 (+5), DES 14 (+2), proficiência +5 (Nv 15)
const scores = { strength: 20, dexterity: 14 };

describe("parseDamageFormula", () => {
	it("lê dado, número e fórmula composta", () => {
		expect(parseDamageFormula("1d8")).toEqual({
			dice: [{ count: 1, sides: 8 }],
			flat: 0,
		});
		expect(parseDamageFormula("+2")).toEqual({ dice: [], flat: 2 });
		expect(parseDamageFormula("2d6 + 1d4 - 1")).toEqual({
			dice: [
				{ count: 2, sides: 6 },
				{ count: 1, sides: 4 },
			],
			flat: -1,
		});
		expect(parseDamageFormula("d6")).toEqual({
			dice: [{ count: 1, sides: 6 }],
			flat: 0,
		});
	});

	it("rejeita entrada inválida ou vazia", () => {
		expect(parseDamageFormula("")).toBeNull();
		expect(parseDamageFormula("abc")).toBeNull();
		expect(parseDamageFormula("1d")).toBeNull();
		expect(parseDamageFormula("-1d6")).toBeNull();
		expect(parseDamageFormula(undefined)).toBeNull();
	});
});

describe("formatDamageFormula / averageDamage", () => {
	it("agrupa dados iguais e formata o sinal", () => {
		expect(
			formatDamageFormula(
				[
					{ count: 1, sides: 6 },
					{ count: 1, sides: 8 },
					{ count: 1, sides: 6 },
				],
				3,
			),
		).toBe("1d8+2d6+3");
		expect(formatDamageFormula([{ count: 1, sides: 4 }], -1)).toBe("1d4-1");
		expect(formatDamageFormula([], 2)).toBe("2");
	});

	it("calcula a média sem ficar negativa", () => {
		expect(averageDamage([{ count: 1, sides: 8 }], 8)).toBe(12.5);
		expect(averageDamage([], -3)).toBe(0);
	});
});

describe("isEquippedWeapon", () => {
	it("só aceita arma equipada com dado base válido", () => {
		expect(isEquippedWeapon(longsword)).toBe(true);
		expect(isEquippedWeapon({ ...longsword, location: "backpack" })).toBe(
			false,
		);
		expect(isEquippedWeapon({ ...longsword, category: "gear" })).toBe(false);
		expect(isEquippedWeapon({ ...longsword, weapon: undefined })).toBe(false);
		expect(
			isEquippedWeapon({
				...longsword,
				weapon: { ...longswordStats, damageDice: "5" },
			}),
		).toBe(false);
	});
});

describe("buildWeaponAttack", () => {
	it("monta acerto e dano por origem e por tipo (cenário do mock)", () => {
		const attack = buildWeaponAttack(longsword, scores, 5);
		expect(attack.attackBonus).toBe(11);
		expect(attack.attackParts).toEqual([
			{ label: "Proficiência", value: 5 },
			{ label: "Força", value: 5 },
			{ label: "Arma mágica", value: 1 },
		]);
		expect(attack.formula).toBe("1d8+8");
		expect(attack.average).toBe(12.5);
		expect(attack.byType.map((t) => [t.type, t.formula])).toEqual([
			["slashing", "1d8+6"],
			["lightning", "2"],
		]);
		expect(attack.types).toEqual(["slashing", "lightning"]);
		const oil = attack.damageParts.find((p) => p.label === "Óleo de veneno");
		expect(oil?.excluded).toBe(true);
		expect(attack.damageParts.map((p) => p.origin)).toEqual([
			"weapon",
			"ability",
			"magic",
			"extra",
			"extra",
		]);
	});

	it("atributo legado finesse lê como Destreza (sem max FOR/DES); sem proficiência não soma PB", () => {
		const rapier = {
			...longsword,
			name: "Rapieira",
			weapon: {
				damageDice: "1d8",
				damageType: "piercing" as const,
				ability: "finesse" as never,
				proficient: false,
			},
		};
		const attack = buildWeaponAttack(
			rapier,
			{ strength: 18, dexterity: 12 },
			2,
		);
		expect(attack.attackBonus).toBe(1);
		expect(attack.attackParts).toEqual([{ label: "Destreza", value: 1 }]);
		expect(attack.formula).toBe("1d8+1");
	});

	const pactBlade = {
		...longsword,
		name: "Lâmina do Pacto",
		weapon: {
			damageDice: "1d8",
			damageType: "slashing" as const,
			ability: "charisma" as WeaponAbility,
		},
	};
	const warlock = weaponAbilityScores({
		strength: 8,
		dexterity: 14,
		intelligence: 10,
		charisma: 18,
	});

	it("bruxo com Carisma 18: acerto +6, dano 1d8+4 (CA-A6-2)", () => {
		const attack = buildWeaponAttack(pactBlade, warlock, 2);
		expect(attack.attackBonus).toBe(6);
		expect(attack.attackParts).toEqual([
			{ label: "Proficiência", value: 2 },
			{ label: "Carisma", value: 4 },
		]);
		expect(attack.formula).toBe("1d8+4");
	});

	it("mesma arma com Inteligência 10: acerto +2, dano 1d8 (CA-A6-3)", () => {
		const attack = buildWeaponAttack(
			{
				...pactBlade,
				weapon: { ...pactBlade.weapon, ability: "intelligence" },
			},
			warlock,
			2,
		);
		expect(attack.attackBonus).toBe(2);
		expect(attack.formula).toBe("1d8");
	});

	it("cada um dos 6 atributos usa o próprio modificador e rótulo", () => {
		const s = weaponAbilityScores({
			strength: 12,
			dexterity: 14,
			constitution: 16,
			intelligence: 8,
			wisdom: 20,
			charisma: 6,
		});
		const expected: [WeaponAbility, string, number][] = [
			["strength", "Força", 1],
			["dexterity", "Destreza", 2],
			["constitution", "Constituição", 3],
			["intelligence", "Inteligência", -1],
			["wisdom", "Sabedoria", 5],
			["charisma", "Carisma", -2],
		];
		for (const [ability, label, mod] of expected) {
			const a = buildWeaponAttack(
				{
					...pactBlade,
					weapon: { ...pactBlade.weapon, ability, proficient: false },
				},
				s,
				2,
			);
			expect(a.attackParts).toEqual([{ label, value: mod }]);
		}
	});

	it("modificador negativo reduz o dano; dado extra entra no tipo certo", () => {
		const club = {
			...longsword,
			weapon: {
				damageDice: "1d4",
				damageType: "bludgeoning" as const,
				ability: "strength" as const,
				extraDamage: [
					{ id: "f", label: "Chama", amount: "1d6", type: "fire" as const },
				],
			},
		};
		const attack = buildWeaponAttack(club, { strength: 8, dexterity: 10 }, 2);
		expect(attack.attackBonus).toBe(1);
		expect(attack.formula).toBe("1d6+1d4-1");
		expect(attack.byType.map((t) => [t.type, t.formula])).toEqual([
			["bludgeoning", "1d4-1"],
			["fire", "1d6"],
		]);
	});
});

describe("getEquippedWeaponAttacks", () => {
	it("não inventa dano sem arma equipada", () => {
		expect(getEquippedWeaponAttacks(undefined, scores, 5)).toEqual([]);
		expect(
			getEquippedWeaponAttacks(
				[{ ...longsword, location: "backpack" }],
				scores,
				5,
			),
		).toEqual([]);
	});

	it("lista só as armas equipadas", () => {
		const attacks = getEquippedWeaponAttacks(
			[
				longsword,
				{ ...longsword, id: "bag", location: "mount_stash" },
				{
					id: "rope",
					name: "Corda",
					quantity: 1,
					weightLbs: 10,
					location: "equipped",
					category: "gear",
				},
			],
			scores,
			5,
		);
		expect(attacks.map((a) => a.itemId)).toEqual(["sword"]);
	});
});
