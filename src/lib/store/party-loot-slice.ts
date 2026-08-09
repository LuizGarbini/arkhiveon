import type { StateCreator } from "zustand";
import { generateEntry, pushLog } from "./helpers";
import type { PartyLootItem, RPGState } from "./types";

export const partyLootDefaults: Omit<PartyLootItem, "id" | "createdAt"> = {
	name: "",
	quantity: 1,
	category: "Geral",
	description: "",
	properties: "",
	isClaimed: false,
};

export interface PartyLootSlice {
	partyLoot: PartyLootItem[];
	addPartyLootItem: (
		item: Partial<Omit<PartyLootItem, "id" | "createdAt">>,
	) => PartyLootItem;
	updatePartyLootItem: (id: string, item: Partial<PartyLootItem>) => void;
	removePartyLootItem: (id: string) => void;
	claimPartyLootItem: (
		id: string,
		characterId: string,
		characterName: string,
	) => void;
}

export const createPartyLootSlice: StateCreator<
	RPGState,
	[],
	[],
	PartyLootSlice
> = (set, get) => ({
	partyLoot: [],
	addPartyLootItem: (item) => {
		const created = generateEntry(partyLootDefaults, item) as PartyLootItem;
		const log = {
			action: "create" as const,
			entityKind: "partyLoot" as const,
			entityId: created.id,
			entityName: created.name || "Item de Saque",
		};

		set((state) => ({
			partyLoot: [created, ...state.partyLoot],
			activityLog: pushLog(state.activityLog, log),
		}));

		return created;
	},

	updatePartyLootItem: (id, patch) => {
		set((state) => ({
			partyLoot: state.partyLoot.map((item) =>
				item.id === id ? { ...item, ...patch } : item,
			),
		}));
	},

	removePartyLootItem: (id) => {
		set((state) => ({
			partyLoot: state.partyLoot.filter((item) => item.id !== id),
		}));
	},

	claimPartyLootItem: (id, characterId, characterName) => {
		const targetItem = get().partyLoot.find((item) => item.id === id);
		if (!targetItem) return;

		// Marcar no saque do grupo como reinvidicado por este personagem
		set((state) => ({
			partyLoot: state.partyLoot.map((item) =>
				item.id === id
					? {
							...item,
							isClaimed: true,
							claimedByCharacterId: characterId,
							claimedByCharacterName: characterName,
						}
					: item,
			),
		}));

		// Também adiciona o item no inventário individual do personagem se ele existir no store
		const character = get().characters.find((c) => c.id === characterId);
		if (character) {
			const currentEquipment = character.equipment || "";
			const newItemLine = `${targetItem.quantity}x ${targetItem.name}${targetItem.description ? ` (${targetItem.description})` : ""}`;
			const updatedEquipment = currentEquipment
				? `${currentEquipment}\n${newItemLine}`
				: newItemLine;

			get().updateCharacter(characterId, { equipment: updatedEquipment });
		}
	},
});
