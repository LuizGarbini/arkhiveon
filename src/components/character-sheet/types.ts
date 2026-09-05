import type {
	Control,
	UseFormRegister,
	UseFormSetValue,
} from "react-hook-form";
import type { Character } from "@/lib/store";

export const STANDARD_CHARACTER_ATTRIBUTE_KEYS = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
	"power",
	"size",
	"education",
] as const;

export const CUSTOM_NUMBER_CONSTRAINTS: Record<
	string,
	{ min?: number; max?: number; placeholder: string }
> = {
	nex: { min: 0, max: 99, placeholder: "0" },
	luck: { min: 0, max: 99, placeholder: "50" },
	magicPoints: { min: 0, max: 99, placeholder: "0" },
	moveRate: { min: 0, placeholder: "8" },
	pe: { min: 0, placeholder: "0" },
	peMax: { min: 0, placeholder: "10" },
	humanity: { min: 0, max: 10, placeholder: "7" },
};

export const CREATION_EMPTY_NUMERIC_KEYS: Array<keyof CharacterFormValues> = [
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

export const CHARACTER_NAME_REQUIRED_MESSAGE =
	"Informe o nome do personagem para continuar";

export type CharacterFormValues = Omit<
	Character,
	"id" | "createdAt" | "updatedAt"
>;

export type CharacterRegister = UseFormRegister<CharacterFormValues>;
export type CharacterControl = Control<CharacterFormValues>;
export type CharacterSetValue = UseFormSetValue<CharacterFormValues>;

export type BuildCharacterFormDefaultsOptions = {
	forCreation?: boolean;
};

export type SanitizeCharacterFormOptions = {
	emptyToZero?: boolean;
};
