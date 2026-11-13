import { describe, expect, it } from "vitest";
import type { InventoryItem, Item } from "@/lib/store/types";
import { computeArmorClass, computeInitiative } from "./combat-stats";
import {
	attunedCount,
	computeAbilityScores,
	computeEffectiveStats,
	computeSavesBonus,
	computeSpeed,
	defaultSlotFor,
	describeAbilityBonus,
	describeItemEffects,
	effectiveScores,
	equipEntryInSlot,
	equipNewItemInSlot,
	estimateHealthMax,
	itemSlotOf,
	MAX_ATTUNED_ITEMS,
	resolveSlots,
	setAttunement,
	slotsForItem,
	unequipEntry,
	withoutEquipment,
} from "./equipment";
import { describeLinkCandidate, resolveLinkedEntries } from "./item-links";
import {
	byId,
	longsword,
	ringOfAlertness,
	shield,
	studdedLeather,
	thalia,
} from "./thalia.fixture";
import { buildWeaponAttack, getEquippedWeaponAttacks } from "./weapon-damage";

function make(id: string, data: Partial<Item>): Item {
	return { ...ringOfAlertness, id, name: id, bonuses: undefined, ...data };
}

const gauntlets = make("it-gauntlets", {
	name: "Luvas de Poder de Ogro",
	type: "Item Maravilhoso",
	slot: "hands",
	requiresAttunement: true,
	abilityBonuses: [{ id: "a1", ability: "strength", mode: "set", value: 19 }],
});
const amulet = make("it-amulet", {
	name: "Amuleto da Saúde",
	type: "Amuleto",
	requiresAttunement: true,
	abilityBonuses: [
		{ id: "a2", ability: "constitution", mode: "set", value: 19 },
	],
});
const belt = make("it-belt", {
	name: "Cinto do Gigante",
	type: "Item Maravilhoso",
	slot: "cloak",
	abilityBonuses: [{ id: "a3", ability: "strength", mode: "add", value: 2 }],
});
const boots = make("it-boots", {
	name: "Botas da Velocidade",
	type: "Item Maravilhoso",
	slot: "feet",
	bonuses: [
		{ id: "s1", target: "speed", value: 3 },
		{ id: "s2", target: "speed", value: 6, when: "ao correr" },
	],
});
const protRing = make("it-prot", {
	name: "Anel da Proteção",
	type: "Anel",
	requiresAttunement: true,
	bonuses: [
		{ id: "p1", target: "ac", value: 1 },
		{ id: "p2", target: "saves", value: 1 },
	],
});
const secondRing = make("it-ring2", { name: "Anel de Saltar", type: "Anel" });
const dexGloves = make("it-dexgloves", {
	name: "Luvas da Destreza",
	type: "Item Maravilhoso",
	slot: "hands",
	abilityBonuses: [{ id: "d1", ability: "dexterity", mode: "add", value: 2 }],
});

function entry(
	item: Item,
	location: InventoryItem["location"] = "equipped",
	extra: Partial<InventoryItem> = {},
): InventoryItem {
	return {
		id: `inv-${item.id}`,
		name: item.name,
		quantity: 1,
		weightLbs: 0,
		location,
		campaignItemId: item.id,
		...(item.requiresAttunement ? { isAttuned: true } : {}),
		...extra,
	};
}

function linkedOf(items: Item[], entries: InventoryItem[]) {
	return resolveLinkedEntries(entries, byId(...items));
}

describe("slot do item", () => {
	it("deduz da categoria quando o cadastro não diz", () => {
		expect(itemSlotOf(longsword)).toBe("weapon");
		expect(itemSlotOf(studdedLeather)).toBe("armor");
		expect(itemSlotOf(shield)).toBe("shield");
		expect(itemSlotOf(ringOfAlertness)).toBe("ring");
		expect(itemSlotOf(amulet)).toBe("neck");
	});

	it("o slot escolhido no cadastro vale mais que a categoria", () => {
		expect(itemSlotOf(gauntlets)).toBe("hands");
		expect(itemSlotOf({ ...studdedLeather, slot: "cloak" })).toBe("cloak");
	});

	it("item sem categoria nem slot não cabe em lugar nenhum", () => {
		const wonder = make("w", { type: "Item Maravilhoso" });
		expect(itemSlotOf(wonder)).toBeUndefined();
		expect(slotsForItem(wonder)).toEqual([]);
	});

	it("anel cabe nos dois slots, escudo só na mão secundária", () => {
		expect(slotsForItem(ringOfAlertness)).toEqual(["ring1", "ring2"]);
		expect(slotsForItem(shield)).toEqual(["offHand"]);
		expect(slotsForItem(longsword)).toEqual(["mainHand", "offHand"]);
	});
});

describe("resolveSlots", () => {
	it("respeita o slot gravado", () => {
		const items = [ringOfAlertness, secondRing];
		const linked = linkedOf(items, [
			entry(ringOfAlertness, "equipped", { slot: "ring2" }),
			entry(secondRing, "equipped", { slot: "ring1" }),
		]);
		const { bySlot } = resolveSlots(linked);
		expect(bySlot.get("ring2")?.item.id).toBe(ringOfAlertness.id);
		expect(bySlot.get("ring1")?.item.id).toBe(secondRing.id);
	});

	it("ficha antiga (sem slot) é encaixada no primeiro livre, sem sobrepor", () => {
		const linked = linkedOf(
			[longsword, shield, ringOfAlertness, secondRing],
			[
				entry(shield),
				entry(longsword),
				entry(ringOfAlertness),
				entry(secondRing),
			],
		);
		const { bySlot, unslotted } = resolveSlots(linked);
		expect(bySlot.get("offHand")?.item.id).toBe(shield.id);
		expect(bySlot.get("mainHand")?.item.id).toBe(longsword.id);
		expect(bySlot.get("ring1")?.item.id).toBe(ringOfAlertness.id);
		expect(bySlot.get("ring2")?.item.id).toBe(secondRing.id);
		expect(unslotted).toEqual([]);
	});

	it("o que não cabe em nenhum slot vai para 'unslotted'", () => {
		const wonder = make("w", { type: "Item Maravilhoso" });
		const linked = linkedOf([wonder], [entry(wonder)]);
		expect(resolveSlots(linked).unslotted).toHaveLength(1);
	});

	it("slot gravado que não combina com o item é ignorado", () => {
		const linked = linkedOf(
			[shield],
			[entry(shield, "equipped", { slot: "head" })],
		);
		expect(resolveSlots(linked).bySlot.get("offHand")?.item.id).toBe(shield.id);
	});

	it("mochila não ocupa slot", () => {
		const linked = linkedOf([longsword], [entry(longsword, "backpack")]);
		expect(resolveSlots(linked).bySlot.size).toBe(0);
	});
});

describe("atributos efetivos", () => {
	const sheet = { ...thalia, strength: 14, constitution: 14 };

	it("'fixa em' sobe o atributo (FOR 14 → 19)", () => {
		const stats = computeAbilityScores(
			sheet,
			linkedOf([gauntlets], [entry(gauntlets)]),
		);
		expect(stats.strength.total).toBe(19);
		expect(stats.strength.base).toBe(14);
		expect(stats.strength.delta).toBe(5);
		expect(stats.strength.parts.map((p) => p.kind)).toEqual(["base", "set"]);
	});

	it("'fixa em' não rebaixa quem já tem mais", () => {
		const strong = { ...thalia, strength: 21 };
		const stats = computeAbilityScores(
			strong,
			linkedOf([gauntlets], [entry(gauntlets)]),
		);
		expect(stats.strength.total).toBe(21);
		expect(stats.strength.parts).toHaveLength(1);
	});

	it("com duas fixas vale a maior", () => {
		const weak = make("g2", {
			slot: "head",
			abilityBonuses: [
				{ id: "x", ability: "strength", mode: "set", value: 17 },
			],
		});
		const stats = computeAbilityScores(
			sheet,
			linkedOf([gauntlets, weak], [entry(gauntlets), entry(weak)]),
		);
		expect(stats.strength.total).toBe(19);
	});

	it("soma depois de fixar: fixa 19, +2 do cinto = 21", () => {
		const stats = computeAbilityScores(
			sheet,
			linkedOf([gauntlets, belt], [entry(gauntlets), entry(belt)]),
		);
		expect(stats.strength.total).toBe(21);
		expect(stats.strength.parts.map((p) => p.kind)).toEqual([
			"base",
			"set",
			"add",
		]);
	});

	it("nunca passa de 30", () => {
		const huge = make("h", {
			slot: "head",
			abilityBonuses: [
				{ id: "x", ability: "strength", mode: "add", value: 20 },
			],
		});
		const stats = computeAbilityScores(sheet, linkedOf([huge], [entry(huge)]));
		expect(stats.strength.total).toBe(30);
	});

	it("item na mochila não conta", () => {
		const stats = computeAbilityScores(
			sheet,
			linkedOf([gauntlets], [entry(gauntlets, "backpack")]),
		);
		expect(stats.strength.total).toBe(14);
	});

	it("item que exige sintonização só conta sintonizado", () => {
		const stats = computeAbilityScores(
			sheet,
			linkedOf(
				[gauntlets],
				[entry(gauntlets, "equipped", { isAttuned: false })],
			),
		);
		expect(stats.strength.total).toBe(14);
	});

	it("ficha sem atributo salvo usa 10 como base", () => {
		const stats = computeAbilityScores({}, []);
		expect(stats.wisdom.total).toBe(10);
		expect(stats.wisdom.delta).toBe(0);
	});

	it("ignora bônus com atributo ou modo inválido", () => {
		const bad = make("bad", {
			slot: "head",
			abilityBonuses: [
				// biome-ignore lint/suspicious/noExplicitAny: dado corrompido de propósito
				{ id: "1", ability: "luck" as any, mode: "add", value: 5 },
				// biome-ignore lint/suspicious/noExplicitAny: dado corrompido de propósito
				{ id: "2", ability: "strength", mode: "mult" as any, value: 5 },
				{ id: "3", ability: "strength", mode: "add", value: Number.NaN },
			],
		});
		const stats = computeAbilityScores(sheet, linkedOf([bad], [entry(bad)]));
		expect(stats.strength.total).toBe(14);
	});

	it("effectiveScores devolve os seis totais", () => {
		const stats = computeAbilityScores(
			sheet,
			linkedOf([gauntlets, amulet], [entry(gauntlets), entry(amulet)]),
		);
		const scores = effectiveScores(stats);
		expect(scores.strength).toBe(19);
		expect(scores.constitution).toBe(19);
		expect(scores.dexterity).toBe(sheet.dexterity);
	});
});

describe("efeito dos atributos nas contas de combate", () => {
	it("o acerto da arma usa a Força com itens", () => {
		const longsword1 = longsword;
		const linked = linkedOf(
			[longsword1, gauntlets],
			[entry(longsword1, "equipped", { proficient: true }), entry(gauntlets)],
		);
		const stats = computeAbilityScores({ ...thalia, strength: 14 }, linked);
		const resolved = [
			{
				id: "w",
				name: "Espada",
				quantity: 1,
				weightLbs: 0,
				location: "equipped" as const,
				category: "weapon" as const,
				weapon: {
					damageDice: "1d8",
					damageType: "slashing" as const,
					ability: "strength" as const,
					magicBonus: 1,
					proficient: true,
					extraDamage: [],
				},
			},
		];
		const withItems = getEquippedWeaponAttacks(
			resolved,
			effectiveScores(stats),
			3,
		)[0];
		const without = getEquippedWeaponAttacks(resolved, { strength: 14 }, 3)[0];
		// FOR 14 (+2) → 19 (+4): +2 no acerto e +2 no dano.
		expect(withItems.attackBonus - without.attackBonus).toBe(2);
		expect(
			buildWeaponAttack(resolved[0], { strength: 19 }, 3).attackBonus,
		).toBe(withItems.attackBonus);
	});

	it("a CA sem armadura acompanha a Destreza dos itens", () => {
		const sheet = { ...thalia, dexterity: 12, armorClass: 11 };
		const linked = linkedOf([dexGloves], [entry(dexGloves)]);
		const stats = computeAbilityScores(sheet, linked);
		// DES 12 (+1) → 14 (+2): a CA digitada ganha +1.
		const ac = computeArmorClass(sheet, linked, stats.dexterity.total);
		expect(ac.total).toBe(12);
		expect(ac.source).toBe("items");
		expect(computeArmorClass(sheet, linked).total).toBe(11);
	});

	it("a CA com armadura usa a Destreza com itens (respeitando o teto)", () => {
		const sheet = { ...thalia, dexterity: 12 };
		const medium = {
			...studdedLeather,
			armor: {
				baseAc: 14,
				dexMode: "max2" as const,
				armorCategory: "medium" as const,
			},
		};
		const linked = linkedOf(
			[medium, dexGloves],
			[entry(medium), entry(dexGloves)],
		);
		const stats = computeAbilityScores(sheet, linked);
		expect(computeArmorClass(sheet, linked, stats.dexterity.total).total).toBe(
			16,
		);
	});

	it("a iniciativa sobe com a Destreza dos itens e mantém o ajuste da ficha", () => {
		// ficha: DES 12 (+1) e iniciativa digitada +3 (ajuste de +2)
		const sheet = { ...thalia, dexterity: 12, initiative: 3 };
		const linked = linkedOf([dexGloves], [entry(dexGloves)]);
		const stats = computeAbilityScores(sheet, linked);
		const init = computeInitiative(sheet, linked, stats.dexterity.total);
		expect(init.total).toBe(4);
		expect(init.source).toBe("items");
		expect(computeInitiative(sheet, linked).total).toBe(3);
	});

	it("sem item que mexa em Destreza, CA e iniciativa seguem o valor da ficha", () => {
		const linked = linkedOf([gauntlets], [entry(gauntlets)]);
		const stats = computeAbilityScores(thalia, linked);
		expect(
			computeArmorClass(thalia, linked, stats.dexterity.total).source,
		).toBe("manual");
		expect(
			computeInitiative(thalia, linked, stats.dexterity.total).source,
		).toBe("manual");
	});
});

describe("deslocamento e salvaguardas", () => {
	it("soma o deslocamento e ignora o que tem condição", () => {
		const speed = computeSpeed({ speed: 9 }, linkedOf([boots], [entry(boots)]));
		expect(speed.base).toBe(9);
		expect(speed.total).toBe(12);
		expect(speed.parts).toEqual([{ label: boots.name, value: 3 }]);
	});

	it("bota na mochila não soma", () => {
		const speed = computeSpeed(
			{ speed: 9 },
			linkedOf([boots], [entry(boots, "backpack")]),
		);
		expect(speed.total).toBe(9);
	});

	it("soma salvaguardas só de item sintonizado", () => {
		const on = computeSavesBonus(linkedOf([protRing], [entry(protRing)]));
		expect(on.total).toBe(1);
		const off = computeSavesBonus(
			linkedOf([protRing], [entry(protRing, "equipped", { isAttuned: false })]),
		);
		expect(off.total).toBe(0);
	});
});

describe("PV estimado", () => {
	it("CON 14 → 19 em nível 7: +2 por nível", () => {
		expect(
			estimateHealthMax({
				healthMax: 58,
				level: 7,
				baseCon: 14,
				effectiveCon: 19,
			}),
		).toEqual({ from: 58, to: 72, perLevel: 2 });
	});

	it("sem mudança de modificador não há estimativa", () => {
		expect(
			estimateHealthMax({
				healthMax: 58,
				level: 7,
				baseCon: 14,
				effectiveCon: 15,
			}),
		).toBeNull();
	});

	it("sem PV máximo salvo não estima", () => {
		expect(
			estimateHealthMax({
				healthMax: 0,
				level: 3,
				baseCon: 10,
				effectiveCon: 18,
			}),
		).toBeNull();
	});

	it("nunca cai abaixo de 1 PV por nível", () => {
		const r = estimateHealthMax({
			healthMax: 10,
			level: 5,
			baseCon: 16,
			effectiveCon: 4,
		});
		expect(r?.to).toBe(5);
	});
});

describe("equipar e desequipar", () => {
	const items = [
		longsword,
		shield,
		ringOfAlertness,
		secondRing,
		gauntlets,
		protRing,
	];
	const map = byId(...items);

	it("equipa uma entrada da mochila no slot e grava o slot", () => {
		const inv = [entry(longsword, "backpack")];
		const { inventory, displaced } = equipEntryInSlot(
			inv,
			map,
			`inv-${longsword.id}`,
			"mainHand",
		);
		expect(inventory[0]).toMatchObject({
			location: "equipped",
			slot: "mainHand",
		});
		expect(displaced).toBeUndefined();
	});

	it("troca: quem estava no slot volta para a mochila, sem slot", () => {
		const inv = [
			entry(ringOfAlertness, "equipped", { slot: "ring1" }),
			entry(secondRing, "backpack"),
		];
		const out = equipEntryInSlot(inv, map, `inv-${secondRing.id}`, "ring1");
		const old = out.inventory.find((e) => e.id === `inv-${ringOfAlertness.id}`);
		expect(old?.location).toBe("backpack");
		expect(old?.slot).toBeUndefined();
		expect(out.displaced?.id).toBe(`inv-${ringOfAlertness.id}`);
		const next = out.inventory.find((e) => e.id === `inv-${secondRing.id}`);
		expect(next).toMatchObject({ location: "equipped", slot: "ring1" });
	});

	it("não equipa em slot que o item não comporta", () => {
		const inv = [entry(shield, "backpack")];
		const out = equipEntryInSlot(inv, map, `inv-${shield.id}`, "head");
		expect(out.inventory).toEqual(inv);
	});

	it("entrada inexistente não muda nada", () => {
		const inv = [entry(longsword, "backpack")];
		expect(equipEntryInSlot(inv, map, "nada", "mainHand").inventory).toEqual(
			inv,
		);
	});

	it("item novo da campanha vira entrada vinculada já equipada", () => {
		const out = equipNewItemInSlot([], map, shield, "offHand", {
			newId: () => "novo",
		});
		expect(out.inventory).toHaveLength(1);
		expect(out.inventory[0]).toMatchObject({
			id: "novo",
			campaignItemId: shield.id,
			location: "equipped",
			slot: "offHand",
		});
	});

	it("item novo em slot errado não cria nada", () => {
		expect(equipNewItemInSlot([], map, shield, "head").inventory).toEqual([]);
	});

	it("desequipar leva para a mochila e limpa o slot", () => {
		const inv = [entry(longsword, "equipped", { slot: "mainHand" })];
		const [out] = unequipEntry(inv, `inv-${longsword.id}`);
		expect(out.location).toBe("backpack");
		expect(out.slot).toBeUndefined();
	});

	it("não muta o inventário recebido", () => {
		const inv = [entry(longsword, "backpack")];
		const snapshot = structuredClone(inv);
		equipEntryInSlot(inv, map, `inv-${longsword.id}`, "mainHand");
		unequipEntry(inv, `inv-${longsword.id}`);
		expect(inv).toEqual(snapshot);
	});
});

describe("slot padrão e ficha sem equipamento", () => {
	it("sugere o primeiro slot livre; ocupados, o primeiro (troca)", () => {
		const linkedOne = linkedOf(
			[ringOfAlertness],
			[entry(ringOfAlertness, "equipped", { slot: "ring1" })],
		);
		expect(defaultSlotFor(secondRing, linkedOne)).toBe("ring2");
		const both = linkedOf(
			[ringOfAlertness, protRing],
			[
				entry(ringOfAlertness, "equipped", { slot: "ring1" }),
				entry(protRing, "equipped", { slot: "ring2" }),
			],
		);
		expect(defaultSlotFor(secondRing, both)).toBe("ring1");
		expect(
			defaultSlotFor(make("w", { type: "Item Maravilhoso" }), []),
		).toBeUndefined();
	});

	it("withoutEquipment põe tudo na mochila sem mexer no resto", () => {
		const inv = [
			entry(longsword, "equipped", { slot: "mainHand" }),
			entry(shield, "mount_stash"),
		];
		const out = withoutEquipment(inv);
		expect(out[0]).toMatchObject({ location: "backpack" });
		expect(out[0].slot).toBeUndefined();
		expect(out[1].location).toBe("mount_stash");
		expect(inv[0].location).toBe("equipped");
	});

	it("o 'sem itens' devolve os números salvos da ficha", () => {
		const sheet = { ...thalia, strength: 14, system: "dnd5e" } as typeof thalia;
		const inventoryList = [entry(gauntlets, "equipped", { slot: "hands" })];
		const map = byId(gauntlets);
		const withItems = computeEffectiveStats({ ...sheet, inventoryList }, map);
		const bare = computeEffectiveStats(
			{ ...sheet, inventoryList: withoutEquipment(inventoryList) },
			map,
		);
		expect(withItems.abilities.strength.total).toBe(19);
		expect(bare.abilities.strength.total).toBe(14);
	});

	it("fora do D&D 5e os itens não mudam nada", () => {
		const other = { ...thalia, system: "ordem", strength: 14 } as typeof thalia;
		const stats = computeEffectiveStats(
			{ ...other, inventoryList: [entry(gauntlets)] },
			byId(gauntlets),
		);
		expect(stats.abilities.strength.total).toBe(14);
		expect(stats.linked).toEqual([]);
	});
});

describe("sintonização (limite de 3)", () => {
	const a1 = make("at1", { type: "Anel", requiresAttunement: true });
	const a2 = make("at2", { type: "Amuleto", requiresAttunement: true });
	const a3 = make("at3", { slot: "hands", requiresAttunement: true });
	const a4 = make("at4", { slot: "head", requiresAttunement: true });
	const map = byId(a1, a2, a3, a4);

	it("conta só equipados e sintonizados", () => {
		const linked = linkedOf(
			[a1, a2, a3],
			[
				entry(a1),
				entry(a2, "backpack"),
				entry(a3, "equipped", { isAttuned: false }),
			],
		);
		expect(attunedCount(linked)).toBe(1);
	});

	it("o quarto item equipa, mas sem sintonizar", () => {
		const inv = [
			entry(a1, "equipped", { slot: "ring1" }),
			entry(a2, "equipped", { slot: "neck" }),
			entry(a3, "equipped", { slot: "hands" }),
			entry(a4, "backpack", { isAttuned: true }),
		];
		expect(attunedCount(linkedOf([a1, a2, a3, a4], inv))).toBe(
			MAX_ATTUNED_ITEMS,
		);
		const out = equipEntryInSlot(inv, map, `inv-${a4.id}`, "head");
		expect(out.attunementFull).toBe(true);
		const fourth = out.inventory.find((e) => e.id === `inv-${a4.id}`);
		expect(fourth).toMatchObject({ location: "equipped", isAttuned: false });
	});

	it("trocar um sintonizado por outro mantém a vaga", () => {
		const inv = [
			entry(a1, "equipped", { slot: "ring1" }),
			entry(a2, "equipped", { slot: "neck" }),
			entry(a3, "equipped", { slot: "hands" }),
			entry(a4, "backpack", { isAttuned: true }),
		];
		// a4 vai para "hands" no lugar de a3: a vaga de a3 é liberada.
		const swapped = { ...a4, slot: "hands" as const };
		const out = equipEntryInSlot(
			inv,
			byId(a1, a2, a3, swapped),
			`inv-${a4.id}`,
			"hands",
		);
		expect(out.attunementFull).toBe(false);
		expect(out.inventory.find((e) => e.id === `inv-${a4.id}`)?.isAttuned).toBe(
			true,
		);
	});
});

describe("liga e desliga a sintonia", () => {
	const items = [ringOfAlertness, gauntlets, amulet, protRing, shield];
	const map = byId(...items);
	const full = () => [
		entry(gauntlets, "equipped", { slot: "hands" }),
		entry(amulet, "equipped", { slot: "neck" }),
		entry(protRing, "equipped", { slot: "ring1" }),
		entry(ringOfAlertness, "equipped", { slot: "ring2", isAttuned: false }),
	];

	it("com 3 sintonizados, o quarto não consegue sintonizar", () => {
		const inv = full();
		const out = setAttunement(inv, map, `inv-${ringOfAlertness.id}`, true);
		expect(out.ok).toBe(false);
		expect(out.inventory).toEqual(inv);
	});

	it("tirar a sintonia de um libera a vaga para o outro", () => {
		const released = setAttunement(full(), map, `inv-${amulet.id}`, false);
		expect(released.ok).toBe(true);
		const out = setAttunement(
			released.inventory,
			map,
			`inv-${ringOfAlertness.id}`,
			true,
		);
		expect(out.ok).toBe(true);
		expect(
			out.inventory.find((e) => e.id === `inv-${ringOfAlertness.id}`)
				?.isAttuned,
		).toBe(true);
	});

	it("item que não exige sintonização não muda", () => {
		const inv = [entry(shield, "equipped", { slot: "offHand" })];
		expect(setAttunement(inv, map, `inv-${shield.id}`, true).ok).toBe(false);
	});

	it("não sintoniza o que está na mochila", () => {
		const inv = [entry(protRing, "backpack", { isAttuned: false })];
		expect(setAttunement(inv, map, `inv-${protRing.id}`, true).ok).toBe(false);
	});

	it("não muta o inventário recebido", () => {
		const inv = full();
		const snapshot = structuredClone(inv);
		setAttunement(inv, map, `inv-${amulet.id}`, false);
		expect(inv).toEqual(snapshot);
	});
});

describe("texto dos efeitos", () => {
	it("a lista de itens da campanha mostra atributos e bônus gerais", () => {
		expect(describeLinkCandidate(gauntlets)).toBe(
			"Item Maravilhoso · FOR → 19 · sintonização",
		);
		expect(describeLinkCandidate(boots)).toBe(
			"Item Maravilhoso · +3 Deslocamento · +6 Deslocamento · sintonização",
		);
		expect(describeLinkCandidate(protRing)).toBe(
			"Anel · +1 CA · +1 Salvaguardas · sintonização",
		);
	});

	it("descreve fixa e soma", () => {
		expect(
			describeAbilityBonus({
				id: "1",
				ability: "strength",
				mode: "set",
				value: 19,
			}),
		).toBe("FOR → 19");
		expect(
			describeAbilityBonus({
				id: "1",
				ability: "dexterity",
				mode: "add",
				value: 2,
			}),
		).toBe("DES +2");
	});

	it("lista atributos, CA e bônus gerais do item", () => {
		const chips = describeItemEffects(protRing);
		expect(chips).toEqual([
			{ label: "CA", value: "+1" },
			{ label: "Salvag.", value: "+1" },
		]);
		expect(describeItemEffects(gauntlets)).toEqual([
			{ label: "FOR", value: "→ 19" },
		]);
		expect(describeItemEffects(shield)).toEqual([{ label: "CA", value: "+2" }]);
	});
});
