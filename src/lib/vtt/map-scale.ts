/**
 * Escala do mapa (F3): faixa da UI 25%–400%, teto pelo limite 4096 px da imagem
 * e pelo check da migration 0058 (`map_scale` em (0, 8]).
 */
import { MAP_MAX_DIMENSION } from "@/lib/vtt/map-upload";
import { MAP_SCALE_MAX } from "@/lib/vtt/scene-settings";

/** Mínimo do controle da UI (25%). */
export const MAP_SCALE_UI_MIN = 0.25;
/** Máximo do controle da UI (400%), antes do teto por dimensão. */
export const MAP_SCALE_UI_MAX = 4;
/** Passo do slider e dos botões −/+, em pontos percentuais. */
export const MAP_SCALE_PERCENT_STEP = 5;

/** Maior escala que cabe em 4096 px nos dois lados e na faixa da UI. */
export function maxMapScaleForDimensions(
	width: number,
	height: number,
): number {
	const w = width > 0 ? width : MAP_MAX_DIMENSION;
	const h = height > 0 ? height : MAP_MAX_DIMENSION;
	const bySize = Math.min(MAP_MAX_DIMENSION / w, MAP_MAX_DIMENSION / h);
	return Math.min(MAP_SCALE_UI_MAX, bySize);
}

/**
 * Prende a escala na faixa da UI e no teto 4096 px da cena.
 * Valor inválido volta para o menor entre 1 e o máximo permitido.
 */
export function clampMapScaleForScene(
	value: number,
	width: number,
	height: number,
): number {
	const max = maxMapScaleForDimensions(width, height);
	const fallback = Math.min(1, max);
	if (!Number.isFinite(value) || value <= 0) return fallback;
	const clamped = Math.min(max, Math.max(MAP_SCALE_UI_MIN, value));
	return Math.round(clamped * 100) / 100;
}

/** Escala → percentual inteiro para o slider (ex.: 1.25 → 125). */
export function mapScaleToPercent(scale: number): number {
	return Math.round(scale * 100);
}

/** Percentual do slider → escala (ex.: 125 → 1.25). */
export function percentToMapScale(percent: number): number {
	return percent / 100;
}

/**
 * Fator `next / current` para a RPC `scale_scene_geometry`.
 * `null` = não chamar (mesmo valor ou entrada inválida).
 */
export function mapScaleFactor(current: number, next: number): number | null {
	if (
		!Number.isFinite(current) ||
		!Number.isFinite(next) ||
		current <= 0 ||
		next <= 0
	) {
		return null;
	}
	if (current === next) return null;
	const factor = next / current;
	if (!Number.isFinite(factor) || factor <= 0 || factor > MAP_SCALE_MAX) {
		return null;
	}
	return factor;
}

/** Texto de ajuda: faixa da UI e teto desta imagem, se menor que 400%. */
export function mapScaleHint(
	width: number,
	height: number,
	saving = false,
): string {
	if (saving) return "Salvando…";
	const maxPercent = mapScaleToPercent(maxMapScaleForDimensions(width, height));
	if (maxPercent < mapScaleToPercent(MAP_SCALE_UI_MAX)) {
		return `De 25% a ${maxPercent}% nesta imagem (limite ${MAP_MAX_DIMENSION} px).`;
	}
	return "De 25% a 400%.";
}

/** Multiplica coordenadas de tokens e paredes de uma cena pelo fator. */
export function scaleSceneEntities<
	T extends { sceneId: string; x: number; y: number },
	W extends {
		sceneId: string;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	},
>(
	sceneId: string,
	factor: number,
	tokens: readonly T[],
	walls: readonly W[],
): { tokens: T[]; walls: W[] } {
	return {
		tokens: tokens.map((token) =>
			token.sceneId === sceneId
				? { ...token, x: token.x * factor, y: token.y * factor }
				: token,
		),
		walls: walls.map((wall) =>
			wall.sceneId === sceneId
				? {
						...wall,
						x1: wall.x1 * factor,
						y1: wall.y1 * factor,
						x2: wall.x2 * factor,
						y2: wall.y2 * factor,
					}
				: wall,
		),
	};
}
