import { pointInPolygon, type VisionPoint } from "./vision";

/**
 * Memória de exploração do grupo (lógica pura, sem Pixi nem rede).
 *
 * O mapa é dividido em células quadradas e cada célula é 1 bit. O formato é o
 * mesmo da tabela `vtt_scene_explored` (migration 0071): bit n = linha n/cols,
 * coluna n%cols; bit 0 é o MENOS significativo do primeiro byte (igual a
 * get_bit/set_bit do Postgres).
 */

/** Limites iguais aos da tabela. */
export const MAX_EXPLORED_CELLS = 250_000;
const MAX_SIDE = 5000;
const MIN_CELL = 4;
const MAX_CELL = 2000;

export interface ExploredMeta {
	/** Lado da célula em pixels da cena. */
	cell: number;
	cols: number;
	rows: number;
}

export interface ExploredGrid extends ExploredMeta {
	bits: Uint8Array;
}

export interface ExploredRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Tamanho da grade de exploração: meia casa da grade do mapa, aumentando a
 * célula só se o mapa for tão grande que passaria dos limites do banco.
 */
export function exploredMeta(
	width: number,
	height: number,
	gridSize: number,
): ExploredMeta {
	const w = width > 0 ? width : 1;
	const h = height > 0 ? height : 1;
	let cell = Math.min(
		MAX_CELL,
		Math.max(MIN_CELL, Math.round((gridSize > 0 ? gridSize : 70) / 2)),
	);
	for (;;) {
		const cols = Math.max(1, Math.ceil(w / cell));
		const rows = Math.max(1, Math.ceil(h / cell));
		if (
			(cols * rows <= MAX_EXPLORED_CELLS &&
				cols <= MAX_SIDE &&
				rows <= MAX_SIDE) ||
			cell >= MAX_CELL
		) {
			return { cell, cols, rows };
		}
		cell = Math.min(MAX_CELL, Math.ceil(cell * 1.25));
	}
}

export function sameExploredMeta(a: ExploredMeta, b: ExploredMeta): boolean {
	return a.cell === b.cell && a.cols === b.cols && a.rows === b.rows;
}

export function createExploredGrid(meta: ExploredMeta): ExploredGrid {
	return {
		...meta,
		bits: new Uint8Array(Math.ceil((meta.cols * meta.rows) / 8)),
	};
}

export function isExplored(grid: ExploredGrid, index: number): boolean {
	return (((grid.bits[index >> 3] ?? 0) >> (index & 7)) & 1) === 1;
}

function setCell(grid: ExploredGrid, index: number): boolean {
	const byte = index >> 3;
	const mask = 1 << (index & 7);
	const current = grid.bits[byte] ?? 0;
	if (current & mask) return false;
	grid.bits[byte] = current | mask;
	return true;
}

/**
 * Marca como explorada toda célula cujo centro está dentro do polígono de
 * visão. Devolve só as células NOVAS (é o que se envia ao banco e aos outros).
 */
export function markPolygon(
	grid: ExploredGrid,
	polygon: readonly VisionPoint[],
): number[] {
	if (polygon.length < 3) return [];
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (const p of polygon) {
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}
	const c0 = Math.max(0, Math.floor(minX / grid.cell));
	const c1 = Math.min(grid.cols - 1, Math.floor(maxX / grid.cell));
	const r0 = Math.max(0, Math.floor(minY / grid.cell));
	const r1 = Math.min(grid.rows - 1, Math.floor(maxY / grid.cell));
	const fresh: number[] = [];
	for (let r = r0; r <= r1; r++) {
		for (let c = c0; c <= c1; c++) {
			const index = r * grid.cols + c;
			if (isExplored(grid, index)) continue;
			const center = { x: (c + 0.5) * grid.cell, y: (r + 0.5) * grid.cell };
			if (pointInPolygon(center, polygon) && setCell(grid, index)) {
				fresh.push(index);
			}
		}
	}
	return fresh;
}

/** Aplica células vindas de outro cliente. Devolve quantas eram novas. */
export function markIndexes(
	grid: ExploredGrid,
	indexes: readonly number[],
): number {
	const total = grid.cols * grid.rows;
	let added = 0;
	for (const index of indexes) {
		if (!Number.isInteger(index) || index < 0 || index >= total) continue;
		if (setCell(grid, index)) added++;
	}
	return added;
}

/** Junta (OR) os bits do banco ao que já existe na tela. Devolve se mudou algo. */
export function mergeBits(grid: ExploredGrid, bits: Uint8Array): boolean {
	if (bits.length !== grid.bits.length) return false;
	let changed = false;
	for (let i = 0; i < bits.length; i++) {
		const merged = (grid.bits[i] ?? 0) | (bits[i] ?? 0);
		if (merged !== grid.bits[i]) {
			grid.bits[i] = merged;
			changed = true;
		}
	}
	return changed;
}

/**
 * Retângulos (em pixels) que cobrem as células exploradas: runs na horizontal e,
 * quando a linha de baixo tem exatamente o mesmo trecho, os runs se fundem na
 * vertical. Poucos retângulos = máscara barata de desenhar.
 */
export function exploredRuns(grid: ExploredGrid): ExploredRect[] {
	const out: ExploredRect[] = [];
	let open = new Map<string, ExploredRect>();
	for (let r = 0; r < grid.rows; r++) {
		const next = new Map<string, ExploredRect>();
		let c = 0;
		while (c < grid.cols) {
			if (!isExplored(grid, r * grid.cols + c)) {
				c++;
				continue;
			}
			const start = c;
			while (c < grid.cols && isExplored(grid, r * grid.cols + c)) c++;
			const key = `${start}:${c}`;
			const above = open.get(key);
			if (above && above.y + above.h === r * grid.cell) {
				above.h += grid.cell;
				next.set(key, above);
			} else {
				const rect = {
					x: start * grid.cell,
					y: r * grid.cell,
					w: (c - start) * grid.cell,
					h: grid.cell,
				};
				out.push(rect);
				next.set(key, rect);
			}
		}
		open = next;
	}
	return out;
}

/** Base64 dos bits (formato que o banco devolve em get_scene_explored). */
export function encodeBits(bits: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bits.length; i += 0x8000) {
		binary += String.fromCharCode(...bits.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

/** Lê o base64 do banco. `null` se for inválido ou tiver tamanho diferente. */
export function decodeBits(
	base64: string,
	expectedBytes: number,
): Uint8Array | null {
	try {
		const binary = atob(base64);
		if (binary.length !== expectedBytes) return null;
		const bits = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bits[i] = binary.charCodeAt(i);
		return bits;
	} catch {
		return null;
	}
}
