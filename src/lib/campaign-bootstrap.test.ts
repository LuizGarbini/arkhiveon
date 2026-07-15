import { describe, expect, it } from "vitest";
import { shouldShowEmptyCampaignOnboarding } from "./campaign-bootstrap";

describe("shouldShowEmptyCampaignOnboarding", () => {
	it("does not flash onboarding before campaigns hydrate (cold browser)", () => {
		expect(
			shouldShowEmptyCampaignOnboarding({
				hasLoadedCampaigns: false,
				campaignCount: 0,
			}),
		).toBe(false);
	});

	it("shows onboarding only after hydrate confirms zero campaigns", () => {
		expect(
			shouldShowEmptyCampaignOnboarding({
				hasLoadedCampaigns: true,
				campaignCount: 0,
			}),
		).toBe(true);
	});

	it("hides onboarding when the user already has campaigns", () => {
		expect(
			shouldShowEmptyCampaignOnboarding({
				hasLoadedCampaigns: true,
				campaignCount: 2,
			}),
		).toBe(false);
	});
});
