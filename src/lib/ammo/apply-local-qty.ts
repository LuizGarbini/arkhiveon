import { useRPGStore } from "@/lib/store";

/** Atualiza só a cópia local da quantidade. Não chama save LWW da ficha. */
export function applyLocalInventoryQuantity(
	characterId: string,
	entryId: string,
	quantity: number,
): void {
	const { characters } = useRPGStore.getState();
	useRPGStore.setState({
		characters: characters.map((character) => {
			if (character.id !== characterId) return character;
			const list = character.inventoryList ?? [];
			return {
				...character,
				inventoryList: list.map((entry) =>
					entry.id === entryId ? { ...entry, quantity } : entry,
				),
			};
		}),
	});
}
