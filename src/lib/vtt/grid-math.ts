import type { VTTDiagonalRule, VTTGridScaleUnit, VTTGridType } from "./types";

export interface Point {
	x: number;
	y: number;
}

/**
 * Snap pixel coordinates (world position) to the center of the nearest grid cell or vertex.
 * Correctly accounts for multi-cell tokens (1x1, 2x2, 3x3, 4x4) in Square and Hexagonal grids.
 */
export function snapToGrid(
	point: Point,
	gridType: VTTGridType,
	gridSize: number,
	tokenSizeCells = 1,
): Point {
	if (gridType === "none" || gridSize <= 0) return point;

	const isEven = tokenSizeCells % 2 === 0;

	if (gridType === "square") {
		if (isEven) {
			// Even sized tokens (2x2, 4x4) snap to grid line intersection (vertex)
			return {
				x: Math.round(point.x / gridSize) * gridSize,
				y: Math.round(point.y / gridSize) * gridSize,
			};
		}
		// Odd sized tokens (1x1, 3x3) snap to cell center
		return {
			x: (Math.floor(point.x / gridSize) + 0.5) * gridSize,
			y: (Math.floor(point.y / gridSize) + 0.5) * gridSize,
		};
	}

	if (gridType === "hex_pointy") {
		const r = gridSize / 2;
		const h = r * Math.sqrt(3);

		if (isEven) {
			// Multi-hex even tokens snap to nearest hex vertex to avoid barycenter offset
			const col = Math.round(point.x / (1.5 * r));
			const offsetY = col % 2 !== 0 ? h / 2 : 0;
			const row = Math.round((point.y - offsetY) / h);
			const centerX = col * 1.5 * r;
			const centerY = row * h + offsetY;
			const corners = getPointyHexCorners(centerX, centerY, r);

			// Find closest corner
			let closest = corners[0];
			let minDist = Number.POSITIVE_INFINITY;
			for (const c of corners) {
				const distSq = (point.x - c.x) ** 2 + (point.y - c.y) ** 2;
				if (distSq < minDist) {
					minDist = distSq;
					closest = c;
				}
			}
			return closest;
		}

		// Odd sized tokens (1x1, 3x3) snap to hex center
		const col = Math.round(point.x / (1.5 * r));
		const offsetY = col % 2 !== 0 ? h / 2 : 0;
		const row = Math.round((point.y - offsetY) / h);
		return {
			x: col * 1.5 * r,
			y: row * h + offsetY,
		};
	}

	if (gridType === "hex_flat") {
		const r = gridSize / 2;
		const w = r * Math.sqrt(3);

		if (isEven) {
			// Multi-hex even tokens snap to nearest hex vertex
			const row = Math.round(point.y / (1.5 * r));
			const offsetX = row % 2 !== 0 ? w / 2 : 0;
			const col = Math.round((point.x - offsetX) / w);
			const centerX = col * w + offsetX;
			const centerY = row * 1.5 * r;
			const corners = getFlatHexCorners(centerX, centerY, r);

			let closest = corners[0];
			let minDist = Number.POSITIVE_INFINITY;
			for (const c of corners) {
				const distSq = (point.x - c.x) ** 2 + (point.y - c.y) ** 2;
				if (distSq < minDist) {
					minDist = distSq;
					closest = c;
				}
			}
			return closest;
		}

		// Odd sized tokens snap to hex center
		const row = Math.round(point.y / (1.5 * r));
		const offsetX = row % 2 !== 0 ? w / 2 : 0;
		const col = Math.round((point.x - offsetX) / w);
		return {
			x: col * w + offsetX,
			y: row * 1.5 * r,
		};
	}

	return point;
}

export interface RulerTick {
	x: number;
	y: number;
	cells: number;
	distance: number;
}

/**
 * Calculate distance between two points in game world units (meters / feet).
 * 5-10-5 uses D&D optional diagonals: first diagonal costs 1 cell, second costs 2.
 */
export function calculateGridDistance(
	p1: Point,
	p2: Point,
	gridSize: number,
	scaleDistance: number,
	scaleUnit: VTTGridScaleUnit,
	diagonalRule: VTTDiagonalRule = "5105",
): { distance: number; formatted: string } {
	if (gridSize <= 0) return { distance: 0, formatted: `0 ${scaleUnit}` };

	const rawDx = Math.abs(p2.x - p1.x) / gridSize;
	const rawDy = Math.abs(p2.y - p1.y) / gridSize;

	let cellDistance = 0;
	if (diagonalRule === "5105") {
		const dx = Math.round(rawDx);
		const dy = Math.round(rawDy);
		const max = Math.max(dx, dy);
		const min = Math.min(dx, dy);
		cellDistance = max + Math.floor(min / 2);
	} else {
		cellDistance = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
	}

	const realDistance = Number((cellDistance * scaleDistance).toFixed(1));
	return {
		distance: realDistance,
		formatted: `${realDistance} ${scaleUnit}`,
	};
}

/**
 * Evenly spaced scale ticks along a ruler, one per full grid cell.
 * Tick labels use the same diagonal rule as the HUD (5-10-5 or Euclidean).
 */
export function rulerTickPoints(
	start: Point,
	end: Point,
	gridSize: number,
	scaleDistance = 1,
	scaleUnit: VTTGridScaleUnit = "ft",
	diagonalRule: VTTDiagonalRule = "euclidean",
): RulerTick[] {
	if (gridSize <= 0) return [];
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const length = Math.hypot(dx, dy);
	if (length < gridSize) return [];

	const cells = Math.floor(length / gridSize + 1e-9);
	const ticks: RulerTick[] = [];
	for (let i = 1; i <= cells; i++) {
		const t = (i * gridSize) / length;
		const point = {
			x: start.x + dx * t,
			y: start.y + dy * t,
		};
		ticks.push({
			...point,
			cells: i,
			distance: calculateGridDistance(
				start,
				point,
				gridSize,
				scaleDistance,
				scaleUnit,
				diagonalRule,
			).distance,
		});
	}
	return ticks;
}

/**
 * Generate corners for a Pointy-topped hexagon.
 */
export function getPointyHexCorners(
	centerX: number,
	centerY: number,
	radius: number,
): Point[] {
	const corners: Point[] = [];
	for (let i = 0; i < 6; i++) {
		const angleDeg = 60 * i - 30;
		const angleRad = (Math.PI / 180) * angleDeg;
		corners.push({
			x: centerX + radius * Math.cos(angleRad),
			y: centerY + radius * Math.sin(angleRad),
		});
	}
	return corners;
}

/**
 * Generate corners for a Flat-topped hexagon.
 */
export function getFlatHexCorners(
	centerX: number,
	centerY: number,
	radius: number,
): Point[] {
	const corners: Point[] = [];
	for (let i = 0; i < 6; i++) {
		const angleDeg = 60 * i;
		const angleRad = (Math.PI / 180) * angleDeg;
		corners.push({
			x: centerX + radius * Math.cos(angleRad),
			y: centerY + radius * Math.sin(angleRad),
		});
	}
	return corners;
}

export interface OccupiedFootprint extends Point {
	sizeCells: number;
}

export interface FindFreeCellOptions {
	gridType: VTTGridType;
	gridSize: number;
	sizeCells?: number;
	bounds: { width: number; height: number };
	/** Raio máximo da busca, em casas. */
	maxRings?: number;
}

function footprintsOverlap(
	a: OccupiedFootprint,
	b: OccupiedFootprint,
	gridType: VTTGridType,
	gridSize: number,
): boolean {
	const reach = ((a.sizeCells + b.sizeCells) / 2) * gridSize;
	const eps = gridSize * 0.01;
	if (gridType === "hex_pointy" || gridType === "hex_flat") {
		// Centros de hexágonos vizinhos ficam a r·√3 (= gridSize·√3/2).
		const neighbor = (reach * Math.sqrt(3)) / 2;
		return Math.hypot(a.x - b.x, a.y - b.y) < neighbor - eps;
	}
	return Math.abs(a.x - b.x) < reach - eps && Math.abs(a.y - b.y) < reach - eps;
}

function insideBounds(
	p: Point,
	half: number,
	bounds: { width: number; height: number },
): boolean {
	const eps = 0.001;
	return (
		p.x - half >= -eps &&
		p.y - half >= -eps &&
		p.x + half <= bounds.width + eps &&
		p.y + half <= bounds.height + eps
	);
}

/**
 * Próxima casa livre ao redor de `origin` para um token novo.
 * Procura em anéis crescentes (mais perto primeiro), devolve o centro já
 * encaixado no grid cuja pegada não cruza nenhum token e cabe na cena.
 * Se nada couber no raio, devolve a origem encaixada.
 */
export function findFreeCell(
	origin: Point,
	occupied: readonly OccupiedFootprint[],
	{
		gridType,
		gridSize,
		sizeCells = 1,
		bounds,
		maxRings = 10,
	}: FindFreeCellOptions,
): Point {
	const start = snapToGrid(origin, gridType, gridSize, sizeCells);
	if (gridSize <= 0) return start;
	const half = (sizeCells * gridSize) / 2;
	const isFree = (p: Point) =>
		insideBounds(p, half, bounds) &&
		occupied.every(
			(o) => !footprintsOverlap({ ...p, sizeCells }, o, gridType, gridSize),
		);

	if (isFree(start)) return start;

	const step = gridSize / 2;
	const steps = maxRings * 2;
	const seen = new Set<string>();
	const candidates: { p: Point; d: number }[] = [];
	for (let i = -steps; i <= steps; i++) {
		for (let j = -steps; j <= steps; j++) {
			const p = snapToGrid(
				{ x: start.x + i * step, y: start.y + j * step },
				gridType,
				gridSize,
				sizeCells,
			);
			const key = `${p.x.toFixed(2)}:${p.y.toFixed(2)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const d = Math.hypot(p.x - start.x, p.y - start.y);
			if (d > maxRings * gridSize + 0.001) continue;
			candidates.push({ p, d });
		}
	}
	candidates.sort((a, b) => a.d - b.d || a.p.y - b.p.y || a.p.x - b.p.x);
	for (const { p } of candidates) {
		if (isFree(p)) return p;
	}
	return start;
}
