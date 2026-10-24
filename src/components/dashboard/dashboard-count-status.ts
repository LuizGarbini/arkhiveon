import type { RPGState } from "@/lib/store/types";
import type { DashboardCountStatus } from "./dashboard-count";

interface CountStatusInput {
	isLoadingRemote: boolean;
	hasCampaignSnapshot: boolean;
	loadError: string | null;
	/** Há mesa ativa, mas os dados dela ainda não chegaram nesta sessão. */
	awaitingActiveCampaignData?: boolean;
}

/** Estado dos números do painel: carregando, erro ("—") ou pronto (inclui 0 real). */
export function dashboardCountStatus({
	isLoadingRemote,
	hasCampaignSnapshot,
	loadError,
	awaitingActiveCampaignData = false,
}: CountStatusInput): DashboardCountStatus {
	// Erro não é carregamento: mostra "—" em vez de skeleton eterno.
	if (loadError) return "error";
	if (isLoadingRemote || !hasCampaignSnapshot || awaitingActiveCampaignData)
		return "loading";
	return "ready";
}

/**
 * Seletor estável (retorna string) do estado dos dados do painel. Cobre o
 * intervalo do reload em que a carga ainda nem começou (isLoadingRemote ainda
 * false), para nenhuma seção mostrar estado vazio, CTA de criar ou 0 antes
 * dos dados chegarem.
 */
export function selectDashboardDataStatus(
	state: RPGState,
): DashboardCountStatus {
	return dashboardCountStatus({
		isLoadingRemote: state.isLoadingRemote,
		hasCampaignSnapshot: state.hasLoadedCampaigns,
		loadError: state.remoteLoadError,
		awaitingActiveCampaignData:
			state.activeCampaignId !== null &&
			state.remoteLoadedCampaignId !== state.activeCampaignId,
	});
}
