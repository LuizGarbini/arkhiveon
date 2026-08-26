import { describe, expect, it } from "vitest";
import {
	calculateAbilityModifier,
	calculatePassiveScore,
	calculateProficiencyBonus,
	formatModifier,
} from "./modifier-engine";
import { calculateSkillModifier, isSkillValueValid } from "./skills-engine";

describe("RPG Modifier Engine (Core Rules)", () => {
	describe("calculateAbilityModifier", () => {
		it("calculates positive modifiers for scores > 10", () => {
			expect(calculateAbilityModifier(10)).toBe(0);
			expect(calculateAbilityModifier(11)).toBe(0);
			expect(calculateAbilityModifier(12)).toBe(1);
			expect(calculateAbilityModifier(13)).toBe(1);
			expect(calculateAbilityModifier(18)).toBe(4);
			expect(calculateAbilityModifier(20)).toBe(5);
		});

		it("calculates negative modifiers for scores < 10", () => {
			expect(calculateAbilityModifier(9)).toBe(-1);
			expect(calculateAbilityModifier(8)).toBe(-1);
			expect(calculateAbilityModifier(7)).toBe(-2);
			expect(calculateAbilityModifier(6)).toBe(-2);
			expect(calculateAbilityModifier(1)).toBe(-5);
		});

		it("returns 0 for invalid inputs", () => {
			expect(calculateAbilityModifier(Number.NaN)).toBe(0);
			expect(calculateAbilityModifier(undefined as unknown as number)).toBe(0);
		});
	});

	describe("formatModifier", () => {
		it("adds plus sign for positive numbers and zero", () => {
			expect(formatModifier(3)).toBe("+3");
			expect(formatModifier(0)).toBe("+0");
		});

		it("formats negative numbers directly", () => {
			expect(formatModifier(-2)).toBe("-2");
			expect(formatModifier(-5)).toBe("-5");
		});
	});

	describe("calculateProficiencyBonus", () => {
		it("calculates D&D 5e proficiency scaling by level", () => {
			expect(calculateProficiencyBonus(1)).toBe(2);
			expect(calculateProficiencyBonus(4)).toBe(2);
			expect(calculateProficiencyBonus(5)).toBe(3);
			expect(calculateProficiencyBonus(8)).toBe(3);
			expect(calculateProficiencyBonus(9)).toBe(4);
			expect(calculateProficiencyBonus(12)).toBe(4);
			expect(calculateProficiencyBonus(13)).toBe(5);
			expect(calculateProficiencyBonus(16)).toBe(5);
			expect(calculateProficiencyBonus(17)).toBe(6);
			expect(calculateProficiencyBonus(20)).toBe(6);
		});
	});

	describe("calculatePassiveScore", () => {
		it("calculates passive perception / check score", () => {
			expect(calculatePassiveScore(3, 2, false)).toBe(13);
			expect(calculatePassiveScore(3, 2, true)).toBe(15);
			expect(calculatePassiveScore(-1, 2, true)).toBe(11);
		});
	});
});

describe("RPG Skills Engine (Core Rules)", () => {
	describe("calculateSkillModifier", () => {
		it("calculates base skill modifier without proficiency", () => {
			expect(
				calculateSkillModifier({
					attributeScore: 16,
					proficiencyBonus: 3,
					proficiencyLevel: "none",
				}),
			).toBe(3);
		});

		it("calculates proficient skill modifier (1x bonus)", () => {
			expect(
				calculateSkillModifier({
					attributeScore: 16,
					proficiencyBonus: 3,
					proficiencyLevel: "proficient",
				}),
			).toBe(6);
		});

		it("calculates expertise skill modifier (2x bonus)", () => {
			expect(
				calculateSkillModifier({
					attributeScore: 16,
					proficiencyBonus: 3,
					proficiencyLevel: "expertise",
				}),
			).toBe(9);
		});

		it("calculates half-proficiency skill modifier (0.5x bonus / Jack of all Trades)", () => {
			expect(
				calculateSkillModifier({
					attributeScore: 14,
					proficiencyBonus: 3,
					proficiencyLevel: "half",
				}),
			).toBe(3);
		});

		it("adds misc bonus correctly", () => {
			expect(
				calculateSkillModifier({
					attributeScore: 14,
					proficiencyBonus: 2,
					proficiencyLevel: "proficient",
					miscBonus: 2,
				}),
			).toBe(6);
		});
	});

	describe("isSkillValueValid", () => {
		it("validates D20 scale values", () => {
			expect(isSkillValueValid(5)).toBe(true);
			expect(isSkillValueValid(-2)).toBe(true);
			expect(isSkillValueValid(60)).toBe(false);
		});

		it("validates percentile scale values (CoC / Ordem)", () => {
			expect(isSkillValueValid(75, true)).toBe(true);
			expect(isSkillValueValid(105, true)).toBe(false);
			expect(isSkillValueValid(-5, true)).toBe(false);
		});
	});
});
