import type { StateCreator } from "zustand";
import { WORLD_GRIMOIRE_FORBIDDEN } from "../worldbuilding/campaign-content";
import {
	isWorldStaffInWorld,
	validateRestrictedScope,
} from "../worldbuilding/visibility";
import type { PublicationScope, RPGState } from "./types";

export function activeCampaignRole(
	get: () => RPGState,
): ReturnType<typeof get>["campaigns"][number]["myRole"] {
	const activeCampaignId = get().activeCampaignId;
	return get().campaigns.find((c) => c.id === activeCampaignId)?.myRole;
}

export function denyUnlessWorldStaff(
	get: () => RPGState,
	set: Parameters<StateCreator<RPGState, [], [], unknown>>[0],
): boolean {
	const activeCampaignId = get().activeCampaignId;
	const activeCampaign = get().campaigns.find((c) => c.id === activeCampaignId);
	if (
		!activeCampaign?.worldId ||
		!isWorldStaffInWorld(get().campaigns, activeCampaign.worldId)
	) {
		set({ syncError: WORLD_GRIMOIRE_FORBIDDEN });
		return false;
	}
	return true;
}

export function validateEntityScopeForActiveWorld(
	get: () => RPGState,
	publicationScope: PublicationScope,
	campaignIds: string[],
): string | null {
	const activeCampaignId = get().activeCampaignId;
	const activeCampaign = get().campaigns.find((c) => c.id === activeCampaignId);
	if (!activeCampaign?.worldId) {
		return "Campanha ativa sem Mundo associado.";
	}
	const worldCampaignIds = get()
		.campaigns.filter((c) => c.worldId === activeCampaign.worldId)
		.map((c) => c.id);
	return validateRestrictedScope(
		publicationScope,
		campaignIds,
		worldCampaignIds,
	);
}
