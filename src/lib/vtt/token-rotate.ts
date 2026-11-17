/**
 * Girar tokens no mesmo lugar (pura, sem React). Q gira para a esquerda e E para
 * a direita, 45° por toque; com Shift, 15° para acertar o ângulo fino. O token
 * olha para cima em 0° e o ângulo cresce no sentido horário (igual ao cone de
 * visão e ao `facingFromMove`).
 */

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
