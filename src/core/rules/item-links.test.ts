import { describe, expect, it } from "vitest";
import type { InventoryItem, Item } from "@/lib/store/types";
import {
	canLinkOnSheet,
	describeLinkCandidate,
	linkKindOf,
	linkStatus,
	makeLinkedEntry,
	parseWeightLbs,
	previewLinkEffect,
	resolveLinkedEntries,
	resolveLinkedInventory,
} from "./item-links";
import {
	byId,
	healingPotion,
	longsword,
	ringOfAlertness,
	shortbow,
	studdedLeather,
	thalia,
} from "./thalia.fixture";
import { getEquippedWeaponAttacks } from "./weapon-damage";

const scores = { strength: 16, dexterity: 16 };

function link(
	itemId: string,
	location: InventoryItem["location"] = "equipped",
	extra: Partial<InventoryItem> = {},
): InventoryItem {
	return {
		id: `inv-${itemId}`,
		name: "retrato antigo",
		quantity: 1,
		weightLbs: 0,
		location,
		category: "gear",
		campaignItemId: itemId,
		...extra,
	};
}

describe("resolveLinkedInventory", () => {
	it("arma vinculada No Corpo vira ataque com números do Item vivo", () => {
		const inv = [link(longsword.id, "equipped", { proficient: true })];
		const attacks = getEquippedWeaponAttacks(
			resolveLinkedInventory(inv, byId(longsword)),
			scores,
			2,
		);
		expect(attacks).toHaveLength(1);
		expect(attacks[0].name).toBe("Espada longa +1");
		expect(attacks[0].attackBonus).toBe(6);
		expect(attacks[0].formula).toBe("1d8+4");
	});

	it("editar o Item muda a ficha sem revincular (vivo)", () => {
		const inv = [link(longsword.id)];
		const edited = {
			...longsword,
			weapon: {
				...(longsword.weapon as NonNullable<Item["weapon"]>),
				magicBonus: 2,
			},
		};
		const [attack] = getEquippedWeaponAttacks(
			resolveLinkedInventory(inv, byId(edited)),
			scores,
			2,
		);
		expect(attack.attackBonus).toBe(7);
		expect(attack.formula).toBe("1d8+5");
	});

	it("desvincular (remover a entrada) tira o ataque", () => {
		const resolved = resolveLinkedInventory([], byId(longsword));
		expect(getEquippedWeaponAttacks(resolved, scores, 2)).toEqual([]);
	});

	it("item apagado ou secreto = missing, sem números", () => {
		const inv = [
			link(longsword.id, "equipped", {
				category: "weapon",
				weapon: {
					damageDice: "1d8",
					damageType: "slashing",
					ability: "strength",
				},
			}),
		];
		const items = byId();
		expect(linkStatus(inv[0], items)).toBe("missing");
		const resolved = resolveLinkedInventory(inv, items);
		expect(resolved[0].weapon).toBeUndefined();
		expect(getEquippedWeaponAttacks(resolved, scores, 2)).toEqual([]);
	});

	it("proficiência fica no vínculo", () => {
		const inv = [link(longsword.id, "equipped", { proficient: false })];
		const [attack] = getEquippedWeaponAttacks(
			resolveLinkedInventory(inv, byId(longsword)),
			scores,
			2,
		);
		expect(attack.attackBonus).toBe(4);
	});

	it("Mochila e Montaria não entram em ataques", () => {
		const inv = [
			link(longsword.id, "backpack"),
			link(shortbow.id, "mount_stash"),
		];
		expect(
			getEquippedWeaponAttacks(
				resolveLinkedInventory(inv, byId(longsword, shortbow)),
				scores,
				2,
			),
		).toEqual([]);
	});

	it("entrada antiga sem campaignItemId volta idêntica", () => {
		const old: InventoryItem = {
			id: "old",
			name: "Machado",
			quantity: 1,
			weightLbs: 4,
			location: "equipped",
			category: "weapon",
			weapon: {
				damageDice: "1d12",
				damageType: "slashing",
				ability: "strength",
			},
		};
		const resolved = resolveLinkedInventory([old], byId(longsword));
		expect(resolved[0]).toBe(old);
	});

	it("resolveLinkedEntries ignora vínculo quebrado e entrada livre", () => {
		const inv = [
			link(longsword.id),
			link("sumiu"),
			{ ...link("x"), campaignItemId: undefined },
		];
		expect(
			resolveLinkedEntries(inv, byId(longsword)).map((l) => l.item.id),
		).toEqual([longsword.id]);
	});
});

describe("canLinkOnSheet", () => {
	it("mestre vincula em qualquer ficha", () => {
		expect(
			canLinkOnSheet({
				role: "owner",
				characterCreatedBy: "outro",
				userId: "eu",
			}),
		).toBe(true);
	});
	it("co-mestre só na ficha que criou", () => {
		expect(
			canLinkOnSheet({
				role: "editor",
				characterCreatedBy: "eu",
				userId: "eu",
			}),
		).toBe(true);
		expect(
			canLinkOnSheet({
				role: "editor",
				characterCreatedBy: "outro",
				userId: "eu",
			}),
		).toBe(false);
		expect(
			canLinkOnSheet({
				role: "editor",
				characterCreatedBy: undefined,
				userId: "eu",
			}),
		).toBe(false);
	});
	it("viewer não vincula em ficha alheia", () => {
		expect(
			canLinkOnSheet({
				role: "viewer",
				characterCreatedBy: "outro",
				userId: "eu",
			}),
		).toBe(false);
	});
});

describe("makeLinkedEntry", () => {
	it("grava só o vínculo e o retrato de exibição", () => {
		const entry = makeLinkedEntry(
			longsword,
			{ location: "equipped", proficient: true },
			() => "new-1",
		);
		expect(entry).toEqual({
			id: "new-1",
			name: "Espada longa +1",
			quantity: 1,
			weightLbs: 3.3,
			location: "equipped",
			category: "weapon",
			campaignItemId: longsword.id,
			proficient: true,
		});
		expect(entry.weapon).toBeUndefined();
	});
	it("item com sintonização entra sintonizado; não-arma sem proficiência", () => {
		const entry = makeLinkedEntry(
			ringOfAlertness,
			{ location: "equipped", proficient: true },
			() => "r",
		);
		expect(entry.isAttuned).toBe(true);
		expect("proficient" in entry).toBe(false);
	});
});

describe("previewLinkEffect", () => {
	const onBody = { location: "equipped" as const, proficient: true };
	it("arma No Corpo: acerto e dano", () => {
		const e = previewLinkEffect(longsword, thalia, onBody);
		expect(e.text).toBe("Acerto +6 · Dano 1d8+4 cortante");
		expect(e.short).toBe("Acerto +6 · Dano 1d8+4");
	});
	it("muda com a proficiência", () => {
		expect(
			previewLinkEffect(longsword, thalia, { ...onBody, proficient: false })
				.text,
		).toBe("Acerto +4 · Dano 1d8+4 cortante");
	});
	it("armadura: CA 15", () => {
		expect(previewLinkEffect(studdedLeather, thalia, onBody).text).toBe(
			"CA 15",
		);
	});
	it("anel: Iniciativa +4", () => {
		expect(previewLinkEffect(ringOfAlertness, thalia, onBody).text).toBe(
			"Iniciativa +4",
		);
	});
	it("Mochila / Montaria", () => {
		expect(
			previewLinkEffect(longsword, thalia, { ...onBody, location: "backpack" })
				.text,
		).toBe("Só carrega");
		expect(
			previewLinkEffect(longsword, thalia, {
				...onBody,
				location: "mount_stash",
			}).text,
		).toBe("Não pesa");
	});
	it("poção No Corpo não mexe em número", () => {
		expect(previewLinkEffect(healingPotion, thalia, onBody).kind).toBe("none");
	});
});

describe("descrição e categorias", () => {
	it("linha do item no formato do mock", () => {
		expect(describeLinkCandidate(longsword)).toBe(
			"Arma · 1d8 cortante · +1 · versátil",
		);
		expect(describeLinkCandidate(shortbow)).toBe(
			"Arma · 1d6 perfurante · distância 24/96 m",
		);
		expect(describeLinkCandidate(studdedLeather)).toBe(
			"Armadura leve · CA 12 + DES",
		);
		expect(describeLinkCandidate(ringOfAlertness)).toBe(
			"Anel · +1 Iniciativa · sintonização",
		);
		expect(describeLinkCandidate(healingPotion)).toBe("Poção · 2d4+2 PV");
	});
	it("chips", () => {
		expect(linkKindOf(longsword)).toBe("weapon");
		expect(linkKindOf(studdedLeather)).toBe("armor");
		expect(linkKindOf(ringOfAlertness)).toBe("ring");
		expect(linkKindOf(healingPotion)).toBe("consumable");
	});
	it("peso", () => {
		expect(parseWeightLbs("1,5 kg")).toBe(3.3);
		expect(parseWeightLbs("3 lb")).toBe(3);
		expect(parseWeightLbs("")).toBe(0);
	});
});
