const WARRIOR_PRESET = "/presets/warrior.png";

const CLASS_PRESET_RULES: Array<{ keywords: string[]; preset: string }> = [
	{
		keywords: ["warrior", "guerreiro", "fighter", "barbarian", "paladin"],
		preset: WARRIOR_PRESET,
	},
	{
		keywords: ["mage", "mago", "wizard", "sorcerer", "warlock"],
		preset: "/presets/mage.png",
	},
	{
		keywords: ["rogue", "ladino", "ranger", "assassin"],
		preset: "/presets/rogue.png",
	},
	{
		keywords: ["cleric", "clérigo", "clerigo", "priest", "druid", "monk"],
		preset: "/presets/cleric.png",
	},
	{
		keywords: ["vampire", "vampiro", "necromancer"],
		preset: "/presets/vampire.png",
	},
	{
		keywords: ["detective", "detetive", "investigator"],
		preset: "/presets/detective.png",
	},
];

const DEFAULT_PRESET = WARRIOR_PRESET;

/** Resolve a class-based fallback portrait when the character has no uploaded image. */
export function getCharacterPresetUrl(charClass: string): string {
	const normalized = charClass.toLowerCase();
	for (const rule of CLASS_PRESET_RULES) {
		if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
			return rule.preset;
		}
	}
	return DEFAULT_PRESET;
}
