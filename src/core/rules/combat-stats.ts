/**
 * D&D 5e: CA e iniciativa somando itens vinculados da campanha.
 * Funções puras (sem React/DOM). Sem item que afete o número, vale o valor
 * manual da ficha, igual a antes.
 */
import type { Character, InventoryItem, Item } from "@/lib/store/types";
import { calculateAbilityModifier, formatModifier } from "./modifier-engine";

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
