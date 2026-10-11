/**
 * Cadastro rico de itens (arma, armadura, bônus). Funções puras (sem React/DOM).
 * Nesta etapa só descrevem e validam o item; a ficha ainda não lê esses campos.
 */
import type {
	DamageType,
	Item,
	ItemArmorStats,
	ItemBonus,
	ItemBonusTarget,
	ItemOrigin,
	ItemWeaponStats,
	WeaponPropertyKey,
} from "@/lib/store/types";
import {
	ABILITY_LABELS,
	DAMAGE_TYPE_LABELS,
	normalizeWeaponAbility,
	parseDamageFormula,
	WEAPON_ABILITIES,
} from "./weapon-damage";

export { normalizeWeaponAbility, WEAPON_ABILITIES };

export type ItemCategoryKind = "weapon" | "armor" | "other";

export const ITEM_CATEGORIES = [
	"Arma",
	"Armadura",
	"Escudo",
	"Poção",
	"Anel",
	"Amuleto",
	"Pergaminho",
	"Varinha",
	"Cajado",
	"Foco Arcano",
	"Item Maravilhoso",
	"Utilitário",
] as const;

export const ITEM_RARITY_OPTIONS = [
	{ value: "comum", label: "Comum" },
	{ value: "incomum", label: "Incomum" },
	{ value: "raro", label: "Raro" },
	{ value: "muito raro", label: "Muito raro" },
	{ value: "lendário", label: "Lendário" },
	{ value: "artefato", label: "Artefato" },
] as const;

export const WEAPON_PROPERTY_LABELS: Record<WeaponPropertyKey, string> = {
	versatile: "Versátil",
	light: "Leve",
	heavy: "Pesada",
	two_handed: "Duas mãos",
	thrown: "Arremesso",
	reach: "Alcance",
	finesse: "Acuidade",
	ammunition: "Munição",
	loading: "Recarga",
};

/** Chips mostrados na aba Ataque. Acuidade é propriedade (não muda a conta ainda). */
export const WEAPON_PROPERTY_CHIPS: WeaponPropertyKey[] = [
	"versatile",
	"light",
	"heavy",
	"two_handed",
	"thrown",
	"reach",
	"finesse",
	"ammunition",
	"loading",
];

export const WEAPON_ABILITY_LABELS: Record<ItemWeaponStats["ability"], string> =
	ABILITY_LABELS;

const WEAPON_ABILITY_SHORT: Record<ItemWeaponStats["ability"], string> = {
	strength: "FOR",
	dexterity: "DES",
	constitution: "CON",
	intelligence: "INT",
	wisdom: "SAB",
	charisma: "CAR",
};

/**
 * Arma do Item lida do banco: atributo legado "finesse"/"acuidade" vira
 * Destreza e a arma ganha a propriedade Acuidade (se ainda não tinha).
 */
export function normalizeItemWeapon<T extends ItemWeaponStats | undefined>(
	weapon: T,
): T {
	if (!weapon) return weapon;
	const raw = (weapon as { ability?: unknown }).ability;
	const ability = normalizeWeaponAbility(raw);
	const legacyFinesse = raw === "finesse" || raw === "acuidade";
	const properties = weapon.properties ?? [];
	if (ability === raw && weapon.properties) return weapon;
	return {
		...weapon,
		ability,
		properties:
			legacyFinesse && !properties.includes("finesse")
				? [...properties, "finesse"]
				: properties,
	};
}

export const WEAPON_CATEGORY_LABELS: Record<
	ItemWeaponStats["weaponCategory"],
	string
> = {
	simple: "Simples",
	martial: "Marcial",
};

export const ARMOR_DEX_LABELS: Record<ItemArmorStats["dexMode"], string> = {
	full: "Total",
	max2: "Máx. +2",
	none: "Nenhuma",
};

export const ARMOR_CATEGORY_LABELS: Record<
	ItemArmorStats["armorCategory"],
	string
> = {
	light: "Leve",
	medium: "Média",
	heavy: "Pesada",
	shield: "Escudo",
};

export const ITEM_BONUS_TARGET_LABELS: Record<ItemBonusTarget, string> = {
	attack: "Acerto",
	damage: "Dano",
	ac: "CA",
	initiative: "Iniciativa",
	saves: "Salvaguardas",
	speed: "Deslocamento",
};

function normalizeText(value: string | undefined): string {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

/** Decide qual aba mecânica o item usa a partir da categoria (campo `type`). */
export function itemCategoryKind(type: string | undefined): ItemCategoryKind {
	const t = normalizeText(type);
	if (t === "arma" || t === "weapon" || t.startsWith("arma ")) return "weapon";
	if (
		t === "armadura" ||
		t === "escudo" ||
		t === "armor" ||
		t === "shield" ||
		t.startsWith("armadura ")
	)
		return "armor";
	return "other";
}

export function emptyWeaponStats(): ItemWeaponStats {
	return {
		damageDice: "",
		damageType: "slashing",
		ability: "strength",
		weaponCategory: "martial",
		properties: [],
		customProperties: [],
		extraDamage: [],
	};
}

export function emptyArmorStats(isShield = false): ItemArmorStats {
	return isShield
		? { baseAc: 2, dexMode: "none", armorCategory: "shield" }
		: { baseAc: 11, dexMode: "full", armorCategory: "light" };
}

/** Dado de arma válido: só dados ("1d8", "2d6", "1d4+1d6"), sem número solto. */
export function isValidDamageDice(value: string | undefined): boolean {
	const parsed = parseDamageFormula(value ?? "");
	return Boolean(parsed && parsed.dice.length > 0 && parsed.flat === 0);
}

/** Quantia de dano extra: aceita "1d6", "2" ou "1d6+2". */
export function isValidDamageAmount(value: string | undefined): boolean {
	return parseDamageFormula(value ?? "") !== null;
}

export interface ItemDraft {
	name?: string;
	type?: string;
	description?: string;
	weapon?: ItemWeaponStats;
	armor?: ItemArmorStats;
	bonuses?: ItemBonus[];
}

export interface ItemDraftErrors {
	name?: string;
	damageDice?: string;
	versatileDice?: string;
	extraDamage?: Record<string, string>;
}

export function validateItemDraft(draft: ItemDraft): {
	ok: boolean;
	errors: ItemDraftErrors;
} {
	const errors: ItemDraftErrors = {};
	if (!draft.name?.trim()) errors.name = "Dê um nome para o item.";
	const weapon =
		itemCategoryKind(draft.type) === "weapon" ? draft.weapon : undefined;
	if (weapon) {
		if (weapon.damageDice.trim() && !isValidDamageDice(weapon.damageDice))
			errors.damageDice = "Use dados no formato 1d8 ou 2d6.";
		if (
			weapon.properties.includes("versatile") &&
			weapon.versatileDice?.trim() &&
			!isValidDamageDice(weapon.versatileDice)
		)
			errors.versatileDice = "Use dados no formato 1d10.";
		for (const extra of weapon.extraDamage) {
			if (extra.amount.trim() && !isValidDamageAmount(extra.amount)) {
				errors.extraDamage ??= {};
				errors.extraDamage[extra.id] = "Use 1d6, 2 ou 1d6+2.";
			}
		}
	}
	return { ok: Object.keys(errors).length === 0, errors };
}

function signed(value: number): string {
	return value >= 0 ? `+${value}` : String(value);
}

export function shortDamageType(type: DamageType): string {
	const label = normalizeText(DAMAGE_TYPE_LABELS[type]);
	return `${label.slice(0, 3)}.`;
}

export interface ItemSheetSummary {
	attack: string;
	damage: string;
	extra?: string;
}

/** Como a arma aparece na ficha: "Prof+FOR+1", "1d8+FOR+1", "+1d6 rad.". */
export function summarizeItemForSheet(
	weapon: ItemWeaponStats | undefined,
): ItemSheetSummary | null {
	if (!weapon || !isValidDamageDice(weapon.damageDice)) return null;
	const ability = WEAPON_ABILITY_SHORT[normalizeWeaponAbility(weapon.ability)];
	const magic = weapon.magicBonus ? signed(weapon.magicBonus) : "";
	const extras = weapon.extraDamage
		.filter((e) => e.amount.trim() && isValidDamageAmount(e.amount))
		.map(
			(e) =>
				`+${e.amount.replace(/^\+/, "").trim()} ${shortDamageType(e.type)}`,
		);
	return {
		attack: `Prof+${ability}${magic}`,
		damage: `${weapon.damageDice.replace(/\s+/g, "")}+${ability}${magic}`,
		extra: extras.length ? extras.join(" ") : undefined,
	};
}

function newId(): string {
	return crypto.randomUUID();
}

/** Cópia independente da mecânica de outro item (mudar a origem não mexe na cópia). */
export function copyItemMechanics(
	from: Pick<
		Item,
		| "id"
		| "name"
		| "type"
		| "subtype"
		| "rarity"
		| "weapon"
		| "armor"
		| "bonuses"
	>,
): Pick<
	Item,
	"type" | "subtype" | "rarity" | "weapon" | "armor" | "bonuses" | "origin"
> {
	const weapon = from.weapon
		? normalizeItemWeapon(structuredClone(from.weapon))
		: undefined;
	if (weapon) {
		weapon.properties ??= [];
		weapon.customProperties ??= [];
		weapon.extraDamage = (weapon.extraDamage ?? []).map((e) => ({
			...e,
			id: newId(),
		}));
	}
	return {
		type: from.type,
		subtype: from.subtype,
		rarity: from.rarity,
		weapon,
		armor: from.armor ? structuredClone(from.armor) : undefined,
		bonuses: from.bonuses?.map((b) => ({ ...b, id: newId() })),
		origin: { kind: "copy", fromItemId: from.id, fromName: from.name },
	};
}

export type ItemFormTabId = "identity" | "mechanics" | "bonus" | "description";

export type TabStatus =
	| { kind: "done" }
	| { kind: "summary"; text: string }
	| { kind: "empty" }
	| { kind: "optional" }
	| { kind: "required" };

/** Status curto de cada aba na coluna lateral. */
export function tabStatus(
	draft: ItemDraft,
	mode: "create" | "edit",
): Record<ItemFormTabId, TabStatus> {
	const idle: TabStatus =
		mode === "create" ? { kind: "optional" } : { kind: "empty" };
	const kind = itemCategoryKind(draft.type);

	let mechanics: TabStatus = idle;
	if (kind === "weapon") {
		const w = draft.weapon;
		if (w && isValidDamageDice(w.damageDice)) {
			const magic = w.magicBonus ? signed(w.magicBonus) : "";
			mechanics = {
				kind: "summary",
				text: `${w.damageDice.replace(/\s+/g, "")}${magic}`,
			};
		} else {
			mechanics = { kind: "required" };
		}
	} else if (kind === "armor") {
		mechanics = draft.armor
			? { kind: "summary", text: `CA ${draft.armor.baseAc}` }
			: { kind: "required" };
	}

	const bonusCount = draft.bonuses?.length ?? 0;
	return {
		identity: draft.name?.trim() ? { kind: "done" } : { kind: "required" },
		mechanics,
		bonus: bonusCount ? { kind: "summary", text: String(bonusCount) } : idle,
		description: draft.description?.trim() ? { kind: "done" } : idle,
	};
}

/** Linha curta do item: "Marcial · corpo a corpo". */
export function describeItemLine(
	draft: Pick<ItemDraft, "type" | "weapon" | "armor"> & { subtype?: string },
): string {
	const kind = itemCategoryKind(draft.type);
	if (kind === "weapon" && draft.weapon) {
		const ranged =
			draft.weapon.properties.includes("ammunition") ||
			draft.weapon.properties.includes("loading");
		return `${WEAPON_CATEGORY_LABELS[draft.weapon.weaponCategory]} · ${ranged ? "à distância" : "corpo a corpo"}`;
	}
	if (kind === "armor" && draft.armor)
		return `${ARMOR_CATEGORY_LABELS[draft.armor.armorCategory]} · CA ${draft.armor.baseAc}`;
	return draft.subtype?.trim() || draft.type?.trim() || "Item";
}

export function formatBonusValue(value: number): string {
	return signed(value);
}

export function makeItemBonus(): ItemBonus {
	return { id: newId(), target: "attack", value: 1 };
}

export function makeExtraDamage(): ItemWeaponStats["extraDamage"][number] {
	return { id: newId(), label: "", amount: "", type: "radiant" };
}

export const BLANK_ORIGIN: ItemOrigin = { kind: "blank" };
