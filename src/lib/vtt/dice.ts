/**
 * Parser de fórmula XdY+Z e somas 1d8+1d6+3. Espelha `public.parse_dice_formula`
 * (0064): só valida e mostra. Quem rola é o servidor; aqui não há random().
 *
 * Limites iguais aos do banco: 1..100 dados no total, 2..1000 faces, modificador
 * entre -1000000 e 1000000. `d20` vale `1d20`. Espaço e maiúscula entram.
 * `2d6+0` vira `2d6`.
 */

export const DICE_FORMULA_MAX_LENGTH = 200;
export const DICE_COUNT_MIN = 1;
export const DICE_COUNT_MAX = 100;
export const DICE_FACES_MIN = 2;
export const DICE_FACES_MAX = 1000;
export const DICE_MODIFIER_MIN = -1_000_000;
export const DICE_MODIFIER_MAX = 1_000_000;

const DICE_TERM = /^(\d{0,3})d(\d{1,4})$/;
const DICE_FORMULA = /^((?:\d{0,3}d\d{1,4}\+)*\d{0,3}d\d{1,4})([+-]\d{1,7})?$/;

const INVALID_FORMULA = "Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.";
const INVALID_COUNT = "A quantidade de dados deve ser de 1 a 100.";
const INVALID_FACES = "O dado deve ter de 2 a 1000 faces.";
const INVALID_MODIFIER = "O modificador deve ficar entre -1000000 e 1000000.";

export interface DicePool {
	count: number;
	faces: number;
}

export interface ParsedDiceFormula {
	count: number;
	faces: number;
	modifier: number;
	/** Forma canônica, a mesma que o servidor grava no feed público. */
	formula: string;
	pools: DicePool[];
}

export function canonicalDiceFormula(
	count: number,
	faces: number,
	modifier: number,
): string {
	const base = `${count}d${faces}`;
	if (modifier > 0) return `${base}+${modifier}`;
	if (modifier < 0) return `${base}${modifier}`;
	return base;
}

function canonicalPoolsFormula(pools: DicePool[], modifier: number): string {
	const dice = pools.map((pool) => `${pool.count}d${pool.faces}`).join("+");
	if (modifier > 0) return `${dice}+${modifier}`;
	if (modifier < 0) return `${dice}${modifier}`;
	return dice;
}

export function parseDiceFormula(input: string): ParsedDiceFormula {
	if (typeof input !== "string" || input.length > DICE_FORMULA_MAX_LENGTH) {
		throw new Error(INVALID_FORMULA);
	}

	const text = input.toLowerCase().replace(/\s+/g, "");
	const match = DICE_FORMULA.exec(text);
	if (!match) throw new Error(INVALID_FORMULA);

	const modifier = match[2] === undefined ? 0 : Number(match[2]);
	if (
		!Number.isInteger(modifier) ||
		modifier < DICE_MODIFIER_MIN ||
		modifier > DICE_MODIFIER_MAX
	) {
		throw new Error(INVALID_MODIFIER);
	}

	const pools: DicePool[] = [];
	let totalCount = 0;
	for (const term of match[1].split("+")) {
		const tm = DICE_TERM.exec(term);
		if (!tm) throw new Error(INVALID_FORMULA);
		const count = tm[1] === "" ? 1 : Number(tm[1]);
		const faces = Number(tm[2]);
		if (
			!Number.isInteger(count) ||
			count < DICE_COUNT_MIN ||
			count > DICE_COUNT_MAX
		) {
			throw new Error(INVALID_COUNT);
		}
		if (
			!Number.isInteger(faces) ||
			faces < DICE_FACES_MIN ||
			faces > DICE_FACES_MAX
		) {
			throw new Error(INVALID_FACES);
		}
		totalCount += count;
		if (totalCount > DICE_COUNT_MAX) throw new Error(INVALID_COUNT);
		pools.push({ count, faces });
	}

	const first = pools[0];
	if (!first) throw new Error(INVALID_FORMULA);

	return {
		count: totalCount,
		faces: first.faces,
		modifier,
		formula: canonicalPoolsFormula(pools, modifier),
		pools,
	};
}

export function tryParseDiceFormula(input: string): ParsedDiceFormula | null {
	try {
		return parseDiceFormula(input);
	} catch {
		return null;
	}
}
