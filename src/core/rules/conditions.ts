/**
 * Condições oficiais do D&D 5e (apêndice A do PHB / Livro do Jogador).
 * Usadas no cadastro de munição. Não aplicam sozinhas no token.
 */

export const DND_5E_CONDITION_KEYS = [
	"poisoned",
	"restrained",
	"prone",
	"unconscious",
	"blinded",
	"frightened",
	"deafened",
	"stunned",
	"charmed",
	"grappled",
	"incapacitated",
	"invisible",
	"paralyzed",
	"petrified",
	"exhaustion",
] as const;

export type DnDConditionKey = (typeof DND_5E_CONDITION_KEYS)[number];

export interface DnDConditionDef {
	key: DnDConditionKey;
	/** Rótulo do Livro do Jogador (pt-BR). */
	label: string;
	/**
	 * Aparece no começo do seletor: efeitos que munição / rede / dardo
	 * costumam aplicar na mesa.
	 */
	typicalOnAmmo: boolean;
	aliases: readonly string[];
}

export const DND_5E_CONDITIONS: readonly DnDConditionDef[] = [
	{
		key: "poisoned",
		label: "Envenenado",
		typicalOnAmmo: true,
		aliases: ["envenenado", "poisoned", "veneno"],
	},
	{
		key: "restrained",
		label: "Contido",
		typicalOnAmmo: true,
		aliases: ["contido", "restrained", "imobilizado", "preso"],
	},
	{
		key: "prone",
		label: "Caído",
		typicalOnAmmo: true,
		aliases: ["caido", "caído", "prone", "prono"],
	},
	{
		key: "unconscious",
		label: "Inconsciente",
		typicalOnAmmo: true,
		aliases: ["inconsciente", "unconscious", "sono"],
	},
	{
		key: "blinded",
		label: "Cego",
		typicalOnAmmo: true,
		aliases: ["cego", "blinded", "cegueira"],
	},
	{
		key: "frightened",
		label: "Amedrontado",
		typicalOnAmmo: true,
		aliases: ["amedrontado", "frightened", "assustado"],
	},
	{
		key: "deafened",
		label: "Surdo",
		typicalOnAmmo: true,
		aliases: ["surdo", "deafened", "surdez"],
	},
	{
		key: "stunned",
		label: "Atordoado",
		typicalOnAmmo: true,
		aliases: ["atordoado", "stunned"],
	},
	{
		key: "charmed",
		label: "Enfeitiçado",
		typicalOnAmmo: false,
		aliases: ["enfeiticado", "enfeitiçado", "charmed"],
	},
	{
		key: "grappled",
		label: "Agarrado",
		typicalOnAmmo: false,
		aliases: ["agarrado", "grappled"],
	},
	{
		key: "incapacitated",
		label: "Incapacitado",
		typicalOnAmmo: false,
		aliases: ["incapacitado", "incapacitated"],
	},
	{
		key: "invisible",
		label: "Invisível",
		typicalOnAmmo: false,
		aliases: ["invisivel", "invisível", "invisible"],
	},
	{
		key: "paralyzed",
		label: "Paralisado",
		typicalOnAmmo: false,
		aliases: ["paralisado", "paralyzed"],
	},
	{
		key: "petrified",
		label: "Petrificado",
		typicalOnAmmo: false,
		aliases: ["petrificado", "petrified"],
	},
	{
		key: "exhaustion",
		label: "Exaustão",
		typicalOnAmmo: false,
		aliases: ["exaustao", "exaustão", "exhaustion"],
	},
];

const BY_KEY = new Map(DND_5E_CONDITIONS.map((c) => [c.key, c]));

function fold(value: string): string {
	return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

const BY_ALIAS = new Map<string, DnDConditionKey>();
for (const def of DND_5E_CONDITIONS) {
	BY_ALIAS.set(fold(def.key), def.key);
	BY_ALIAS.set(fold(def.label), def.key);
	for (const alias of def.aliases) BY_ALIAS.set(fold(alias), def.key);
}

export function isDnDConditionKey(value: unknown): value is DnDConditionKey {
	return typeof value === "string" && BY_KEY.has(value as DnDConditionKey);
}

export function dndConditionDef(
	key: DnDConditionKey,
): DnDConditionDef | undefined {
	return BY_KEY.get(key);
}

/** Resolve chave oficial a partir de `key`, rótulo ou apelido. Sem match → undefined. */
export function matchDnDCondition(
	value: string | null | undefined,
): DnDConditionKey | undefined {
	if (!value?.trim()) return undefined;
	return BY_ALIAS.get(fold(value));
}

export function firstUnusedConditionKey(
	used: readonly (string | undefined)[],
): DnDConditionKey | undefined {
	const taken = new Set(used.filter(Boolean));
	return DND_5E_CONDITIONS.find((c) => !taken.has(c.key))?.key;
}

export function conditionSelectOptions(
	currentKey: string | undefined,
	usedKeys: readonly (string | undefined)[],
): readonly DnDConditionDef[] {
	const taken = new Set(usedKeys.filter((key) => key && key !== currentKey));
	return DND_5E_CONDITIONS.filter((c) => !taken.has(c.key));
}
