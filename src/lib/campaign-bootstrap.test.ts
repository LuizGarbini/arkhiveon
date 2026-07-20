import { describe, expect, it } from "vitest";
import {
	appOnboardingStep,
	needsAppOnboarding,
	shouldShowEmptyCampaignOnboarding,
} from "./campaign-bootstrap";

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

describe("needsAppOnboarding", () => {
	it("waits for hydrate", () => {
		expect(
			needsAppOnboarding({ hasLoadedCampaigns: false, campaignCount: 0 }),
		).toBe(false);
	});

	it("requires onboarding with zero campaigns after hydrate", () => {
		expect(
			needsAppOnboarding({ hasLoadedCampaigns: true, campaignCount: 0 }),
		).toBe(true);
	});

	it("skips when the user already has campaigns", () => {
		expect(
			needsAppOnboarding({ hasLoadedCampaigns: true, campaignCount: 1 }),
		).toBe(false);
	});
});

describe("appOnboardingStep", () => {
	it("starts on world when the user owns none", () => {
		expect(appOnboardingStep({ ownedWorldCount: 0 })).toBe("world");
	});

	it("skips to campaign when a Mundo already exists", () => {
		expect(appOnboardingStep({ ownedWorldCount: 1 })).toBe("campaign");
	});
});
