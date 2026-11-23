/**
 * D&D 5e: CA, iniciativa e deslocamento com os itens equipados.
 *
 * Módulo puro e sem dependências (nem alias `@/`, nem imports): roda no Vite
 * (ficha, card, combate) e no Deno (Edge Function da IA da mesa). É a única
 * cópia da regra; `src/core/rules` reexporta daqui.
 *
 * Sem item que afete o número, vale o valor digitado na ficha, igual a antes.
 */

// ── Tipos mínimos (o Item/InventoryItem do app cabem aqui) ───────────

export type CoreAbility =
	| "strength"
	| "dexterity"
	| "constitution"
	| "intelligence"
	| "wisdom"
	| "charisma";

export type CoreItemSlot =
	| "head"
	| "earring"
	| "neck"
	| "cloak"
	| "bracers"
	| "hands"
	| "bracelet"
	| "belt"
	| "ring"
	| "weapon"
	| "shield"
	| "armor"
	| "feet";

export type CoreEquipSlot =
	| "head"
	| "earring"
	| "neck"
	| "cloak"
	| "bracers"
	| "hands"
	| "bracelet"
	| "belt"
	| "ring1"
	| "ring2"
	| "ring3"
	| "ring4"
	| "mainHand"
	| "offHand"
	| "armor"
	| "feet";

export type CoreDexMode = "full" | "max2" | "none";

export type CoreBonusTarget =
	| "attack"
	| "damage"
	| "ac"
	| "initiative"
	| "saves"
	| "speed"
	| "spellSaveDc"
	| "spellAttack";

export interface CoreItemBonus {
	target: CoreBonusTarget;
	value: number;
	when?: string;
}

export interface CoreAbilityBonus {
	ability: CoreAbility;
	mode: "add" | "set";
	value: number;
}

export interface CoreItem {
	name: string;
	type?: string;
	slot?: CoreItemSlot;
	requiresAttunement?: boolean;
	armor?: {
		baseAc?: number;
		dexMode: CoreDexMode;
		armorCategory: "light" | "medium" | "heavy" | "shield";
	};
	weapon?: { properties?: readonly string[] };
	bonuses?: readonly CoreItemBonus[];
	abilityBonuses?: readonly CoreAbilityBonus[];
}

export interface CoreEntry {
	location?: string;
	isAttuned?: boolean;
	slot?: CoreEquipSlot;
	campaignItemId?: string;
}

/** Entrada do inventário vinculada a um Item vivo (já resolvido). */
export interface CoreLinked<
	E extends CoreEntry = CoreEntry,
	I extends CoreItem = CoreItem,
> {
	entry: E;
	item: I;
}

// ── Modificadores ────────────────────────────────────────────────────

/** floor((valor - 10) / 2). */
export function calculateAbilityModifier(score: number): number {
	if (typeof score !== "number" || Number.isNaN(score)) return 0;
	return Math.floor((score - 10) / 2);
}

/** Modificador com sinal explícito (+/-). */
export function formatModifier(modifier: number): string {
	if (typeof modifier !== "number" || Number.isNaN(modifier)) return "+0";
	return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

// ── Categoria e slot do item ─────────────────────────────────────────

export type ItemCategoryKind = "weapon" | "armor" | "ammo" | "other";
export type LinkKind = "weapon" | "armor" | "ring" | "consumable" | "other";

function normalizeItemText(value: string | undefined): string {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

/** Decide qual aba mecânica o item usa a partir da categoria (campo `type`). */
export function itemCategoryKind(type: string | undefined): ItemCategoryKind {
	const t = normalizeItemText(type);
	if (t === "arma" || t === "weapon" || t.startsWith("arma ")) return "weapon";
	if (
		t === "armadura" ||
		t === "escudo" ||
		t === "armor" ||
		t === "shield" ||
		t.startsWith("armadura ")
	)
		return "armor";
	if (t === "municao" || t === "ammo" || t.startsWith("municao "))
		return "ammo";
	return "other";
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

export function linkKindOf(item: { type?: string }): LinkKind {
	const kind = itemCategoryKind(item.type);
	if (kind === "weapon") return "weapon";
	if (kind === "armor") return "armor";
	if (kind === "ammo") return "consumable";
	const t = normalizeItemText(item.type);
	if (t === "anel" || t === "aneis" || t === "ring") return "ring";
	if (CONSUMABLE_TYPES.some((c) => t === c || t.startsWith(`${c} `)))
		return "consumable";
	return "other";
}

const SLOTS_FOR_ITEM_SLOT: Record<CoreItemSlot, readonly CoreEquipSlot[]> = {
	head: ["head"],
	earring: ["earring"],
	neck: ["neck"],
	cloak: ["cloak"],
	bracers: ["bracers"],
	hands: ["hands"],
	bracelet: ["bracelet"],
	belt: ["belt"],
	ring: ["ring1", "ring2", "ring3", "ring4"],
	weapon: ["mainHand", "offHand"],
	shield: ["offHand"],
	armor: ["armor"],
	feet: ["feet"],
};

type SlotItem = Pick<CoreItem, "type" | "slot" | "armor" | "weapon">;

/** Slot do item: o escolhido no cadastro, ou deduzido da categoria. */
export function itemSlotOf(
	item: Pick<CoreItem, "type" | "slot" | "armor">,
): CoreItemSlot | undefined {
	if (item.slot) return item.slot;
	const kind = linkKindOf(item);
	if (kind === "weapon") return "weapon";
	if (kind === "armor") {
		return item.armor?.armorCategory === "shield" ||
			normalizeItemText(item.type) === "escudo"
			? "shield"
			: "armor";
	}
	if (kind === "ring") return "ring";
	const type = normalizeItemText(item.type);
	if (type === "amuleto" || type === "amulet") return "neck";
	if (type === "elmo") return "head";
	if (type === "capa" || type === "cloak" || type === "cape") return "cloak";
	if (type === "luvas" || type === "luva") return "hands";
	if (type === "botas" || type === "bota") return "feet";
	if (
		type === "brinco" ||
		type === "brincos" ||
		type === "earring" ||
		type === "earrings"
	)
		return "earring";
	if (type === "bracelete" || type === "braceletes" || type === "bracelet")
		return "bracelet";
	if (type === "cinto" || type === "belt") return "belt";
	if (
		type === "bracadeira" ||
		type === "bracadeiras" ||
		type === "bracer" ||
		type === "bracers"
	)
		return "bracers";
	return undefined;
}

/** Arma de duas mãos: ocupa a mão principal e bloqueia a secundária. */
export function isTwoHanded(item: SlotItem): boolean {
	return (
		itemSlotOf(item) === "weapon" &&
		Boolean(item.weapon?.properties?.includes("two_handed"))
	);
}

export function slotsForItem(item: SlotItem): readonly CoreEquipSlot[] {
	const slot = itemSlotOf(item);
	if (!slot) return [];
	return isTwoHanded(item) ? ["mainHand"] : SLOTS_FOR_ITEM_SLOT[slot];
}

export interface SlotMap<L extends CoreLinked = CoreLinked> {
	bySlot: ReadonlyMap<CoreEquipSlot, L>;
	/** Equipado, mas sem slot que o comporte (item antigo sem categoria). */
	unslotted: L[];
	/**
	 * Mão secundária tomada por uma arma de duas mãos: quem ficou sem lugar por
	 * isso (escudo, segunda arma) não conta nos números.
	 */
	blockedByTwoHanded: L[];
	/** A arma de duas mãos que bloqueia a mão secundária, se houver. */
	twoHanded?: L;
}

/**
 * Encaixa os itens equipados nos slots. Quem tem `entry.slot` válido fica
 * onde está; os demais (fichas antigas) ocupam o primeiro slot livre da sua
 * categoria. Determinístico: a mesma ficha sempre dá o mesmo resultado.
 */
export function resolveSlots<L extends CoreLinked>(
	linked: readonly L[],
): SlotMap<L> {
	const bySlot = new Map<CoreEquipSlot, L>();
	const pending: L[] = [];
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
	const unslotted: L[] = [];
	for (const l of pending) {
		const free = slotsForItem(l.item).find((s) => !bySlot.has(s));
		if (free) bySlot.set(free, l);
		else unslotted.push(l);
	}

	// Arma de duas mãos na principal: a secundária não existe. Quem estava
	// nela (ficha antiga com escudo + espadão) fica de fora e não soma.
	const main = bySlot.get("mainHand");
	const twoHanded = main && isTwoHanded(main.item) ? main : undefined;
	const blockedByTwoHanded: L[] = [];
	if (twoHanded) {
		const off = bySlot.get("offHand");
		if (off) {
			bySlot.delete("offHand");
			unslotted.push(off);
			blockedByTwoHanded.push(off);
		}
		// Quem não coube em nenhum slot e era para a mão secundária também.
		for (const l of unslotted) {
			const wantsOffHand = slotsForItem(l.item).includes("offHand");
			if (wantsOffHand && !blockedByTwoHanded.includes(l)) {
				blockedByTwoHanded.push(l);
			}
		}
	}
	return { bySlot, unslotted, blockedByTwoHanded, twoHanded };
}

// ── Vínculo ──────────────────────────────────────────────────────────

/** Entradas do inventário com `campaignItemId` que acham o Item no mapa. */
export function resolveLinkedEntries<E extends CoreEntry, I extends CoreItem>(
	inventory: readonly E[] | undefined,
	itemsById: ReadonlyMap<string, I>,
): CoreLinked<E, I>[] {
	const out: CoreLinked<E, I>[] = [];
	for (const entry of inventory ?? []) {
		if (!entry.campaignItemId) continue;
		const item = itemsById.get(entry.campaignItemId);
		if (item) out.push({ entry, item });
	}
	return out;
}

/** Item No Corpo e, se exigir sintonização, sintonizado. */
export function isLinkActive({ entry, item }: CoreLinked): boolean {
	if (entry.location !== "equipped") return false;
	return !item.requiresAttunement || entry.isAttuned === true;
}

// ── Atributos efetivos ───────────────────────────────────────────────

export const ABILITY_KEYS: readonly CoreAbility[] = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
];

/** Teto do D&D 5e para um atributo. */
export const ABILITY_SCORE_CAP = 30;

export type AbilityScores = Record<CoreAbility, number>;

/** Os seis valores salvos na ficha (10 quando vazio ou inválido). */
export function baseAbilityScores(
	character: Partial<Record<CoreAbility, unknown>>,
): AbilityScores {
	return {
		strength: Number(character.strength) || 10,
		dexterity: Number(character.dexterity) || 10,
		constitution: Number(character.constitution) || 10,
		intelligence: Number(character.intelligence) || 10,
		wisdom: Number(character.wisdom) || 10,
		charisma: Number(character.charisma) || 10,
	};
}

export interface AbilityPart {
	/** Origem: "Base da ficha" ou o nome do item. */
	label: string;
	kind: "base" | "set" | "add";
	value: number;
}

export interface AbilityScoreStat {
	key: CoreAbility;
	/** Valor salvo na ficha. */
	base: number;
	/** Valor com os itens equipados. */
	total: number;
	/** `total - base`. */
	delta: number;
	parts: AbilityPart[];
}

export type AbilityScoreStats = Record<CoreAbility, AbilityScoreStat>;

/** Bônus de atributo bem formado (atributo, modo e número válidos). */
export function validAbilityBonus(b: CoreAbilityBonus): boolean {
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
	character: Partial<Record<CoreAbility, unknown>>,
	linked: readonly CoreLinked[],
): AbilityScoreStats {
	const base = baseAbilityScores(character);
	const counted = linked.filter(isLinkActive);
	const out = {} as AbilityScoreStats;

	for (const key of ABILITY_KEYS) {
		const sets: { label: string; value: number }[] = [];
		const adds: { label: string; value: number }[] = [];
		for (const l of counted) {
			for (const b of l.item.abilityBonuses ?? []) {
				if (!validAbilityBonus(b) || b.ability !== key) continue;
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

// ── CA e iniciativa ──────────────────────────────────────────────────

export type StatPartKind = "armor" | "dex" | "shield" | "bonus" | "sheet";

export interface StatPart {
	kind: StatPartKind;
	/** Origem (nome do item, "Destreza", "Ajuste da ficha"…). */
	label: string;
	value: number;
}

/** "Capa do Vento +3", "Couro batido 12", "Escudo +2". */
export function formatStatPart(part: StatPart): string {
	const raw =
		part.kind === "shield"
			? `+${part.value}`
			: part.kind === "armor" || part.kind === "sheet"
				? String(part.value)
				: formatModifier(part.value);
	return `${part.label} ${raw}`;
}

export interface CombatStat {
	total: number;
	/** "manual" = valor digitado na ficha, sem item que mude o número. */
	source: "manual" | "items";
	parts: StatPart[];
	notes: string[];
}

export interface ArmorClassStat extends CombatStat {
	armorName?: string;
	armorBase?: number;
	dexMode?: CoreDexMode;
	/** CA sem armadura (10 + DES), para a nota do detalhe. */
	unarmored: number;
	hasShield: boolean;
}

function dexModOf(
	character: { dexterity?: unknown },
	/** Destreza com itens; sem ela vale o valor salvo na ficha. */
	effectiveDexterity?: number,
): number {
	return calculateAbilityModifier(
		effectiveDexterity ?? (Number(character.dexterity) || 10),
	);
}

function attunementNote(name: string): string {
	return `${name} exige sintonização: só soma sintonizado.`;
}

function isShield(item: CoreItem): boolean {
	return item.armor?.armorCategory === "shield";
}

function affectsArmorClass(item: CoreItem): boolean {
	return (
		Boolean(item.armor) || (item.bonuses ?? []).some((b) => b.target === "ac")
	);
}

/** Só armadura com CA base positiva substitui a CA digitada na ficha. */
function replacesArmorBase(item: CoreItem): boolean {
	if (!item.armor || isShield(item)) return false;
	const base = item.armor.baseAc;
	return typeof base === "number" && Number.isFinite(base) && base > 0;
}

function affectsInitiative(item: CoreItem): boolean {
	return (item.bonuses ?? []).some((b) => b.target === "initiative");
}

export function computeArmorClass(
	character: { armorClass?: unknown; dexterity?: unknown },
	linked: readonly CoreLinked[],
	effectiveDexterity?: number,
): ArmorClassStat {
	const manual = Number(character.armorClass) || 0;
	const dex = dexModOf(character, effectiveDexterity);
	// Quanto os itens mexeram no modificador (a CA digitada já conta o da ficha).
	const dexFromItems = dex - dexModOf(character);
	const unarmored = 10 + dex;
	const notes: string[] = [];

	const equipped = linked.filter(
		(l) => l.entry.location === "equipped" && affectsArmorClass(l.item),
	);
	for (const l of equipped) {
		if (!isLinkActive(l)) notes.push(attunementNote(l.item.name));
	}
	const counted = equipped.filter(isLinkActive);

	const armors = counted
		.filter((l) => replacesArmorBase(l.item))
		.sort((a, b) => (b.item.armor?.baseAc ?? 0) - (a.item.armor?.baseAc ?? 0));
	const shields = counted.filter((l) => isShield(l.item));
	const bonusParts: StatPart[] = [];
	for (const l of counted) {
		for (const b of l.item.bonuses ?? []) {
			if (b.target !== "ac") continue;
			const value = Math.trunc(Number(b.value) || 0);
			if (b.when?.trim()) {
				notes.push(
					`${l.item.name}: ${formatModifier(value)} na CA ${b.when.trim()} (não soma).`,
				);
				continue;
			}
			if (value !== 0)
				bonusParts.push({ kind: "bonus", label: l.item.name, value });
		}
	}

	const armor = armors[0];
	const shield = shields[0];
	if (!armor && !shield && bonusParts.length === 0 && dexFromItems === 0) {
		return {
			total: manual,
			source: "manual",
			parts: [],
			notes,
			unarmored,
			hasShield: false,
		};
	}

	const parts: StatPart[] = [];
	let dexMode: ArmorClassStat["dexMode"];
	if (armor?.item.armor) {
		const stats = armor.item.armor;
		dexMode = stats.dexMode;
		parts.push({ kind: "armor", label: armor.item.name, value: stats.baseAc ?? 0 });
		if (stats.dexMode !== "none") {
			const applied = stats.dexMode === "max2" ? Math.min(dex, 2) : dex;
			parts.push({ kind: "dex", label: "Destreza", value: applied });
		}
		if (armors.length > 1)
			notes.push(
				`Só uma armadura conta: ${armors
					.slice(1)
					.map((a) => a.item.name)
					.join(", ")} ficou de fora.`,
			);
	} else {
		// Sem armadura vinculada: a base é a CA digitada na ficha.
		parts.push({ kind: "sheet", label: "CA da ficha", value: manual });
		if (dexFromItems !== 0)
			parts.push({
				kind: "dex",
				label: "Destreza dos itens",
				value: dexFromItems,
			});
	}
	if (shield?.item.armor) {
		parts.push({
			kind: "shield",
			label: shield.item.name,
			value: shield.item.armor.baseAc ?? 0,
		});
		if (shields.length > 1) notes.push("Só um escudo conta.");
	}
	parts.push(...bonusParts);

	return {
		total: parts.reduce((s, p) => s + p.value, 0),
		source: "items",
		parts,
		notes,
		armorName: armor?.item.name,
		armorBase: armor?.item.armor?.baseAc,
		dexMode,
		unarmored,
		hasShield: Boolean(shield),
	};
}

export function computeInitiative(
	character: { initiative?: unknown; dexterity?: unknown },
	linked: readonly CoreLinked[],
	effectiveDexterity?: number,
): CombatStat {
	const manual = Number(character.initiative) || 0;
	const baseDex = dexModOf(character);
	const dex = dexModOf(character, effectiveDexterity);
	const notes: string[] = [];

	const equipped = linked.filter(
		(l) => l.entry.location === "equipped" && affectsInitiative(l.item),
	);
	for (const l of equipped) {
		if (!isLinkActive(l)) notes.push(attunementNote(l.item.name));
	}
	const bonusParts: StatPart[] = [];
	for (const l of equipped.filter(isLinkActive)) {
		for (const b of l.item.bonuses ?? []) {
			if (b.target !== "initiative") continue;
			const value = Math.trunc(Number(b.value) || 0);
			if (b.when?.trim()) {
				notes.push(
					`${l.item.name}: ${formatModifier(value)} na iniciativa ${b.when.trim()} (não soma).`,
				);
				continue;
			}
			if (value !== 0)
				bonusParts.push({ kind: "bonus", label: l.item.name, value });
		}
	}

	if (bonusParts.length === 0 && dex === baseDex) {
		return { total: manual, source: "manual", parts: [], notes };
	}

	const parts: StatPart[] = [{ kind: "dex", label: "Destreza", value: dex }];
	// O ajuste é medido contra a Destreza da ficha, não a dos itens.
	const adjust = manual - baseDex;
	if (adjust !== 0)
		parts.push({ kind: "sheet", label: "Ajuste da ficha", value: adjust });
	parts.push(...bonusParts);
	return {
		total: parts.reduce((s, p) => s + p.value, 0),
		source: "items",
		parts,
		notes,
	};
}

// ── Deslocamento (e as outras somas simples) ─────────────────────────

export interface BonusPart {
	label: string;
	value: number;
}

export interface SumStat {
	base: number;
	total: number;
	parts: BonusPart[];
}

/** Bônus sem “Quando?” de itens que contam, para um alvo de soma simples. */
export function sumBonuses(
	linked: readonly CoreLinked[],
	target: "speed" | "saves" | "spellSaveDc" | "spellAttack",
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
	linked: readonly CoreLinked[],
): SumStat {
	const base = Number(character.speed) || 0;
	const parts = sumBonuses(linked, "speed");
	return {
		base,
		total: base + parts.reduce((s, p) => s + p.value, 0),
		parts,
	};
}

// ── Tudo junto (o miolo de computeEffectiveStats) ────────────────────

export interface CoreCharacter extends Partial<Record<CoreAbility, unknown>> {
	system?: unknown;
	armorClass?: unknown;
	initiative?: unknown;
	speed?: unknown;
}

export interface CombatCore<L extends CoreLinked = CoreLinked> {
	/** Itens vinculados já resolvidos (vazio fora do D&D 5e). */
	linked: L[];
	/** Os vinculados menos quem a arma de duas mãos deixou sem mão. */
	counting: L[];
	blockedByTwoHanded: L[];
	abilities: AbilityScoreStats;
	ac: ArmorClassStat;
	initiative: CombatStat;
	speed: SumStat;
}

/**
 * CA, iniciativa e deslocamento com os itens equipados. Fora do D&D 5e não
 * há vínculo de itens, então tudo volta igual ao valor salvo. Item que não
 * está no mapa (apagado, ou que quem pergunta não pode ler) não soma nada.
 */
export function computeCombatCore<E extends CoreEntry, I extends CoreItem>(
	character: CoreCharacter,
	inventory: readonly E[] | undefined,
	itemsById: ReadonlyMap<string, I>,
): CombatCore<CoreLinked<E, I>> {
	const linked =
		character.system === "dnd5e"
			? resolveLinkedEntries(inventory, itemsById)
			: [];
	// Escudo ou segunda arma com um espadão nas mãos não conta.
	const { blockedByTwoHanded } = resolveSlots(linked);
	const counting = linked.filter((l) => !blockedByTwoHanded.includes(l));
	const abilities = computeAbilityScores(character, counting);
	return {
		linked,
		counting,
		blockedByTwoHanded,
		abilities,
		ac: computeArmorClass(character, counting, abilities.dexterity.total),
		initiative: computeInitiative(
			character,
			counting,
			abilities.dexterity.total,
		),
		speed: computeSpeed(character, counting),
	};
}
