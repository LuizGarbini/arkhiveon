/**
 * Assistente da mesa — editar ficha existente (proposta de patch).
 * Sem dependências: roda em Deno (Edge Function) e no Vite (cliente/testes).
 *
 * Regras:
 * - A IA só LÊ fichas da campanha atual (cliente do próprio usuário, RLS) e
 *   PROPÕE um patch estruturado. Nada é gravado aqui.
 * - O patch só mexe em campos que já existem no modelo da ficha: atributos
 *   numéricos (FOR…CAR, PV, CA, nível…) e itens do inventário
 *   (`inventoryList`, inclusive dados de arma/dano do D&D 5e).
 * - Tudo é saneado e limitado: campos fora da allowlist são descartados.
 * - Multiclasse, troca de classe e outras campanhas ficam fora.
 */

export const CHARACTER_PATCH_TOOL = "propose_character_patch" as const;
export const READ_CHARACTER_TOOL = "read_character" as const;

/** Campos numéricos editáveis, com faixa permitida. */
export const CHARACTER_NUMERIC_FIELDS = {
	strength: { label: "FOR", min: 1, max: 30 },
	dexterity: { label: "DES", min: 1, max: 30 },
	constitution: { label: "CON", min: 1, max: 30 },
	intelligence: { label: "INT", min: 1, max: 30 },
	wisdom: { label: "SAB", min: 1, max: 30 },
	charisma: { label: "CAR", min: 1, max: 30 },
	level: { label: "Nível", min: 1, max: 20 },
	xp: { label: "XP", min: 0, max: 1_000_000 },
	health: { label: "PV", min: 0, max: 9999 },
	healthMax: { label: "PV máx.", min: 0, max: 9999 },
	tempHealth: { label: "PV temp.", min: 0, max: 9999 },
	armorClass: { label: "CA", min: 0, max: 50 },
	initiative: { label: "Iniciativa", min: -10, max: 30 },
	speed: { label: "Deslocamento", min: 0, max: 500 },
	proficiencyBonus: { label: "Proficiência", min: 0, max: 10 },
} as const;

export type CharacterNumericField = keyof typeof CHARACTER_NUMERIC_FIELDS;

export const CHARACTER_NUMERIC_FIELD_KEYS = Object.keys(
	CHARACTER_NUMERIC_FIELDS,
) as CharacterNumericField[];

export const PATCH_DAMAGE_TYPES = [
	"slashing",
	"piercing",
	"bludgeoning",
	"acid",
	"cold",
	"fire",
	"force",
	"lightning",
	"necrotic",
	"poison",
	"psychic",
	"radiant",
	"thunder",
] as const;
export type PatchDamageType = (typeof PATCH_DAMAGE_TYPES)[number];

const ITEM_LOCATIONS = ["equipped", "backpack", "mount_stash"] as const;
const ITEM_CATEGORIES = [
	"weapon",
	"armor",
	"potion",
	"gear",
	"treasure",
	"custom",
] as const;
const WEAPON_ABILITIES = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
] as const;

export type PatchItemLocation = (typeof ITEM_LOCATIONS)[number];
export type PatchItemCategory = (typeof ITEM_CATEGORIES)[number];

export const PATCH_LIMITS = {
	name: 80,
	label: 60,
	description: 600,
	summary: 300,
	itemsPerList: 10,
	extraDamage: 4,
	rosterSize: 40,
	inventoryRead: 40,
} as const;

export interface PatchWeaponExtraDamage {
	label: string;
	amount: string;
	type: PatchDamageType;
}

export interface PatchWeaponStats {
	damageDice: string;
	damageType: PatchDamageType;
	ability: (typeof WEAPON_ABILITIES)[number];
	magicBonus?: number;
	proficient?: boolean;
	extraDamage?: PatchWeaponExtraDamage[];
}

export interface PatchNewItem {
	name: string;
	quantity: number;
	location: PatchItemLocation;
	category: PatchItemCategory;
	weightLbs?: number;
	description?: string;
	weapon?: PatchWeaponStats;
}

export interface PatchItemUpdate {
	itemId: string;
	name?: string;
	quantity?: number;
	location?: PatchItemLocation;
	category?: PatchItemCategory;
	description?: string;
	weapon?: PatchWeaponStats;
}

export interface IaMesaCharacterPatchProposal {
	kind: "character_patch";
	characterId: string;
	characterName: string;
	summary: string;
	fields: Partial<Record<CharacterNumericField, number>>;
	addItems: PatchNewItem[];
	updateItems: PatchItemUpdate[];
	removeItemIds: string[];
}

// ---------------------------------------------------------------------------
// Saneamento
// ---------------------------------------------------------------------------

function cleanText(value: unknown, max: number): string {
	if (typeof value !== "string") return "";
	const stripped = Array.from(value)
		.filter((ch) => {
			const code = ch.charCodeAt(0);
			return code >= 32 || code === 9 || code === 10;
		})
		.join("")
		.trim();
	return stripped.length > max ? `${stripped.slice(0, max - 1)}…` : stripped;
}

function toInt(value: unknown): number | null {
	const n =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim() !== ""
				? Number(value)
				: Number.NaN;
	return Number.isFinite(n) ? Math.round(n) : null;
}

function clampInt(value: unknown, min: number, max: number): number | null {
	const n = toInt(value);
	if (n === null) return null;
	return Math.min(max, Math.max(min, n));
}

function oneOf<T extends string>(
	list: readonly T[],
	value: unknown,
): T | undefined {
	return typeof value === "string" && (list as readonly string[]).includes(value)
		? (value as T)
		: undefined;
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export function isEntityId(value: unknown): value is string {
	return typeof value === "string" && ID_RE.test(value);
}

/** Dado de arma: "1d8", "2d6". */
const DICE_RE = /^([1-9]\d?)d(4|6|8|10|12|20|100)$/i;
/** Dano extra: "2", "1d6", "1d6+2". */
const AMOUNT_RE = /^(?:([1-9]\d?)d(4|6|8|10|12|20|100))?(?:\s*([+-]?\s*\d{1,2}))?$/i;

function cleanDice(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const v = value.trim().toLowerCase();
	return DICE_RE.test(v) ? v : null;
}

function cleanAmount(value: unknown): string | null {
	const v =
		typeof value === "number" ? String(Math.round(value)) : String(value ?? "");
	const t = v.trim().toLowerCase().replace(/\s+/g, "");
	if (!t || !AMOUNT_RE.test(t)) return null;
	return t;
}

function parseWeapon(raw: unknown): PatchWeaponStats | undefined {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
	const r = raw as Record<string, unknown>;
	const damageDice = cleanDice(r.damageDice);
	const damageType = oneOf(PATCH_DAMAGE_TYPES, r.damageType);
	if (!damageDice || !damageType) return undefined;
	const weapon: PatchWeaponStats = {
		damageDice,
		damageType,
		// "finesse" legado (Acuidade virou propriedade) → Destreza.
		ability:
			r.ability === "finesse"
				? "dexterity"
				: (oneOf(WEAPON_ABILITIES, r.ability) ?? "strength"),
	};
	const magic = clampInt(r.magicBonus, 0, 3);
	if (magic !== null && magic > 0) weapon.magicBonus = magic;
	if (typeof r.proficient === "boolean") weapon.proficient = r.proficient;
	if (Array.isArray(r.extraDamage)) {
		const extras: PatchWeaponExtraDamage[] = [];
		for (const e of r.extraDamage.slice(0, PATCH_LIMITS.extraDamage)) {
			if (!e || typeof e !== "object") continue;
			const er = e as Record<string, unknown>;
			const amount = cleanAmount(er.amount);
			const type = oneOf(PATCH_DAMAGE_TYPES, er.type);
			if (!amount || !type) continue;
			extras.push({
				label: cleanText(er.label, PATCH_LIMITS.label) || "Dano extra",
				amount,
				type,
			});
		}
		if (extras.length) weapon.extraDamage = extras;
	}
	return weapon;
}

function parseNewItem(raw: unknown): PatchNewItem | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const r = raw as Record<string, unknown>;
	const name = cleanText(r.name, PATCH_LIMITS.name);
	if (!name) return null;
	const weapon = parseWeapon(r.weapon);
	const item: PatchNewItem = {
		name,
		quantity: clampInt(r.quantity, 1, 9999) ?? 1,
		location: oneOf(ITEM_LOCATIONS, r.location) ?? "backpack",
		category:
			oneOf(ITEM_CATEGORIES, r.category) ?? (weapon ? "weapon" : "gear"),
	};
	const weight = typeof r.weightLbs === "number" ? r.weightLbs : null;
	if (weight !== null && Number.isFinite(weight) && weight >= 0)
		item.weightLbs = Math.min(9999, Math.round(weight * 100) / 100);
	const description = cleanText(r.description, PATCH_LIMITS.description);
	if (description) item.description = description;
	if (weapon) item.weapon = weapon;
	return item;
}

function parseItemUpdate(raw: unknown): PatchItemUpdate | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const r = raw as Record<string, unknown>;
	if (!isEntityId(r.itemId)) return null;
	const update: PatchItemUpdate = { itemId: r.itemId };
	const name = cleanText(r.name, PATCH_LIMITS.name);
	if (name) update.name = name;
	const quantity = clampInt(r.quantity, 0, 9999);
	if (quantity !== null) update.quantity = quantity;
	const location = oneOf(ITEM_LOCATIONS, r.location);
	if (location) update.location = location;
	const category = oneOf(ITEM_CATEGORIES, r.category);
	if (category) update.category = category;
	const description = cleanText(r.description, PATCH_LIMITS.description);
	if (description) update.description = description;
	const weapon = parseWeapon(r.weapon);
	if (weapon) update.weapon = weapon;
	return Object.keys(update).length > 1 ? update : null;
}

/** Contexto para validar o patch: ids que a leitura da campanha devolveu. */
export interface CharacterPatchScope {
	/** Fichas da campanha atual que o usuário enxerga (RLS). */
	characters: { id: string; name: string; itemIds?: string[] }[];
}

/**
 * Valida a chamada `propose_character_patch`. Descarta qualquer coisa fora da
 * allowlist; personagem fora da campanha ou item que não existe = proposta
 * inválida (null). Patch vazio = null.
 */
export function parseCharacterPatch(
	args: unknown,
	scope?: CharacterPatchScope,
): IaMesaCharacterPatchProposal | null {
	if (!args || typeof args !== "object" || Array.isArray(args)) return null;
	const raw = args as Record<string, unknown>;
	if (!isEntityId(raw.characterId)) return null;
	const target = scope?.characters.find((c) => c.id === raw.characterId);
	if (scope && !target) return null;

	const fields: Partial<Record<CharacterNumericField, number>> = {};
	const rawFields =
		raw.fields && typeof raw.fields === "object" && !Array.isArray(raw.fields)
			? (raw.fields as Record<string, unknown>)
			: {};
	for (const key of CHARACTER_NUMERIC_FIELD_KEYS) {
		if (!(key in rawFields)) continue;
		const spec = CHARACTER_NUMERIC_FIELDS[key];
		const v = clampInt(rawFields[key], spec.min, spec.max);
		if (v !== null) fields[key] = v;
	}

	const list = (value: unknown) =>
		Array.isArray(value) ? value.slice(0, PATCH_LIMITS.itemsPerList) : [];
	const addItems = list(raw.addItems)
		.map(parseNewItem)
		.filter((i): i is PatchNewItem => !!i);
	const updateItems = list(raw.updateItems)
		.map(parseItemUpdate)
		.filter((i): i is PatchItemUpdate => !!i);
	const removeItemIds = Array.from(
		new Set(list(raw.removeItemIds).filter(isEntityId)),
	);

	const knownItems = target?.itemIds;
	if (knownItems) {
		const known = new Set(knownItems);
		if (
			updateItems.some((u) => !known.has(u.itemId)) ||
			removeItemIds.some((id) => !known.has(id))
		)
			return null;
	}
	// Não atualiza e remove o mesmo item.
	const removing = new Set(removeItemIds);
	const updates = updateItems.filter((u) => !removing.has(u.itemId));

	if (
		Object.keys(fields).length === 0 &&
		addItems.length === 0 &&
		updates.length === 0 &&
		removeItemIds.length === 0
	)
		return null;

	return {
		kind: "character_patch",
		characterId: raw.characterId,
		characterName:
			target?.name ||
			cleanText(raw.characterName, PATCH_LIMITS.name) ||
			"Personagem",
		summary: cleanText(raw.summary, PATCH_LIMITS.summary),
		fields,
		addItems,
		updateItems: updates,
		removeItemIds,
	};
}

// ---------------------------------------------------------------------------
// Leitura (o que a IA enxerga da ficha)
// ---------------------------------------------------------------------------

export interface CharacterRow {
	id: string;
	name?: unknown;
	system?: unknown;
	data?: unknown;
}

export interface CharacterRosterEntry {
	id: string;
	name: string;
	class: string;
	level: number | null;
}

function dataOf(row: CharacterRow): Record<string, unknown> {
	return row.data && typeof row.data === "object" && !Array.isArray(row.data)
		? (row.data as Record<string, unknown>)
		: {};
}

export function rowName(row: CharacterRow): string {
	const data = dataOf(row);
	return (
		cleanText(data.characterName, PATCH_LIMITS.name) ||
		cleanText(row.name, PATCH_LIMITS.name) ||
		"Sem nome"
	);
}

export function rowItemIds(row: CharacterRow): string[] {
	const inv = dataOf(row).inventoryList;
	return Array.isArray(inv)
		? inv
				.map((i) => (i as { id?: unknown })?.id)
				.filter(isEntityId)
		: [];
}

export function toRoster(rows: CharacterRow[]): CharacterRosterEntry[] {
	return rows
		.filter((r) => isEntityId(r.id))
		.slice(0, PATCH_LIMITS.rosterSize)
		.map((row) => {
			const data = dataOf(row);
			return {
				id: row.id,
				name: rowName(row),
				class: cleanText(data.class, PATCH_LIMITS.label),
				level: toInt(data.level),
			};
		});
}

/** Ficha resumida (só campos editáveis + inventário) devolvida ao modelo. */
export function summarizeCharacter(row: CharacterRow): Record<string, unknown> {
	const data = dataOf(row);
	const fields: Record<string, number> = {};
	for (const key of CHARACTER_NUMERIC_FIELD_KEYS) {
		const v = toInt(data[key]);
		if (v !== null) fields[key] = v;
	}
	const inv = Array.isArray(data.inventoryList) ? data.inventoryList : [];
	const inventory = inv.slice(0, PATCH_LIMITS.inventoryRead).flatMap((i) => {
		if (!i || typeof i !== "object") return [];
		const item = i as Record<string, unknown>;
		if (!isEntityId(item.id)) return [];
		const weapon = parseWeapon(item.weapon);
		return [
			{
				itemId: item.id,
				name: cleanText(item.name, PATCH_LIMITS.name),
				quantity: toInt(item.quantity) ?? 1,
				location: oneOf(ITEM_LOCATIONS, item.location) ?? "backpack",
				category: oneOf(ITEM_CATEGORIES, item.category) ?? "gear",
				...(weapon ? { weapon } : {}),
			},
		];
	});
	return {
		characterId: row.id,
		name: rowName(row),
		system: cleanText(row.system ?? data.system, 20),
		class: cleanText(data.class, PATCH_LIMITS.label),
		race: cleanText(data.race, PATCH_LIMITS.label),
		fields,
		inventory,
	};
}

// ---------------------------------------------------------------------------
// Declarações para o modelo (formato Gemini functionDeclarations)
// ---------------------------------------------------------------------------

const WEAPON_SCHEMA = {
	type: "OBJECT",
	description:
		"Dados de arma (D&D 5e). Só para itens da categoria weapon. Dano por dado base + atributo + bônus mágico + extras.",
	properties: {
		damageDice: { type: "STRING", description: 'Dado base, ex.: "1d8"' },
		damageType: { type: "STRING", enum: [...PATCH_DAMAGE_TYPES] },
		ability: { type: "STRING", enum: [...WEAPON_ABILITIES] },
		magicBonus: { type: "INTEGER", description: "0 a 3" },
		proficient: { type: "BOOLEAN" },
		extraDamage: {
			type: "ARRAY",
			items: {
				type: "OBJECT",
				properties: {
					label: { type: "STRING", description: "Origem, ex.: Runa de fogo" },
					amount: { type: "STRING", description: '"2", "1d6" ou "1d6+2"' },
					type: { type: "STRING", enum: [...PATCH_DAMAGE_TYPES] },
				},
				required: ["amount", "type"],
			},
		},
	},
	required: ["damageDice", "damageType"],
};

const ITEM_BASE_PROPS = {
	name: { type: "STRING" },
	quantity: { type: "INTEGER" },
	location: { type: "STRING", enum: [...ITEM_LOCATIONS] },
	category: { type: "STRING", enum: [...ITEM_CATEGORIES] },
	description: { type: "STRING" },
	weapon: WEAPON_SCHEMA,
};

export const CHARACTER_TOOL_DECLARATIONS = [
	{
		name: READ_CHARACTER_TOOL,
		description:
			"Lê a ficha atual de um personagem DESTA campanha (atributos, PV, CA, inventário com itemId e dados de arma). Use antes de propor alterações.",
		parameters: {
			type: "OBJECT",
			properties: {
				characterId: {
					type: "STRING",
					description: "id do personagem (da lista de personagens da campanha)",
				},
			},
			required: ["characterId"],
		},
	},
	{
		name: CHARACTER_PATCH_TOOL,
		description:
			"Propõe alterações numa ficha EXISTENTE desta campanha. Não salva nada: o usuário vê o diff, confirma e aplica. Só envie o que muda.",
		parameters: {
			type: "OBJECT",
			properties: {
				characterId: { type: "STRING" },
				summary: {
					type: "STRING",
					description: "Uma frase explicando a mudança",
				},
				fields: {
					type: "OBJECT",
					description: "Novos valores numéricos (só os que mudam)",
					properties: Object.fromEntries(
						CHARACTER_NUMERIC_FIELD_KEYS.map((k) => [
							k,
							{ type: "INTEGER", description: CHARACTER_NUMERIC_FIELDS[k].label },
						]),
					),
				},
				addItems: {
					type: "ARRAY",
					items: {
						type: "OBJECT",
						properties: ITEM_BASE_PROPS,
						required: ["name"],
					},
				},
				updateItems: {
					type: "ARRAY",
					items: {
						type: "OBJECT",
						properties: { itemId: { type: "STRING" }, ...ITEM_BASE_PROPS },
						required: ["itemId"],
					},
				},
				removeItemIds: { type: "ARRAY", items: { type: "STRING" } },
			},
			required: ["characterId"],
		},
	},
];
