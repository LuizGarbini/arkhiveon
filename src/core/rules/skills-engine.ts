import { calculateAbilityModifier } from "./modifier-engine";

export interface SkillCalculationInput {
	attributeScore: number;
	proficiencyBonus: number;
	proficiencyLevel: "none" | "proficient" | "expertise" | "half";
	miscBonus?: number;
}

/**
 * Calculates total skill modifier based on attribute, proficiency tier, and misc bonus.
 */
export function calculateSkillModifier({
	attributeScore,
	proficiencyBonus,
	proficiencyLevel,
	miscBonus = 0,
}: SkillCalculationInput): number {
	const baseModifier = calculateAbilityModifier(attributeScore);
	let profMultiplier = 0;

	switch (proficiencyLevel) {
		case "half":
			profMultiplier = 0.5;
			break;
		case "proficient":
			profMultiplier = 1;
			break;
		case "expertise":
			profMultiplier = 2;
			break;
		default:
			profMultiplier = 0;
			break;
	}

	const totalProficiency = Math.floor(proficiencyBonus * profMultiplier);
	return baseModifier + totalProficiency + (miscBonus || 0);
}

/**
 * Validates whether a skill value is within valid RPG system boundaries.
 */
export function isSkillValueValid(
	value: number,
	isPercentile = false,
): boolean {
	if (typeof value !== "number" || Number.isNaN(value)) return false;
	if (isPercentile) {
		return value >= 0 && value <= 100;
	}
	return value >= -10 && value <= 50;
}
