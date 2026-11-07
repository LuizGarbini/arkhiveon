import type { VTTToken } from "./types";

/**
 * How a token is drawn. Position and the remote interpolation target are
 * omitted on purpose: those change on every pointer move, and rebuilding the
 * sprite for them fights the live drag.
 */
export function tokenAppearanceKey(token: VTTToken): string {
	return [
		token.id,
		token.sceneId,
		token.name,
		token.avatarUrl ?? "",
		token.layer,
		token.sizeCells,
		token.rotation,
		token.elevation,
		token.hpCurrent ?? "",
		token.hpMax ?? "",
		token.visionRange,
		token.isLocked ? 1 : 0,
		token.isHidden ? 1 : 0,
		token.characterId ?? "",
		token.npcId ?? "",
		token.controlledBy.join(","),
		token.conditions.join("\u001f"),
		token.auras
			.map((aura) => `${aura.radius}:${aura.color}:${aura.opacity ?? ""}`)
			.join(","),
	].join("|");
}

export function tokensAppearanceKey(tokens: readonly VTTToken[]): string {
	return tokens.map(tokenAppearanceKey).join("\n");
}

export interface TokenVisibilityScene {
	fogEnabled: boolean;
	fogExploration: boolean;
	gridSize: number;
}

/**
 * Ids actually drawn. Position changes the string only when someone enters or
 * leaves vision, so a drag does not rebuild every token.
 */
export function visibleTokenIds(
	tokens: readonly VTTToken[],
	isGM: boolean,
	scene: TokenVisibilityScene | null,
): string {
	if (!scene) return "";
	const gridSize = scene.gridSize || 70;
	const explore = !isGM && scene.fogEnabled && scene.fogExploration;
	const playerTokens = explore
		? tokens.filter(
				(token) =>
					token.layer === "token" &&
					!token.isHidden &&
					(token.characterId || token.controlledBy.length > 0),
			)
		: [];
	const ids: string[] = [];
	for (const token of tokens) {
		if (token.layer === "gm" && !isGM) continue;
		if (token.isHidden && !isGM) continue;
		if (explore && !token.characterId && token.controlledBy.length === 0) {
			const seen = playerTokens.some((player) => {
				const range = (player.visionRange || 6) * gridSize;
				return Math.hypot(player.x - token.x, player.y - token.y) <= range;
			});
			if (!seen) continue;
		}
		ids.push(token.id);
	}
	return ids.join("|");
}

/** One owner for the sprite position each frame. */
export type TokenPose =
	| { mode: "drag" }
	| { mode: "lerp"; x: number; y: number }
	| { mode: "place"; x: number; y: number };

export function tokenPose(
	token: VTTToken,
	draggedTokenId: string | null,
): TokenPose {
	if (draggedTokenId === token.id) return { mode: "drag" };
	if (token.targetX !== undefined && token.targetY !== undefined) {
		return { mode: "lerp", x: token.targetX, y: token.targetY };
	}
	return { mode: "place", x: token.x, y: token.y };
}
