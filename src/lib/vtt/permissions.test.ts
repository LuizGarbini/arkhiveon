import { describe, expect, it } from "vitest";
import { canControlVTTToken, tokenImageForViewer } from "./permissions";

const token = { characterId: "hero", controlledBy: [], isLocked: false };

describe("VTT token control", () => {
	it("lets authenticated campaign staff administer locked tokens", () => {
		for (const role of ["owner", "editor"]) {
			expect(
				canControlVTTToken({ ...token, isLocked: true }, role, true, []),
			).toBe(true);
		}
		expect(canControlVTTToken(token, null, true, [])).toBe(false);
	});

	it("allows explicit controllers without requiring a linked character", () => {
		expect(
			canControlVTTToken(
				{ ...token, characterId: null, controlledBy: ["player"] },
				"player",
				false,
				[],
			),
		).toBe(true);
		expect(
			canControlVTTToken(
				{ ...token, controlledBy: ["other"] },
				"player",
				false,
				[],
			),
		).toBe(false);
	});

	it("recognizes the linked character user or creator, not an unrelated character", () => {
		expect(
			canControlVTTToken(token, "player", false, [
				{ id: "hero", userId: "player" },
			]),
		).toBe(true);
		expect(
			canControlVTTToken(token, "player", false, [
				{ id: "hero", createdBy: "player" },
			]),
		).toBe(true);
		expect(
			canControlVTTToken(token, "player", false, [
				{ id: "other", userId: "player" },
			]),
		).toBe(false);
		expect(
			canControlVTTToken(token, "player", false, [
				{ id: "hero", userId: "other" },
			]),
		).toBe(false);
		expect(canControlVTTToken(token, "player", false, [])).toBe(false);
	});

	it("denies locked tokens to players even when they own or control them", () => {
		expect(
			canControlVTTToken(
				{ ...token, isLocked: true, controlledBy: ["player"] },
				"player",
				false,
				[{ id: "hero", userId: "player" }],
			),
		).toBe(false);
	});
});

describe("tokenImageForViewer", () => {
	const visible = {
		avatarUrl: "https://img.test/hero.png",
		layer: "token" as const,
		isHidden: false,
	};

	it("shows any token image to the GM", () => {
		expect(tokenImageForViewer(visible, true)).toBe(visible.avatarUrl);
		expect(tokenImageForViewer({ ...visible, layer: "gm" }, true)).toBe(
			visible.avatarUrl,
		);
		expect(tokenImageForViewer({ ...visible, isHidden: true }, true)).toBe(
			visible.avatarUrl,
		);
	});

	it("shows players only visible tokens with an image", () => {
		expect(tokenImageForViewer(visible, false)).toBe(visible.avatarUrl);
		expect(
			tokenImageForViewer({ ...visible, layer: "gm" }, false),
		).toBeUndefined();
		expect(
			tokenImageForViewer({ ...visible, isHidden: true }, false),
		).toBeUndefined();
		expect(
			tokenImageForViewer({ ...visible, avatarUrl: null }, false),
		).toBeUndefined();
		expect(
			tokenImageForViewer({ ...visible, avatarUrl: null }, true),
		).toBeUndefined();
	});
});
