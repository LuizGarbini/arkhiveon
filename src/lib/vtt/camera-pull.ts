/**
 * Levar a câmera até um ponto do mapa (pura): é o que o ping "Todos aqui" do mestre
 * faz na tela de cada jogador. Mantém o zoom de quem recebe e centra o ponto.
 */

export interface CameraTarget {
	x: number;
	y: number;
	scale: number;
}

/** Visão (viewport) que põe o ponto do mapa no centro da tela, no mesmo zoom. */
export function cameraCenteredOn(
	world: { x: number; y: number },
	scale: number,
	screen: { width: number; height: number },
): CameraTarget {
	return {
		x: screen.width / 2 - world.x * scale,
		y: screen.height / 2 - world.y * scale,
		scale,
	};
}

/** Suaviza o movimento: começa rápido e chega devagar. */
export function easeOutCubic(t: number): number {
	const c = Math.max(0, Math.min(1, t));
	return 1 - (1 - c) ** 3;
}

/** A visão a `t` (0 a 1) do caminho entre `from` e `to`. */
export function cameraAt(
	from: CameraTarget,
	to: CameraTarget,
	t: number,
): CameraTarget {
	const k = easeOutCubic(t);
	return {
		x: from.x + (to.x - from.x) * k,
		y: from.y + (to.y - from.y) * k,
		scale: from.scale + (to.scale - from.scale) * k,
	};
}

/** Duração do movimento (ms). */
export const CAMERA_PULL_MS = 450;
