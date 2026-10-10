/**
 * Regras de exibição do Assistente da mesa (piloto), compartilhadas entre a
 * aba VTT e o shell logado. A allowlist (`ia_mesa_pilot_campaigns`) continua
 * sendo consultada no Supabase via `fetchMesaPilotEnabled`; aqui só ficam as
 * regras puras de papel e de rota.
 */

interface CampaignRoleInfo {
	ownerId?: string | null;
	myRole?: string | null;
}

/** Mestre/dono/editor da campanha — o mesmo gate de `isGM` no VTT. */
export function canUseMesaAssistant(
	campaign: CampaignRoleInfo | null | undefined,
	userId: string | null | undefined,
): boolean {
	if (!campaign || !userId) return false;
	return (
		campaign.ownerId === userId ||
		campaign.myRole === "owner" ||
		campaign.myRole === "editor"
	);
}

/**
 * A aba VTT monta o próprio FAB (com a cena atual). O shell logado não monta
 * outro nessas rotas, para nunca haver dois botões na mesa.
 */
export function isVttPath(pathname: string): boolean {
	return /\/vtt(\/|$)/.test(pathname);
}
