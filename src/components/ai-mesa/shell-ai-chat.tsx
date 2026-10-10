import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { VTTAiChat } from "@/components/vtt/vtt-ai-chat";
import { fetchMesaPilotEnabled } from "@/lib/ai-mesa/client";
import { canUseMesaAssistant, isVttPath } from "@/lib/ai-mesa/gate";
import { useAuth } from "@/lib/auth";
import { useRPGStore } from "@/lib/store";

/**
 * Assistente da mesa no shell logado (fichas, mundo, NPCs…).
 * Mesmo componente/UX do VTT. Usa a campanha ativa do store; sem campanha
 * ativa, fora da allowlist ou sem papel de mestre/editor = nenhuma UI.
 * Em rotas `/vtt` não renderiza: lá o VTT monta o próprio FAB.
 */
export function ShellAiChat() {
	const { pathname } = useLocation();
	const { user } = useAuth();
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const campaign = useRPGStore((s) =>
		s.activeCampaignId
			? s.campaigns.find((c) => c.id === s.activeCampaignId)
			: undefined,
	);
	const allowedByRole = canUseMesaAssistant(campaign, user?.id);
	const onVtt = isVttPath(pathname);

	const [enabledFor, setEnabledFor] = useState<string | null>(null);
	useEffect(() => {
		let cancelled = false;
		setEnabledFor(null);
		if (!allowedByRole || !activeCampaignId || onVtt) return;
		const campaignId = activeCampaignId;
		void fetchMesaPilotEnabled(campaignId).then((enabled) => {
			if (!cancelled && enabled) setEnabledFor(campaignId);
		});
		return () => {
			cancelled = true;
		};
	}, [activeCampaignId, allowedByRole, onVtt]);

	if (onVtt || !allowedByRole || !activeCampaignId) return null;
	if (enabledFor !== activeCampaignId) return null;

	return (
		<VTTAiChat
			key={activeCampaignId}
			campaignId={activeCampaignId}
			campaignName={campaign?.name || "Campanha"}
			placement="fixed"
		/>
	);
}
