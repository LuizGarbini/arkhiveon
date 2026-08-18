import { describe, expect, it } from "vitest";
import {
	appOnboardingStep,
	isCampaignLoadPending,
	needsAppOnboarding,
	shouldShowEmptyCampaignOnboarding,
} from "./campaign-bootstrap";

describe("isCampaignLoadPending", () => {
	it("only treats idle and loading as pending", () => {
		expect(isCampaignLoadPending("idle")).toBe(true);
		expect(isCampaignLoadPending("loading")).toBe(true);
		expect(isCampaignLoadPending("ready")).toBe(false);
		expect(isCampaignLoadPending("error")).toBe(false);
	});
});

describe("shouldShowEmptyCampaignOnboarding", () => {
	it("does not flash onboarding before campaigns hydrate (cold browser)", () => {
		expect(
			shouldShowEmptyCampaignOnboarding({
				campaignLoadStatus: "loading",
				campaignCount: 0,
			}),
		).toBe(false);
	});

	it("shows onboarding only after hydrate confirms zero campaigns", () => {
		expect(
			shouldShowEmptyCampaignOnboarding({
				campaignLoadStatus: "ready",
				campaignCount: 0,
			}),
		).toBe(true);
	});

	it("hides onboarding when the user already has campaigns", () => {
		expect(
			shouldShowEmptyCampaignOnboarding({
				campaignLoadStatus: "ready",
				campaignCount: 2,
			}),
		).toBe(false);
	});

	it("does not treat a failed load as an empty account", () => {
		expect(
			shouldShowEmptyCampaignOnboarding({
				campaignLoadStatus: "error",
				campaignCount: 0,
			}),
		).toBe(false);
	});
});

describe("needsAppOnboarding", () => {
	it("waits for hydrate", () => {
		expect(
			needsAppOnboarding({ campaignLoadStatus: "loading", campaignCount: 0 }),
		).toBe(false);
	});

	it("requires onboarding with zero campaigns after hydrate", () => {
		expect(
			needsAppOnboarding({ campaignLoadStatus: "ready", campaignCount: 0 }),
		).toBe(true);
	});

	it("skips when the user already has campaigns", () => {
		expect(
			needsAppOnboarding({ campaignLoadStatus: "ready", campaignCount: 1 }),
		).toBe(false);
	});

	it("skips when campaign loading failed", () => {
		expect(
			needsAppOnboarding({ campaignLoadStatus: "error", campaignCount: 0 }),
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
