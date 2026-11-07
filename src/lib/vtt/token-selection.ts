import { TOKEN_TAP_SLOP_PX } from "./token-press";
import type { VTTLayer } from "./types";

export interface MovableToken {
	id: string;
	x: number;
	y: number;
	isLocked: boolean;
	canMove: boolean;
}

export interface DragMember {
	id: string;
	x: number;
	y: number;
}

/** Shift, Ctrl or Command adds to the selection instead of replacing it. */
export function isAdditiveSelect(event: {
	shiftKey: boolean;
	metaKey: boolean;
	ctrlKey: boolean;
}): boolean {
	return event.shiftKey || event.metaKey || event.ctrlKey;
}

/** Map layer has no tokens. GM layer and token layer do not mix. */
export function canSelectTokenLayer(
	activeLayer: VTTLayer,
	tokenLayer: VTTLayer,
): boolean {
	if (activeLayer === "map") return false;
	if (activeLayer === "gm") return tokenLayer === "gm";
	return tokenLayer !== "gm";
}

/**
 * Tokens that should follow the pointer. Dragging one that is already
 * selected moves the whole movable selection. Dragging any other token
 * moves only that one, unless the press is additive.
 */
export function dragMembers(input: {
	grabbedId: string;
	selectedIds: readonly string[];
	additive: boolean;
	tokens: readonly MovableToken[];
}): DragMember[] {
	const grabbed = input.tokens.find((token) => token.id === input.grabbedId);
	if (!grabbed || !grabbed.canMove || grabbed.isLocked) return [];
	const inSelection = input.selectedIds.includes(input.grabbedId);
	const ids = new Set(
		inSelection || input.additive
			? [...input.selectedIds, input.grabbedId]
			: [input.grabbedId],
	);
	return input.tokens
		.filter((token) => ids.has(token.id) && token.canMove && !token.isLocked)
		.map((token) => ({ id: token.id, x: token.x, y: token.y }));
}

export function translateMembers(
	members: readonly DragMember[],
	dx: number,
	dy: number,
): DragMember[] {
	return members.map((member) => ({
		id: member.id,
		x: member.x + dx,
		y: member.y + dy,
	}));
}

export function tokensInsideRect(
	tokens: readonly { id: string; x: number; y: number }[],
	rect: { x0: number; y0: number; x1: number; y1: number },
): string[] {
	const left = Math.min(rect.x0, rect.x1);
	const right = Math.max(rect.x0, rect.x1);
	const top = Math.min(rect.y0, rect.y1);
	const bottom = Math.max(rect.y0, rect.y1);
	return tokens
		.filter(
			(token) =>
				token.x >= left &&
				token.x <= right &&
				token.y >= top &&
				token.y <= bottom,
		)
		.map((token) => token.id);
}

export function selectionFromMarquee(
	current: readonly string[],
	hits: readonly string[],
	additive: boolean,
): string[] {
	if (!additive) return [...hits];
	return [...new Set([...current, ...hits])];
}

export interface RightPress {
	x: number;
	y: number;
	moved: boolean;
	tokenId: string | null;
}

export function beginRightPress(
	x: number,
	y: number,
	tokenId: string | null,
): RightPress {
	return { x, y, moved: false, tokenId };
}

/** Past the tap slop, a right press pans the table instead of opening a menu. */
export function trackRightPress(
	press: RightPress,
	x: number,
	y: number,
): RightPress {
	if (
		press.moved ||
		Math.hypot(x - press.x, y - press.y) <= TOKEN_TAP_SLOP_PX
	) {
		return press;
	}
	return { ...press, moved: true };
}
