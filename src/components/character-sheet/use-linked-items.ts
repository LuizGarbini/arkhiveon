import { useMemo } from "react";
import { canLinkOnSheet } from "@/core/rules";
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

/** Mesma regra do servidor (migration 0038). */
export function useCanLinkOnSheet(character: Pick<Character, "createdBy">) {
	const role = useActiveCampaignRole();
	const { user } = useAuth();
	return canLinkOnSheet({
		role,
		characterCreatedBy: character.createdBy,
		userId: user?.id,
	});
}
