/** Contas do cursor remoto (puras, para testar sem o Pixi). */

/** Constante de tempo do suavizado: ~70 ms alcança 63% do caminho. */
const SMOOTH_TAU_MS = 70;
/** Mais longe que isto (px do mapa) é salto de verdade, não movimento: teleporta. */
const TELEPORT_DISTANCE = 900;
/** Parado há tanto tempo, o cursor começa a sumir e depois some. */
const FADE_START_MS = 10_000;
const FADE_END_MS = 12_000;
const MAX_NAME_CHARS = 20;

/**
 * Tamanho do cursor no mundo: acompanha o zoom pela metade. Com zoom 1 mede o
 * normal; ao aproximar fica um pouco maior na tela (não gigante) e ao afastar
 * não vira um ponto.
 */
export function cursorScale(viewScale: number): number {
	const scale = Number.isFinite(viewScale) && viewScale > 0 ? viewScale : 1;
	return Math.min(2.5, Math.max(0.5, scale ** -0.75));
}

/**
 * Passo do suavizado exponencial: independe da taxa de quadros (60 ou 144 Hz
 * andam igual). Perto o bastante, encaixa no alvo para o ticker poder parar.
 */
export function smoothStep(
	current: number,
	target: number,
	dtMs: number,
): number {
	const delta = target - current;
	if (Math.abs(delta) < 0.05) return target;
	const factor = 1 - Math.exp(-Math.max(0, dtMs) / SMOOTH_TAU_MS);
	return current + delta * factor;
}

/** O cursor pulou (outro ponto do mapa, ou acabou de aparecer): sem deslizar. */
export function shouldTeleport(
	from: { x: number; y: number } | null,
	to: { x: number; y: number },
): boolean {
	if (!from) return true;
	return Math.hypot(to.x - from.x, to.y - from.y) > TELEPORT_DISTANCE;
}

/** Opacidade por tempo sem se mexer: cheio, some devagar e some de vez. */
export function cursorOpacity(idleMs: number): number {
	if (idleMs <= FADE_START_MS) return 1;
	if (idleMs >= FADE_END_MS) return 0;
	return 1 - (idleMs - FADE_START_MS) / (FADE_END_MS - FADE_START_MS);
}

/** Nome na etiqueta: curto, com reticências. */
export function chipLabel(name: string): string {
	const letters = Array.from(name.trim());
	if (letters.length <= MAX_NAME_CHARS) return letters.join("");
	return `${letters.slice(0, MAX_NAME_CHARS - 1).join("")}…`;
}

/** Medidas da etiqueta (px do mundo, antes do zoom) a partir do texto. */
export function chipBox(textWidth: number, textHeight: number) {
	const padX = 7;
	const padY = 3;
	return {
		width: Math.ceil(textWidth + padX * 2),
		height: Math.ceil(textHeight + padY * 2),
		padX,
		padY,
		radius: Math.ceil((textHeight + padY * 2) / 2),
	};
}
