/**
 * Whether the empty-state "create your first campaign" UI should show.
 * Must stay false until campaigns have been fetched for this session,
 * otherwise a cold browser flash looks like a brand-new account.
 */
export function shouldShowEmptyCampaignOnboarding({
	hasLoadedCampaigns,
	isLoadingRemote,
	campaignCount,
}: {
	hasLoadedCampaigns: boolean;
	isLoadingRemote: boolean;
	campaignCount: number;
}): boolean {
	return hasLoadedCampaigns && !isLoadingRemote && campaignCount === 0;
}
