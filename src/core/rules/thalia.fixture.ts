/** Cenário dos mocks (Thalia, Guerreira Nv 3) usado nos testes de itens vinculados. */
import type { Character, Item } from "@/lib/store/types";

function item(id: string, data: Partial<Item>): Item {
	return {
		id,
		createdAt: 0,
		createdBy: "gm",
		worldId: "world-1",
		publicationScope: "restricted",
		campaignIds: ["camp-1"],
		visibility: "public",
		name: "",
		type: "",
		rarity: "comum",
		subtype: "",
		weight: "",
		value: "",
		requiresAttunement: false,
		attunedTo: "",
		charges: "",
		source: "",
		stats: "",
		properties: "",
		description: "",
		owner: "",
		imageUrl: "",
		equipped: false,
		entityLinks: [],
		...data,
	};
}

export const longsword = item("it-longsword", {
	name: "Espada longa +1",
	type: "Arma",
	rarity: "incomum",
	weight: "1,5 kg",
	weapon: {
		damageDice: "1d8",
		damageType: "slashing",
		magicBonus: 1,
		ability: "strength",
		weaponCategory: "martial",
		range: "1,5 m",
		properties: ["versatile"],
		versatileDice: "1d10",
		customProperties: [],
		extraDamage: [],
	},
});

export const shortbow = item("it-shortbow", {
	name: "Arco curto",
	type: "Arma",
	weapon: {
		damageDice: "1d6",
		damageType: "piercing",
		ability: "dexterity",
		weaponCategory: "simple",
		range: "24/96 m",
		properties: ["ammunition"],
		customProperties: [],
		extraDamage: [],
	},
});

export const studdedLeather = item("it-studded", {
	name: "Couro batido",
	type: "Armadura",
	armor: { baseAc: 12, dexMode: "full", armorCategory: "light" },
});

export const shield = item("it-shield", {
	name: "Escudo +2",
	type: "Escudo",
	armor: { baseAc: 2, dexMode: "none", armorCategory: "shield" },
});

export const ringOfAlertness = item("it-ring", {
	name: "Anel da prontidão",
	type: "Anel",
	rarity: "raro",
	requiresAttunement: true,
	bonuses: [{ id: "b1", target: "initiative", value: 1 }],
});

export const healingPotion = item("it-potion", {
	name: "Poção de cura",
	type: "Poção",
	stats: "2d4+2 PV",
});

export const thalia = {
	id: "thalia",
	system: "dnd5e",
	characterName: "Thalia Ventoclaro",
	level: 3,
	proficiencyBonus: 2,
	strength: 16,
	dexterity: 16,
	armorClass: 13,
	initiative: 3,
	createdBy: "player-1",
	inventoryList: [],
} as unknown as Character;

export function byId(...items: Item[]): Map<string, Item> {
	return new Map(items.map((i) => [i.id, i]));
}
