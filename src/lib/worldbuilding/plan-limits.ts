import type { Campaign, UserPlan, World } from "@/lib/store/types";

export const FREE_OWNED_WORLDS_LIMIT = 1;
export const PRO_OWNED_WORLDS_LIMIT = 5;
export const FREE_OWNED_CAMPAIGNS_PER_WORLD = 1;
export const PRO_OWNED_CAMPAIGNS_PER_WORLD = 5;

export function maxOwnedWorlds(plan: UserPlan): number {
	return plan === "pro" ? PRO_OWNED_WORLDS_LIMIT : FREE_OWNED_WORLDS_LIMIT;
}

export function maxOwnedCampaignsPerWorld(plan: UserPlan): number {
	return plan === "pro"
		? PRO_OWNED_CAMPAIGNS_PER_WORLD
		: FREE_OWNED_CAMPAIGNS_PER_WORLD;
}

export function countOwnedWorlds(
	worlds: World[],
	ownerUserId: string | undefined,
): number {
	if (!ownerUserId) return 0;
	return worlds.filter((w) => w.ownerUserId === ownerUserId).length;
}

export function countOwnedCampaignsInWorld(
	campaigns: Campaign[],
	worldId: string,
): number {
	return campaigns.filter(
		(c) => c.worldId === worldId && c.myRole === "owner",
	).length;
}

export function worldLimitError(plan: UserPlan): string {
	const max = maxOwnedWorlds(plan);
	return plan === "pro"
		? `Você atingiu o limite de ${max} Mundos do plano Pro.`
		: `No plano Free você pode ter ${max} Mundo. Faça upgrade para o Pro e tenha até ${PRO_OWNED_WORLDS_LIMIT} Mundos.`;
}

export function campaignPerWorldLimitError(plan: UserPlan): string {
	const max = maxOwnedCampaignsPerWorld(plan);
	return plan === "pro"
		? `Você atingiu o limite de ${max} campanhas neste Mundo (plano Pro).`
		: `No plano Free você pode ter ${max} campanha por Mundo. Faça upgrade para o Pro e tenha até ${PRO_OWNED_CAMPAIGNS_PER_WORLD} por Mundo.`;
}
