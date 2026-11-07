import { describe, expect, it } from "vitest";
import { TOKEN_TAP_SLOP_PX } from "./token-press";
import {
	beginRightPress,
	canSelectTokenLayer,
	dragMembers,
	isAdditiveSelect,
	selectionFromMarquee,
	tokensInsideRect,
	trackRightPress,
	translateMembers,
} from "./token-selection";

const piece = (
	id: string,
	x: number,
	y: number,
	extra: { isLocked?: boolean; canMove?: boolean } = {},
) => ({
	id,
	x,
	y,
	isLocked: extra.isLocked ?? false,
	canMove: extra.canMove ?? true,
});

describe("group drag", () => {
	const tokens = [
		piece("hero", 10, 20),
		piece("wolf", 80, 20),
		piece("chest", 40, 90),
		piece("locked", 0, 0, { isLocked: true }),
		piece("other", 200, 200, { canMove: false }),
	];

	it("moves every selected piece when the grabbed one is in the selection", () => {
		expect(
			dragMembers({
				grabbedId: "hero",
				selectedIds: ["hero", "wolf", "locked", "other"],
				additive: false,
				tokens,
			}),
		).toEqual([
			{ id: "hero", x: 10, y: 20 },
			{ id: "wolf", x: 80, y: 20 },
		]);
	});

	it("moves only the grabbed piece when it was not selected", () => {
		expect(
			dragMembers({
				grabbedId: "chest",
				selectedIds: ["hero", "wolf"],
				additive: false,
				tokens,
			}),
		).toEqual([{ id: "chest", x: 40, y: 90 }]);
	});

	it("adds the grabbed piece to the selection on an additive drag", () => {
		expect(
			dragMembers({
				grabbedId: "chest",
				selectedIds: ["hero"],
				additive: true,
				tokens,
			}).map((member) => member.id),
		).toEqual(["hero", "chest"]);
	});

	it("keeps the same offset for every piece", () => {
		expect(
			translateMembers(
				[
					{ id: "hero", x: 10, y: 20 },
					{ id: "wolf", x: 80, y: 20 },
				],
				15,
				-4,
			),
		).toEqual([
			{ id: "hero", x: 25, y: 16 },
			{ id: "wolf", x: 95, y: 16 },
		]);
	});
});

describe("marquee selection", () => {
	it("keeps tokens whose center sits inside the rectangle", () => {
		expect(
			tokensInsideRect(
				[
					{ id: "in", x: 30, y: 40 },
					{ id: "out", x: 200, y: 40 },
				],
				{ x0: 100, y0: 100, x1: 0, y1: 0 },
			),
		).toEqual(["in"]);
	});

	it("replaces the selection, or adds to it when the press is additive", () => {
		expect(selectionFromMarquee(["a"], ["b"], false)).toEqual(["b"]);
		expect(selectionFromMarquee(["a"], ["b", "a"], true)).toEqual(["a", "b"]);
	});

	it("does not mix the token layer with the GM layer", () => {
		expect(canSelectTokenLayer("token", "token")).toBe(true);
		expect(canSelectTokenLayer("token", "gm")).toBe(false);
		expect(canSelectTokenLayer("gm", "gm")).toBe(true);
		expect(canSelectTokenLayer("map", "token")).toBe(false);
	});
});

describe("right button", () => {
	it("treats Shift, Ctrl and Command as additive", () => {
		expect(
			isAdditiveSelect({ shiftKey: true, metaKey: false, ctrlKey: false }),
		).toBe(true);
		expect(
			isAdditiveSelect({ shiftKey: false, metaKey: true, ctrlKey: false }),
		).toBe(true);
		expect(
			isAdditiveSelect({ shiftKey: false, metaKey: false, ctrlKey: false }),
		).toBe(false);
	});

	it("pans once the right press leaves the tap slop and keeps a tap as a menu", () => {
		const tap = beginRightPress(10, 10, "hero");
		expect(trackRightPress(tap, 12, 11).moved).toBe(false);
		expect(trackRightPress(tap, 10 + TOKEN_TAP_SLOP_PX + 4, 10).moved).toBe(
			true,
		);
	});
});
