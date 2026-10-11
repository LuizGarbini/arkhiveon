/**
 * D&D 5e: CA e iniciativa somando itens vinculados da campanha.
 * Funções puras (sem React/DOM). Sem item que afete o número, vale o valor
 * manual da ficha, igual a antes.
 */
import type { Character, InventoryItem, Item } from "@/lib/store/types";
import { calculateAbilityModifier, formatModifier } from "./modifier-engine";
import {
	DAMAGE_TYPE_LABELS,
	type DamagePart,
	formatDamageFormula,
	type WeaponAttack,
} from "./weapon-damage";

/** Entrada do inventário vinculada a um Item vivo (já resolvido). */
export interface LinkedEntry {
	entry: InventoryItem;
	item: Item;
}

export type StatPartKind = "armor" | "dex" | "shield" | "bonus" | "sheet";

export interface StatPart {
	kind: StatPartKind;
	/** Origem (nome do item, "Destreza", "Ajuste da ficha"…). */
	label: string;
	value: number;
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
	dexMode?: NonNullable<Item["armor"]>["dexMode"];
	/** CA sem armadura (10 + DES), para a nota do detalhe. */
	unarmored: number;
	hasShield: boolean;
}

function dexModOf(character: Pick<Character, "dexterity">): number {
	return calculateAbilityModifier(Number(character.dexterity) || 10);
}

/** Item No Corpo e, se exigir sintonização, sintonizado. */
export function isLinkActive({ entry, item }: LinkedEntry): boolean {
	if (entry.location !== "equipped") return false;
	return !item.requiresAttunement || entry.isAttuned === true;
}

function attunementNote(name: string): string {
	return `${name} exige sintonização: só soma sintonizado.`;
}

function isShield(item: Item): boolean {
	return item.armor?.armorCategory === "shield";
}

function affectsArmorClass(item: Item): boolean {
	return (
		Boolean(item.armor) || (item.bonuses ?? []).some((b) => b.target === "ac")
	);
}

function affectsInitiative(item: Item): boolean {
	return (item.bonuses ?? []).some((b) => b.target === "initiative");
}

export function computeArmorClass(
	character: Pick<Character, "armorClass" | "dexterity">,
	linked: LinkedEntry[],
): ArmorClassStat {
	const manual = Number(character.armorClass) || 0;
	const dex = dexModOf(character);
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
		.filter((l) => l.item.armor && !isShield(l.item))
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
	if (!armor && !shield && bonusParts.length === 0) {
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
		parts.push({ kind: "armor", label: armor.item.name, value: stats.baseAc });
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
	}
	if (shield?.item.armor) {
		parts.push({
			kind: "shield",
			label: shield.item.name,
			value: shield.item.armor.baseAc,
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
	character: Pick<Character, "initiative" | "dexterity">,
	linked: LinkedEntry[],
): CombatStat {
	const manual = Number(character.initiative) || 0;
	const dex = dexModOf(character);
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

	if (bonusParts.length === 0) {
		return { total: manual, source: "manual", parts: [], notes };
	}

	const parts: StatPart[] = [{ kind: "dex", label: "Destreza", value: dex }];
	const adjust = manual - dex;
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

// ---------------------------------------------------------------------------
// "O porquê" em prosa: uma frase com trechos em negrito + blocos da conta.
// ---------------------------------------------------------------------------

export interface ProseSegment {
	text: string;
	strong?: boolean;
}

export interface FormulaBlock {
	value: string;
	label: string;
}

export interface Explanation {
	sentence: ProseSegment[];
	blocks: FormulaBlock[];
	total: string;
	notes: string[];
}

type Clause = ProseSegment[];

const s = (text: string): ProseSegment => ({ text });
const b = (text: string): ProseSegment => ({ text, strong: true });

/** Artigo pelo fim da primeira palavra ("a Espada", "o Arco", "o Anel"). */
export function articleFor(name: string): "a" | "o" {
	const first = name
		.trim()
		.split(/\s+/)[0]
		?.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	return first?.endsWith("a") ? "a" : "o";
}

function shortName(name: string): string {
	return name.trim().split(/\s+/)[0] || name;
}

function joinClauses(clauses: Clause[]): ProseSegment[] {
	const out: ProseSegment[] = [];
	clauses.forEach((clause, i) => {
		if (i > 0) out.push(s(i === clauses.length - 1 ? " e " : ", "));
		out.push(...clause);
	});
	return out;
}

function sentence(head: ProseSegment[], clauses: Clause[]): ProseSegment[] {
	const merged: ProseSegment[] = [];
	for (const seg of [...head, s(" porque "), ...joinClauses(clauses), s(".")]) {
		const last = merged[merged.length - 1];
		if (last && !last.strong && !seg.strong) last.text += seg.text;
		else merged.push({ ...seg });
	}
	return merged;
}

/** Texto puro da frase (testes, aria-label). */
export function proseText(segments: ProseSegment[]): string {
	return segments.map((p) => p.text).join("");
}

function partValue(part: DamagePart): string {
	return part.dice.length === 0
		? formatModifier(part.flat)
		: formatDamageFormula(part.dice, part.flat);
}

/** "sua Força", mas "seu Carisma". */
function possessive(abilityLabel: string): string {
	return abilityLabel === "Carisma" ? "seu " : "sua ";
}

export function explainDamage(attack: WeaponAttack): Explanation {
	const counted = attack.damageParts.filter((p) => !p.excluded);
	const weapon = counted.find((p) => p.origin === "weapon");
	const clauses: Clause[] = [];
	if (weapon)
		clauses.push([
			s(`${articleFor(attack.name)} `),
			b(attack.name),
			s(" rola "),
			b(formatDamageFormula(weapon.dice, weapon.flat)),
		]);
	for (const p of counted) {
		if (p.origin === "ability")
			clauses.push([
				s(`você soma ${possessive(p.label)}`),
				b(`${p.label} ${formatModifier(p.flat)}`),
			]);
		else if (p.origin === "magic")
			clauses.push([s("a magia da arma dá "), b(formatModifier(p.flat))]);
		else if (p.origin === "extra")
			clauses.push([
				b(p.label),
				s(" dá "),
				b(`+${partValue(p).replace(/^\+/, "")}`),
				s(` ${DAMAGE_TYPE_LABELS[p.type].toLowerCase()}`),
			]);
	}
	const single = attack.types.length === 1 ? attack.types[0] : undefined;
	const head = [
		s("Seu dano é "),
		b(
			single
				? `${attack.formula} ${DAMAGE_TYPE_LABELS[single].toLowerCase()}`
				: attack.formula,
		),
	];
	const blocks: FormulaBlock[] = counted.map((p) => ({
		value:
			p.origin === "weapon" || p.dice.length === 0
				? partValue(p)
				: `+${partValue(p)}`,
		label:
			p.origin === "weapon"
				? shortName(attack.name)
				: p.origin === "ability"
					? p.label
					: p.origin === "magic"
						? "Mágica"
						: p.label,
	}));
	return {
		sentence: sentence(head, clauses),
		blocks,
		total: attack.formula,
		notes: [],
	};
}

export function explainAttack(attack: WeaponAttack): Explanation {
	const clauses: Clause[] = [];
	const blocks: FormulaBlock[] = [];
	for (const p of attack.attackParts) {
		const v = formatModifier(p.value);
		if (p.label === "Proficiência") {
			clauses.push([s("você soma proficiência "), b(v)]);
			blocks.push({ value: v, label: "Prof." });
		} else if (p.label === "Arma mágica") {
			clauses.push([s("a magia da arma dá "), b(v)]);
			blocks.push({ value: v, label: "Mágica" });
		} else {
			clauses.push([s(possessive(p.label)), b(`${p.label} ${v}`)]);
			blocks.push({ value: v, label: p.label });
		}
	}
	const notes = attack.attackParts.some((p) => p.label === "Proficiência")
		? []
		: ["Sem proficiência com esta arma: não soma o bônus de proficiência."];
	return {
		sentence: sentence(
			[s("Seu acerto é "), b(formatModifier(attack.attackBonus))],
			clauses,
		),
		blocks,
		total: formatModifier(attack.attackBonus),
		notes,
	};
}

export function explainArmorClass(stat: ArmorClassStat): Explanation {
	const clauses: Clause[] = [];
	const blocks: FormulaBlock[] = [];
	for (const p of stat.parts) {
		const v = formatModifier(p.value);
		if (p.kind === "armor") {
			clauses.push([
				s("você veste "),
				b(p.label),
				s(" (base "),
				b(String(p.value)),
				s(")"),
			]);
			blocks.push({ value: String(p.value), label: p.label });
		} else if (p.kind === "sheet") {
			clauses.push([s("a ficha tem CA "), b(String(p.value))]);
			blocks.push({ value: String(p.value), label: p.label });
		} else if (p.kind === "dex") {
			clauses.push(
				stat.dexMode === "max2"
					? [s("soma sua "), b(`Destreza ${v}`), s(" (máx. +2)")]
					: [s("soma toda a sua "), b(`Destreza ${v}`)],
			);
			blocks.push({ value: v, label: "Destreza" });
		} else {
			clauses.push([s(`${articleFor(p.label)} `), b(p.label), s(" dá "), b(v)]);
			blocks.push({ value: v, label: p.label });
		}
	}
	if (stat.dexMode === "none")
		clauses.push([s("a armadura não soma Destreza")]);
	const notes = [...stat.notes];
	if (stat.armorName) {
		notes.push(
			`Sem armadura seria ${stat.unarmored}.${stat.hasShield ? "" : " Escudo somaria +2."}`,
		);
	}
	return {
		sentence: sentence([s("Sua CA é "), b(String(stat.total))], clauses),
		blocks,
		total: String(stat.total),
		notes,
	};
}

export function explainInitiative(stat: CombatStat): Explanation {
	const clauses: Clause[] = [];
	const blocks: FormulaBlock[] = [];
	for (const p of stat.parts) {
		const v = formatModifier(p.value);
		if (p.kind === "dex") {
			clauses.push([s("você soma sua "), b(`Destreza ${v}`)]);
			blocks.push({ value: v, label: "Destreza" });
		} else if (p.kind === "sheet") {
			clauses.push([s("a ficha ajusta "), b(v)]);
			blocks.push({ value: v, label: "Ajuste da ficha" });
		} else {
			clauses.push([s(`${articleFor(p.label)} `), b(p.label), s(" dá "), b(v)]);
			blocks.push({ value: v, label: shortName(p.label) });
		}
	}
	return {
		sentence: sentence(
			[s("Sua iniciativa é "), b(formatModifier(stat.total))],
			clauses,
		),
		blocks,
		total: formatModifier(stat.total),
		notes: [...stat.notes],
	};
}

/** Sublinha do card: "Couro batido", "+1 do Anel". */
export function armorClassCaption(stat: ArmorClassStat): string | undefined {
	if (stat.source !== "items") return undefined;
	if (stat.armorName) return stat.armorName;
	const extra = stat.parts.filter((p) => p.kind !== "sheet");
	return extra.length === 1
		? `${formatModifier(extra[0].value)} do ${shortName(extra[0].label)}`
		: "Com itens";
}

export function initiativeCaption(stat: CombatStat): string | undefined {
	if (stat.source !== "items") return undefined;
	const bonuses = stat.parts.filter((p) => p.kind === "bonus");
	if (bonuses.length === 1)
		return `${formatModifier(bonuses[0].value)} do ${shortName(bonuses[0].label)}`;
	const sum = bonuses.reduce((acc, p) => acc + p.value, 0);
	return `${formatModifier(sum)} de itens`;
}
