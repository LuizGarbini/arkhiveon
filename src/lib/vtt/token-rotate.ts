/**
 * Girar tokens no mesmo lugar (pura, sem React). Q gira para a esquerda e E para
 * a direita, 45° por toque; com Shift, 15° para acertar o ângulo fino. O token
 * olha para cima em 0° e o ângulo cresce no sentido horário (igual ao cone de
 * visão e ao `facingFromMove`).
 */

export const ROTATE_STEP_DEGREES = 45;
export const ROTATE_FINE_STEP_DEGREES = 15;

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
