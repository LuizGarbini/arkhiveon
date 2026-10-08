import { describe, expect, it } from "vitest";
import {
	beginTokenPress,
	canvasPressAction,
	isDoublePress,
	isTokenTap,
	TOKEN_DOUBLE_PRESS_MS,
	TOKEN_TAP_SLOP_PX,
	tokenPressEndAction,
	trackTokenPressMove,
} from "./token-press";

const select = { isLeftClick: true, activeTool: "select" } as const;

// The token (Pixi) handler runs first and records the press; the canvas
// container listener receives the very same DOM event right after it.
function press(
	pointerType: "mouse" | "touch" | "pen",
	source: Event = new Event("pointerdown"),
) {
	return beginTokenPress(
		"token-a",
		{ pointerType, clientX: 100, clientY: 100 },
		source,
	);
}

describe("token press vs. empty-area press on the canvas", () => {
	it("does not let the empty-area handler undo a token press on the same event", () => {
		const domEvent = new Event("pointerdown");
		const tokenPress = press("mouse", domEvent);
		expect(canvasPressAction(tokenPress, domEvent, select)).toBe("ignore");
	});

	it("deselects on a press that did not hit a token", () => {
		expect(canvasPressAction(null, new Event("pointerdown"), select)).toBe(
			"deselect",
		);
		// A press left over from an earlier event never shields a new one.
		const stale = press("mouse");
		expect(canvasPressAction(stale, new Event("pointerdown"), select)).toBe(
			"deselect",
		);
	});

	it("only deselects for a left press with the select tool", () => {
		const domEvent = new Event("pointerdown");
		expect(
			canvasPressAction(null, domEvent, {
				isLeftClick: false,
				activeTool: "select",
			}),
		).toBe("ignore");
		expect(
			canvasPressAction(null, domEvent, {
				isLeftClick: true,
				activeTool: "ruler",
			}),
		).toBe("ignore");
	});
});

describe("tap, click and drag on a token", () => {
	it("opens the panel when a touch or pen press ends as a tap", () => {
		expect(tokenPressEndAction(press("touch"), 103, 102)).toBe("open-panel");
		expect(tokenPressEndAction(press("pen"), 100, 100)).toBe("open-panel");
	});

	it("keeps a single mouse click as selection only", () => {
		expect(tokenPressEndAction(press("mouse"), 100, 100)).toBe("none");
	});

	it("never opens the panel after a drag", () => {
		for (const type of ["touch", "mouse"] as const) {
			let current = press(type);
			current = trackTokenPressMove(current, 100 + TOKEN_TAP_SLOP_PX + 12, 100);
			expect(current.moved).toBe(true);
			// Coming back near the start does not turn the drag into a tap.
			current = trackTokenPressMove(current, 101, 100);
			expect(tokenPressEndAction(current, 101, 100)).toBe("none");
		}
		// Releasing far away without intermediate moves is a drag too.
		expect(tokenPressEndAction(press("touch"), 140, 100)).toBe("none");
	});

	it("tolerates jitter within the tap slop", () => {
		const current = trackTokenPressMove(
			press("touch"),
			100 + TOKEN_TAP_SLOP_PX,
			100,
		);
		expect(current.moved).toBe(false);
	});

	it("treats a press that stays within the slop as a tap, not a move", () => {
		expect(isTokenTap(press("mouse"), 104, 103)).toBe(true);
		expect(isTokenTap(press("touch"), 100 + TOKEN_TAP_SLOP_PX + 1, 100)).toBe(
			false,
		);
		const dragged = trackTokenPressMove(press("mouse"), 130, 100);
		expect(isTokenTap(dragged, 100, 100)).toBe(false);
	});

	it("detects a double press on the same token only", () => {
		const last = { id: "token-a", time: 1000 };
		expect(
			isDoublePress(last, "token-a", 1000 + TOKEN_DOUBLE_PRESS_MS - 1),
		).toBe(true);
		expect(
			isDoublePress(last, "token-a", 1000 + TOKEN_DOUBLE_PRESS_MS + 1),
		).toBe(false);
		expect(isDoublePress(last, "token-b", 1100)).toBe(false);
		expect(isDoublePress(null, "token-a", 1100)).toBe(false);
	});
});
