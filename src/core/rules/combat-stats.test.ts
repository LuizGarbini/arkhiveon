import { describe, expect, it } from "vitest";
import type { InventoryItem, Item } from "@/lib/store/types";
import {
	armorClassCaption,
	computeArmorClass,
	computeInitiative,
	explainArmorClass,
	explainAttack,
	explainDamage,
	explainInitiative,
	initiativeCaption,
	type LinkedEntry,
	proseText,
} from "./combat-stats";
import { resolveLinkedInventory } from "./item-links";
import {
	byId,
	longsword,
	ringOfAlertness,
	shield,
	studdedLeather,
	thalia,
} from "./thalia.fixture";
import { getEquippedWeaponAttacks } from "./weapon-damage";

function linked(
	item: Item,
	location: InventoryItem["location"] = "equipped",
	extra: Partial<InventoryItem> = {},
): LinkedEntry {
	return {
		item,
		entry: {
			id: `inv-${item.id}`,
			name: item.name,
			quantity: 1,
			weightLbs: 0,
			location,
			campaignItemId: item.id,
			...extra,
		},
	};
}

describe("computeArmorClass", () => {
	it("Thalia: Couro batido 12 + DES 3 = 15", () => {
		const ac = computeArmorClass(thalia, [linked(studdedLeather)]);
		expect(ac.source).toBe("items");
		expect(ac.total).toBe(15);
		expect(ac.parts.map((p) => [p.label, p.value])).toEqual([
			["Couro batido", 12],
			["Destreza", 3],
		]);
		expect(ac.unarmored).toBe(13);
	});
	it("Couro batido + Escudo = 17", () => {
		expect(
			computeArmorClass(thalia, [linked(studdedLeather), linked(shield)]).total,
		).toBe(17);
	});
	it("máx. +2 limita a Destreza", () => {
		const scale: Item = {
			...studdedLeather,
			id: "scale",
			name: "Brunea",
			armor: { baseAc: 14, dexMode: "max2", armorCategory: "medium" },
		};
		expect(computeArmorClass(thalia, [linked(scale)]).total).toBe(16);
	});
	it("armadura pesada não soma Destreza", () => {
		const plate: Item = {
			...studdedLeather,
			id: "plate",
			name: "Placas",
			armor: { baseAc: 18, dexMode: "none", armorCategory: "heavy" },
		};
		const ac = computeArmorClass(thalia, [linked(plate)]);
		expect(ac.total).toBe(18);
		expect(ac.parts.some((p) => p.kind === "dex")).toBe(false);
	});
	it("sem item que afete CA = valor manual", () => {
		const ac = computeArmorClass(thalia, [linked(ringOfAlertness)]);
		expect(ac).toMatchObject({ source: "manual", total: 13, parts: [] });
	});
	it("armadura na Mochila não conta", () => {
		expect(
			computeArmorClass(thalia, [linked(studdedLeather, "backpack")]).source,
		).toBe("manual");
	});
	it("bônus de CA com 'quando' não soma e vira nota", () => {
		const cloak: Item = {
			...ringOfAlertness,
			id: "cloak",
			name: "Capa",
			requiresAttunement: false,
			bonuses: [{ id: "c", target: "ac", value: 1, when: "contra projéteis" }],
		};
		const ac = computeArmorClass(thalia, [
			linked(studdedLeather),
			linked(cloak),
		]);
		expect(ac.total).toBe(15);
		expect(ac.notes.join(" ")).toContain("contra projéteis");
	});
	it("exige sintonização e não está sintonizado = não soma", () => {
		const ring: Item = {
			...ringOfAlertness,
			id: "prot",
			name: "Anel de proteção",
			bonuses: [{ id: "p", target: "ac", value: 1 }],
		};
		expect(
			computeArmorClass(thalia, [
				linked(studdedLeather),
				linked(ring, "equipped", { isAttuned: false }),
			]).total,
		).toBe(15);
		expect(
			computeArmorClass(thalia, [
				linked(studdedLeather),
				linked(ring, "equipped", { isAttuned: true }),
			]).total,
		).toBe(16);
	});
	it("só escudo: soma em cima da CA da ficha", () => {
		const ac = computeArmorClass(thalia, [linked(shield)]);
		expect(ac.total).toBe(15);
		expect(ac.parts[0]).toMatchObject({ kind: "sheet", value: 13 });
	});
});

describe("computeInitiative", () => {
	it("Thalia: DES +3 + Anel +1 = +4", () => {
		const init = computeInitiative(thalia, [
			linked(ringOfAlertness, "equipped", { isAttuned: true }),
		]);
		expect(init.total).toBe(4);
		expect(init.parts.map((p) => [p.label, p.value])).toEqual([
			["Destreza", 3],
			["Anel da prontidão", 1],
		]);
	});
	it("sem item = manual", () => {
		expect(computeInitiative(thalia, [])).toMatchObject({
			source: "manual",
			total: 3,
		});
	});
	it("ajuste da ficha aparece quando o manual difere da DES", () => {
		const init = computeInitiative({ ...thalia, initiative: 8 }, [
			linked(ringOfAlertness, "equipped", { isAttuned: true }),
		]);
		expect(init.total).toBe(9);
		expect(init.parts).toContainEqual({
			kind: "sheet",
			label: "Ajuste da ficha",
			value: 5,
		});
	});
	it("anel sem sintonizar não soma", () => {
		const init = computeInitiative(thalia, [
			linked(ringOfAlertness, "equipped", { isAttuned: false }),
		]);
		expect(init.source).toBe("manual");
		expect(init.notes[0]).toContain("sintonização");
	});
});

describe("prosa (mocks 03)", () => {
	const [attack] = getEquippedWeaponAttacks(
		resolveLinkedInventory(
			[
				{
					id: "inv-sword",
					name: "x",
					quantity: 1,
					weightLbs: 0,
					location: "equipped",
					campaignItemId: longsword.id,
					proficient: true,
				},
			],
			byId(longsword),
		),
		{ strength: 16, dexterity: 16 },
		2,
	);

	it("Dano: frase exata + blocos", () => {
		const e = explainDamage(attack);
		expect(proseText(e.sentence)).toBe(
			"Seu dano é 1d8+4 cortante porque a Espada longa +1 rola 1d8, você soma sua Força +3 e a magia da arma dá +1.",
		);
		expect(e.sentence.filter((p) => p.strong).map((p) => p.text)).toEqual([
			"1d8+4 cortante",
			"Espada longa +1",
			"1d8",
			"Força +3",
			"+1",
		]);
		expect(e.blocks).toEqual([
			{ value: "1d8", label: "Espada" },
			{ value: "+3", label: "Força" },
			{ value: "+1", label: "Mágica" },
		]);
		expect(e.total).toBe("1d8+4");
	});

	it("Acerto: +6 = Prof. +2 + Força +3 + Mágica +1", () => {
		const e = explainAttack(attack);
		expect(proseText(e.sentence)).toBe(
			"Seu acerto é +6 porque você soma proficiência +2, sua Força +3 e a magia da arma dá +1.",
		);
		expect(e.blocks.map((b) => b.value)).toEqual(["+2", "+3", "+1"]);
		expect(e.total).toBe("+6");
	});

	it('Carisma: prosa diz "seu Carisma" (bruxo, CA-A6-2)', () => {
		const [pact] = getEquippedWeaponAttacks(
			[
				{
					id: "pact",
					name: "Lâmina do Pacto",
					quantity: 1,
					weightLbs: 0,
					location: "equipped",
					category: "weapon",
					weapon: {
						damageDice: "1d8",
						damageType: "slashing",
						ability: "charisma",
					},
				},
			],
			{ charisma: 18 },
			2,
		);
		expect(proseText(explainAttack(pact).sentence)).toBe(
			"Seu acerto é +6 porque você soma proficiência +2 e seu Carisma +4.",
		);
		expect(proseText(explainDamage(pact).sentence)).toBe(
			"Seu dano é 1d8+4 cortante porque a Lâmina do Pacto rola 1d8 e você soma seu Carisma +4.",
		);
		expect(explainDamage(pact).blocks[1]).toEqual({
			value: "+4",
			label: "Carisma",
		});
	});

	it("CA: frase exata + nota do mock", () => {
		const stat = computeArmorClass(thalia, [linked(studdedLeather)]);
		const e = explainArmorClass(stat);
		expect(proseText(e.sentence)).toBe(
			"Sua CA é 15 porque você veste Couro batido (base 12) e soma toda a sua Destreza +3.",
		);
		expect(e.blocks).toEqual([
			{ value: "12", label: "Couro batido" },
			{ value: "+3", label: "Destreza" },
		]);
		expect(e.notes).toEqual(["Sem armadura seria 13. Escudo somaria +2."]);
		expect(armorClassCaption(stat)).toBe("Couro batido");
	});

	it("Iniciativa: +4 com o Anel", () => {
		const stat = computeInitiative(thalia, [
			linked(ringOfAlertness, "equipped", { isAttuned: true }),
		]);
		expect(proseText(explainInitiative(stat).sentence)).toBe(
			"Sua iniciativa é +4 porque você soma sua Destreza +3 e o Anel da prontidão dá +1.",
		);
		expect(initiativeCaption(stat)).toBe("+1 do Anel");
	});
});
