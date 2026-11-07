/** Design System — ativo em dev local ou quando explicitamente habilitado no build. */
export function isDesignSystemEnabled(): boolean {
	return (
		import.meta.env.DEV || import.meta.env.VITE_ENABLE_DESIGN_SYSTEM === "true"
	);
}

/**
 * Transferir mestre fica desligado até o build trazer exatamente "true".
 * Não há atalho de DEV: produção só liga quando Luiz habilitar depois da 0059.
 */
export function isTransferCampaignOwnershipEnabled(): boolean {
	return import.meta.env.VITE_ENABLE_TRANSFER_CAMPAIGN_OWNERSHIP === "true";
}
