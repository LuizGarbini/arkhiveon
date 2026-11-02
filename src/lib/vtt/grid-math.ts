import type { VTTDiagonalRule, VTTGridScaleUnit, VTTGridType } from "./types";

export interface Point {
	x: number;
	y: number;
}

/** Origem do grid sem offset. */
export const ZERO_ORIGIN: Readonly<Point> = Object.freeze({ x: 0, y: 0 });

/**
 * Snap pixel coordinates (world position) to the center of the nearest grid cell or vertex.
 * Correctly accounts for multi-cell tokens (1x1, 2x2, 3x3, 4x4) in Square and Hexagonal grids.
 */
export function snapToGrid(
	point: Point,
	gridType: VTTGridType,
	gridSize: number,
	tokenSizeCells = 1,
	origin: Point = ZERO_ORIGIN,
): Point {
	if (gridType === "none" || gridSize <= 0) return point;
	if (origin.x !== 0 || origin.y !== 0) {
		// Offset do grid: encaixa no grid sem offset e devolve deslocado.
		const local = snapToGrid(
			{ x: point.x - origin.x, y: point.y - origin.y },
			gridType,
			gridSize,
			tokenSizeCells,
		);
		return { x: local.x + origin.x, y: local.y + origin.y };
	}

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
	origin: Point = ZERO_ORIGIN,
): RulerTick[] {
	if (gridSize <= 0) return [];
	// A distância não muda com o offset: mede no espaço local e devolve no mundo.
	const localStart = { x: start.x - origin.x, y: start.y - origin.y };
	const localEnd = { x: end.x - origin.x, y: end.y - origin.y };
	const dx = localEnd.x - localStart.x;
	const dy = localEnd.y - localStart.y;
	const length = Math.hypot(dx, dy);
	if (length < gridSize) return [];

	const cells = Math.floor(length / gridSize + 1e-9);
	const ticks: RulerTick[] = [];
	for (let i = 1; i <= cells; i++) {
		const t = (i * gridSize) / length;
		const point = {
			x: localStart.x + dx * t + origin.x,
			y: localStart.y + dy * t + origin.y,
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
	/** Offset do grid (origem das linhas). */
	origin?: Point;
}

function footprintsOverlap(
	a: OccupiedFootprint,
	b: OccupiedFootprint,
	gridType: VTTGridType,
	gridSize: number,
	origin: Point = ZERO_ORIGIN,
): boolean {
	const ax = a.x - origin.x;
	const ay = a.y - origin.y;
	const bx = b.x - origin.x;
	const by = b.y - origin.y;
	const reach = ((a.sizeCells + b.sizeCells) / 2) * gridSize;
	const eps = gridSize * 0.01;
	if (gridType === "hex_pointy" || gridType === "hex_flat") {
		// Centros de hexágonos vizinhos ficam a r·√3 (= gridSize·√3/2).
		const neighbor = (reach * Math.sqrt(3)) / 2;
		return Math.hypot(ax - bx, ay - by) < neighbor - eps;
	}
	return Math.abs(ax - bx) < reach - eps && Math.abs(ay - by) < reach - eps;
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
		origin: gridOrigin = ZERO_ORIGIN,
	}: FindFreeCellOptions,
): Point {
	const start = snapToGrid(origin, gridType, gridSize, sizeCells, gridOrigin);
	if (gridSize <= 0) return start;
	const half = (sizeCells * gridSize) / 2;
	const isFree = (p: Point) =>
		insideBounds(p, half, bounds) &&
		occupied.every(
			(o) =>
				!footprintsOverlap(
					{ ...p, sizeCells },
					o,
					gridType,
					gridSize,
					gridOrigin,
				),
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
				gridOrigin,
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

/** Faixa aceita para o tamanho da célula (px no mapa). Spec escala-mapa F1. */
export const GRID_SIZE_MIN = 10;
export const GRID_SIZE_MAX = 400;
/** Distância por célula padrão (D&D: 1,5 m). */
export const DEFAULT_GRID_SCALE_DISTANCE = 1.5;

/** Casas decimais aceitas na célula e no offset (0,01 px). */
const GRID_DECIMALS = 100;

function roundGrid(value: number): number {
	return Math.round(value * GRID_DECIMALS) / GRID_DECIMALS;
}

/** Prende o tamanho da célula em 10–400 px, com até 2 casas decimais. */
export function clampGridSize(value: number): number {
	if (!Number.isFinite(value)) return GRID_SIZE_MIN;
	return Math.min(GRID_SIZE_MAX, Math.max(GRID_SIZE_MIN, roundGrid(value)));
}

/**
 * Normaliza o offset para 0 ≤ offset < célula (deslocar uma célula inteira
 * desenha o mesmo grid). Até 2 casas decimais.
 */
export function normalizeGridOffset(value: number, gridSize: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(gridSize) || gridSize <= 0)
		return 0;
	const wrapped = roundGrid(((value % gridSize) + gridSize) % gridSize);
	// Mesma faixa do CHECK da 0058: 0 <= offset < célula.
	return wrapped >= gridSize ? 0 : wrapped;
}

/** Primeira coordenada de linha do grid dentro da cena (≥ 0). */
export function firstGridLine(offset: number, step: number): number {
	if (step <= 0) return 0;
	return ((offset % step) + step) % step;
}

function axisGridLines(length: number, step: number, offset: number): number[] {
	if (step <= 0 || length < 0) return [];
	const start = firstGridLine(offset, step);
	const count = Math.floor((length - start) / step + 1e-9) + 1;
	const lines: number[] = [];
	for (let i = 0; i < count; i++) {
		const value = start + i * step;
		if (value > length + 1e-6) break;
		lines.push(roundGrid(value));
	}
	return lines;
}

/** Linhas do grid quadrado. Offset 0 começa em 0, como a cena antiga. */
export function squareGridLines(
	width: number,
	height: number,
	gridSize: number,
	origin: Point = ZERO_ORIGIN,
): { xs: number[]; ys: number[] } {
	return {
		xs: axisGridLines(width, gridSize, origin.x),
		ys: axisGridLines(height, gridSize, origin.y),
	};
}

function hexCenters(
	width: number,
	height: number,
	gridSize: number,
	origin: Point,
	orientation: "pointy" | "flat",
): Point[] {
	if (gridSize <= 0) return [];
	const r = gridSize / 2;
	const across = r * Math.sqrt(3);
	const stepMajor = 1.5 * r;
	const points: Point[] = [];
	const pointy = orientation === "pointy";
	const spanMajor = pointy ? width : height;
	const spanMinor = pointy ? height : width;
	const originMajor = pointy ? origin.x : origin.y;
	const originMinor = pointy ? origin.y : origin.x;
	const firstMajor = Math.floor((-r - originMajor) / stepMajor);
	const lastMajor = Math.ceil((spanMajor - originMajor + r) / stepMajor);
	for (let major = firstMajor; major <= lastMajor; major++) {
		const majorPos = originMajor + major * stepMajor;
		if (majorPos > spanMajor + r + 1e-6) continue;
		const minorShift = major % 2 !== 0 ? across / 2 : 0;
		const firstMinor = Math.floor(
			(-across - originMinor - minorShift) / across,
		);
		const lastMinor = Math.ceil((spanMinor - originMinor + across) / across);
		for (let minor = firstMinor; minor <= lastMinor; minor++) {
			const minorPos = originMinor + minor * across + minorShift;
			if (minorPos < -across - 1e-6 || minorPos > spanMinor + across + 1e-6)
				continue;
			points.push(
				pointy ? { x: majorPos, y: minorPos } : { x: minorPos, y: majorPos },
			);
		}
	}
	return points;
}

/** Centros do hex pontudo, no mesmo lattice do snap, deslocados pela origem. */
export function pointyHexCenters(
	width: number,
	height: number,
	gridSize: number,
	origin: Point = ZERO_ORIGIN,
): Point[] {
	return hexCenters(width, height, gridSize, origin, "pointy");
}

/** Centros do hex plano, no mesmo lattice do snap, deslocados pela origem. */
export function flatHexCenters(
	width: number,
	height: number,
	gridSize: number,
	origin: Point = ZERO_ORIGIN,
): Point[] {
	return hexCenters(width, height, gridSize, origin, "flat");
}

/**
 * "Contar quadrados": quantas casas o mapa tem na largura → tamanho da
 * célula. Quadrado: largura / colunas. Hex pontudo: as colunas andam 1,5·r
 * (= 0,75 · célula). Hex plano: as colunas andam r·√3 (= célula · √3/2).
 * Devolve null se a entrada não dá um tamanho válido.
 */
/**
 * "Contar quadrados": colunas × linhas no mapa viram o tamanho da célula.
 * Quadrado: largura/colunas e altura/linhas (a média, iguais quando batem).
 * Hex pontudo: colunas andam 0,75·célula e linhas andam célula·√3/2.
 * Hex plano: o contrário. Devolve null se a entrada não dá um tamanho válido.
 */
export function gridSizeFromCellCount(
	mapWidth: number,
	mapHeight: number,
	columns: number,
	rows: number,
	gridType: VTTGridType,
): number | null {
	if (!(mapWidth > 0) || !(mapHeight > 0)) return null;
	if (!(columns >= 1) || !(rows >= 1)) return null;
	if (!Number.isFinite(columns) || !Number.isFinite(rows)) return null;
	const widthSize = cellSizeFromSpan(mapWidth / columns, gridType, "x");
	const heightSize = cellSizeFromSpan(mapHeight / rows, gridType, "y");
	return clampGridSize((widthSize + heightSize) / 2);
}

function cellSizeFromSpan(
	span: number,
	gridType: VTTGridType,
	axis: "x" | "y",
): number {
	if (gridType === "hex_pointy") {
		return axis === "x" ? span / 0.75 : span / (Math.sqrt(3) / 2);
	}
	if (gridType === "hex_flat") {
		return axis === "x" ? span / (Math.sqrt(3) / 2) : span / 0.75;
	}
	return span;
}
