import { describe, expect, it } from "vitest";
import {
	DEFAULT_WORLD_NAME,
	isDefaultWorldName,
	needsLegacyWorldNaming,
} from "./legacy-world-naming";

describe("isDefaultWorldName", () => {
	it("matches the migration default name", () => {
		expect(isDefaultWorldName(DEFAULT_WORLD_NAME)).toBe(true);
		expect(isDefaultWorldName("  mundo padrão  ")).toBe(true);
		expect(isDefaultWorldName("Faerûn")).toBe(false);
	});
});

describe("needsLegacyWorldNaming", () => {
	it("skips brand-new accounts still in onboarding", () => {
		expect(
			needsLegacyWorldNaming({
				hasLoadedCampaigns: true,
				campaignCount: 0,
				ownedWorlds: [{ id: "w1", name: DEFAULT_WORLD_NAME }],
			}).needed,
		).toBe(false);
	});

	it("asks existing owners to rename Mundo Padrão", () => {
		const result = needsLegacyWorldNaming({
			hasLoadedCampaigns: true,
			campaignCount: 2,
			ownedWorlds: [{ id: "w1", name: DEFAULT_WORLD_NAME }],
		});
		expect(result.needed).toBe(true);
		expect(result.worldId).toBe("w1");
	});

	it("skips when the world already has a custom name", () => {
		expect(
			needsLegacyWorldNaming({
				hasLoadedCampaigns: true,
				campaignCount: 1,
				ownedWorlds: [{ id: "w1", name: "Reinos Esquecidos" }],
			}).needed,
		).toBe(false);
	});
});
