/**
 * Pure calculation engine for ability modifiers, proficiency bonuses, saving throws, and health.
 * 100% pure TypeScript functions with zero React or DOM dependencies.
 */

/**
 * Calculates the standard ability modifier based on an attribute score.
 * Formula: floor((score - 10) / 2)
 */
export function calculateAbilityModifier(score: number): number {
	if (typeof score !== "number" || Number.isNaN(score)) return 0;
	return Math.floor((score - 10) / 2);
}

/**
 * Formats an integer modifier with an explicit sign (+/-).
 * e.g., 3 -> "+3", 0 -> "+0", -2 -> "-2"
 */
export function formatModifier(modifier: number): string {
	if (typeof modifier !== "number" || Number.isNaN(modifier)) return "+0";
	return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Calculates D&D 5e standard proficiency bonus based on character level.
 * Formula: 2 + floor((level - 1) / 4)
 */
export function calculateProficiencyBonus(level: number): number {
	const safeLevel = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
	return 2 + Math.floor((safeLevel - 1) / 4);
}

/**
 * Calculates passive check scores (e.g. Passive Perception = 10 + mod + (prof ? pb : 0)).
 */
export function calculatePassiveScore(
	abilityModifier: number,
	proficiencyBonus: number,
	isProficient: boolean,
): number {
	return 10 + abilityModifier + (isProficient ? proficiencyBonus : 0);
}

export interface SavingThrowCalculationInput {
	abilityScore: number;
	proficiencyBonus: number;
	isProficient: boolean;
	miscBonus?: number;
}

/**
 * Calculates saving throw modifier for an ability score.
 */
export function calculateSavingThrowModifier({
	abilityScore,
	proficiencyBonus,
	isProficient,
	miscBonus = 0,
}: SavingThrowCalculationInput): number {
	const baseMod = calculateAbilityModifier(abilityScore);
	const profBonus = isProficient ? proficiencyBonus : 0;
	return baseMod + profBonus + (miscBonus || 0);
}

export interface EffectiveHealthMaxInput {
	baseHealthMax: number;
	level?: number;
	featsList?: Array<{ name: string }>;
	system?: string;
}

/**
 * Calculates effective max HP including bonuses from feats like Tough (+2 HP per level in D&D 5e/2024).
 */
export function calculateEffectiveHealthMax({
	baseHealthMax,
	level = 1,
	featsList,
	system,
}: EffectiveHealthMaxInput): number {
	const rawBase = Number(baseHealthMax) || 0;
	const safeLevel = Math.max(1, Math.floor(Number(level) || 1));

	const hasTough = featsList?.some(
		(f) =>
			f.name.toLowerCase() === "robusto" || f.name.toLowerCase() === "tough",
	);

	const isDndSystem = system === "dnd5e" || system === "dnd2024";
	const toughBonus = hasTough && isDndSystem ? 2 * safeLevel : 0;

	return rawBase + toughBonus;
}

/**
 * Calculates health bar percentage clamped between 0 and 100%.
 */
export function calculateHitPointPercentage(
	currentHealth: number,
	effectiveHealthMax: number,
): number {
	if (!effectiveHealthMax || effectiveHealthMax <= 0) return 0;
	const current = Math.max(0, Number(currentHealth) || 0);
	return Math.min(100, Math.round((current / effectiveHealthMax) * 100));
}
