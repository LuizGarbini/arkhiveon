import { characterDefaults } from "@/lib/store";
import {
	type CustomField,
	SYSTEM_CONFIG,
	type SystemConfig,
} from "@/lib/systems";
import {
	type BuildCharacterFormDefaultsOptions,
	type CharacterFormValues,
	CREATION_EMPTY_NUMERIC_KEYS,
	CUSTOM_NUMBER_CONSTRAINTS,
	type SanitizeCharacterFormOptions,
	STANDARD_CHARACTER_ATTRIBUTE_KEYS,
} from "./types";

export function getAttributeConstraints(config: SystemConfig) {
	const isPercentile = config.value === "coc" || config.value === "ordem";
	return {
		min: 1,
		max: isPercentile ? 99 : 30,
		placeholder: "10",
	};
}

export function getCustomFieldPlaceholder(field: CustomField) {
	const constraints = CUSTOM_NUMBER_CONSTRAINTS[field.key];
	if (constraints?.placeholder) return constraints.placeholder;
	if (field.hint) return field.hint;
	if (field.type === "number") return "0";
	if (field.type === "textarea")
		return `Descreva ${field.label.toLowerCase()}...`;
	return `Ex: ${field.label}`;
}

export function ensureSystemAttributeDefaults(
	values: CharacterFormValues,
): CharacterFormValues {
	const config = SYSTEM_CONFIG[values.system] ?? SYSTEM_CONFIG.generic;
	const systemAttributes = { ...(values.systemAttributes ?? {}) };

	for (const attr of config.attributes) {
		if (
			STANDARD_CHARACTER_ATTRIBUTE_KEYS.includes(
				attr.key as (typeof STANDARD_CHARACTER_ATTRIBUTE_KEYS)[number],
			)
		) {
			continue;
		}
		const current = systemAttributes[attr.key];
		if (
			current == null ||
			(typeof current === "number" && Number.isNaN(current))
		) {
			systemAttributes[attr.key] = 10;
		}
	}

	return { ...values, systemAttributes };
}

export function buildCharacterFormDefaults(
	overrides?: Partial<CharacterFormValues>,
	options?: BuildCharacterFormDefaultsOptions,
): CharacterFormValues {
	const base = { ...characterDefaults, ...overrides };

	if (options?.forCreation) {
		const empty = { ...base } as CharacterFormValues;
		for (const key of CREATION_EMPTY_NUMERIC_KEYS) {
			(empty as Record<string, unknown>)[key] = Number.NaN;
		}
		empty.deathSaves = {
			successes: Number.NaN,
			failures: Number.NaN,
		};
		empty.systemAttributes = {};
		return empty;
	}

	return ensureSystemAttributeDefaults(base);
}

export function sanitizeCharacterFormValues(
	values: CharacterFormValues,
	options?: SanitizeCharacterFormOptions,
): CharacterFormValues {
	const numericKeys: Array<keyof CharacterFormValues> = [
		"level",
		"xp",
		"strength",
		"dexterity",
		"constitution",
		"intelligence",
		"wisdom",
		"charisma",
		"power",
		"size",
		"education",
		"sanity",
		"sanityMax",
		"health",
		"healthMax",
		"tempHealth",
		"armorClass",
		"initiative",
		"speed",
		"proficiencyBonus",
		"spellSaveDc",
		"spellAttackBonus",
	];
	const sanitized = { ...values };
	if (typeof sanitized.characterName === "string") {
		sanitized.characterName = sanitized.characterName.trim();
	}
	for (const key of numericKeys) {
		const value = sanitized[key];
		if (
			value === undefined ||
			(typeof value === "number" && Number.isNaN(value))
		) {
			(sanitized as Record<string, unknown>)[key] = options?.emptyToZero
				? 0
				: (characterDefaults[key as keyof typeof characterDefaults] ?? 0);
		}
	}

	const deathSaves = { ...sanitized.deathSaves };
	if (Number.isNaN(deathSaves.successes)) {
		deathSaves.successes = options?.emptyToZero
			? 0
			: characterDefaults.deathSaves.successes;
	}
	if (Number.isNaN(deathSaves.failures)) {
		deathSaves.failures = options?.emptyToZero
			? 0
			: characterDefaults.deathSaves.failures;
	}
	sanitized.deathSaves = deathSaves;

	if (sanitized.systemAttributes) {
		const nextAttributes = { ...sanitized.systemAttributes };
		for (const [key, value] of Object.entries(nextAttributes)) {
			if (typeof value === "number" && Number.isNaN(value)) {
				nextAttributes[key] = 0;
			}
		}
		sanitized.systemAttributes = nextAttributes;
	}

	return sanitized;
}
