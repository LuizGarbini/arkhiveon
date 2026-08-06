import { describe, expect, it } from "vitest";
import {
	campaignPerWorldLimitError,
	countOwnedCampaignsInWorld,
	countOwnedWorlds,
	maxOwnedCampaignsPerWorld,
	maxOwnedWorlds,
	worldLimitError,
} from "./plan-limits";

describe("plan-limits", () => {
	it("caps owned worlds by plan", () => {
		expect(maxOwnedWorlds("free")).toBe(1);
		expect(maxOwnedWorlds("pro")).toBe(5);
	});

	it("caps owned campaigns per world by plan", () => {
		expect(maxOwnedCampaignsPerWorld("free")).toBe(1);
		expect(maxOwnedCampaignsPerWorld("pro")).toBe(5);
	});

	it("counts only worlds owned by the user", () => {
		expect(
			countOwnedWorlds(
				[
					{
						id: "w1",
						name: "A",
						isDefault: true,
						ownerUserId: "u1",
						createdAt: 1,
					},
					{
						id: "w2",
						name: "B",
						isDefault: false,
						ownerUserId: "u2",
						createdAt: 1,
					},
				],
				"u1",
			),
		).toBe(1);
	});

	it("counts only owned campaigns in a world", () => {
		expect(
			countOwnedCampaignsInWorld(
				[
					{
						id: "c1",
						name: "A",
						description: "",
						system: "dnd5e",
						ownerId: "u1",
						worldId: "w1",
						myRole: "owner",
						createdAt: 1,
					},
					{
						id: "c2",
						name: "B",
						description: "",
						system: "dnd5e",
						ownerId: "u1",
						worldId: "w1",
						myRole: "viewer",
						createdAt: 1,
					},
					{
						id: "c3",
						name: "C",
						description: "",
						system: "dnd5e",
						ownerId: "u1",
						worldId: "w2",
						myRole: "owner",
						createdAt: 1,
					},
				],
				"w1",
			),
		).toBe(1);
	});

	it("returns upgrade-oriented error messages", () => {
		expect(worldLimitError("free")).toMatch(/Free/i);
		expect(campaignPerWorldLimitError("pro")).toMatch(/Pro/i);
	});
});
