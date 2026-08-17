import type { Campaign } from "../store/types";

/**
 * After reloading memberships, pick which campaign/world should stay active.
 * Must NOT yank the user back to campaigns[0] when they intentionally selected
 * another world (including an empty one).
 */
export function resolveActiveContextAfterCampaignLoad({
	campaigns,
	activeCampaignId,
	activeWorldId,
}: {
	campaigns: Array<Pick<Campaign, "id" | "worldId">>;
	activeCampaignId: string | null;
	activeWorldId: string | null;
}): { campaignId: string | null; worldId: string | null } {
	if (
		activeCampaignId &&
		campaigns.some((campaign) => campaign.id === activeCampaignId)
	) {
		const active = campaigns.find(
			(campaign) => campaign.id === activeCampaignId,
		);
		return {
			campaignId: active?.id ?? null,
			worldId: active?.worldId ?? activeWorldId,
		};
	}

	if (activeWorldId) {
		const inWorld = campaigns.find(
			(campaign) => campaign.worldId === activeWorldId,
		);
		if (inWorld) {
			return { campaignId: inWorld.id, worldId: activeWorldId };
		}

		return { campaignId: null, worldId: activeWorldId };
	}

	const first = campaigns[0];
	if (first) {
		return {
			campaignId: first.id,
			worldId: first.worldId,
		};
	}

	return {
		campaignId: null,
		worldId: activeWorldId,
	};
}
