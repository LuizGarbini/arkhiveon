/**
 * Bootstrap / onboarding gates for first-time Mundo → Campanha setup.
 * Must stay false until campaigns (and worlds) have been fetched for this session,
 * otherwise a cold browser flash looks like a brand-new account.
 */

export function shouldShowEmptyCampaignOnboarding({
	hasLoadedCampaigns,
	campaignCount,
}: {
	hasLoadedCampaigns: boolean;
	campaignCount: number;
}): boolean {
	return hasLoadedCampaigns && campaignCount === 0;
}

/** Full-screen Mundo → Campanha onboarding (Approach A). */
export function needsAppOnboarding({
	hasLoadedCampaigns,
	campaignCount,
}: {
	hasLoadedCampaigns: boolean;
	campaignCount: number;
}): boolean {
	return hasLoadedCampaigns && campaignCount === 0;
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
