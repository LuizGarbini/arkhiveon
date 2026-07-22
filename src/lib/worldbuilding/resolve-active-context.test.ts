import { describe, expect, it } from "vitest";
import { resolveActiveContextAfterCampaignLoad } from "./resolve-active-context";

const campaigns = [
	{ id: "c1", worldId: "w1" },
	{ id: "c2", worldId: "w2" },
];

describe("resolveActiveContextAfterCampaignLoad", () => {
	it("keeps a still-valid active campaign", () => {
		expect(
			resolveActiveContextAfterCampaignLoad({
				campaigns,
				activeCampaignId: "c2",
				activeWorldId: "w1",
			}),
		).toEqual({ campaignId: "c2", worldId: "w2" });
	});

	it("when campaign is cleared but a world is selected, prefers a campaign in that world", () => {
		expect(
			resolveActiveContextAfterCampaignLoad({
				campaigns,
				activeCampaignId: null,
				activeWorldId: "w2",
			}),
		).toEqual({ campaignId: "c2", worldId: "w2" });
	});

	it("does not jump to world 1 when the selected world has no campaigns yet", () => {
		expect(
			resolveActiveContextAfterCampaignLoad({
				campaigns: [{ id: "c1", worldId: "w1" }],
				activeCampaignId: null,
				activeWorldId: "w2",
			}),
		).toEqual({ campaignId: null, worldId: "w2" });
	});

	it("falls back to the first campaign only when no world is selected", () => {
		expect(
			resolveActiveContextAfterCampaignLoad({
				campaigns,
				activeCampaignId: null,
				activeWorldId: null,
			}),
		).toEqual({ campaignId: "c1", worldId: "w1" });
	});
});
