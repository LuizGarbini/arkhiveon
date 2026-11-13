// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	longsword,
	ringOfAlertness,
	shield,
	studdedLeather,
	thalia,
} from "@/core/rules/thalia.fixture";
import { useRPGStore } from "@/lib/store";
import type { Character, InventoryItem, Item } from "@/lib/store/types";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

import { EquipmentDialog } from "./equipment-dialog";

function make(id: string, data: Partial<Item>): Item {
	return { ...ringOfAlertness, id, name: id, bonuses: undefined, ...data };
}

const gloves = make("gloves", {
	name: "Luvas de Poder de Ogro",
	type: "Item Maravilhoso",
	slot: "hands",
	requiresAttunement: true,
	abilityBonuses: [{ id: "a", ability: "strength", mode: "set", value: 19 }],
});
const amulet = make("amulet", {
	name: "Amuleto da Saúde",
	type: "Amuleto",
	requiresAttunement: true,
	abilityBonuses: [
		{ id: "a", ability: "constitution", mode: "set", value: 19 },
	],
});
const protRing = make("prot", {
	name: "Anel da Proteção",
	type: "Anel",
	requiresAttunement: true,
	bonuses: [{ id: "a", target: "ac", value: 1 }],
});
const newRing = make("ring-new", {
	name: "Anel Novo",
	type: "Anel",
	requiresAttunement: true,
	bonuses: [{ id: "a", target: "ac", value: 2 }],
});
const evasionRing = make("ring-free", {
	name: "Anel da Evasão",
	type: "Anel",
	bonuses: [{ id: "a", target: "ac", value: 1 }],
});

const allItems = [
	longsword,
	shield,
	studdedLeather,
	gloves,
	amulet,
	protRing,
	newRing,
	evasionRing,
];

function entry(
	item: Item,
	location: InventoryItem["location"],
	extra: Partial<InventoryItem> = {},
): InventoryItem {
	return {
		id: `e-${item.id}`,
		name: item.name,
		quantity: 1,
		weightLbs: 0,
		location,
		campaignItemId: item.id,
		...(item.requiresAttunement ? { isAttuned: true } : {}),
		...extra,
	};
}

const updateCharacter = vi.fn();

function setup({
	role = "owner",
	inventory,
}: {
	role?: "owner" | "viewer";
	inventory: InventoryItem[];
}) {
	const character = {
		...thalia,
		strength: 14,
		constitution: 14,
		dexterity: 12,
		level: 7,
		healthMax: 58,
		armorClass: 11,
		characterName: "Thalia",
		inventoryList: inventory,
	} as unknown as Character;
	useRPGStore.setState({
		campaigns: [{ id: "camp-1", worldId: "world-1", myRole: role }] as never,
		activeCampaignId: "camp-1",
		items: allItems,
		characters: [character],
		imageAssets: [],
		updateCharacter: updateCharacter as never,
	});
	render(
		<EquipmentDialog
			character={character}
			open
			onOpenChange={() => {}}
			speedUnit="m"
		/>,
	);
	return character;
}

beforeEach(() => {
	updateCharacter.mockReset();
});
afterEach(cleanup);

describe("EquipmentDialog", () => {
	it("mostra os atributos com os itens e o que mudou", () => {
		setup({
			inventory: [
				entry(gloves, "equipped", { slot: "hands" }),
				entry(amulet, "equipped", { slot: "neck" }),
			],
		});
		const str = screen.getByText("FOR").closest("li") as HTMLElement;
		expect(within(str).getByText("19")).toBeTruthy();
		expect(within(str).getByText("14")).toBeTruthy();
		expect(screen.getByText("2/3")).toBeTruthy();
		// CON 14 → 19 em nível 7: 58 → 72
		expect(screen.getByText("72")).toBeTruthy();
	});

	it("o resumo mostra a CA com os itens ao lado da CA sem eles", () => {
		setup({
			inventory: [
				entry(studdedLeather, "equipped", { slot: "armor" }),
				entry(shield, "equipped", { slot: "offHand" }),
			],
		});
		const card = screen.getByText("Classe de Armadura").closest("div")
			?.parentElement as HTMLElement;
		// Couro batido 12 + DES +1 + escudo +2 = 15 (sem itens: 11)
		expect(within(card).getByText("15")).toBeTruthy();
		expect(within(card).getByText("11")).toBeTruthy();
	});

	it("equipa um item da mochila no slot vazio e grava o slot", () => {
		setup({ inventory: [entry(protRing, "backpack")] });
		fireEvent.click(screen.getByRole("button", { name: /Anel 1: vazio/ }));
		fireEvent.click(screen.getByRole("button", { name: /Anel da Proteção/ }));
		expect(screen.getByText("O que muda na ficha")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
		expect(updateCharacter).toHaveBeenCalledTimes(1);
		const [id, patch] = updateCharacter.mock.calls[0];
		expect(id).toBe(thalia.id);
		expect(patch.inventoryList[0]).toMatchObject({
			location: "equipped",
			slot: "ring1",
		});
	});

	it("item que só existe na campanha vira entrada vinculada equipada", () => {
		setup({ inventory: [] });
		fireEvent.click(screen.getByRole("button", { name: /Anel 2: vazio/ }));
		fireEvent.click(screen.getByRole("button", { name: /Anel da Evasão/ }));
		fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
		const [, patch] = updateCharacter.mock.calls[0];
		expect(patch.inventoryList).toHaveLength(1);
		expect(patch.inventoryList[0]).toMatchObject({
			campaignItemId: evasionRing.id,
			location: "equipped",
			slot: "ring2",
		});
	});

	it("trocar o item do slot devolve o antigo para a mochila", () => {
		setup({
			inventory: [
				entry(evasionRing, "equipped", { slot: "ring1" }),
				entry(newRing, "backpack"),
			],
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Anel 1: Anel da Evasão/ }),
		);
		fireEvent.click(screen.getByRole("button", { name: /Anel Novo/ }));
		fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
		const [, patch] = updateCharacter.mock.calls[0];
		const old = patch.inventoryList.find(
			(e: InventoryItem) => e.id === `e-${evasionRing.id}`,
		);
		expect(old).toMatchObject({ location: "backpack" });
		expect(old.slot).toBeUndefined();
	});

	it("avisa quando já há 3 itens sintonizados", () => {
		setup({
			inventory: [
				entry(gloves, "equipped", { slot: "hands" }),
				entry(amulet, "equipped", { slot: "neck" }),
				entry(protRing, "equipped", { slot: "ring1" }),
				entry(newRing, "backpack"),
			],
		});
		fireEvent.click(screen.getByRole("button", { name: /Anel 2: vazio/ }));
		fireEvent.click(screen.getByRole("button", { name: /Anel Novo/ }));
		expect(screen.getByText(/Já há 3 itens sintonizados/)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Equipar" }));
		const [, patch] = updateCharacter.mock.calls[0];
		const equipped = patch.inventoryList.find(
			(e: InventoryItem) => e.id === `e-${newRing.id}`,
		);
		expect(equipped).toMatchObject({ location: "equipped", isAttuned: false });
	});

	it("tirar a sintonia pelo item equipado grava isAttuned falso", () => {
		setup({
			inventory: [entry(protRing, "equipped", { slot: "ring1" })],
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Anel 1: Anel da Proteção/ }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Sintonizado" }));
		const [, patch] = updateCharacter.mock.calls[0];
		expect(patch.inventoryList[0].isAttuned).toBe(false);
	});

	it("desequipar leva o item para a mochila", () => {
		setup({ inventory: [entry(longsword, "equipped", { slot: "mainHand" })] });
		fireEvent.click(
			screen.getByRole("button", { name: /Mão principal: Espada longa/ }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Desequipar" }));
		const [, patch] = updateCharacter.mock.calls[0];
		expect(patch.inventoryList[0]).toMatchObject({ location: "backpack" });
	});

	it("a aba Mochila lista o guardado e equipa com um clique", () => {
		setup({ inventory: [entry(protRing, "backpack")] });
		fireEvent.click(screen.getByRole("tab", { name: /Mochila/ }));
		fireEvent.click(
			screen.getByRole("button", {
				name: /Equipar Anel da Proteção em Anel 1/,
			}),
		);
		const [, patch] = updateCharacter.mock.calls[0];
		expect(patch.inventoryList[0]).toMatchObject({
			location: "equipped",
			slot: "ring1",
		});
	});

	it("quem não é mestre vê tudo, mas não troca o equipamento", () => {
		setup({
			role: "viewer",
			inventory: [entry(longsword, "equipped", { slot: "mainHand" })],
		});
		const emptyHead = screen.getByRole("button", { name: /Cabeça: vazio/ });
		expect((emptyHead as HTMLButtonElement).disabled).toBe(true);
		expect(screen.getByText(/Só o mestre e os co-mestres/)).toBeTruthy();
	});

	it("equipado sem slot aparece à parte, com Desequipar", () => {
		const wonder = make("wonder", { type: "Item Maravilhoso", name: "Pedra" });
		allItems.push(wonder);
		setup({ inventory: [entry(wonder, "equipped")] });
		expect(screen.getByText(/Equipados sem slot/)).toBeTruthy();
		allItems.pop();
	});
});
