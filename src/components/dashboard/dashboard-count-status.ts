import type { DashboardCountStatus } from "./dashboard-count";

interface CountStatusInput {
	isLoadingRemote: boolean;
	hasCampaignSnapshot: boolean;
	loadError: string | null;
}

/** Estado dos números do painel: carregando, erro ("—") ou pronto (inclui 0 real). */
export function dashboardCountStatus({
	isLoadingRemote,
	hasCampaignSnapshot,
	loadError,
}: CountStatusInput): DashboardCountStatus {
	if (isLoadingRemote || !hasCampaignSnapshot) return "loading";
	if (loadError) return "error";
	return "ready";
}
