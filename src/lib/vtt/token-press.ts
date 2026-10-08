/**
 * Pointer bookkeeping for presses on VTT tokens.
 *
 * The token handler (PixiJS, bound to the canvas element) sees a press first;
 * the same DOM event then bubbles to the table container, whose "press on an
 * empty area deselects" listener used to wipe the selection and the token
 * panel that the token handler had just set. Recording the press with its
 * native event lets the container tell both cases apart on the same press.
 */

/** Two presses on the same token within this window open its panel. */
export const TOKEN_DOUBLE_PRESS_MS = 320;
/** Movement beyond this (in CSS px) turns a press into a drag, never a tap. */
export const TOKEN_TAP_SLOP_PX = 8;

export interface TokenPress {
	tokenId: string;
	pointerType: string;
	startX: number;
	startY: number;
	/** Set once the pointer leaves the tap slop; a drag stays a drag. */
	moved: boolean;
	/** Native DOM event of the press, shared with the container listener. */
	source: Event | null;
}

export function beginTokenPress(
	tokenId: string,
	point: { pointerType: string; clientX: number; clientY: number },
	source: Event | null,
): TokenPress {
	return {
		tokenId,
		pointerType: point.pointerType,
		startX: point.clientX,
		startY: point.clientY,
		moved: false,
		source,
	};
}

/** What the table container should do with a pointerdown it receives. */
export function canvasPressAction(
	press: TokenPress | null,
	event: Event,
	opts: { isLeftClick: boolean; activeTool: string },
): "deselect" | "ignore" {
	if (!opts.isLeftClick || opts.activeTool !== "select") return "ignore";
	if (press?.source && press.source === event) return "ignore";
	return "deselect";
}

function beyondSlop(press: TokenPress, x: number, y: number) {
	return Math.hypot(x - press.startX, y - press.startY) > TOKEN_TAP_SLOP_PX;
}

export function trackTokenPressMove(
	press: TokenPress,
	x: number,
	y: number,
): TokenPress {
	if (press.moved || !beyondSlop(press, x, y)) return press;
	return { ...press, moved: true };
}

/** A press that ends without leaving the tap slop: no move, no persist. */
export function isTokenTap(press: TokenPress, x: number, y: number): boolean {
	return !press.moved && !beyondSlop(press, x, y);
}

/**
 * Touch and pen taps open the token panel when they end; a mouse click only
 * selects (double-click or right-click opens it). Drags never open it.
 */
export function tokenPressEndAction(
	press: TokenPress,
	x: number,
	y: number,
): "open-panel" | "none" {
	if (!isTokenTap(press, x, y)) return "none";
	return press.pointerType === "touch" || press.pointerType === "pen"
		? "open-panel"
		: "none";
}

export function isDoublePress(
	last: { id: string; time: number } | null,
	tokenId: string,
	now: number,
): boolean {
	return Boolean(
		last && last.id === tokenId && now - last.time < TOKEN_DOUBLE_PRESS_MS,
	);
}
