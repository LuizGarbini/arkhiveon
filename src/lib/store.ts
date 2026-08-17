import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeCampaignSystem } from "./campaign-systems";
import { createCampaignSlice } from "./store/campaign-slice";
import { createCharacterSlice } from "./store/character-slice";
import { createCollectionSlice } from "./store/collection-slice";
import { createImageLibrarySlice } from "./store/image-library-slice";
import { createNpcSlice } from "./store/npc-slice";
import { createPartyLootSlice } from "./store/party-loot-slice";
import { createQuestSlice } from "./store/quest-slice";
import { createSessionSlice } from "./store/session-slice";
import { createSpotifySlice } from "./store/spotify-slice";
import { createSyncSlice } from "./store/sync-slice";
import type { ImageAsset, MembershipRole, RPGState } from "./store/types";
import { createWorldbuildingSlice } from "./store/worldbuilding-slice";

export { characterDefaults } from "./store/character-slice";
export {
	itemDefaults,
	locationDefaults,
	loreDefaults,
} from "./store/collection-slice";
export {
	abilityModifier,
	formatModifier,
	getAttributeExtraInfo,
	getAttributeFullName,
	systemLabel,
} from "./store/helpers";
export { npcDefaults } from "./store/npc-slice";
export { partyLootDefaults } from "./store/party-loot-slice";
export { questDefaults } from "./store/quest-slice";
export { sessionDefaults } from "./store/session-slice";
export {
	FREE_CREATION_LIMIT,
	isCreationLimitReached,
} from "./store/sync-slice";
// Re-export types for convenience
export * from "./store/types";
export { factionDefaults } from "./store/worldbuilding-slice";

const IMAGE_FIELDS = new Set(["imageUrl", "mapUrl"]);

function stripPersistedDataImages<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map(stripPersistedDataImages) as T;
	}

	if (!value || typeof value !== "object") {
		return value;
	}

	const next: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		if (
			IMAGE_FIELDS.has(key) &&
			typeof item === "string" &&
			item.startsWith("data:image/")
		) {
			next[key] = "";
			continue;
		}

		next[key] = stripPersistedDataImages(item);
	}

	return next as T;
}

function migratePersistedState(persistedState: unknown) {
	const migrated = stripPersistedDataImages(persistedState);
	if (!migrated || typeof migrated !== "object") return migrated;

	const state = migrated as { campaigns?: Array<Record<string, unknown>> };
	if (Array.isArray(state.campaigns)) {
		state.campaigns = state.campaigns.map((campaign) => ({
			...campaign,
			system: normalizeCampaignSystem(campaign.system),
		}));
	}

	return migrated;
}

export const useRPGStore = create<RPGState>()(
	persist(
		(...a) => ({
			...createCampaignSlice(...a),
			...createCharacterSlice(...a),
			...createNpcSlice(...a),
			...createSessionSlice(...a),
			...createCollectionSlice(...a),
			...createQuestSlice(...a),
			...createPartyLootSlice(...a),
			...createImageLibrarySlice(...a),
			...createSpotifySlice(...a),
			...createWorldbuildingSlice(...a),
			...createSyncSlice(...a),
		}),
		{
			name: "arkhiveon-storage",
			version: 3,
			migrate: migratePersistedState,
			partialize: (state) => ({
				activeCampaignId: state.activeCampaignId,
				activeWorldId: state.activeWorldId,
				campaigns: state.campaigns.map((c) => ({
					id: c.id,
					name: c.name,
					description: c.description,
					system: c.system,
					worldId: c.worldId,
					myRole: c.myRole,
				})),
				spotifyJamLink: state.spotifyJamLink,
				spotifyJamActive: state.spotifyJamActive,
			}),
		},
	),
);

export function useActiveCampaignId() {
	return useRPGStore((s) => s.activeCampaignId);
}

export function useActiveCampaignRole(): MembershipRole | undefined {
	return useRPGStore(
		(s) =>
			s.campaigns.find((campaign) => campaign.id === s.activeCampaignId)
				?.myRole,
	);
}

export function useIsCampaignMaster() {
	const role = useActiveCampaignRole();
	return role === "owner";
}

export function useIsWorldStaff() {
	return useRPGStore((s) => {
		const active = s.campaigns.find((c) => c.id === s.activeCampaignId);
		if (!active?.worldId) return false;
		return s.campaigns.some(
			(c) =>
				c.worldId === active.worldId &&
				(c.myRole === "owner" || c.myRole === "editor"),
		);
	});
}

export function useActiveCampaign() {
	return useRPGStore((s) =>
		s.campaigns.find((campaign) => campaign.id === s.activeCampaignId),
	);
}

export function useImageAssetLookup(): Map<string, ImageAsset> {
	const imageAssets = useRPGStore((s) => s.imageAssets);
	return useMemo(
		() => new Map(imageAssets.map((asset) => [asset.id, asset])),
		[imageAssets],
	);
}
