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
	ABILITY_KEYS,
	ABILITY_SCORE_CAP,
	type AbilityPart,
	type AbilityScoreStat,
	type AbilityScoreStats,
	type BonusPart,
	type SlotMap as CoreSlotMap,
	computeAbilityScores,
	computeCombatCore,
	computeSpeed,
	isTwoHanded,
	itemSlotOf,
	resolveSlots,
	type SumStat,
	slotsForItem,
	sumBonuses,
	validAbilityBonus as validBonus,
} from "../../../supabase/functions/_shared/combat-core";
import {
	type ArmorClassStat,
	type CombatStat,
	isLinkActive,
	type LinkedEntry,
} from "./combat-stats";
import {
	makeLinkedEntry,
	resolveLinkedEntries,
	resolveLinkedInventory,
} from "./item-links";
import { ABILITY_SHORT_LABELS } from "./item-mechanics";
import {
	calculateAbilityModifier,
	calculateProficiencyBonus,
	formatModifier,
} from "./modifier-engine";
import {
	DAMAGE_TYPE_LABELS,
	getEquippedWeaponAttacks,
	type WeaponItemBonuses,
} from "./weapon-damage";

export { ABILITY_SHORT_LABELS };

// ── Slots ────────────────────────────────────────────────────────────

/** Ordem em que os slots aparecem na ficha. */
export const EQUIP_SLOTS: readonly EquipSlot[] = [
	"head",
	"earring",
	"neck",
	"cloak",
	"armor",
	"belt",
	"bracers",
	"hands",
	"bracelet",
	"ring1",
	"ring2",
	"ring3",
	"ring4",
	"mainHand",
	"offHand",
	"feet",
];

export const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
	head: "Cabeça",
	earring: "Brinco",
	neck: "Pescoço",
	cloak: "Capa",
	bracers: "Braçadeiras",
	hands: "Mãos",
	bracelet: "Bracelete",
	belt: "Cinto",
	ring1: "Anel 1",
	ring2: "Anel 2",
	ring3: "Anel 3",
	ring4: "Anel 4",
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
	earring: "Brinco",
	neck: "Pescoço",
	cloak: "Capa",
	armor: "Armadura",
	belt: "Cinto",
	bracers: "Braçadeiras",
	hands: "Mãos (luvas)",
	bracelet: "Bracelete",
	ring: "Anel",
	feet: "Pés",
	weapon: "Arma (uma mão)",
	shield: "Escudo",
};

export const ITEM_SLOTS = Object.keys(ITEM_SLOT_LABELS) as ItemSlot[];

/** Slots do item e o encaixe na ficha: a regra mora em `_shared/combat-core`. */
export type SlotMap = CoreSlotMap<LinkedEntry>;
export { isTwoHanded, itemSlotOf, resolveSlots, slotsForItem };

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

export { ABILITY_KEYS };

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

export {
	ABILITY_SCORE_CAP,
	type AbilityPart,
	type AbilityScoreStat,
	type AbilityScoreStats,
	computeAbilityScores,
};

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

// ── Acerto e dano dos itens ──────────────────────────────────────────

/** Bônus de acerto/dano de itens equipados que valem para todos os ataques. */
export function computeWeaponItemBonuses(
	linked: readonly LinkedEntry[],
): WeaponItemBonuses {
	const out: WeaponItemBonuses = { attack: [], damage: [] };
	for (const l of linked.filter(isLinkActive)) {
		for (const b of l.item.bonuses ?? []) {
			if ((b.target !== "attack" && b.target !== "damage") || b.when?.trim())
				continue;
			const value = Math.trunc(Number(b.value) || 0);
			if (value !== 0) out[b.target].push({ label: l.item.name, value });
		}
	}
	return out;
}

// ── Deslocamento e salvaguardas ──────────────────────────────────────

export { type BonusPart, computeSpeed, type SumStat };

/** Bônus geral de salvaguardas dos itens (soma em todas elas). */
export function computeSavesBonus(linked: readonly LinkedEntry[]): SumStat {
	const parts = sumBonuses(linked, "saves");
	return { base: 0, total: parts.reduce((s, p) => s + p.value, 0), parts };
}

function sumParts(parts: readonly BonusPart[]): number {
	return parts.reduce((sum, part) => sum + part.value, 0);
}

/**
 * CD de magia: o número digitado na ficha é a base. Itens No Corpo (e
 * sintonizados, se exigirem) somam à parte. Bônus com “Quando?” não entram.
 */
export function computeSpellSaveDc(
	character: { spellSaveDc?: unknown },
	linked: readonly LinkedEntry[],
): SumStat {
	const base = Number(character.spellSaveDc) || 0;
	const parts = sumBonuses(linked, "spellSaveDc");
	return { base, total: base + sumParts(parts), parts };
}

/** Ataque de magia, no mesmo molde da CD: base manual + itens que contam. */
export function computeSpellAttack(
	character: { spellAttackBonus?: unknown },
	linked: readonly LinkedEntry[],
): SumStat {
	const base = Number(character.spellAttackBonus) || 0;
	const parts = sumBonuses(linked, "spellAttack");
	return { base, total: base + sumParts(parts), parts };
}

/**
 * Chip de origem. O nome é a única parte que pode truncar;
 * `prefix` e `modifier` ficam sempre visíveis. `label` é a frase
 * completa, para title e aria-label.
 */
export interface SpellOriginChip {
	text: string;
	label: string;
	prefix: string;
	name: string;
	modifier: string;
}

export function describeSpellOrigin(
	kind: "dc" | "attack",
	part: BonusPart,
): SpellOriginChip {
	const full = kind === "dc" ? "CD de magia" : "Ataque de magia";
	const prefix = kind === "dc" ? "CD ·" : "Ataque ·";
	const modifier = formatModifier(part.value);
	return {
		text: `${prefix} ${part.label} ${modifier}`,
		label: `${full} ${part.label} ${modifier}`,
		prefix,
		name: part.label,
		modifier,
	};
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
	/** CD de magia: base manual da ficha + bônus de itens que contam. */
	spellDc: SumStat;
	/** Ataque de magia: base manual da ficha + bônus de itens que contam. */
	spellAttack: SumStat;
	/** Acerto e dano que os itens somam em todos os ataques. */
	weaponBonuses: WeaponItemBonuses;
	/** Quem a arma de duas mãos deixou sem mão (não soma nos números). */
	blockedByTwoHanded: LinkedEntry[];
}

/**
 * Números da ficha com os itens equipados: atributos, CA, iniciativa,
 * deslocamento, salvaguardas, CD de magia e ataque de magia. Fora do D&D 5e
 * não há vínculo de itens, então tudo volta igual ao valor salvo.
 */
export function computeEffectiveStats(
	character: Character,
	itemsById: ReadonlyMap<string, Item>,
): EffectiveStats {
	const core = computeCombatCore(character, character.inventoryList, itemsById);
	const { linked, counting, blockedByTwoHanded, abilities } = core;
	return {
		linked,
		abilities,
		scores: effectiveScores(abilities),
		ac: core.ac,
		initiative: core.initiative,
		speed: core.speed,
		saves: computeSavesBonus(counting),
		spellDc: computeSpellSaveDc(character, counting),
		spellAttack: computeSpellAttack(character, counting),
		weaponBonuses: computeWeaponItemBonuses(counting),
		blockedByTwoHanded,
	};
}

// ── Relatório (PDF) ──────────────────────────────────────────────────

export interface EquipmentReport {
	abilities: {
		key: WeaponAbility;
		base: number;
		total: number;
		modifier: number;
	}[];
	ac: number;
	initiative: number;
	speed: number;
	/** Bônus geral de salvaguardas vindo de itens. */
	savesBonus: number;
	/** CD de magia já com os itens (a base manual continua na ficha). */
	spellDc: number;
	/** Ataque de magia já com os itens (a base manual continua na ficha). */
	spellAttack: number;
	attacks: { name: string; hit: number; damage: string; types: string[] }[];
	/** Um por slot ocupado, na ordem do boneco. */
	equipped: {
		slot: EquipSlot;
		slotLabel: string;
		name: string;
		attuned: boolean | undefined;
		effects: string[];
	}[];
}

/**
 * Tudo o que o PDF precisa dos itens equipados: números com itens, ataques e a
 * lista do que está vestido. `null` fora do D&D 5e (não há vínculo de itens).
 */
export function buildEquipmentReport(
	character: Character,
	itemsById: ReadonlyMap<string, Item>,
): EquipmentReport | null {
	if (character.system !== "dnd5e") return null;
	const stats = computeEffectiveStats(character, itemsById);
	const proficiency =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const blocked = new Set(stats.blockedByTwoHanded.map((l) => l.entry.id));
	const attacks = getEquippedWeaponAttacks(
		resolveLinkedInventory(character.inventoryList, itemsById).filter(
			(entry) => !blocked.has(entry.id),
		),
		stats.scores,
		proficiency,
		stats.weaponBonuses,
	).map((attack) => ({
		name: attack.name,
		hit: attack.attackBonus,
		damage: attack.formula,
		types: attack.types.map((t) => DAMAGE_TYPE_LABELS[t].toLowerCase()),
	}));
	const { bySlot } = resolveSlots(stats.linked);
	const equipped = EQUIP_SLOTS.flatMap((slot) => {
		const l = bySlot.get(slot);
		if (!l) return [];
		return [
			{
				slot,
				slotLabel: EQUIP_SLOT_LABELS[slot],
				name: l.item.name,
				attuned: l.item.requiresAttunement
					? l.entry.isAttuned === true
					: undefined,
				effects: describeItemEffects(l.item).map(
					(c) => `${c.label} ${c.value}`,
				),
			},
		];
	});
	return {
		abilities: ABILITY_KEYS.map((key) => ({
			key,
			base: stats.abilities[key].base,
			total: stats.abilities[key].total,
			modifier: calculateAbilityModifier(stats.abilities[key].total),
		})),
		ac: stats.ac.total,
		initiative: stats.initiative.total,
		speed: stats.speed.total,
		savesBonus: stats.saves.total,
		spellDc: stats.spellDc.total,
		spellAttack: stats.spellAttack.total,
		attacks,
		equipped,
	};
}

// ── Percepção passiva ────────────────────────────────────────────────

/**
 * Percepção passiva com a Sabedoria dos itens equipados: 10 + modificador de
 * SAB + proficiência (dobrada com especialização) em Percepção.
 */
export function computePassivePerception(
	character: Pick<
		Character,
		"proficiencyBonus" | "level" | "skillProficiencies"
	>,
	wisdomScore: number,
): number {
	const proficiency =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const level = character.skillProficiencies?.perception;
	const bonus =
		level === "expertise"
			? proficiency * 2
			: level === "proficient"
				? proficiency
				: 0;
	return 10 + calculateAbilityModifier(wisdomScore) + bonus;
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
	/** Primeira entrada que saiu do slot para a mochila, se havia. */
	displaced?: InventoryItem;
	/** Todas as que saíram (uma arma de duas mãos pode tirar duas). */
	displacedAll: InventoryItem[];
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
		return {
			inventory: [...inventory],
			displacedAll: [],
			attunementFull: false,
		};
	}
	const map = resolveSlots(linked);
	// Quem sai: o do slot; com arma de duas mãos, também o da mão secundária;
	// e, indo para a mão secundária, a arma de duas mãos que ocupava as duas.
	const leaving = new Set<string>();
	const occupant = map.bySlot.get(slot);
	if (occupant) leaving.add(occupant.entry.id);
	if (isTwoHanded(target.item)) {
		const off = map.bySlot.get("offHand");
		if (off) leaving.add(off.entry.id);
		for (const l of map.blockedByTwoHanded) leaving.add(l.entry.id);
	}
	if (slot === "offHand" && map.twoHanded) leaving.add(map.twoHanded.entry.id);
	leaving.delete(entryId);

	const ignore = new Set([entryId, ...leaving]);
	const needsAttunement = target.item.requiresAttunement;
	const canAttune = !needsAttunement || freeAttunement(linked, ignore);

	const displacedAll: InventoryItem[] = [];
	const next = inventory.map((entry) => {
		if (entry.id === entryId) {
			return {
				...entry,
				location: "equipped" as const,
				slot,
				...(needsAttunement ? { isAttuned: canAttune } : {}),
			};
		}
		if (leaving.has(entry.id)) {
			const out: InventoryItem = {
				...withoutSlot(entry),
				location: "backpack",
			};
			displacedAll.push(out);
			return out;
		}
		return entry;
	});
	return {
		inventory: next,
		displaced: displacedAll[0],
		displacedAll,
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
		return {
			inventory: [...inventory],
			displacedAll: [],
			attunementFull: false,
		};
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
		spellSaveDc: "CD magia",
		spellAttack: "Atq. magia",
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
