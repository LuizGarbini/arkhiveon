import type { VTTToken } from "./types";

/** Ownership metadata from character rows, never inferred from sheet labels. */
export interface VTTCharacterOwner {
	id: string;
	userId?: string | null;
	createdBy?: string | null;
}

/**
 * Papel na mesa. Mestre (owner) vê tudo (névoa, camada do mestre, paredes).
 * Co-mestre (editor) vê a mesa como jogador, mas move os tokens, abre fichas
 * e mexe nos PV, como a RLS de `vtt_tokens` e `set_character_hp` já deixam.
 */
export function tableRole(
	campaign: { ownerId?: string | null; myRole?: string | null } | undefined,
	userId: string | null | undefined,
): { isGM: boolean; isCoGM: boolean } {
	if (!campaign || !userId) return { isGM: false, isCoGM: false };
	const isGM = campaign.ownerId === userId || campaign.myRole === "owner";
	return { isGM, isCoGM: !isGM && campaign.myRole === "editor" };
}

/** `canManage`: mestre ou co-mestre (ver `tableRole`). */
export function canControlVTTToken(
	token: Pick<VTTToken, "characterId" | "controlledBy" | "isLocked">,
	userId: string | null | undefined,
	canManage: boolean,
	characterOwners: readonly VTTCharacterOwner[],
): boolean {
	if (!userId) return false;
	if (canManage) return true;
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
