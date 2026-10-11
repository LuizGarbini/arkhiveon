/**
 * D&D 5e: acerto e dano de armas equipadas a partir do inventário.
 * Funções puras (sem React/DOM). A ficha só lê o resultado.
 */
import type {
	DamageType,
	InventoryItem,
	InventoryWeaponStats,
} from "@/lib/store/types";
import { calculateAbilityModifier } from "./modifier-engine";

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
	slashing: "Cortante",
	piercing: "Perfurante",
	bludgeoning: "Contundente",
	acid: "Ácido",
	cold: "Frio",
	fire: "Fogo",
	force: "Energia",
	lightning: "Raio",
	necrotic: "Necrótico",
	poison: "Veneno",
	psychic: "Psíquico",
	radiant: "Radiante",
	thunder: "Trovejante",
};

export const DAMAGE_TYPES = Object.keys(DAMAGE_TYPE_LABELS) as DamageType[];

export type DamageOrigin = "weapon" | "ability" | "magic" | "extra";

export interface DiceTerm {
	count: number;
	sides: number;
}

export interface DamagePart {
	origin: DamageOrigin;
	label: string;
	dice: DiceTerm[];
	flat: number;
	type: DamageType;
	/** Linha zerada: aparece no breakdown, mas não entra no total. */
	excluded: boolean;
}

export interface AttackPart {
	label: string;
	value: number;
}

export interface DamageByType {
	type: DamageType;
	dice: DiceTerm[];
	flat: number;
	formula: string;
	average: number;
}

export interface WeaponAttack {
	itemId: string;
	name: string;
	attackBonus: number;
	attackParts: AttackPart[];
	damageParts: DamagePart[];
	byType: DamageByType[];
	formula: string;
	average: number;
	/** Tipos com contribuição real, na ordem em que aparecem. */
	types: DamageType[];
}

export interface WeaponAbilityScores {
	strength: number;
	dexterity: number;
}

const DICE_RE = /^(\d*)d(\d+)$/i;
const FLAT_RE = /^[+-]?\d+$/;

/**
 * Lê "1d8", "2d6+1", "+2", "1d4 + 1d6". Retorna null se não for uma fórmula válida.
 */
export function parseDamageFormula(
	input: string | number | undefined | null,
): { dice: DiceTerm[]; flat: number } | null {
	if (input === undefined || input === null) return null;
	if (typeof input === "number") {
		return Number.isFinite(input)
			? { dice: [], flat: Math.trunc(input) }
			: null;
	}
	const compact = input.replace(/\s+/g, "");
	if (!compact) return null;
	const tokens = compact.match(/[+-]?[^+-]+/g);
	if (!tokens) return null;
	const dice: DiceTerm[] = [];
	let flat = 0;
	for (const raw of tokens) {
		const sign = raw.startsWith("-") ? -1 : 1;
		const token = raw.replace(/^[+-]/, "");
		const diceMatch = DICE_RE.exec(token);
		if (diceMatch) {
			if (sign < 0) return null;
			const count = diceMatch[1] ? Number(diceMatch[1]) : 1;
			const sides = Number(diceMatch[2]);
			if (count < 1 || sides < 2) return null;
			dice.push({ count, sides });
			continue;
		}
		if (FLAT_RE.test(token)) {
			flat += sign * Number(token);
			continue;
		}
		return null;
	}
	return { dice, flat };
}

function mergeDice(terms: DiceTerm[]): DiceTerm[] {
	const bySides = new Map<number, number>();
	for (const t of terms)
		bySides.set(t.sides, (bySides.get(t.sides) ?? 0) + t.count);
	return [...bySides.entries()]
		.sort((a, b) => b[0] - a[0])
		.map(([sides, count]) => ({ count, sides }));
}

export function formatDamageFormula(dice: DiceTerm[], flat: number): string {
	const diceStr = mergeDice(dice)
		.map((d) => `${d.count}d${d.sides}`)
		.join("+");
	if (!diceStr) return String(flat);
	if (flat === 0) return diceStr;
	return flat > 0 ? `${diceStr}+${flat}` : `${diceStr}${flat}`;
}

export function averageDamage(dice: DiceTerm[], flat: number): number {
	const diceAvg = dice.reduce(
		(sum, d) => sum + (d.count * (d.sides + 1)) / 2,
		0,
	);
	return Math.max(0, diceAvg + flat);
}

/** Item que a ficha D&D 5e trata como ataque: arma, equipada, com dado base válido. */
export function isEquippedWeapon(
	item: InventoryItem,
): item is InventoryItem & { weapon: InventoryWeaponStats } {
	if (
		item.location !== "equipped" ||
		item.category !== "weapon" ||
		!item.weapon
	) {
		return false;
	}
	const base = parseDamageFormula(item.weapon.damageDice);
	return !!base && base.dice.length > 0;
}

function abilityFor(
	ability: InventoryWeaponStats["ability"],
	scores: WeaponAbilityScores,
): { label: string; mod: number } {
	const str = calculateAbilityModifier(scores.strength);
	const dex = calculateAbilityModifier(scores.dexterity);
	if (ability === "dexterity") return { label: "Destreza", mod: dex };
	if (ability === "finesse") {
		return dex > str
			? { label: "Destreza (acuidade)", mod: dex }
			: { label: "Força (acuidade)", mod: str };
	}
	return { label: "Força", mod: str };
}

export function buildWeaponAttack(
	item: InventoryItem & { weapon: InventoryWeaponStats },
	scores: WeaponAbilityScores,
	proficiencyBonus: number,
): WeaponAttack {
	const w = item.weapon;
	const base = parseDamageFormula(w.damageDice) ?? { dice: [], flat: 0 };
	const ability = abilityFor(w.ability, scores);
	const magic = Math.trunc(Number(w.magicBonus) || 0);
	const proficient = w.proficient !== false;

	const attackParts: AttackPart[] = [];
	if (proficient)
		attackParts.push({ label: "Proficiência", value: proficiencyBonus });
	attackParts.push({ label: ability.label, value: ability.mod });
	if (magic !== 0) attackParts.push({ label: "Arma mágica", value: magic });
	const attackBonus = attackParts.reduce((s, p) => s + p.value, 0);

	const damageParts: DamagePart[] = [
		{
			origin: "weapon",
			label: item.name,
			dice: base.dice,
			flat: base.flat,
			type: w.damageType,
			excluded: false,
		},
		{
			origin: "ability",
			label: ability.label,
			dice: [],
			flat: ability.mod,
			type: w.damageType,
			excluded: ability.mod === 0,
		},
	];
	if (magic !== 0) {
		damageParts.push({
			origin: "magic",
			label: "Arma mágica",
			dice: [],
			flat: magic,
			type: w.damageType,
			excluded: false,
		});
	}
	for (const extra of w.extraDamage ?? []) {
		const parsed = parseDamageFormula(extra.amount);
		const zero = !parsed || (parsed.dice.length === 0 && parsed.flat === 0);
		damageParts.push({
			origin: "extra",
			label: extra.label.trim() || "Dano extra",
			dice: parsed?.dice ?? [],
			flat: parsed?.flat ?? 0,
			type: extra.type,
			excluded: zero,
		});
	}

	const counted = damageParts.filter((p) => !p.excluded);
	const typeOrder: DamageType[] = [];
	const acc = new Map<DamageType, { dice: DiceTerm[]; flat: number }>();
	for (const p of counted) {
		if (!acc.has(p.type)) {
			acc.set(p.type, { dice: [], flat: 0 });
			typeOrder.push(p.type);
		}
		const bucket = acc.get(p.type);
		if (!bucket) continue;
		bucket.dice.push(...p.dice);
		bucket.flat += p.flat;
	}
	const byType: DamageByType[] = typeOrder.map((type) => {
		const b = acc.get(type) ?? { dice: [], flat: 0 };
		return {
			type,
			dice: mergeDice(b.dice),
			flat: b.flat,
			formula: formatDamageFormula(b.dice, b.flat),
			average: averageDamage(b.dice, b.flat),
		};
	});

	const allDice = counted.flatMap((p) => p.dice);
	const allFlat = counted.reduce((s, p) => s + p.flat, 0);

	return {
		itemId: item.id,
		name: item.name,
		attackBonus,
		attackParts,
		damageParts,
		byType,
		formula: formatDamageFormula(allDice, allFlat),
		// 5e: cada tipo causa no mínimo 0; o total é a soma dos tipos.
		average: byType.reduce((s, t) => s + t.average, 0),
		types: typeOrder,
	};
}

/** Ataques derivados das armas equipadas. Vazio se não houver arma equipada com dano. */
export function getEquippedWeaponAttacks(
	inventory: InventoryItem[] | undefined,
	scores: WeaponAbilityScores,
	proficiencyBonus: number,
): WeaponAttack[] {
	return (inventory ?? [])
		.filter(isEquippedWeapon)
		.map((item) => buildWeaponAttack(item, scores, proficiencyBonus));
}
