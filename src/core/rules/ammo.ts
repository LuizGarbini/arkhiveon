/**
 * Munição consumível — regras puras (sem React, store, rede ou débito).
 * Quantity autoritativa só existirá no RPC (F2). Aqui: modelo, dano, estoque ≥0,
 * elegibilidade. Fail-closed: sem RPC, quantity não é gravável.
 */
import type {
	DamageType,
	InventoryItem,
	InventoryWeaponExtraDamage,
	Item,
	ItemAmmoCondition,
	ItemAmmoStats,
	WeaponPropertyKey,
} from "@/lib/store/types";
import { itemCategoryKind } from "./item-mechanics";
import {
	averageDamage,
	DAMAGE_TYPES,
	type DamagePart,
	formatDamageFormula,
	parseDamageFormula,
	type WeaponAttack,
} from "./weapon-damage";

export const AMMO_QUANTITY_MAX = 9999;

export function emptyAmmoStats(): ItemAmmoStats {
	return { unitLabel: "", extraDamage: [], conditions: [] };
}

function isDamageType(value: unknown): value is DamageType {
	return (
		typeof value === "string" && DAMAGE_TYPES.includes(value as DamageType)
	);
}

function readExtra(raw: unknown): InventoryWeaponExtraDamage | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const extra = raw as Record<string, unknown>;
	if (typeof extra.id !== "string" || !extra.id) return undefined;
	if (!isDamageType(extra.type)) return undefined;
	return {
		id: extra.id,
		label: typeof extra.label === "string" ? extra.label : "",
		amount: typeof extra.amount === "string" ? extra.amount : "",
		type: extra.type,
	};
}

function readCondition(raw: unknown): ItemAmmoCondition | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const condition = raw as Record<string, unknown>;
	if (typeof condition.id !== "string" || !condition.id) return undefined;
	if (typeof condition.name !== "string") return undefined;
	return {
		id: condition.id,
		name: condition.name,
		notes: typeof condition.notes === "string" ? condition.notes : "",
	};
}

/** Lê `Item.ammo` de JSON legado. Lixo vira ausência; nunca lança. */
export function readItemAmmo(raw: unknown): ItemAmmoStats | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const data = raw as Record<string, unknown>;
	const extras = Array.isArray(data.extraDamage)
		? data.extraDamage.map(readExtra).filter((e) => e !== undefined)
		: [];
	const conditions = Array.isArray(data.conditions)
		? data.conditions.map(readCondition).filter((c) => c !== undefined)
		: [];
	let damage: ItemAmmoStats["damage"];
	if (data.damage && typeof data.damage === "object") {
		const d = data.damage as Record<string, unknown>;
		if (
			typeof d.amount === "string" &&
			isDamageType(d.type) &&
			parseDamageFormula(d.amount)
		) {
			damage = { amount: d.amount, type: d.type };
		}
	}
	return {
		unitLabel: typeof data.unitLabel === "string" ? data.unitLabel : "",
		...(damage ? { damage } : {}),
		extraDamage: extras,
		conditions,
	};
}

function mergeDice(
	terms: { count: number; sides: number }[],
): { count: number; sides: number }[] {
	const bySides = new Map<number, number>();
	for (const t of terms)
		bySides.set(t.sides, (bySides.get(t.sides) ?? 0) + t.count);
	return [...bySides.entries()]
		.sort((a, b) => b[0] - a[0])
		.map(([sides, count]) => ({ count, sides }));
}

function ammoParts(ammo: ItemAmmoStats): DamagePart[] {
	const parts: DamagePart[] = [];
	const ownLabel = ammo.unitLabel.trim() || "Munição";
	if (ammo.damage?.amount.trim()) {
		const parsed = parseDamageFormula(ammo.damage.amount);
		const zero = !parsed || (parsed.dice.length === 0 && parsed.flat === 0);
		if (parsed && !zero) {
			parts.push({
				origin: "extra",
				label: ownLabel,
				dice: parsed.dice,
				flat: parsed.flat,
				type: ammo.damage.type,
				excluded: false,
			});
		}
	}
	for (const extra of ammo.extraDamage) {
		const parsed = parseDamageFormula(extra.amount);
		const zero = !parsed || (parsed.dice.length === 0 && parsed.flat === 0);
		parts.push({
			origin: "extra",
			label: extra.label.trim() || "Dano extra",
			dice: parsed?.dice ?? [],
			flat: parsed?.flat ?? 0,
			type: extra.type,
			excluded: zero,
		});
	}
	return parts;
}

function finalizeAttack(
	attack: WeaponAttack,
	damageParts: DamagePart[],
): WeaponAttack {
	const counted = damageParts.filter((p) => !p.excluded);
	const typeOrder: DamageType[] = [];
	const acc = new Map<DamageType, { dice: DamagePart["dice"]; flat: number }>();
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
	const byType = typeOrder.map((type) => {
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
		...attack,
		damageParts,
		byType,
		formula: formatDamageFormula(allDice, allFlat),
		average: byType.reduce((s, t) => s + t.average, 0),
		types: typeOrder,
	};
}

/** Soma dano próprio e adicionais da munição ao ataque da arma. Não gasta estoque. */
export function applyAmmoToAttack(
	attack: WeaponAttack,
	ammo: ItemAmmoStats | undefined,
): WeaponAttack {
	if (!ammo) return attack;
	const extra = ammoParts(ammo);
	if (extra.length === 0) return attack;
	return finalizeAttack(attack, [...attack.damageParts, ...extra]);
}

export function isValidAmmoQuantity(value: number): boolean {
	return Number.isInteger(value) && value >= 0 && value <= AMMO_QUANTITY_MAX;
}

export function canSpendAmmo(quantity: number): boolean {
	return isValidAmmoQuantity(quantity) && quantity >= 1;
}

/** Fail-closed: sem RPC de consumo, a UI não deve gravar quantity de munição. */
export function canMutateAmmoQuantity(rpcReady: boolean): boolean {
	return rpcReady;
}

export function canRestockAmmo(input: {
	rpcReady: boolean;
	role: string | undefined;
}): boolean {
	return (
		canMutateAmmoQuantity(input.rpcReady) &&
		(input.role === "owner" || input.role === "editor")
	);
}

export function canFireAmmo(input: {
	rpcReady: boolean;
	role: string | undefined;
	userId: string | undefined;
	createdBy: string | undefined;
}): boolean {
	if (!canMutateAmmoQuantity(input.rpcReady) || !input.userId) return false;
	if (input.role === "owner" || input.role === "editor") return true;
	return Boolean(input.createdBy && input.createdBy === input.userId);
}

export function isCatalogAmmoItem(
	item: Pick<Item, "type"> | null | undefined,
): boolean {
	return itemCategoryKind(item?.type) === "ammo";
}

/** Identidade de munição: vínculo vivo com item de tipo Munição. Não usa category da ficha. */
export function isCatalogAmmoEntry(
	entry: Pick<InventoryItem, "campaignItemId">,
	itemsById: ReadonlyMap<string, Item>,
): boolean {
	if (!entry.campaignItemId) return false;
	return isCatalogAmmoItem(itemsById.get(entry.campaignItemId));
}

export function nextAmmoQuantity(current: number, delta: number): number {
	return Math.min(AMMO_QUANTITY_MAX, Math.max(0, current + delta));
}

export function weaponUsesAmmunition(
	properties: readonly WeaponPropertyKey[] | undefined,
): boolean {
	if (!properties) return false;
	return properties.includes("ammunition") || properties.includes("loading");
}
