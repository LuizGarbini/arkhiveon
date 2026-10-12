/**
 * Recursos da mesa da ficha: Inspiração, Destino e Dados bônus.
 * Vive dentro de `characters.data` (JSONB) em `Character.tableResources`;
 * não tem coluna nem migração própria.
 */

export const BONUS_DIE_SIDES = [4, 6, 8, 10, 12] as const;
export type BonusDieSides = (typeof BONUS_DIE_SIDES)[number];

export const BONUS_DIE_ORIGIN_MAX = 24;
export const BONUS_DIE_QUANTITY_MAX = 9;
/** Destino tem teto fixo 10 (modelo-a-qty). Fichas antigas com 3 viram 10. */
export const FATE_MAX = 10;

export interface BonusDie {
	id: string;
	sides: BonusDieSides;
	quantity: number;
	origin: string;
}

export interface TableResources {
	/** Quantidade de Inspiração (inteiro ≥ 0, sem teto). */
	inspiration: number;
	/** Pontos de Destino, 0..FATE_MAX. */
	fate: number;
	/** Sempre FATE_MAX; mantido no JSONB para compatibilidade. */
	fateMax: number;
	bonusDice: BonusDie[];
}

export const EMPTY_TABLE_RESOURCES: TableResources = {
	inspiration: 0,
	fate: 0,
	fateMax: FATE_MAX,
	bonusDice: [],
};

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function toInt(value: unknown, fallback: number) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isDieSides(value: unknown): value is BonusDieSides {
	return BONUS_DIE_SIDES.includes(value as BonusDieSides);
}

export function cleanOrigin(origin: unknown) {
	return typeof origin === "string"
		? origin.trim().replace(/\s+/g, " ").slice(0, BONUS_DIE_ORIGIN_MAX)
		: "";
}

/** Aceita qualquer coisa vinda do JSONB e devolve um objeto válido. */
export function normalizeTableResources(raw: unknown): TableResources {
	if (!raw || typeof raw !== "object") return EMPTY_TABLE_RESOURCES;
	const r = raw as Record<string, unknown>;
	const fateMax = FATE_MAX;
	const bonusDice: BonusDie[] = [];
	if (Array.isArray(r.bonusDice)) {
		for (const item of r.bonusDice) {
			if (!item || typeof item !== "object") continue;
			const d = item as Record<string, unknown>;
			const sides = toInt(d.sides, 0);
			const quantity = clamp(toInt(d.quantity, 0), 0, BONUS_DIE_QUANTITY_MAX);
			if (!isDieSides(sides) || quantity < 1) continue;
			bonusDice.push({
				id: typeof d.id === "string" && d.id ? d.id : newId(),
				sides,
				quantity,
				origin: cleanOrigin(d.origin),
			});
		}
	}
	return {
		inspiration: normalizeInspiration(r.inspiration),
		fate: clamp(toInt(r.fate, 0), 0, fateMax),
		fateMax,
		bonusDice,
	};
}

function newId() {
	return typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `bd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Ficha antiga guardava boolean: true → 1, false/ausente → 0. */
function normalizeInspiration(value: unknown): number {
	if (value === true) return 1;
	if (value === false || value == null) return 0;
	return Math.max(0, toInt(value, 0));
}

export function setInspiration(
	res: TableResources,
	inspiration: number,
): TableResources {
	const n = Number.isFinite(inspiration) ? Math.trunc(inspiration) : 0;
	return { ...res, inspiration: Math.max(0, n) };
}

/** "Usar 1 · vantagem": gasta 1 Inspiração; em 0 não muda nada. */
export function spendInspiration(res: TableResources): TableResources {
	return res.inspiration >= 1 ? setInspiration(res, res.inspiration - 1) : res;
}

export function setFate(res: TableResources, fate: number): TableResources {
	const n = Number.isFinite(fate) ? Math.trunc(fate) : 0;
	return { ...res, fate: clamp(n, 0, FATE_MAX), fateMax: FATE_MAX };
}

/** Soma na entrada que já tem o mesmo dado e a mesma origem. */
export function addBonusDie(
	res: TableResources,
	input: { sides: BonusDieSides; quantity: number; origin: string },
): TableResources {
	const origin = cleanOrigin(input.origin);
	const quantity = clamp(Math.trunc(input.quantity), 1, BONUS_DIE_QUANTITY_MAX);
	const same = res.bonusDice.find(
		(d) =>
			d.sides === input.sides &&
			d.origin.toLowerCase() === origin.toLowerCase(),
	);
	if (same) {
		return {
			...res,
			bonusDice: res.bonusDice.map((d) =>
				d.id === same.id
					? {
							...d,
							quantity: clamp(d.quantity + quantity, 1, BONUS_DIE_QUANTITY_MAX),
						}
					: d,
			),
		};
	}
	return {
		...res,
		bonusDice: [
			...res.bonusDice,
			{ id: newId(), sides: input.sides, quantity, origin },
		],
	};
}

/** 1..sides, sem viés de módulo. */
export function rollDie(sides: number): number {
	if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
		const buf = new Uint32Array(1);
		const limit = Math.floor(0x100000000 / sides) * sides;
		do {
			crypto.getRandomValues(buf);
		} while (buf[0] >= limit);
		return (buf[0] % sides) + 1;
	}
	return Math.floor(Math.random() * sides) + 1;
}

/** Rola 1 dado da entrada e gasta 1; a entrada some quando chega a 0. */
export function spendBonusDie(
	res: TableResources,
	id: string,
	roll: (sides: number) => number = rollDie,
): { next: TableResources; die: BonusDie; value: number } | null {
	const die = res.bonusDice.find((d) => d.id === id);
	if (!die) return null;
	const value = roll(die.sides);
	const bonusDice = res.bonusDice
		.map((d) => (d.id === id ? { ...d, quantity: d.quantity - 1 } : d))
		.filter((d) => d.quantity > 0);
	return { next: { ...res, bonusDice }, die, value };
}
