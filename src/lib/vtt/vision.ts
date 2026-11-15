import type { VTTToken } from "./types";

/**
 * Visão dos jogadores na névoa de exploração.
 *
 * Quem enxerga é o token de jogador (com ficha ou com quem o controle) que está
 * visível na cena. O alcance está em casas; aqui já sai em pixels da cena.
 */
export const DEFAULT_VISION_CELLS = 6;

export interface VisionSource {
	id: string;
	x: number;
	y: number;
	/** Alcance em pixels da cena. */
	range: number;
}

type VisionToken = Pick<
	VTTToken,
	| "id"
	| "layer"
	| "isHidden"
	| "characterId"
	| "controlledBy"
	| "x"
	| "y"
	| "visionRange"
>;

/** O token de jogador "enxerga" (ficha ligada ou controlado por alguém)? */
export function isVisionToken(token: VisionToken): boolean {
	return (
		token.layer === "token" &&
		!token.isHidden &&
		Boolean(token.characterId || (token.controlledBy?.length ?? 0) > 0)
	);
}

export function visionSources(
	tokens: readonly VisionToken[],
	gridSize: number,
): VisionSource[] {
	const cell = gridSize > 0 ? gridSize : 70;
	const out: VisionSource[] = [];
	for (const token of tokens) {
		if (!isVisionToken(token)) continue;
		out.push({
			id: token.id,
			x: token.x,
			y: token.y,
			range: (token.visionRange || DEFAULT_VISION_CELLS) * cell,
		});
	}
	return out;
}

/**
 * Assinatura das fontes de visão. Só muda quando alguém que enxerga se mexe,
 * entra, sai ou muda o alcance: mover um monstro ou girar um token qualquer
 * não pode refazer a névoa.
 */
export function visionKey(sources: readonly VisionSource[]): string {
	return sources
		.map((s) => `${s.id}:${Math.round(s.x)}:${Math.round(s.y)}:${s.range}`)
		.join("|");
}
