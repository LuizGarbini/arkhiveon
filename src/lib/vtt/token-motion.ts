import type { VTTToken } from "./types";
import {
	isSeenByAny,
	type VisionSegment,
	type VisionSource,
	visionSources,
} from "./vision";

/**
 * How a token is drawn. Position and the remote interpolation target are
 * omitted on purpose: those change on every pointer move, and rebuilding the
 * sprite for them fights the live drag. A direção (`rotation`) também fica de
 * fora: cada seta que muda de direção a muda, e reconstruir TODOS os tokens por
 * isso causava o "stuttering" ao alternar cima/baixo. A seta de direção é
 * girada direto no objeto (veja `facingRadians`).
 */
export function tokenAppearanceKey(token: VTTToken): string {
	return [
		token.id,
		token.sceneId,
		token.name,
		token.avatarUrl ?? "",
		token.layer,
		token.sizeCells,
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

/** Ângulo (rad) da seta de direção do token: 0° aponta para cima. */
export function facingRadians(token: Pick<VTTToken, "rotation">): number {
	return ((token.rotation || 0) * Math.PI) / 180;
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
	vision: {
		/** Quem enxerga (já com o alcance da ficha). Sem isso, calcula do token. */
		sources?: readonly VisionSource[];
		walls?: readonly VisionSegment[];
	} = {},
): string {
	if (!scene) return "";
	const gridSize = scene.gridSize || 70;
	const explore = !isGM && scene.fogEnabled && scene.fogExploration;
	const sources = explore
		? (vision.sources ?? visionSources(tokens, gridSize))
		: [];
	const walls = vision.walls ?? [];
	const ids: string[] = [];
	for (const token of tokens) {
		if (token.layer === "gm" && !isGM) continue;
		if (token.isHidden && !isGM) continue;
		const isPlayerToken =
			Boolean(token.characterId) || token.controlledBy.length > 0;
		if (
			explore &&
			!isPlayerToken &&
			!isSeenByAny({ x: token.x, y: token.y }, sources, walls)
		)
			continue;
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
	draggedTokenIds: readonly string[] = [],
): TokenPose {
	if (draggedTokenId === token.id || draggedTokenIds.includes(token.id)) {
		return { mode: "drag" };
	}
	if (token.targetX !== undefined && token.targetY !== undefined) {
		return { mode: "lerp", x: token.targetX, y: token.targetY };
	}
	return { mode: "place", x: token.x, y: token.y };
}
