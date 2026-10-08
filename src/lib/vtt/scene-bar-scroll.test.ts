import { describe, expect, it } from "vitest";
import { nearestScrollLeft } from "./scene-bar-scroll";

// Phone scene bar from the slice 03 proof: 266px visible, 393px of content.
const bar = { scrollLeft: 0, clientWidth: 266, scrollWidth: 393 };

describe("nearestScrollLeft", () => {
	it("keeps the offset when the item is already fully visible", () => {
		expect(nearestScrollLeft(bar, { left: 0, width: 140 })).toBe(0);
		expect(
			nearestScrollLeft({ ...bar, scrollLeft: 50 }, { left: 60, width: 140 }),
		).toBe(50);
	});

	it("scrolls just enough to reveal an item past the right edge", () => {
		// In-play scene last: 140 + 8 gap + 246 wide button ends at 393.
		expect(nearestScrollLeft(bar, { left: 148, width: 245 })).toBe(127);
		expect(nearestScrollLeft(bar, { left: 200, width: 60 })).toBe(0);
		expect(nearestScrollLeft(bar, { left: 250, width: 60 })).toBe(44);
	});

	it("scrolls back to reveal an item cut by the left edge", () => {
		expect(
			nearestScrollLeft({ ...bar, scrollLeft: 127 }, { left: 0, width: 140 }),
		).toBe(0);
		expect(
			nearestScrollLeft({ ...bar, scrollLeft: 100 }, { left: 80, width: 60 }),
		).toBe(80);
	});

	it("aligns the start of an item wider than the container", () => {
		expect(
			nearestScrollLeft(
				{ scrollLeft: 0, clientWidth: 100, scrollWidth: 400 },
				{ left: 150, width: 180 },
			),
		).toBe(150);
	});

	it("stays within the scrollable range", () => {
		expect(
			nearestScrollLeft(
				{ scrollLeft: 0, clientWidth: 266, scrollWidth: 300 },
				{ left: 250, width: 100 },
			),
		).toBe(34);
		expect(
			nearestScrollLeft(
				{ scrollLeft: 0, clientWidth: 266, scrollWidth: 266 },
				{ left: 0, width: 140 },
			),
		).toBe(0);
	});
});
