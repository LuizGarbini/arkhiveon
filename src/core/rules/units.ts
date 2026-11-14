/**
 * Unidades de distância na mesa. A ficha guarda o deslocamento na unidade do
 * sistema (D&D 5e: pés), mas a cena mede em metros, pés ou quadrados. Aqui o
 * número da ficha é mostrado na unidade da cena, com a conversão do D&D:
 * 5 pés = 1,5 m = 1 quadrado (então 30 pés = 9 m = 6 quadrados).
 * Funções puras (sem React/DOM).
 */

/** Unidade da cena (mesma lista do ajuste do grid). */
export type TableUnit = "m" | "ft" | "sq";

/** Metros por pé na convenção do D&D (30 pés = 9 m), não os 0,3048 do SI. */
export const METERS_PER_FOOT = 0.3;
export const FEET_PER_SQUARE = 5;
export const METERS_PER_SQUARE = FEET_PER_SQUARE * METERS_PER_FOOT;

/** Uma casa decimal, sem zero à direita: 9 → "9", 9.5 → "9.5". */
function plain(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function isTableUnit(value: unknown): value is TableUnit {
	return value === "m" || value === "ft" || value === "sq";
}

/**
 * Valor da ficha (em `from`: "m" ou "ft") na unidade da cena.
 * `null` quando a unidade da ficha não é conhecida (não dá para converter).
 */
export function convertDistance(
	value: number,
	from: string,
	to: TableUnit,
): number | null {
	if (!Number.isFinite(value)) return null;
	if (from !== "m" && from !== "ft") return null;
	const feet = from === "ft" ? value : value / METERS_PER_FOOT;
	if (to === "ft") return feet;
	if (to === "m") return feet * METERS_PER_FOOT;
	return feet / FEET_PER_SQUARE;
}

const SUFFIX: Record<TableUnit, string> = { m: "m", ft: "ft", sq: "sq" };

/**
 * Deslocamento como a mesa mostra: na unidade da cena quando ela existe e dá
 * para converter; senão, do jeito que a ficha guarda ("30ft").
 * `signed` põe o sinal em bônus ("+3m").
 */
export function formatSpeed(
	value: number,
	sheetUnit: string,
	sceneUnit?: string | null,
	options: { signed?: boolean } = {},
): string {
	const target = isTableUnit(sceneUnit) ? sceneUnit : null;
	const converted = target ? convertDistance(value, sheetUnit, target) : null;
	const shown = converted ?? value;
	const suffix = converted !== null && target ? SUFFIX[target] : sheetUnit;
	const text = plain(Math.abs(shown));
	const sign = shown < 0 ? "-" : options.signed && shown > 0 ? "+" : "";
	return `${sign}${text}${suffix}`;
}

/**
 * Unidade do deslocamento desta ficha: a que ela escolheu (m ou ft) ou, sem
 * escolha, a do sistema. Cada ficha sabe em que unidade o número foi digitado.
 */
export function speedUnitOf(
	character: { speedUnit?: unknown },
	systemUnit: string,
): string {
	return character.speedUnit === "m" || character.speedUnit === "ft"
		? character.speedUnit
		: systemUnit;
}
