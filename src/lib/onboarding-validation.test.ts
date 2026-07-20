import { describe, expect, it } from "vitest";
import {
	normalizeOnboardingName,
	ONBOARDING_MAX_NAME_LENGTH,
	validateOnboardingName,
} from "./onboarding-validation";

describe("normalizeOnboardingName", () => {
	it("trims and collapses whitespace", () => {
		expect(normalizeOnboardingName("  Faerûn   Primordial  ")).toBe(
			"Faerûn Primordial",
		);
	});
});

describe("validateOnboardingName", () => {
	it("rejects empty names", () => {
		expect(validateOnboardingName("   ", "nome do Mundo")).toBe(
			"Informe o nome do Mundo.",
		);
	});

	it("rejects too-short names", () => {
		expect(validateOnboardingName("A", "nome do Mundo")).toMatch(/pelo menos/);
	});

	it("accepts a normal name", () => {
		expect(validateOnboardingName("Faerûn", "nome do Mundo")).toBeNull();
	});

	it("rejects overly long names", () => {
		expect(
			validateOnboardingName(
				"x".repeat(ONBOARDING_MAX_NAME_LENGTH + 1),
				"nome da campanha",
			),
		).toMatch(/no máximo/);
	});
});
