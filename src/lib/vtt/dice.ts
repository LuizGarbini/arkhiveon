/**
 * Parser de fórmula XdY+Z. Espelha `public.parse_dice_formula` na migração
 * 0052: só valida e mostra. Quem rola é o servidor; aqui não há random().
 *
 * Limites iguais aos do banco: 1..100 dados, 2..1000 faces, modificador
 * entre -1000000 e 1000000. `d20` vale `1d20`. Espaço e maiúscula entram.
 * `2d6+0` vira `2d6`.
 */

export const DICE_FORMULA_MAX_LENGTH = 64;
export const DICE_COUNT_MIN = 1;
export const DICE_COUNT_MAX = 100;
export const DICE_FACES_MIN = 2;
export const DICE_FACES_MAX = 1000;
export const DICE_MODIFIER_MIN = -1_000_000;
export const DICE_MODIFIER_MAX = 1_000_000;

const DICE_FORMULA = /^(\d{0,3})d(\d{1,4})([+-]\d{1,7})?$/;

const INVALID_FORMULA = "Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.";
const INVALID_COUNT = "A quantidade de dados deve ser de 1 a 100.";
const INVALID_FACES = "O dado deve ter de 2 a 1000 faces.";
const INVALID_MODIFIER = "O modificador deve ficar entre -1000000 e 1000000.";

export interface ParsedDiceFormula {
	count: number;
	faces: number;
	modifier: number;
	/** Forma canônica, a mesma que o servidor grava no feed público. */
	formula: string;
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

export function parseDiceFormula(input: string): ParsedDiceFormula {
	if (typeof input !== "string" || input.length > DICE_FORMULA_MAX_LENGTH) {
		throw new Error(INVALID_FORMULA);
	}

	const text = input.toLowerCase().replace(/\s+/g, "");
	const match = DICE_FORMULA.exec(text);
	if (!match) throw new Error(INVALID_FORMULA);

	const count = match[1] === "" ? 1 : Number(match[1]);
	const faces = Number(match[2]);
	const modifier = match[3] === undefined ? 0 : Number(match[3]);

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
	if (
		!Number.isInteger(modifier) ||
		modifier < DICE_MODIFIER_MIN ||
		modifier > DICE_MODIFIER_MAX
	) {
		throw new Error(INVALID_MODIFIER);
	}

	return {
		count,
		faces,
		modifier,
		formula: canonicalDiceFormula(count, faces, modifier),
	};
}

export function tryParseDiceFormula(input: string): ParsedDiceFormula | null {
	try {
		return parseDiceFormula(input);
	} catch {
		return null;
	}
}
