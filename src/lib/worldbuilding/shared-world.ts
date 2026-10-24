import type { Campaign } from "@/lib/store/types";

interface WorldOwnership {
	id: string;
	ownerUserId?: string | null;
}

/**
 * Um mundo é "compartilhado" quando não é do usuário ou quando outra pessoa
 * tem campanha nele. Nesses casos os registros globais do mundo aparecem em
 * todas as campanhas dele, então a interface avisa.
 */
export function isSharedWorld(
	world: WorldOwnership,
	campaigns: readonly Pick<Campaign, "worldId" | "ownerId">[],
	userId: string | undefined,
): boolean {
	if (!userId) return false;
	if (world.ownerUserId && world.ownerUserId !== userId) return true;
	return campaigns.some(
		(campaign) => campaign.worldId === world.id && campaign.ownerId !== userId,
	);
}
