import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createCampaignSlice } from "./store/campaign-slice";
import { createCharacterSlice } from "./store/character-slice";
import { createCollectionSlice } from "./store/collection-slice";
import { createNpcSlice } from "./store/npc-slice";
import { createSessionSlice } from "./store/session-slice";
import { createSpotifySlice } from "./store/spotify-slice";
import { createSyncSlice } from "./store/sync-slice";
import type { RPGState } from "./store/types";

export { characterDefaults } from "./store/character-slice";
export {
	itemDefaults,
	locationDefaults,
	loreDefaults,
} from "./store/collection-slice";
export { abilityModifier, formatModifier, systemLabel } from "./store/helpers";
export { npcDefaults } from "./store/npc-slice";
export { sessionDefaults } from "./store/session-slice";
export { FREE_CREATION_LIMIT, isCreationLimitReached } from "./store/sync-slice";
// Re-export types for convenience
export * from "./store/types";

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

export const useRPGStore = create<RPGState>()(
	persist(
		(...a) => ({
			...createCampaignSlice(...a),
			...createCharacterSlice(...a),
			...createNpcSlice(...a),
			...createSessionSlice(...a),
			...createCollectionSlice(...a),
			...createSpotifySlice(...a),
			...createSyncSlice(...a),
		}),
		{
			name: "arkhiveon-storage",
			version: 2,
			migrate: (persistedState) => stripPersistedDataImages(persistedState),
			partialize: (state) => ({
				// Persist everything except transient loading states
				activeCampaignId: state.activeCampaignId,
				campaigns: state.campaigns,
				characters: stripPersistedDataImages(state.characters),
				npcs: stripPersistedDataImages(state.npcs),
				sessions: stripPersistedDataImages(state.sessions),
				items: stripPersistedDataImages(state.items),
				locations: stripPersistedDataImages(state.locations),
				lores: stripPersistedDataImages(state.lores),
				activityLog: state.activityLog,
				spotifyJamLink: state.spotifyJamLink,
				spotifyJamActive: state.spotifyJamActive,
				spotifyToken: state.spotifyToken,
				spotifyUser: state.spotifyUser,
			}),
		},
	),
);
