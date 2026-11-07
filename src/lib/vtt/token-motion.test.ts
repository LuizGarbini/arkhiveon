import { describe, expect, it } from "vitest";
import { tokenAppearanceKey, tokenPose, visibleTokenIds } from "./token-motion";
import type { VTTToken } from "./types";

const token = (patch: Partial<VTTToken> = {}): VTTToken => ({
	id: "hero",
	sceneId: "scene",
	name: "Hero",
	layer: "token",
	x: 10,
	y: 20,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	...patch,
});

const exploring = {
	fogEnabled: true,
	fogExploration: true,
	gridSize: 70,
};

describe("token appearance", () => {
	it("ignores live position and the interpolation target", () => {
		const resting = token();
		const dragged = token({ x: 400, y: 12, targetX: 80, targetY: 90 });
		expect(tokenAppearanceKey(dragged)).toBe(tokenAppearanceKey(resting));
	});

	it("changes when the drawing changes", () => {
		expect(tokenAppearanceKey(token({ name: "Outro" }))).not.toBe(
			tokenAppearanceKey(token()),
		);
		expect(tokenAppearanceKey(token({ sizeCells: 2 }))).not.toBe(
			tokenAppearanceKey(token()),
		);
	});
});

describe("token pose", () => {
	it("lets the pointer own the sprite while that token is dragged", () => {
		expect(
			tokenPose(token({ targetX: 0, targetY: 0, x: 50, y: 50 }), "hero"),
		).toEqual({ mode: "drag" });
		expect(tokenPose(token({ id: "wolf" }), null, ["wolf"])).toEqual({
			mode: "drag",
		});
	});

	it("eases toward a remote target and otherwise sits on x/y", () => {
		expect(tokenPose(token({ targetX: 30, targetY: 40 }), null)).toEqual({
			mode: "lerp",
			x: 30,
			y: 40,
		});
		expect(tokenPose(token({ x: 8, y: 9 }), null)).toEqual({
			mode: "place",
			x: 8,
			y: 9,
		});
	});
});

describe("visible tokens", () => {
	it("keeps the same set while a drag stays inside vision", () => {
		const hero = token({ characterId: "sheet" });
		const npc = token({ id: "goblin", name: "Goblin", x: 100, y: 0 });
		const near = [hero, npc];
		const stillNear = [{ ...hero, x: 40 }, npc];
		expect(visibleTokenIds(stillNear, false, exploring)).toBe(
			visibleTokenIds(near, false, exploring),
		);
	});

	it("drops an npc that leaves vision", () => {
		const hero = token({ characterId: "sheet", x: 0, y: 0 });
		const npc = token({ id: "goblin", name: "Goblin", x: 5000, y: 0 });
		expect(visibleTokenIds([hero, npc], false, exploring)).toBe("hero");
		expect(visibleTokenIds([hero, npc], true, exploring)).toBe("hero|goblin");
	});
});
