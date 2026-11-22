/**
 * D&D 5e: CA e iniciativa somando itens vinculados da campanha.
 * Funções puras (sem React/DOM). Sem item que afete o número, vale o valor
 * manual da ficha, igual a antes.
 */
import type { InventoryItem, Item } from "@/lib/store/types";
import {
	type ArmorClassStat,
	type CombatStat,
	type CoreLinked,
	computeArmorClass,
	computeInitiative,
	formatStatPart,
	isLinkActive,
	type StatPart,
	type StatPartKind,
} from "../../../supabase/functions/_shared/combat-core";
import { formatModifier } from "./modifier-engine";
import {
	DAMAGE_TYPE_LABELS,
	type DamagePart,
	formatDamageFormula,
	type WeaponAttack,
} from "./weapon-damage";

/** Entrada do inventário vinculada a um Item vivo (já resolvido). */
export type LinkedEntry = CoreLinked<InventoryItem, Item>;

// A conta de CA e iniciativa mora em `_shared/combat-core` (também roda no
// Deno, na IA da mesa). Aqui ficam o tipo do app e o texto do detalhe.
export {
	type ArmorClassStat,
	type CombatStat,
	computeArmorClass,
	computeInitiative,
	formatStatPart,
	isLinkActive,
	type StatPart,
	type StatPartKind,
};

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
export function articleFor(name: string): "a" | "o" | "as" | "os" {
	const first = name
		.trim()
		.split(/\s+/)[0]
		?.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	// Plural primeiro ("as Botas", "os Óculos"); depois o gênero pelo fim.
	if (first && first.length > 3) {
		if (first.endsWith("as")) return "as";
		if (first.endsWith("os")) return "os";
	}
	return first?.endsWith("a") ? "a" : "o";
}

/** "dá" ou "dão", conforme o nome do item seja plural ("as Botas dão"). */
function givesVerb(name: string): string {
	return articleFor(name).endsWith("s") ? " dão " : " dá ";
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
			s(articleFor(attack.name).endsWith("s") ? " rolam " : " rola "),
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
		else if (p.origin === "item")
			clauses.push([
				s(`${articleFor(p.label)} `),
				b(p.label),
				s(givesVerb(p.label)),
				b(formatModifier(p.flat)),
			]);
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
						: p.origin === "item"
							? shortName(p.label)
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
		} else if (p.label === "Arma mágica" && p.source !== "item") {
			clauses.push([s("a magia da arma dá "), b(v)]);
			blocks.push({ value: v, label: "Mágica" });
		} else if (p.source === "item") {
			clauses.push([
				s(`${articleFor(p.label)} `),
				b(p.label),
				s(givesVerb(p.label)),
				b(v),
			]);
			blocks.push({ value: v, label: shortName(p.label) });
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
			clauses.push([
				s(`${articleFor(p.label)} `),
				b(p.label),
				s(givesVerb(p.label)),
				b(v),
			]);
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
			clauses.push([
				s(`${articleFor(p.label)} `),
				b(p.label),
				s(givesVerb(p.label)),
				b(v),
			]);
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
	if (extra.length === 1 && extra[0].kind === "dex")
		return "Destreza dos itens";
	return extra.length === 1
		? `${formatModifier(extra[0].value)} do ${shortName(extra[0].label)}`
		: "Com itens";
}

export function initiativeCaption(stat: CombatStat): string | undefined {
	if (stat.source !== "items") return undefined;
	const bonuses = stat.parts.filter((p) => p.kind === "bonus");
	if (bonuses.length === 0) return "Destreza dos itens";
	if (bonuses.length === 1)
		return `${formatModifier(bonuses[0].value)} do ${shortName(bonuses[0].label)}`;
	const sum = bonuses.reduce((acc, p) => acc + p.value, 0);
	return `${formatModifier(sum)} de itens`;
}
