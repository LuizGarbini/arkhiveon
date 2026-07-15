/**
 * Whether the empty-state "create your first campaign" UI should show.
 * Must stay false until campaigns have been fetched for this session,
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
