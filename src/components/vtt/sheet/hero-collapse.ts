/**
 * Quando o cabeçalho (retrato, PV, condições) recolhe numa barra fina enquanto
 * se rola o conteúdo da aba.
 *
 * Recolher libera espaço e o conteúdo desce; sem cuidado isso reabre o
 * cabeçalho na hora e vira um pisca-pisca. Por isso:
 *   - só recolhe se, depois de recolher, ainda há o que rolar;
 *   - só volta a abrir no topo da lista;
 *   - ignora rolagens logo depois de uma troca (o conteúdo ainda está se ajeitando).
 */
export const HERO_COLLAPSE_AFTER_PX = 28;
/** Altura aproximada que o cabeçalho completo ocupa a mais que a barra. */
export const HERO_FREED_PX = 120;
export const HERO_SETTLE_MS = 250;

export function nextHeroCollapsed(input: {
	collapsed: boolean;
	/** Quanto o conteúdo já rolou. */
	scrollTop: number;
	/** Quanto ainda dá para rolar no total (scrollHeight − clientHeight). */
	overflow: number;
	/** Tempo desde a última troca recolhido/aberto. */
	sinceToggleMs: number;
}): boolean {
	const { collapsed, scrollTop, overflow, sinceToggleMs } = input;
	if (sinceToggleMs < HERO_SETTLE_MS) return collapsed;
	if (!collapsed) {
		return scrollTop > HERO_COLLAPSE_AFTER_PX && overflow > HERO_FREED_PX + 48;
	}
	return scrollTop > 0;
}
