/**
 * S6a — visão bloqueada por paredes (lógica pura).
 *
 * Raycast ponto→ponto sobre os segmentos de `VTTWall`. Sem UI, sem Pixi,
 * sem migration. Pensado para rodar por frame: O(paredes) por raio, sem
 * alocação além do retorno.
 */
import type { VTTWall, WallPoint } from "./walls";

/** Epsilon para cantos: tocar a ponta da parede não bloqueia o raio. */
const EPS = 1e-9;

/**
 * Interseção própria de dois segmentos abertos (0,1)×(0,1).
 * Retorna false se só se tocam na ponta ou são colineares/paralelos.
 */
export function segmentsIntersect(
	a1: WallPoint,
	a2: WallPoint,
	b1: WallPoint,
	b2: WallPoint,
): boolean {
	const dax = a2.x - a1.x;
	const day = a2.y - a1.y;
	const dbx = b2.x - b1.x;
	const dby = b2.y - b1.y;
	const denom = dax * dby - day * dbx;
	if (Math.abs(denom) <= EPS) return false;

	const dx = b1.x - a1.x;
	const dy = b1.y - a1.y;
	const t = (dx * dby - dy * dbx) / denom;
	const u = (dx * day - dy * dax) / denom;
	return t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS;
}

/**
 * O raio de `from` até `to` cruza a parede?
 * Parede de comprimento zero nunca bloqueia.
 */
export function wallBlocksRay(
	from: WallPoint,
	to: WallPoint,
	wall: Pick<VTTWall, "x1" | "y1" | "x2" | "y2">,
): boolean {
	if (wall.x1 === wall.x2 && wall.y1 === wall.y2) return false;
	if (from.x === to.x && from.y === to.y) return false;
	return segmentsIntersect(
		from,
		to,
		{ x: wall.x1, y: wall.y1 },
		{ x: wall.x2, y: wall.y2 },
	);
}

/**
 * Há linha de visão entre `from` e `to`? True se nenhuma parede bloqueia.
 * Mesmo ponto = sempre visível.
 */
export function hasLineOfSight(
	from: WallPoint,
	to: WallPoint,
	walls: readonly Pick<VTTWall, "x1" | "y1" | "x2" | "y2">[],
): boolean {
	if (from.x === to.x && from.y === to.y) return true;
	for (let i = 0; i < walls.length; i++) {
		if (wallBlocksRay(from, to, walls[i])) return false;
	}
	return true;
}

/**
 * Id da primeira parede que bloqueia o raio (ordem da lista), ou null.
 */
export function firstBlockingWallId(
	from: WallPoint,
	to: WallPoint,
	walls: readonly VTTWall[],
): string | null {
	if (from.x === to.x && from.y === to.y) return null;
	for (let i = 0; i < walls.length; i++) {
		const wall = walls[i];
		if (wallBlocksRay(from, to, wall)) return wall.id;
	}
	return null;
}
