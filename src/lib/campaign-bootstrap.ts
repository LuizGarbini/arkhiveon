import type { CampaignLoadStatus } from "./store/types";

interface CampaignBootstrapState {
	campaignLoadStatus: CampaignLoadStatus;
	campaignCount: number;
}

export function isCampaignLoadPending(
	campaignLoadStatus: CampaignLoadStatus,
): boolean {
	return campaignLoadStatus === "idle" || campaignLoadStatus === "loading";
}

function hasConfirmedEmptyCampaigns({
	campaignLoadStatus,
	campaignCount,
}: CampaignBootstrapState): boolean {
	return campaignLoadStatus === "ready" && campaignCount === 0;
}

/**
 * Bootstrap / onboarding gates for first-time Mundo → Campanha setup.
 * Must stay false until campaigns (and worlds) have been fetched for this session,
 * otherwise a cold browser flash looks like a brand-new account.
 */

export function shouldShowEmptyCampaignOnboarding(
	state: CampaignBootstrapState,
): boolean {
	return hasConfirmedEmptyCampaigns(state);
}

/** Full-screen Mundo → Campanha onboarding (Approach A). */
export function needsAppOnboarding(state: CampaignBootstrapState): boolean {
	return hasConfirmedEmptyCampaigns(state);
}

/**
 * Which step to show when the user is in onboarding.
 * - world: no owned worlds yet
 * - campaign: already has a Mundo, still needs a first mesa
 */
export function appOnboardingStep({
	ownedWorldCount,
}: {
	ownedWorldCount: number;
}): "world" | "campaign" {
	return ownedWorldCount === 0 ? "world" : "campaign";
}
