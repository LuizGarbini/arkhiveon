/**
 * Geometria da roda de pings (pura). A roda abre em volta do cursor com um tipo
 * por fatia, a partir do topo, no sentido horário. Soltar no miolo (zona morta)
 * usa o tipo escolhido; soltar sobre uma fatia usa o tipo dela.
 */

/** Distância do centro até o centro de cada opção (px). */
export const WHEEL_RADIUS_PX = 84;
/** Dentro deste raio (px) nenhuma fatia está sob o cursor. */
export const WHEEL_DEAD_ZONE_PX = 26;
/** Segurar o botão por este tempo (ms) com Ctrl abre a roda. */
export const WHEEL_HOLD_MS = 220;
/** Mexer o mouse mais que isto (px) antes da roda abrir é arrasto, não roda. */
export const WHEEL_MOVE_SLOP_PX = 6;

/** Ângulo em graus (0 a 360, 0 = para cima, crescendo no sentido horário). */
export function wheelAngle(dx: number, dy: number): number {
	const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
	return (degrees + 360) % 360;
}

/**
 * Qual fatia está sob o deslocamento (dx, dy) em relação ao centro da roda, ou
 * null na zona morta. Com n opções, a fatia i é centrada em i·360/n.
 */
export function kindAtOffset<T>(
	dx: number,
	dy: number,
	kinds: readonly T[],
	deadZone: number = WHEEL_DEAD_ZONE_PX,
): T | null {
	if (kinds.length === 0) return null;
	if (Math.hypot(dx, dy) < deadZone) return null;
	const slice = 360 / kinds.length;
	const index = Math.round(wheelAngle(dx, dy) / slice) % kinds.length;
	return kinds[index] ?? null;
}

/** Onde desenhar a opção `index` (deslocamento do centro da roda, em px). */
export function chipOffset(
	index: number,
	count: number,
	radius: number = WHEEL_RADIUS_PX,
): { x: number; y: number } {
	const angle = ((index * 360) / count) * (Math.PI / 180);
	return { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius };
}
