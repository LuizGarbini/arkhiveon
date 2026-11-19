/**
 * Girar tokens no mesmo lugar (pura, sem React). Q gira para a esquerda e E para
 * a direita, 45° por toque; com Shift, 15° para acertar o ângulo fino. O token
 * olha para cima em 0° e o ângulo cresce no sentido horário (igual ao cone de
 * visão e ao `facingFromMove`).
 */

import { STATUS_RING_OUTER_FACTOR } from "./conditions";

export const ROTATE_STEP_DEGREES = 45;
export const ROTATE_FINE_STEP_DEGREES = 15;
/** O arrasto gruda quando chega perto de um múltiplo de 15° (45° inclusive). */
export const ROTATE_SNAP_DEGREES = 15;
export const ROTATE_SNAP_MAGNET_DEGREES = 5;
/** Raio do alvo da alça, em pixels de TELA. 22 de raio = 44 de diâmetro, o mínimo no toque. */
export const ROTATE_HANDLE_HIT_PX = 22;

/** Quantos graus girar com a tecla apertada, ou null se não é uma tecla de giro. */
export function rotationDelta(key: string, shift: boolean): number | null {
	const k = key.toLowerCase();
	const step = shift ? ROTATE_FINE_STEP_DEGREES : ROTATE_STEP_DEGREES;
	if (k === "e") return step;
	if (k === "q") return -step;
	return null;
}

/** Ângulo entre 0 (inclusive) e 360 (exclusive), inteiro. */
export function normalizeRotation(degrees: number): number {
	const rounded = Math.round(degrees);
	return ((rounded % 360) + 360) % 360;
}

export interface RotateMember {
	id: string;
	rotation?: number | null;
}

/** O novo ângulo de cada token: todos giram no lugar pelo mesmo tanto. */
export function planRotation(
	members: readonly RotateMember[],
	delta: number,
): { id: string; rotation: number }[] {
	return members.map((member) => ({
		id: member.id,
		rotation: normalizeRotation((member.rotation ?? 0) + delta),
	}));
}

/**
 * Distância do centro do token até o miolo da alça. Fica fora do disco, na
 * direção para onde o token olha.
 */
export function rotateHandleDistance(tokenRadius: number): number {
	return tokenRadius + Math.max(18, tokenRadius * 0.28);
}

/**
 * Raio de acerto da alça em unidades do mapa. No mínimo 44px de tela, e nunca
 * menor que o botão desenhado (senão o zoom alto deixa a alça visível e morta).
 */
export function rotateHandleHitRadius(screenScale: number): number {
	const scale =
		Number.isFinite(screenScale) && screenScale > 0.05 ? screenScale : 1;
	const screenHit = ROTATE_HANDLE_HIT_PX / scale;
	const knob = Math.max(10, 12 / scale);
	return Math.max(knob, screenHit);
}

/**
 * O ponteiro acertou a alça? `localX/Y` são relativos ao centro do token.
 * 0° olha para cima, e o ângulo cresce no sentido horário.
 */
export function pointerHitsRotateHandle(
	localX: number,
	localY: number,
	rotation: number,
	tokenRadius: number,
	hitRadius: number,
): boolean {
	if (
		!Number.isFinite(localX) ||
		!Number.isFinite(localY) ||
		!Number.isFinite(rotation) ||
		!Number.isFinite(tokenRadius) ||
		!Number.isFinite(hitRadius)
	)
		return false;
	if (tokenRadius <= 0 || hitRadius <= 0) return false;
	const rad = (rotation * Math.PI) / 180;
	const dist = rotateHandleDistance(tokenRadius);
	const hx = Math.sin(rad) * dist;
	const hy = -Math.cos(rad) * dist;
	return Math.hypot(localX - hx, localY - hy) <= hitRadius;
}

export function pointerHitsRotateHandleWorld(
	token: {
		x: number;
		y: number;
		rotation?: number | null;
		sizeCells: number;
	},
	world: { x: number; y: number },
	gridSize: number,
	screenScale: number,
): boolean {
	if (!Number.isFinite(gridSize) || gridSize <= 0) return false;
	const radius = (token.sizeCells * gridSize) / 2;
	return pointerHitsRotateHandle(
		world.x - token.x,
		world.y - token.y,
		token.rotation ?? 0,
		radius,
		rotateHandleHitRadius(screenScale),
	);
}

/**
 * Ângulo do ponteiro em volta do centro. Null se o ponteiro está em cima do
 * centro (não há direção). 0° é para cima.
 */
export function rotationFromLocalPointer(
	localX: number,
	localY: number,
): number | null {
	if (!Number.isFinite(localX) || !Number.isFinite(localY)) return null;
	if (localX === 0 && localY === 0) return null;
	return normalizeRotation((Math.atan2(localX, -localY) * 180) / Math.PI);
}

/** Livre, mas gruda em passos de 15° quando o dedo chega perto. */
export function steeredRotation(degrees: number): number {
	if (!Number.isFinite(degrees)) return 0;
	const nearest =
		Math.round(degrees / ROTATE_SNAP_DEGREES) * ROTATE_SNAP_DEGREES;
	const gap = Math.abs(degrees - nearest);
	return gap <= ROTATE_SNAP_MAGNET_DEGREES
		? normalizeRotation(nearest)
		: normalizeRotation(degrees);
}

/**
 * Alça em pixels de TELA. O canvas desenha a bola e a haste uma vez nestes
 * tamanhos e o zoom só muda a escala do container. O contrato antigo
 * (`rotateHandleDistance` / `rotateHandleHitRadius`) continua acima: os testes
 * de giro cobrem a fórmula do ângulo, e estes números são o desenho novo.
 */
export const ROTATE_HANDLE_KNOB_PX = 14;
export const ROTATE_HANDLE_STEM_PX = 1.5;
/** Centro da bola, em px de tela, além da borda externa do token. */
export const ROTATE_HANDLE_GAP_PX = 21;
/**
 * Contorno desenhado por fora do disco de 14px, para o miolo medir 14 mesmo
 * com a borda. Mesma espessura da haste.
 */
export const ROTATE_HANDLE_OUTLINE_PX = 1.5;
/** Raio do alvo no mouse: 16px → 32px de diâmetro. */
export const ROTATE_HANDLE_HIT_MOUSE_PX = 16;
/** Raio do alvo no toque: 22px → 44px de diâmetro. */
export const ROTATE_HANDLE_HIT_TOUCH_PX = 22;

/** Zoom usado na conta. Abaixo de 0,05 (ou inválido) cai para 1, como o hit antigo. */
export function rotateViewportScale(scale: number): number {
	return Number.isFinite(scale) && scale > 0.05 ? scale : 1;
}

export interface RotateHandleScreen {
	/** `1 / zoom`: px de tela desenhados no filho continuam px de tela. */
	counterScale: number;
	/** Borda externa do token, em px de tela. */
	edgePx: number;
	/** Centro da bola a partir do centro do token, em px de tela. */
	centerPx: number;
	knobPx: number;
	stemPx: number;
	gapPx: number;
	outlinePx: number;
	hitMousePx: number;
	hitTouchPx: number;
}

/** Geometria da alça em px de tela para um raio externo (mapa) e um zoom. */
export function rotateHandleScreen(
	outerRadius: number,
	scale: number,
): RotateHandleScreen {
	const safe = rotateViewportScale(scale);
	const edgePx = Math.max(0, outerRadius) * safe;
	return {
		counterScale: 1 / safe,
		edgePx,
		centerPx: edgePx + ROTATE_HANDLE_GAP_PX,
		knobPx: ROTATE_HANDLE_KNOB_PX,
		stemPx: ROTATE_HANDLE_STEM_PX,
		gapPx: ROTATE_HANDLE_GAP_PX,
		outlinePx: ROTATE_HANDLE_OUTLINE_PX,
		hitMousePx: ROTATE_HANDLE_HIT_MOUSE_PX,
		hitTouchPx: ROTATE_HANDLE_HIT_TOUCH_PX,
	};
}

/** Raio de acerto em px de tela. Só `touch` usa o alvo de 44px; o resto, 32px. */
export function rotateHandleHitRadiusPx(pointerType: string): number {
	return pointerType === "touch"
		? ROTATE_HANDLE_HIT_TOUCH_PX
		: ROTATE_HANDLE_HIT_MOUSE_PX;
}

/** Raio de acerto em unidades do mapa. */
export function rotateHandleHitWorld(
	scale: number,
	pointerType: string,
): number {
	return rotateHandleHitRadiusPx(pointerType) / rotateViewportScale(scale);
}

/** Distância do centro do token até o centro da bola, em unidades do mapa. */
export function rotateHandleCenterWorld(
	outerRadius: number,
	scale: number,
): number {
	const safe = rotateViewportScale(scale);
	return rotateHandleScreen(outerRadius, safe).centerPx / safe;
}

/**
 * Borda de onde a alça sai. Com disco de status, é a borda do disco; sem ele,
 * o raio do token. O anel de seleção não entra.
 */
export function rotateHandleOuterRadius(
	tokenRadius: number,
	hasStatusDisc: boolean,
): number {
	if (!(tokenRadius > 0)) return 0;
	return hasStatusDisc ? tokenRadius * STATUS_RING_OUTER_FACTOR : tokenRadius;
}

/**
 * O ponteiro acertou a alça? `localX/Y` são o deslocamento a partir do centro
 * do token, em unidades do mapa. 0° olha para cima.
 */
export function pointerHitsRotateHandleScreen(
	localX: number,
	localY: number,
	rotation: number,
	outerRadius: number,
	scale: number,
	pointerType: string,
): boolean {
	if (
		!Number.isFinite(localX) ||
		!Number.isFinite(localY) ||
		!Number.isFinite(rotation) ||
		!Number.isFinite(outerRadius) ||
		!Number.isFinite(scale)
	)
		return false;
	if (outerRadius <= 0) return false;
	const rad = (rotation * Math.PI) / 180;
	const dist = rotateHandleCenterWorld(outerRadius, scale);
	const hit = rotateHandleHitWorld(scale, pointerType);
	const hx = Math.sin(rad) * dist;
	const hy = -Math.cos(rad) * dist;
	return Math.hypot(localX - hx, localY - hy) <= hit;
}

/** A única alça fica no primeiro token que o teclado já giraria. */
export function rotateHandleAnchor<T extends { id: string }>(
	movers: readonly T[],
): T | null {
	return movers[0] ?? null;
}
