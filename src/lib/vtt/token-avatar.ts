import { resolveCharacterImageUrl } from "../character-images";
import type { ImageAssetLookup } from "../entity-images";
import type { MembershipRole } from "../store/types";

/**
 * Foto desenhada no token.
 *
 * Com ficha, a url é a foto atual que este papel enxerga
 * (`resolveCharacterImageUrl`). Vazio — ficha fora do store, ou asset
 * privado — volta para o `avatarUrl` gravado na hora de colocar o token.
 * Sem ficha, o token fica com o `avatarUrl` dele.
 * Não grava nada em `vtt_tokens`.
 */
export interface TokenAvatarToken {
	id: string;
	characterId?: string | null;
	avatarUrl?: string | null;
}

export interface TokenAvatarSheet {
	id: string;
	imageUrl: string;
	imageAssetId?: string | null;
}

/** Referência estável quando o store ainda não tem fichas ou assets. */
export const EMPTY_AVATAR_SHEETS: readonly TokenAvatarSheet[] = [];
export const EMPTY_AVATAR_ASSETS: ImageAssetLookup = [];

export function tokenImageRole(
	campaign:
		| { ownerId?: string | null; myRole?: MembershipRole | null }
		| undefined,
	userId: string | null | undefined,
): MembershipRole {
	if (!campaign || !userId) return "viewer";
	if (campaign.ownerId === userId || campaign.myRole === "owner")
		return "owner";
	if (campaign.myRole === "editor") return "editor";
	return "viewer";
}

function storedAvatar(url: string | null | undefined): string | null {
	return url ? url : null;
}

export function resolveLinkedTokenAvatarUrl(
	token: Pick<TokenAvatarToken, "characterId" | "avatarUrl">,
	sheet: TokenAvatarSheet | undefined,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
	userId?: string | null,
): string | null {
	const stored = storedAvatar(token.avatarUrl);
	if (!token.characterId || !sheet) return stored;
	const live = resolveCharacterImageUrl(
		{
			imageUrl: sheet.imageUrl,
			...(sheet.imageAssetId ? { imageAssetId: sheet.imageAssetId } : {}),
		},
		imageAssets,
		role,
		userId,
	);
	return storedAvatar(live) ?? stored;
}

/** Só tokens com ficha. A chave segue a ordem da lista. */
export function buildTokenAvatarMap(
	tokens: readonly TokenAvatarToken[],
	sheets: readonly TokenAvatarSheet[],
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
	userId?: string | null,
): Map<string, string | null> {
	const sheetList = Array.isArray(sheets) ? sheets : EMPTY_AVATAR_SHEETS;
	const tokenList = Array.isArray(tokens) ? tokens : [];
	const lookup =
		imageAssets instanceof Map || Array.isArray(imageAssets)
			? imageAssets
			: EMPTY_AVATAR_ASSETS;
	const byId = new Map<string, TokenAvatarSheet>();
	for (const sheet of sheetList) byId.set(sheet.id, sheet);
	const urls = new Map<string, string | null>();
	for (const token of tokenList) {
		if (!token.characterId) continue;
		urls.set(
			token.id,
			resolveLinkedTokenAvatarUrl(
				token,
				byId.get(token.characterId),
				lookup,
				role,
				userId,
			),
		);
	}
	return urls;
}

/** Assinatura da foto. Igual enquanto nenhuma url resolvida muda. */
export function tokenAvatarMapKey(
	urls: ReadonlyMap<string, string | null>,
): string {
	let key = "";
	for (const [id, url] of urls) key += `${id}\u0000${url ?? ""}\n`;
	return key;
}

/**
 * Devolve o mapa anterior quando as fotos são as mesmas, para um arrasto
 * (que troca a lista de tokens) não redesenhar o Pixi.
 */
export function retainTokenAvatarMap(
	previous: Map<string, string | null> | null,
	next: Map<string, string | null>,
): Map<string, string | null> {
	if (previous && tokenAvatarMapKey(previous) === tokenAvatarMapKey(next)) {
		return previous;
	}
	return next;
}

export function shownTokenAvatarUrl(
	token: Pick<TokenAvatarToken, "id" | "characterId" | "avatarUrl">,
	urls: ReadonlyMap<string, string | null>,
): string | null {
	if (token.characterId && urls.has(token.id)) {
		return urls.get(token.id) ?? null;
	}
	return storedAvatar(token.avatarUrl);
}
