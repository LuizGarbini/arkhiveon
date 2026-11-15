import { create } from "zustand";
import {
	createExploredGrid,
	type ExploredGrid,
	type ExploredMeta,
	markIndexes,
	markPolygon,
	mergeBits,
	sameExploredMeta,
} from "./explored";
import type { VisionPoint } from "./vision";

/**
 * Memória de exploração da cena ativa. A grade é mexida no lugar (é grande e
 * muda toda hora); quem desenha lê só `version`, que sobe a cada mudança.
 */
interface ExploredState {
	sceneId: string | null;
	grid: ExploredGrid | null;
	version: number;
	/** Garante uma grade vazia para a cena/tamanho (recomeça se algo mudou). */
	ensure: (sceneId: string, meta: ExploredMeta) => void;
	/** Marca o que os polígonos enxergam. Devolve só as células novas. */
	mark: (sceneId: string, polygons: readonly VisionPoint[][]) => number[];
	/** Células vindas de outro cliente. */
	applyRemote: (sceneId: string, indexes: readonly number[]) => void;
	/** Bits vindos do banco: juntam-se ao que já foi marcado nesta tela. */
	mergeServer: (sceneId: string, meta: ExploredMeta, bits: Uint8Array) => void;
	/** O mestre esqueceu o mapa. */
	clear: (sceneId: string) => void;
}

export const useExploredStore = create<ExploredState>((set, get) => ({
	sceneId: null,
	grid: null,
	version: 0,

	ensure: (sceneId, meta) => {
		const { sceneId: current, grid } = get();
		if (current === sceneId && grid && sameExploredMeta(grid, meta)) return;
		set((s) => ({
			sceneId,
			grid: createExploredGrid(meta),
			version: s.version + 1,
		}));
	},

	mark: (sceneId, polygons) => {
		const { sceneId: current, grid } = get();
		if (current !== sceneId || !grid) return [];
		const fresh: number[] = [];
		for (const polygon of polygons) fresh.push(...markPolygon(grid, polygon));
		if (fresh.length > 0) set((s) => ({ version: s.version + 1 }));
		return fresh;
	},

	applyRemote: (sceneId, indexes) => {
		const { sceneId: current, grid } = get();
		if (current !== sceneId || !grid) return;
		if (markIndexes(grid, indexes) > 0)
			set((s) => ({ version: s.version + 1 }));
	},

	mergeServer: (sceneId, meta, bits) => {
		const { sceneId: current, grid } = get();
		if (current !== sceneId || !grid || !sameExploredMeta(grid, meta)) return;
		if (mergeBits(grid, bits)) set((s) => ({ version: s.version + 1 }));
	},

	clear: (sceneId) => {
		const { sceneId: current, grid } = get();
		if (current !== sceneId || !grid) return;
		set((s) => ({
			grid: createExploredGrid(grid),
			version: s.version + 1,
		}));
	},
}));
