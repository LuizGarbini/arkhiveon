export const DEFAULT_WORLD_NAME = "Mundo Padrão";

export function isDefaultWorldName(name: string | undefined | null): boolean {
	return normalizeWorldName(name) === normalizeWorldName(DEFAULT_WORLD_NAME);
}

export function normalizeWorldName(name: string | undefined | null): string {
	return (name ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

/**
 * Contas antigas (já com campanha) que ainda têm "Mundo Padrão"
 * devem passar por um passo de nomeação — o onboarding completo não roda de novo.
 * O gate some assim que o nome deixa de ser o padrão (incluindo se o save remoto falhar e reverter).
 */
export function needsLegacyWorldNaming({
	hasLoadedCampaigns,
	campaignCount,
	ownedWorlds,
}: {
	hasLoadedCampaigns: boolean;
	campaignCount: number;
	ownedWorlds: Array<{ id: string; name: string }>;
}): { needed: boolean; worldId: string | null; worldName: string | null } {
	if (!hasLoadedCampaigns || campaignCount === 0) {
		return { needed: false, worldId: null, worldName: null };
	}

	const pending = ownedWorlds.find((world) => isDefaultWorldName(world.name));

	if (!pending) {
		return { needed: false, worldId: null, worldName: null };
	}

	return {
		needed: true,
		worldId: pending.id,
		worldName: pending.name,
	};
}
