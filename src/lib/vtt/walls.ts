import type { VTTGridType } from "./types";

/** Um segmento de parede (coordenadas do mundo da cena). */
export interface VTTWall {
	id: string;
	sceneId: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface WallPoint {
	x: number;
	y: number;
}

/**
 * Operação de parede no histórico da sessão. `create` põe os segmentos na
 * cena, `delete` tira. Desfazer é aplicar a inversa (os ids se mantêm).
 */
export type WallOp = { kind: "create" | "delete"; walls: VTTWall[] };

/**
 * Snap aos cantos da grade quadrada. Hex e "sem grade" desenham livre na F1.
 * `free` (Shift segurado) desliga o snap.
 */
export function snapWallPoint(
	point: WallPoint,
	gridType: VTTGridType,
	gridSize: number,
	free = false,
): WallPoint {
	if (free || gridType !== "square" || gridSize <= 0) return point;
	return {
		x: Math.round(point.x / gridSize) * gridSize,
		y: Math.round(point.y / gridSize) * gridSize,
	};
}

export function distanceToSegment(
	p: WallPoint,
	w: Pick<VTTWall, "x1" | "y1" | "x2" | "y2">,
): number {
	const dx = w.x2 - w.x1;
	const dy = w.y2 - w.y1;
	const len2 = dx * dx + dy * dy;
	const t =
		len2 === 0
			? 0
			: Math.max(
					0,
					Math.min(1, ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / len2),
				);
	return Math.hypot(p.x - (w.x1 + t * dx), p.y - (w.y1 + t * dy));
}

/** Parede mais próxima do ponto dentro da tolerância (no mundo), ou null. */
export function hitTestWall(
	walls: readonly VTTWall[],
	p: WallPoint,
	tolerance: number,
): string | null {
	let best: string | null = null;
	let bestDist = tolerance;
	for (const w of walls) {
		const d = distanceToSegment(p, w);
		if (d <= bestDist) {
			bestDist = d;
			best = w.id;
		}
	}
	return best;
}

/** Segmentos da polilinha (pontos consecutivos), ignorando os de tamanho zero. */
export function draftToWalls(
	points: readonly WallPoint[],
	sceneId: string,
	newId: () => string,
): VTTWall[] {
	const out: VTTWall[] = [];
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
		if (a.x === b.x && a.y === b.y) continue;
		out.push({ id: newId(), sceneId, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
	}
	return out;
}

export function invertWallOp(op: WallOp): WallOp {
	return { kind: op.kind === "create" ? "delete" : "create", walls: op.walls };
}

/** Aplica a operação à lista local (sem duplicar ids). */
export function applyWallOp(walls: readonly VTTWall[], op: WallOp): VTTWall[] {
	const ids = new Set(op.walls.map((w) => w.id));
	const rest = walls.filter((w) => !ids.has(w.id));
	return op.kind === "create" ? [...rest, ...op.walls] : rest;
}

/** Erro do PostgREST quando a tabela ainda não existe (migração não aplicada). */
export function isMissingWallsTable(
	error: { code?: string; message?: string } | null | undefined,
): boolean {
	if (!error) return false;
	if (error.code === "42P01" || error.code === "PGRST205") return true;
	return (
		/vtt_walls/.test(error.message ?? "") &&
		/exist|schema cache/i.test(error.message ?? "")
	);
}
