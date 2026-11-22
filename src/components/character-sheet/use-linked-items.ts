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
 * deslocamento, salvaguardas, CD de magia e ataque de magia (o valor salvo
 * quando nenhum item mexe).
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

/** CA, iniciativa e deslocamento que os cards e listas mostram (com os itens). */
export interface CombatSummary {
	armorClass: number;
	initiative: number;
	speed: number;
}

/**
 * Mesma conta da ficha (`computeEffectiveStats`), só com os números que o card
 * de personagem e as listas do grupo mostram. Sem item que mexa no valor, fica
 * o que está salvo na ficha.
 */
export function effectiveCombatSummary(
	character: Character,
	itemsById: ReadonlyMap<string, Item>,
): CombatSummary {
	const stats = computeEffectiveStats(character, itemsById);
	return {
		armorClass: stats.ac.total,
		initiative: stats.initiative.total,
		speed: stats.speed.total,
	};
}

/**
 * Para o card de um personagem. A lista de personagens e o painel mostram só
 * as fichas da campanha ativa (`loadRemoteState`), e os itens do store são os
 * do mundo dela: a mesma fonte da ficha.
 */
export function useCombatSummary(
	character: Character | undefined,
): CombatSummary | null {
	const { byId } = useCampaignItems();
	return useMemo(
		() => (character ? effectiveCombatSummary(character, byId) : null),
		[character, byId],
	);
}

/** Para listas do grupo: um resumo por id de personagem. */
export function useCombatSummaries(
	characters: readonly Character[],
): ReadonlyMap<string, CombatSummary> {
	const { byId } = useCampaignItems();
	return useMemo(
		() =>
			new Map(characters.map((c) => [c.id, effectiveCombatSummary(c, byId)])),
		[characters, byId],
	);
}
