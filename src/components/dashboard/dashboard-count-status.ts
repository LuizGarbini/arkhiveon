import type { RPGState } from "@/lib/store/types";
import type { DashboardCountStatus } from "./dashboard-count";

interface CountStatusInput {
	isLoadingRemote: boolean;
	hasCampaignSnapshot: boolean;
	loadError: string | null;
	/**
	 * Mesa ainda sem dados nesta sessão: a lista chegou e a mesa ativa ainda
	 * não foi escolhida, ou o id já existe e a carga remota não.
	 */
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
		isLoadingRemote: state.isLoadingRemote || state.isRetryingBase,
		hasCampaignSnapshot: state.hasLoadedCampaigns,
		// Qualquer falha base (campanhas, vínculos, plano, convites) ou da mesa.
		loadError:
			state.remoteLoadError ??
			state.baseLoadError ??
			(state.campaignLoadStatus === "error" && !state.isRetryingBase
				? "base"
				: null),
		awaitingActiveCampaignData:
			(state.activeCampaignId !== null &&
				state.remoteLoadedCampaignId !== state.activeCampaignId) ||
			// loadCampaigns grava a lista e só depois escolhe a mesa. Nesse
			// intervalo não há sistema nem papel; mundo vazio (id de mundo
			// sem mesa) não entra aqui.
			(state.hasLoadedCampaigns &&
				state.campaigns.length > 0 &&
				state.activeCampaignId === null &&
				state.activeWorldId === null),
	});
}
