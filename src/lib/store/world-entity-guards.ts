import type { StateCreator } from "zustand";
import { WORLD_GRIMOIRE_FORBIDDEN } from "../worldbuilding/campaign-content";
import {
	canCreateCampaignItem,
	canManageOwnItem,
	viewerSafeItemPublication,
} from "../worldbuilding/item-ownership";
import {
	isWorldStaffInWorld,
	validateRestrictedScope,
} from "../worldbuilding/visibility";
import type { Item, PublicationScope, RPGState } from "./types";

type SetState = Parameters<StateCreator<RPGState, [], [], unknown>>[0];

export function activeCampaignRole(
	get: () => RPGState,
): ReturnType<typeof get>["campaigns"][number]["myRole"] {
	const activeCampaignId = get().activeCampaignId;
	return get().campaigns.find((c) => c.id === activeCampaignId)?.myRole;
}

export function denyUnlessWorldStaff(
	get: () => RPGState,
	set: SetState,
	message: string = WORLD_GRIMOIRE_FORBIDDEN,
): boolean {
	const activeCampaignId = get().activeCampaignId;
	const activeCampaign = get().campaigns.find((c) => c.id === activeCampaignId);
	if (
		!activeCampaign?.worldId ||
		!isWorldStaffInWorld(get().campaigns, activeCampaign.worldId)
	) {
		set({ syncError: message });
		return false;
	}
	return true;
}

/**
 * Staff do Mundo OU jogador com item próprio (§5.3).
 * `actingUserId` é obrigatório para o caminho de viewer.
 */
export function allowItemWrite(
	get: () => RPGState,
	set: SetState,
	actingUserId: string | undefined,
	existing?: Item,
): "staff" | "owner" | false {
	const activeCampaignId = get().activeCampaignId;
	const activeCampaign = get().campaigns.find((c) => c.id === activeCampaignId);
	if (!activeCampaign?.worldId) {
		set({ syncError: WORLD_GRIMOIRE_FORBIDDEN });
		return false;
	}

	if (isWorldStaffInWorld(get().campaigns, activeCampaign.worldId)) {
		return "staff";
	}

	const role = activeCampaign.myRole;
	if (!existing) {
		if (!canCreateCampaignItem(role) || !actingUserId) {
			set({ syncError: WORLD_GRIMOIRE_FORBIDDEN });
			return false;
		}
		return "owner";
	}

	if (canManageOwnItem(existing, actingUserId, false)) {
		return "owner";
	}

	set({ syncError: WORLD_GRIMOIRE_FORBIDDEN });
	return false;
}

export function constrainItemPayloadForViewer(
	campaignId: string,
	payload: Partial<Item>,
): Partial<Item> {
	return {
		...payload,
		...viewerSafeItemPublication(campaignId),
	};
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
