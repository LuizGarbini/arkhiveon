import { exploredMeta, fogPathCells, isExplored } from "./explored";
import { useExploredStore } from "./explored-store";
import { exploredSync } from "./explored-sync";
import type { VTTFogPath, VTTScene } from "./types";

type SceneSize = Pick<VTTScene, "id" | "width" | "height" | "gridSize"> & {
	mapScale?: number;
};

/**
 * O mestre cobriu um trecho com a forma "ocultar" da névoa: as células que o
 * grupo já tinha explorado debaixo dela voltam a ser desconhecidas (na tela, nos
 * outros clientes e no banco). Sem isso a memória "furava" a névoa por cima e a
 * área explorada continuava visível. Devolve quantas células foram apagadas.
 *
 * A mesma conta de tamanho do canvas, para as células baterem com as gravadas.
 */
export function uncoverExploredUnder(
	path: Pick<
		VTTFogPath,
		| "type"
		| "mode"
		| "points"
		| "brushRadius"
		| "x"
		| "y"
		| "width"
		| "height"
		| "radius"
	>,
	scene: SceneSize,
	sync: Pick<typeof exploredSync, "unexplore"> = exploredSync,
): number {
	if (path.mode !== "hide") return 0;
	const store = useExploredStore.getState();
	const grid = store.sceneId === scene.id ? store.grid : null;
	if (!grid) return 0;
	const meta = exploredMeta(
		(scene.width || 4000) * (scene.mapScale || 1),
		(scene.height || 4000) * (scene.mapScale || 1),
		scene.gridSize || 70,
	);
	if (
		meta.cell !== grid.cell ||
		meta.cols !== grid.cols ||
		meta.rows !== grid.rows
	)
		return 0;
	const covered = fogPathCells(grid, path).filter((index) =>
		isExplored(grid, index),
	);
	if (covered.length === 0) return 0;
	const cleared = store.unmark(scene.id, covered);
	void sync.unexplore(scene.id, meta, covered);
	return cleared;
}
