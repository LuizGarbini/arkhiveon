/**
 * Pure RPG Rule Calculations (Free of React and DOM dependencies)
 */

/**
 * Calculates standard D20 ability modifier from attribute score.
 * Formula: floor((score - 10) / 2)
 */
export function calculateAbilityModifier(score: number): number {
	if (typeof score !== "number" || Number.isNaN(score)) return 0;
	return Math.floor((score - 10) / 2);
}

/**
 * Formats a numeric modifier with a leading plus sign if non-negative.
 * e.g., 3 -> "+3", -2 -> "-2", 0 -> "+0"
 */
export function formatModifier(modifier: number): string {
	if (typeof modifier !== "number" || Number.isNaN(modifier)) return "+0";
	return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Calculates D&D 5e Proficiency Bonus by character level.
 * Formula: 2 + floor((level - 1) / 4)
 */
export function calculateProficiencyBonus(level: number): number {
	const safeLevel = Math.max(1, Math.min(20, Math.floor(level || 1)));
	return 2 + Math.floor((safeLevel - 1) / 4);
}

/**
 * Calculates passive perception / passive score.
 * Formula: 10 + modifier + (isProficient ? profBonus : 0)
 */
export function calculatePassiveScore(
	abilityModifier: number,
	proficiencyBonus = 0,
	isProficient = false,
): number {
	return 10 + abilityModifier + (isProficient ? proficiencyBonus : 0);
}
