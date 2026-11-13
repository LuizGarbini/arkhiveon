import { useMemo } from "react";
import {
	canLinkOnSheet,
	computeEffectiveStats,
	type EffectiveStats,
} from "@/core/rules";
import { useAuth } from "@/lib/auth";
import { useActiveCampaignRole, useRPGStore } from "@/lib/store";
import type { Character, Item } from "@/lib/store/types";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";

const EMPTY_ITEMS: Item[] = [];

/** Itens da aba Itens que o usuário enxerga (secreto some para o jogador). */
export function useCampaignItems(): {
	items: Item[];
	byId: ReadonlyMap<string, Item>;
} {
	const all = useRPGStore((s) => s.items) ?? EMPTY_ITEMS;
	const items = useVisibleWorldEntities(all);
	return useMemo(
		() => ({ items, byId: new Map(items.map((i) => [i.id, i])) }),
		[items],
	);
}

/** Mestre ou editor da campanha (mesma regra do UPDATE de characters). */
export function useCanLinkOnSheet(character: Pick<Character, "createdBy">) {
	const role = useActiveCampaignRole();
	const { user } = useAuth();
	return canLinkOnSheet({
		role,
		characterCreatedBy: character.createdBy,
		userId: user?.id,
	});
}

/**
 * Números efetivos da ficha com os itens No Corpo: atributos, CA, iniciativa,
 * deslocamento e salvaguardas (o valor salvo quando nenhum item mexe).
 */
export function useCombatStats(
	character: Character,
): EffectiveStats & { itemsById: ReadonlyMap<string, Item> } {
	const { byId } = useCampaignItems();
	return useMemo(
		() => ({ itemsById: byId, ...computeEffectiveStats(character, byId) }),
		[character, byId],
	);
}
