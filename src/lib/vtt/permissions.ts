import type { VTTToken } from "./types";

/** Ownership metadata from character rows, never inferred from sheet labels. */
export interface VTTCharacterOwner {
	id: string;
	userId?: string | null;
	createdBy?: string | null;
}

export function canControlVTTToken(
	token: Pick<VTTToken, "characterId" | "controlledBy" | "isLocked">,
	userId: string | null | undefined,
	isGM: boolean,
	characterOwners: readonly VTTCharacterOwner[],
): boolean {
	if (!userId) return false;
	if (isGM) return true;
	if (token.isLocked) return false;
	if (token.controlledBy.includes(userId)) return true;
	return characterOwners.some(
		(character) =>
			character.id === token.characterId &&
			(character.userId === userId || character.createdBy === userId),
	);
}

/**
 * Imagem que o visualizador em tela cheia pode mostrar para este token.
 * O mestre vê qualquer token; o jogador só vê tokens fora da camada `gm`
 * e não ocultos, para a tela cheia não vazar o que o canvas esconde.
 */
export function tokenImageForViewer(
	token: Pick<VTTToken, "avatarUrl" | "layer" | "isHidden">,
	isGM: boolean,
): string | undefined {
	if (!token.avatarUrl) return undefined;
	if (isGM) return token.avatarUrl;
	if (token.layer === "gm" || token.isHidden) return undefined;
	return token.avatarUrl;
}
