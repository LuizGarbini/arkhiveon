/**
 * Vínculo vivo entre o inventário da ficha e os Itens da campanha.
 * Funções puras (sem React/DOM). Os números nunca são copiados para a ficha:
 * a cada render, a entrada vinculada é resolvida a partir do Item atual.
 */
import type {
	Character,
	InventoryItem,
	InventoryWeaponStats,
	Item,
	MembershipRole,
} from "@/lib/store/types";
import {
	type ArmorClassStat,
	computeArmorClass,
	computeInitiative,
	type LinkedEntry,
} from "./combat-stats";
import {
	ARMOR_CATEGORY_LABELS,
	isValidDamageDice,
	itemCategoryKind,
} from "./item-mechanics";
import { calculateProficiencyBonus, formatModifier } from "./modifier-engine";
import {
	buildWeaponAttack,
	DAMAGE_TYPE_LABELS,
	normalizeWeaponAbility,
	weaponAbilityScores,
} from "./weapon-damage";

export type InventoryLocation = InventoryItem["location"];

/** Chips do Dialog "Adicionar da campanha". */
export type LinkFilter = "all" | "weapon" | "armor" | "ring" | "consumable";

export const LINK_FILTERS: { id: LinkFilter; label: string }[] = [
	{ id: "all", label: "Todos" },
	{ id: "weapon", label: "Armas" },
	{ id: "armor", label: "Armaduras" },
	{ id: "ring", label: "Anéis" },
	{ id: "consumable", label: "Consumíveis" },
];

export type LinkKind = Exclude<LinkFilter, "all"> | "other";

function normalize(value: string | undefined): string {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

const CONSUMABLE_TYPES = [
	"pocao",
	"pocoes",
	"potion",
	"pergaminho",
	"scroll",
	"consumivel",
	"consumable",
	"municao",
];

export function linkKindOf(item: Pick<Item, "type">): LinkKind {
	const kind = itemCategoryKind(item.type);
	if (kind === "weapon") return "weapon";
	if (kind === "armor") return "armor";
	const t = normalize(item.type);
	if (t === "anel" || t === "aneis" || t === "ring") return "ring";
	if (CONSUMABLE_TYPES.some((c) => t === c || t.startsWith(`${c} `)))
		return "consumable";
	return "other";
}

export function matchesLinkFilter(
	item: Pick<Item, "type">,
	filter: LinkFilter,
): boolean {
	return filter === "all" || linkKindOf(item) === filter;
}

export function inventoryCategoryFor(
	item: Pick<Item, "type">,
): NonNullable<InventoryItem["category"]> {
	const kind = linkKindOf(item);
	if (kind === "weapon") return "weapon";
	if (kind === "armor") return "armor";
	if (kind === "consumable") return "potion";
	return "gear";
}

/** Arma do Item convertida para o formato que o #102 já calcula. */
export function weaponStatsFromItem(
	item: Pick<Item, "type" | "weapon">,
	proficient: boolean,
): InventoryWeaponStats | undefined {
	const w = item.weapon;
	if (linkKindOf(item) !== "weapon" || !w || !isValidDamageDice(w.damageDice))
		return undefined;
	return {
		damageDice: w.damageDice.replace(/\s+/g, ""),
		damageType: w.damageType,
		ability: normalizeWeaponAbility(w.ability),
		magicBonus: w.magicBonus,
		proficient,
		extraDamage: (w.extraDamage ?? []).filter((e) => e.amount.trim()),
		...(w.properties?.includes("versatile") && w.versatileDice?.trim()
			? { versatileDice: w.versatileDice.replace(/\s+/g, "") }
			: {}),
	};
}

export type LinkStatus = "ok" | "missing";

/** "missing" = item apagado ou invisível para quem vê (secreto). */
export function linkStatus(
	entry: InventoryItem,
	itemsById: ReadonlyMap<string, Item>,
): LinkStatus {
	if (!entry.campaignItemId) return "ok";
	return itemsById.has(entry.campaignItemId) ? "ok" : "missing";
}

/** Entradas vinculadas com Item disponível. */
export function resolveLinkedEntries(
	inventory: InventoryItem[] | undefined,
	itemsById: ReadonlyMap<string, Item>,
): LinkedEntry[] {
	const out: LinkedEntry[] = [];
	for (const entry of inventory ?? []) {
		if (!entry.campaignItemId) continue;
		const item = itemsById.get(entry.campaignItemId);
		if (item) out.push({ entry, item });
	}
	return out;
}

/**
 * Inventário com as entradas vinculadas lidas do Item vivo. Entradas sem
 * vínculo voltam iguais; vínculo quebrado perde os números (não soma nada).
 */
export function resolveLinkedInventory(
	inventory: InventoryItem[] | undefined,
	itemsById: ReadonlyMap<string, Item>,
): InventoryItem[] {
	return (inventory ?? []).map((entry) => {
		if (!entry.campaignItemId) return entry;
		const item = itemsById.get(entry.campaignItemId);
		const { weapon: _stale, ...rest } = entry;
		if (!item) return { ...rest, category: "custom" };
		const weapon = weaponStatsFromItem(item, entry.proficient !== false);
		return {
			...rest,
			name: item.name,
			category: inventoryCategoryFor(item),
			...(weapon ? { weapon } : {}),
		};
	});
}

/** "1,5 kg" → 3.3 lb; "3 lb" → 3. Sem número → 0. */
export function parseWeightLbs(weight: string | undefined): number {
	const match = /(\d+(?:[.,]\d+)?)/.exec(weight ?? "");
	if (!match) return 0;
	const value = Number(match[1].replace(",", "."));
	if (!Number.isFinite(value)) return 0;
	return /kg/i.test(weight ?? "")
		? Math.round(value * 2.2046 * 10) / 10
		: value;
}

export interface LinkOptions {
	location: InventoryLocation;
	proficient: boolean;
}

export function makeLinkedEntry(
	item: Item,
	{ location, proficient }: LinkOptions,
	newId: () => string = () => crypto.randomUUID(),
): InventoryItem {
	const kind = linkKindOf(item);
	return {
		id: newId(),
		name: item.name,
		quantity: 1,
		weightLbs: parseWeightLbs(item.weight),
		location,
		category: inventoryCategoryFor(item),
		campaignItemId: item.id,
		...(kind === "weapon" ? { proficient } : {}),
		...(item.requiresAttunement ? { isAttuned: true } : {}),
	};
}

/**
 * Quem pode vincular itens nesta ficha: mestre (owner) ou editor da campanha,
 * em qualquer ficha dela — mesmo criada por outra pessoa. Alinha com a policy
 * de UPDATE de characters (owner/editor salvam qualquer ficha da campanha).
 * Viewer não salva ficha nenhuma (RLS de UPDATE), então não vincula.
 * characterCreatedBy/userId ficam na assinatura por compatibilidade.
 */
export function canLinkOnSheet({
	role,
}: {
	role: MembershipRole | undefined;
	characterCreatedBy: string | undefined;
	userId: string | undefined;
}): boolean {
	return role === "owner" || role === "editor";
}

function signed(value: number): string {
	return formatModifier(value);
}

/** Linha curta do item na lista: "Arma · 1d8 cortante · +1 · versátil". */
export function describeLinkCandidate(item: Item): string {
	const kind = linkKindOf(item);
	const w = item.weapon;
	if (kind === "weapon" && w && isValidDamageDice(w.damageDice)) {
		const bits = [
			"Arma",
			`${w.damageDice.replace(/\s+/g, "")} ${DAMAGE_TYPE_LABELS[w.damageType].toLowerCase()}`,
		];
		if (w.magicBonus) bits.push(signed(w.magicBonus));
		const ranged =
			w.properties?.includes("ammunition") || w.properties?.includes("loading");
		if (ranged && w.range?.trim()) bits.push(`distância ${w.range.trim()}`);
		if (w.properties?.includes("versatile")) bits.push("versátil");
		return bits.join(" · ");
	}
	const a = item.armor;
	if (kind === "armor" && a) {
		if (a.armorCategory === "shield") return `Escudo · CA +${a.baseAc}`;
		const dex =
			a.dexMode === "full"
				? " + DES"
				: a.dexMode === "max2"
					? " + DES (máx. 2)"
					: "";
		return `Armadura ${ARMOR_CATEGORY_LABELS[a.armorCategory].toLowerCase()} · CA ${a.baseAc}${dex}`;
	}
	const bits: string[] = [item.type?.trim() || "Item"];
	for (const b of item.bonuses ?? []) {
		if (b.target === "initiative") bits.push(`${signed(b.value)} Iniciativa`);
		else if (b.target === "ac") bits.push(`${signed(b.value)} CA`);
	}
	if (item.requiresAttunement) bits.push("sintonização");
	if (bits.length === 1 && item.stats?.trim()) bits.push(item.stats.trim());
	return bits.join(" · ");
}

export type LinkEffectKind = "attack" | "defense" | "carry" | "stash" | "none";

export interface LinkEffectPart {
	label: string;
	value: string;
	/** Texto depois do número (ex.: tipo de dano). */
	suffix?: string;
}

export interface LinkEffect {
	kind: LinkEffectKind;
	/** Rótulo antes dos números ("Entra em Ataques:"). */
	prefix: string;
	parts: LinkEffectPart[];
	/** Frase completa: "Acerto +6 · Dano 1d8+4 cortante", "CA 15", "Só carrega". */
	text: string;
	/** Versão curta para o botão do mobile: "Acerto +6 · Dano 1d8+4". */
	short: string;
}

function effectOf(
	kind: LinkEffectKind,
	prefix: string,
	parts: LinkEffectPart[],
	fallback: string,
): LinkEffect {
	if (parts.length === 0)
		return { kind, prefix, parts, text: fallback, short: fallback };
	return {
		kind,
		prefix,
		parts,
		text: parts
			.map((p) => `${p.label} ${p.value}${p.suffix ? ` ${p.suffix}` : ""}`)
			.join(" · "),
		short: parts.map((p) => `${p.label} ${p.value}`).join(" · "),
	};
}

/**
 * O que muda na ficha se o item for vinculado assim. `current` são os
 * vínculos que a ficha já tem (para CA/iniciativa somarem com eles).
 */
export function previewLinkEffect(
	item: Item,
	character: Pick<
		Character,
		| "strength"
		| "dexterity"
		| "constitution"
		| "intelligence"
		| "wisdom"
		| "charisma"
		| "level"
		| "proficiencyBonus"
		| "armorClass"
		| "initiative"
	>,
	{ location, proficient }: LinkOptions,
	current: LinkedEntry[] = [],
): LinkEffect {
	if (location === "backpack") return effectOf("carry", "", [], "Só carrega");
	if (location === "mount_stash") return effectOf("stash", "", [], "Não pesa");

	const weapon = weaponStatsFromItem(item, proficient);
	if (weapon) {
		const prof =
			character.proficiencyBonus ||
			calculateProficiencyBonus(character.level || 1);
		const attack = buildWeaponAttack(
			{
				id: item.id,
				name: item.name,
				quantity: 1,
				weightLbs: 0,
				location: "equipped",
				category: "weapon",
				weapon,
			},
			weaponAbilityScores(character),
			prof,
		);
		const single = attack.types.length === 1 ? attack.types[0] : undefined;
		return effectOf(
			"attack",
			"Entra em Ataques:",
			[
				{ label: "Acerto", value: signed(attack.attackBonus) },
				{
					label: "Dano",
					value: attack.formula,
					suffix: single ? DAMAGE_TYPE_LABELS[single].toLowerCase() : undefined,
				},
			],
			"",
		);
	}

	const entry = makeLinkedEntry(
		item,
		{ location, proficient },
		() => "preview",
	);
	const next: LinkedEntry[] = [...current, { entry, item }];
	const parts: LinkEffectPart[] = [];
	const touches = (target: "ac" | "initiative") =>
		(item.bonuses ?? []).some((b) => b.target === target && !b.when?.trim());
	const ac: ArmorClassStat = computeArmorClass(character, next);
	if (ac.source === "items" && (item.armor || touches("ac")))
		parts.push({ label: "CA", value: String(ac.total) });
	const init = computeInitiative(character, next);
	if (init.source === "items" && touches("initiative"))
		parts.push({ label: "Iniciativa", value: signed(init.total) });
	if (parts.length > 0) {
		return effectOf("defense", "Na ficha:", parts, "");
	}
	return effectOf("none", "", [], "Sem número na ficha");
}
