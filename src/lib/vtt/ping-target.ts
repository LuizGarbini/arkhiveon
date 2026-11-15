/**
 * Qual personagem o destaque aponta (puro). Prefere o token sob o ponto (o de
 * cima, se houver vários); sem nenhum, o primeiro selecionado que ainda existe.
 */

export interface PingTargetToken {
	id: string;
	x: number;
	y: number;
	sizeCells: number;
}

/** Folga em volta do token para acertar sem precisar de pontaria. */
const TARGET_SLACK = 1.15;

export function highlightTarget(
	point: { x: number; y: number },
	tokens: readonly PingTargetToken[],
	gridSize: number,
	selectedIds: readonly string[],
): string | null {
	const cell = gridSize > 0 ? gridSize : 70;
	for (let i = tokens.length - 1; i >= 0; i--) {
		const token = tokens[i] as PingTargetToken;
		const radius =
			((token.sizeCells > 0 ? token.sizeCells : 1) * cell * TARGET_SLACK) / 2;
		if (Math.hypot(point.x - token.x, point.y - token.y) <= radius)
			return token.id;
	}
	const existing = new Set(tokens.map((token) => token.id));
	return selectedIds.find((id) => existing.has(id)) ?? null;
}
