/**
 * D&D 5e: equipamento da ficha — em que slot cada item está e o que ele muda
 * nos atributos. Funções puras (sem React/DOM). Como no vínculo de itens, nada
 * é copiado para a ficha: os atributos efetivos são recalculados a cada render
 * a partir do Item vivo, e o valor salvo da ficha continua sendo a base.
 */
import type {
	Character,
	EquipSlot,
	InventoryItem,
	Item,
	ItemAbilityBonus,
	ItemSlot,
	WeaponAbility,
} from "@/lib/store/types";
import {
	type ArmorClassStat,
	type CombatStat,
	computeArmorClass,
	computeInitiative,
	isLinkActive,
	type LinkedEntry,
} from "./combat-stats";
import {
	linkKindOf,
	makeLinkedEntry,
	resolveLinkedEntries,
} from "./item-links";
import { ABILITY_SHORT_LABELS } from "./item-mechanics";
import { calculateAbilityModifier, formatModifier } from "./modifier-engine";
import { weaponAbilityScores } from "./weapon-damage";

export { ABILITY_SHORT_LABELS };

// ── Slots ────────────────────────────────────────────────────────────

/** Ordem em que os slots aparecem na ficha. */
export const EQUIP_SLOTS: readonly EquipSlot[] = [
	"head",
	"neck",
	"cloak",
	"hands",
	"ring1",
	"ring2",
	"mainHand",
	"offHand",
	"armor",
	"feet",
];

export const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
	head: "Cabeça",
	neck: "Pescoço",
	cloak: "Capa",
	hands: "Mãos",
	ring1: "Anel 1",
	ring2: "Anel 2",
	mainHand: "Mão principal",
	offHand: "Mão secundária",
	armor: "Armadura",
	feet: "Pés",
};

/** Rótulo curto para o slot dentro do tile (cabe em 104 px). */
export const EQUIP_SLOT_SHORT_LABELS: Record<EquipSlot, string> = {
	...EQUIP_SLOT_LABELS,
	mainHand: "Principal",
	offHand: "Secundária",
};

export const ITEM_SLOT_LABELS: Record<ItemSlot, string> = {
	head: "Cabeça",
	neck: "Pescoço",
	cloak: "Capa",
	hands: "Mãos (luvas)",
	ring: "Anel",
	weapon: "Arma (uma mão)",
	shield: "Escudo",
	armor: "Armadura",
	feet: "Pés",
};

export const ITEM_SLOTS = Object.keys(ITEM_SLOT_LABELS) as ItemSlot[];

const SLOTS_FOR_ITEM_SLOT: Record<ItemSlot, readonly EquipSlot[]> = {
	head: ["head"],
	neck: ["neck"],
	cloak: ["cloak"],
	hands: ["hands"],
	ring: ["ring1", "ring2"],
	weapon: ["mainHand", "offHand"],
	shield: ["offHand"],
	armor: ["armor"],
	feet: ["feet"],
};

function normalize(value: string | undefined): string {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

/** Slot do item: o escolhido no cadastro, ou deduzido da categoria. */
export function itemSlotOf(
	item: Pick<Item, "type" | "slot" | "armor">,
): ItemSlot | undefined {
	if (item.slot) return item.slot;
	const kind = linkKindOf(item);
	if (kind === "weapon") return "weapon";
	if (kind === "armor") {
		return item.armor?.armorCategory === "shield" ||
			normalize(item.type) === "escudo"
			? "shield"
			: "armor";
	}
	if (kind === "ring") return "ring";
	const type = normalize(item.type);
	if (type === "amuleto" || type === "amulet") return "neck";
	return undefined;
}

/** Posições da ficha onde o item pode ficar (vazio = sem slot definido). */
export function slotsForItem(
	item: Pick<Item, "type" | "slot" | "armor">,
): readonly EquipSlot[] {
	const slot = itemSlotOf(item);
	return slot ? SLOTS_FOR_ITEM_SLOT[slot] : [];
}

export interface SlotMap {
	bySlot: ReadonlyMap<EquipSlot, LinkedEntry>;
	/** Equipado, mas sem slot que o comporte (item antigo sem categoria). */
	unslotted: LinkedEntry[];
}

/**
 * Encaixa os itens equipados nos slots. Quem tem `entry.slot` válido fica
 * onde está; os demais (fichas antigas) ocupam o primeiro slot livre da sua
 * categoria. Determinístico: a mesma ficha sempre dá o mesmo resultado.
 */
export function resolveSlots(linked: readonly LinkedEntry[]): SlotMap {
	const bySlot = new Map<EquipSlot, LinkedEntry>();
	const pending: LinkedEntry[] = [];
	const equipped = linked.filter((l) => l.entry.location === "equipped");

	for (const l of equipped) {
		const allowed = slotsForItem(l.item);
		const wanted = l.entry.slot;
		if (wanted && allowed.includes(wanted) && !bySlot.has(wanted)) {
			bySlot.set(wanted, l);
		} else {
			pending.push(l);
		}
	}
	const unslotted: LinkedEntry[] = [];
	for (const l of pending) {
		const free = slotsForItem(l.item).find((s) => !bySlot.has(s));
		if (free) bySlot.set(free, l);
		else unslotted.push(l);
	}
	return { bySlot, unslotted };
}

// ── Sintonização ─────────────────────────────────────────────────────

/** Regra do D&D 5e: no máximo 3 itens sintonizados. */
export const MAX_ATTUNED_ITEMS = 3;

/** Itens equipados e sintonizados (os que exigem sintonização). */
export function attunedCount(linked: readonly LinkedEntry[]): number {
	return linked.filter(
		(l) =>
			l.entry.location === "equipped" &&
			l.item.requiresAttunement &&
			l.entry.isAttuned === true,
	).length;
}

/**
 * Liga ou desliga a sintonia de um item equipado. Ligar exige vaga (máximo 3);
 * item que não exige sintonização não muda. `ok: false` = nada foi alterado.
 */
export function setAttunement(
	inventory: readonly InventoryItem[],
	itemsById: ReadonlyMap<string, Item>,
	entryId: string,
	attuned: boolean,
): { inventory: InventoryItem[]; ok: boolean } {
	const unchanged = { inventory: [...inventory], ok: false };
	const linked = resolveLinkedEntries([...inventory], itemsById);
	const target = linked.find((l) => l.entry.id === entryId);
	if (!target?.item.requiresAttunement) return unchanged;
	if (attuned && target.entry.location !== "equipped") return unchanged;
	if (attuned) {
		const used = attunedCount(linked.filter((l) => l.entry.id !== entryId));
		if (used >= MAX_ATTUNED_ITEMS) return unchanged;
	}
	return {
		inventory: inventory.map((entry) =>
			entry.id === entryId ? { ...entry, isAttuned: attuned } : entry,
		),
		ok: true,
	};
}

// ── Atributos efetivos ───────────────────────────────────────────────

export const ABILITY_KEYS: readonly WeaponAbility[] = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
];

/** A chave é um dos seis atributos clássicos (os únicos que itens alteram)? */
export function isWeaponAbilityKey(key: string): key is WeaponAbility {
	return (ABILITY_KEYS as readonly string[]).includes(key);
}

export const ABILITY_FULL_LABELS: Record<WeaponAbility, string> = {
	strength: "Força",
	dexterity: "Destreza",
	constitution: "Constituição",
	intelligence: "Inteligência",
	wisdom: "Sabedoria",
	charisma: "Carisma",
};

/** Teto do D&D 5e para um atributo. */
export const ABILITY_SCORE_CAP = 30;

export interface AbilityPart {
	/** Origem: "Base da ficha" ou o nome do item. */
	label: string;
	kind: "base" | "set" | "add";
	value: number;
}

export interface AbilityScoreStat {
	key: WeaponAbility;
	/** Valor salvo na ficha. */
	base: number;
	/** Valor com os itens equipados. */
	total: number;
	/** `total - base`. */
	delta: number;
	parts: AbilityPart[];
}

export type AbilityScoreStats = Record<WeaponAbility, AbilityScoreStat>;

function validBonus(b: ItemAbilityBonus): boolean {
	return (
		ABILITY_KEYS.includes(b.ability) &&
		(b.mode === "add" || b.mode === "set") &&
		Number.isFinite(Number(b.value))
	);
}

/**
 * Atributos com os itens: primeiro "fixa em" (vale o maior, e só se passar da
 * base), depois as somas. Só conta item No Corpo e, se exigir, sintonizado.
 */
export function computeAbilityScores(
	character: Partial<Record<WeaponAbility, unknown>>,
	linked: readonly LinkedEntry[],
): AbilityScoreStats {
	const base = weaponAbilityScores(character);
	const counted = linked.filter(isLinkActive);
	const out = {} as AbilityScoreStats;

	for (const key of ABILITY_KEYS) {
		const sets: { label: string; value: number }[] = [];
		const adds: { label: string; value: number }[] = [];
		for (const l of counted) {
			for (const b of l.item.abilityBonuses ?? []) {
				if (!validBonus(b) || b.ability !== key) continue;
				const value = Math.trunc(Number(b.value));
				if (b.mode === "set") sets.push({ label: l.item.name, value });
				else if (value !== 0) adds.push({ label: l.item.name, value });
			}
		}
		const parts: AbilityPart[] = [
			{ label: "Base da ficha", kind: "base", value: base[key] },
		];
		const bestSet = sets.sort((a, b) => b.value - a.value)[0];
		let running = base[key];
		if (bestSet && bestSet.value > base[key]) {
			parts.push({ label: bestSet.label, kind: "set", value: bestSet.value });
			running = bestSet.value;
		}
		for (const a of adds) {
			parts.push({ label: a.label, kind: "add", value: a.value });
			running += a.value;
		}
		const total = Math.min(ABILITY_SCORE_CAP, Math.max(1, running));
		out[key] = { key, base: base[key], total, delta: total - base[key], parts };
	}
	return out;
}

/** Os 6 valores efetivos, no formato que as contas de arma/CA já leem. */
export function effectiveScores(
	stats: AbilityScoreStats,
): Record<WeaponAbility, number> {
	return {
		strength: stats.strength.total,
		dexterity: stats.dexterity.total,
		constitution: stats.constitution.total,
		intelligence: stats.intelligence.total,
		wisdom: stats.wisdom.total,
		charisma: stats.charisma.total,
	};
}

// ── Deslocamento e salvaguardas ──────────────────────────────────────

export interface BonusPart {
	label: string;
	value: number;
}

export interface SumStat {
	base: number;
	total: number;
	parts: BonusPart[];
}

function sumBonuses(
	linked: readonly LinkedEntry[],
	target: "speed" | "saves",
): BonusPart[] {
	const parts: BonusPart[] = [];
	for (const l of linked.filter(isLinkActive)) {
		for (const b of l.item.bonuses ?? []) {
			if (b.target !== target || b.when?.trim()) continue;
			const value = Math.trunc(Number(b.value) || 0);
			if (value !== 0) parts.push({ label: l.item.name, value });
		}
	}
	return parts;
}

export function computeSpeed(
	character: { speed?: unknown },
	linked: readonly LinkedEntry[],
): SumStat {
	const base = Number(character.speed) || 0;
	const parts = sumBonuses(linked, "speed");
	return {
		base,
		total: base + parts.reduce((s, p) => s + p.value, 0),
		parts,
	};
}

/** Bônus geral de salvaguardas dos itens (soma em todas elas). */
export function computeSavesBonus(linked: readonly LinkedEntry[]): SumStat {
	const parts = sumBonuses(linked, "saves");
	return { base: 0, total: parts.reduce((s, p) => s + p.value, 0), parts };
}

// ── Tudo junto ───────────────────────────────────────────────────────

export interface EffectiveStats {
	/** Itens vinculados já resolvidos (vazio fora do D&D 5e). */
	linked: LinkedEntry[];
	abilities: AbilityScoreStats;
	/** Os seis atributos com itens, prontos para as contas de arma. */
	scores: Record<WeaponAbility, number>;
	ac: ArmorClassStat;
	initiative: CombatStat;
	speed: SumStat;
	saves: SumStat;
}

/**
 * Números da ficha com os itens equipados: atributos, CA, iniciativa,
 * deslocamento e salvaguardas. Fora do D&D 5e não há vínculo de itens, então
 * tudo volta igual ao valor salvo.
 */
export function computeEffectiveStats(
	character: Character,
	itemsById: ReadonlyMap<string, Item>,
): EffectiveStats {
	const linked =
		character.system === "dnd5e"
			? resolveLinkedEntries(character.inventoryList, itemsById)
			: [];
	const abilities = computeAbilityScores(character, linked);
	return {
		linked,
		abilities,
		scores: effectiveScores(abilities),
		ac: computeArmorClass(character, linked, abilities.dexterity.total),
		initiative: computeInitiative(character, linked, abilities.dexterity.total),
		speed: computeSpeed(character, linked),
		saves: computeSavesBonus(linked),
	};
}

// ── PV estimado ──────────────────────────────────────────────────────

/**
 * PV máximo estimado quando a Constituição efetiva muda o modificador:
 * a diferença vale por nível. É só uma estimativa mostrada na equipe — o PV
 * máximo salvo na ficha não é alterado.
 */
export function estimateHealthMax(input: {
	healthMax: number;
	level: number;
	baseCon: number;
	effectiveCon: number;
}): { from: number; to: number; perLevel: number } | null {
	const perLevel =
		calculateAbilityModifier(input.effectiveCon) -
		calculateAbilityModifier(input.baseCon);
	if (perLevel === 0 || !(input.healthMax > 0)) return null;
	const level = Math.max(1, Math.trunc(input.level) || 1);
	return {
		from: input.healthMax,
		to: Math.max(level, input.healthMax + perLevel * level),
		perLevel,
	};
}

// ── Trocar item no slot ──────────────────────────────────────────────

function freeAttunement(
	linked: readonly LinkedEntry[],
	ignoreIds: ReadonlySet<string>,
): boolean {
	const used = attunedCount(linked.filter((l) => !ignoreIds.has(l.entry.id)));
	return used < MAX_ATTUNED_ITEMS;
}

export interface EquipOutcome {
	inventory: InventoryItem[];
	/** Entrada que saiu do slot para a mochila, se havia. */
	displaced?: InventoryItem;
	/** Exige sintonização e já havia 3: ficou equipado, mas sem sintonizar. */
	attunementFull: boolean;
}

function withoutSlot(entry: InventoryItem): InventoryItem {
	const { slot: _slot, ...rest } = entry;
	return rest;
}

/**
 * Equipa uma entrada que já está no inventário (mochila ou montaria) no slot.
 * Quem estava lá vai para a mochila. Retorna o inventário novo.
 */
export function equipEntryInSlot(
	inventory: readonly InventoryItem[],
	itemsById: ReadonlyMap<string, Item>,
	entryId: string,
	slot: EquipSlot,
): EquipOutcome {
	const linked = resolveLinkedEntries([...inventory], itemsById);
	const target = linked.find((l) => l.entry.id === entryId);
	if (!target || !slotsForItem(target.item).includes(slot)) {
		return { inventory: [...inventory], attunementFull: false };
	}
	const occupant = resolveSlots(linked).bySlot.get(slot);
	const ignore = new Set([entryId, occupant?.entry.id ?? ""]);
	const needsAttunement = target.item.requiresAttunement;
	const canAttune = !needsAttunement || freeAttunement(linked, ignore);

	let displaced: InventoryItem | undefined;
	const next = inventory.map((entry) => {
		if (entry.id === entryId) {
			return {
				...entry,
				location: "equipped" as const,
				slot,
				...(needsAttunement ? { isAttuned: canAttune } : {}),
			};
		}
		if (occupant && entry.id === occupant.entry.id) {
			displaced = { ...withoutSlot(entry), location: "backpack" };
			return displaced;
		}
		return entry;
	});
	return {
		inventory: next,
		displaced,
		attunementFull: needsAttunement && !canAttune,
	};
}

/** Cria uma entrada vinculada nova (item da campanha) já equipada no slot. */
export function equipNewItemInSlot(
	inventory: readonly InventoryItem[],
	itemsById: ReadonlyMap<string, Item>,
	item: Item,
	slot: EquipSlot,
	options: { proficient?: boolean; newId?: () => string } = {},
): EquipOutcome {
	if (!slotsForItem(item).includes(slot)) {
		return { inventory: [...inventory], attunementFull: false };
	}
	const entry = makeLinkedEntry(
		item,
		{ location: "equipped", proficient: options.proficient ?? true },
		options.newId,
	);
	const withEntry = [...inventory, { ...entry, location: "backpack" as const }];
	return equipEntryInSlot(withEntry, itemsById, entry.id, slot);
}

/**
 * Slot sugerido ao equipar sem escolher: o primeiro livre da categoria; se
 * todos estiverem ocupados, o primeiro (troca com quem está lá).
 */
export function defaultSlotFor(
	item: Pick<Item, "type" | "slot" | "armor">,
	linked: readonly LinkedEntry[],
): EquipSlot | undefined {
	const allowed = slotsForItem(item);
	const { bySlot } = resolveSlots(linked);
	return allowed.find((s) => !bySlot.has(s)) ?? allowed[0];
}

/** O mesmo inventário com tudo na mochila (base para o "sem itens"). */
export function withoutEquipment(
	inventory: readonly InventoryItem[],
): InventoryItem[] {
	return inventory.map((entry) =>
		entry.location === "equipped"
			? { ...withoutSlot(entry), location: "backpack" as const }
			: entry,
	);
}

/** Tira o item do corpo e leva para a mochila. */
export function unequipEntry(
	inventory: readonly InventoryItem[],
	entryId: string,
): InventoryItem[] {
	return inventory.map((entry) =>
		entry.id === entryId
			? { ...withoutSlot(entry), location: "backpack" as const }
			: entry,
	);
}

// ── Texto dos efeitos ────────────────────────────────────────────────

/** "FOR → 19" (fixa) ou "DES +2" (soma). */
export function describeAbilityBonus(b: ItemAbilityBonus): string {
	const label = ABILITY_SHORT_LABELS[b.ability];
	return b.mode === "set"
		? `${label} → ${b.value}`
		: `${label} ${formatModifier(b.value)}`;
}

export interface ItemEffectChip {
	label: string;
	value: string;
}

/** O que o item faz, em chips curtos: atributos, CA, iniciativa, etc. */
export function describeItemEffects(item: Item): ItemEffectChip[] {
	const chips: ItemEffectChip[] = [];
	for (const b of item.abilityBonuses ?? []) {
		if (!validBonus(b)) continue;
		chips.push({
			label: ABILITY_SHORT_LABELS[b.ability],
			value: b.mode === "set" ? `→ ${b.value}` : formatModifier(b.value),
		});
	}
	if (item.armor) {
		chips.push({
			label: "CA",
			value:
				item.armor.armorCategory === "shield"
					? `+${item.armor.baseAc}`
					: String(item.armor.baseAc),
		});
	}
	if (item.weapon?.magicBonus) {
		chips.push({
			label: "Arma",
			value: formatModifier(item.weapon.magicBonus),
		});
	}
	const names: Record<string, string> = {
		attack: "Acerto",
		damage: "Dano",
		ac: "CA",
		initiative: "Iniciativa",
		saves: "Salvag.",
		speed: "Desloc.",
	};
	for (const b of item.bonuses ?? []) {
		const value = Math.trunc(Number(b.value) || 0);
		if (value === 0) continue;
		chips.push({
			label: names[b.target] ?? b.target,
			value: formatModifier(value),
		});
	}
	return chips;
}

export function makeAbilityBonus(
	newId: () => string = () => crypto.randomUUID(),
): ItemAbilityBonus {
	return { id: newId(), ability: "strength", mode: "add", value: 1 };
}
