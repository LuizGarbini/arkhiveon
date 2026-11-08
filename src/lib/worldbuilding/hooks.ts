import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import {
	useActiveCampaign,
	useActiveCampaignRole,
	useRPGStore,
} from "@/lib/store";
import {
	filterVisibleContent,
	type ScopedContent,
} from "@/lib/worldbuilding/visibility";

export function useActiveCampaignContext() {
	const activeCampaign = useActiveCampaign();
	return useMemo(() => {
		if (!activeCampaign?.worldId) return null;
		return { id: activeCampaign.id, worldId: activeCampaign.worldId };
	}, [activeCampaign]);
}

export function useActiveWorld() {
	const activeWorldId = useRPGStore((s) => s.activeWorldId);
	const activeCampaign = useActiveCampaign();
	const worlds = useRPGStore((s) => s.worlds);
	return useMemo(() => {
		const worldId = activeWorldId || activeCampaign?.worldId;
		if (!worldId) return null;
		return worlds.find((w) => w.id === worldId) ?? null;
	}, [activeWorldId, activeCampaign?.worldId, worlds]);
}

export function useWorldCampaignsByWorldId(worldId: string | undefined) {
	const campaigns = useRPGStore((s) => s.campaigns);
	return useMemo(
		() => (worldId ? campaigns.filter((c) => c.worldId === worldId) : []),
		[campaigns, worldId],
	);
}

export function useVisibleWorldEntities<T extends ScopedContent>(
	items: T[],
): T[] {
	const activeCampaign = useActiveCampaignContext();
	const role = useActiveCampaignRole();
	const campaigns = useRPGStore((s) => s.campaigns);
	const { session } = useAuth();
	const userId = session?.user.id;
	return useMemo(
		() => filterVisibleContent(items, activeCampaign, role, campaigns, userId),
		[items, activeCampaign, role, campaigns, userId],
	);
}

export function useWorldCampaigns() {
	const activeCampaign = useActiveCampaign();
	const campaigns = useRPGStore((s) => s.campaigns);
	const worldId = activeCampaign?.worldId;
	return useMemo(
		() => (worldId ? campaigns.filter((c) => c.worldId === worldId) : []),
		[campaigns, worldId],
	);
}

export function useFactionReputationForActiveCampaign(factionId: string) {
	return useRPGStore((s) =>
		s.factionReputations.find(
			(r) => r.factionId === factionId && r.campaignId === s.activeCampaignId,
		),
	);
}
