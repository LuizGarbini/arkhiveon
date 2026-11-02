import type { Database } from "@/lib/database.types";
import { normalizeGridOffset } from "@/lib/vtt/grid-math";
import type { VTTScene, VTTSceneSettingsPatch } from "@/lib/vtt/types";

/** Teto da escala do sprite do mapa. Igual ao check da migration 0058. */
export const MAP_SCALE_MAX = 8;

/** Escala do mapa em (0, 8]. Valor inválido volta para 1. */
export function clampMapScale(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 1;
	return Math.min(MAP_SCALE_MAX, value);
}

/** Garante offset dentro da célula e escala válida, inclusive em cena antiga. */
export function withSceneGridDefaults(scene: VTTScene): VTTScene {
	const gridSize = scene.gridSize > 0 ? scene.gridSize : 70;
	return {
		...scene,
		gridOffsetX: normalizeGridOffset(scene.gridOffsetX ?? 0, gridSize),
		gridOffsetY: normalizeGridOffset(scene.gridOffsetY ?? 0, gridSize),
		mapScale: clampMapScale(scene.mapScale ?? 1),
	};
}

type SceneUpdate = Database["public"]["Tables"]["vtt_scenes"]["Update"];

/** Converte o patch parcial do painel do grid nas colunas de vtt_scenes. */
export function sceneSettingsPatchToDb(
	patch: VTTSceneSettingsPatch,
): SceneUpdate {
	const db: SceneUpdate = {};
	if (patch.gridType !== undefined) db.grid_type = patch.gridType;
	if (patch.gridSize !== undefined) db.grid_size = patch.gridSize;
	if (patch.gridColor !== undefined) db.grid_color = patch.gridColor;
	if (patch.gridOpacity !== undefined) db.grid_opacity = patch.gridOpacity;
	if (patch.gridScaleDistance !== undefined)
		db.grid_scale_distance = patch.gridScaleDistance;
	if (patch.gridScaleUnit !== undefined)
		db.grid_scale_unit = patch.gridScaleUnit;
	if (patch.gridOffsetX !== undefined) db.grid_offset_x = patch.gridOffsetX;
	if (patch.gridOffsetY !== undefined) db.grid_offset_y = patch.gridOffsetY;
	return db;
}

/** Valores atuais da cena só para as chaves do patch (para reverter). */
export function previousSceneSettings(
	scene: VTTScene,
	patch: VTTSceneSettingsPatch,
): VTTSceneSettingsPatch {
	const prev: VTTSceneSettingsPatch = {};
	for (const key of Object.keys(patch) as (keyof VTTSceneSettingsPatch)[]) {
		Object.assign(prev, { [key]: scene[key] });
	}
	return prev;
}

/**
 * Resultado do update com `.select("id")`. A RLS que bloqueia o update não
 * dá erro: devolve 0 linhas. Por isso 0 linhas também conta como falha.
 */
export function sceneSaveSucceeded(result: {
	data: { id: string }[] | null;
	error: unknown;
}): boolean {
	return !result.error && (result.data?.length ?? 0) > 0;
}
