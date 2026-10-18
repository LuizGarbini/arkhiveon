/**
 * Recursos da mesa da ficha: Inspiração, Destino e Dados bônus.
 * Vive dentro de `characters.data` (JSONB) em `Character.tableResources`;
 * não tem coluna nem migração própria.
 */

export const BONUS_DIE_SIDES = [4, 6, 8, 10, 12] as const;
export type BonusDieSides = (typeof BONUS_DIE_SIDES)[number];

export const BONUS_DIE_ORIGIN_MAX = 24;
export const BONUS_DIE_QUANTITY_MAX = 9;
/**
 * Total de Destino padrão. Fichas sem `fateTotal` (todas as anteriores a este
 * campo, inclusive as antigas com `fateMax: 3`) ficam com 10.
 */
export const FATE_TOTAL_DEFAULT = 10;
/** Limites do total editável pelo jogador. 0 = todos os pontos queimados. */
export const FATE_TOTAL_MIN = 0;
export const FATE_TOTAL_MAX = 99;

export interface BonusDie {
	id: string;
	sides: BonusDieSides;
	quantity: number;
	origin: string;
}

export interface TableResources {
	/** Quantidade de Inspiração (inteiro ≥ 0, sem teto). */
	inspiration: number;
	/** Pontos de Destino que ainda sobram para gastar, 0..fateTotal. */
	fate: number;
	/**
	 * Total de Destino escolhido pelo jogador (FATE_TOTAL_MIN..FATE_TOTAL_MAX).
	 * Chave nova de propósito: o `fateMax` legado (3 ou 10 fixo) é ignorado
	 * para nenhuma ficha antiga mudar de total sozinha.
	 */
	fateTotal: number;
	bonusDice: BonusDie[];
}

export const EMPTY_TABLE_RESOURCES: TableResources = {
	inspiration: 0,
	fate: 0,
	fateTotal: FATE_TOTAL_DEFAULT,
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
	const fateTotal = normalizeFateTotal(r.fateTotal);
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
		fate: clamp(toInt(r.fate, 0), 0, fateTotal),
		fateTotal,
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

function normalizeFateTotal(value: unknown): number {
	if (value == null) return FATE_TOTAL_DEFAULT;
	return clamp(
		toInt(value, FATE_TOTAL_DEFAULT),
		FATE_TOTAL_MIN,
		FATE_TOTAL_MAX,
	);
}

/** Define quanto sobra, sempre entre 0 e o total. */
export function setFate(res: TableResources, fate: number): TableResources {
	const n = Number.isFinite(fate) ? Math.trunc(fate) : 0;
	return { ...res, fate: clamp(n, 0, res.fateTotal) };
}

/** "−": gasta 1 ponto; em 0 não muda nada. */
export function spendFate(res: TableResources): TableResources {
	return setFate(res, res.fate - 1);
}

/** "+": devolve 1 ponto; no total não muda nada. */
export function regainFate(res: TableResources): TableResources {
	return setFate(res, res.fate + 1);
}

/**
 * Muda o total. Valor inválido mantém o total atual. Se o novo total ficar
 * abaixo do que sobra, o que sobra desce junto.
 */
export function setFateTotal(
	res: TableResources,
	total: number,
): TableResources {
	if (!Number.isFinite(total)) return res;
	const fateTotal = clamp(Math.trunc(total), FATE_TOTAL_MIN, FATE_TOTAL_MAX);
	return { ...res, fateTotal, fate: Math.min(res.fate, fateTotal) };
}

/**
 * "Queimar": tira 1 ponto do total para sempre (mínimo 0) e o que sobra desce
 * junto se passar do novo total. Ex.: 3/4 → 3/3 e 4/4 → 3/3.
 */
export function burnFate(res: TableResources): TableResources {
	if (res.fateTotal <= 0) return res;
	return setFateTotal(res, res.fateTotal - 1);
}

/** Largura da barra: quanto sobra / total, em % inteiro 0..100. */
export function fatePercent(res: TableResources): number {
	if (res.fateTotal <= 0) return 0;
	return clamp(Math.round((res.fate / res.fateTotal) * 100), 0, 100);
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
