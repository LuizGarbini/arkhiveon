import { type Point, ZERO_ORIGIN } from "./grid-math";
import type {
	VTTDiagonalRule,
	VTTGridType,
	VTTRulerMeasurement,
} from "./types";

export interface RulerContext {
	gridSize: number;
	scaleDistance: number;
	unit: string;
	diagonalRule: VTTDiagonalRule;
}

export interface RulerSegment {
	from: Point;
	to: Point;
	cells: number;
	distance: number;
}

export interface RulerPathMeasure {
	segments: RulerSegment[];
	cells: number;
	distance: number;
}

const roundTenth = (value: number) => Number(value.toFixed(1));

/**
 * Mede o caminho trecho a trecho. No 5-10-5 a contagem de diagonais segue de
 * um trecho para o outro (a 2ª diagonal do caminho custa 2, mesmo depois de
 * um ponto), como na mesa física.
 */
export function measureRulerPath(
	points: readonly Point[],
	gridSize: number,
	scaleDistance: number,
	diagonalRule: VTTDiagonalRule,
): RulerPathMeasure {
	if (gridSize <= 0 || points.length < 2)
		return { segments: [], cells: 0, distance: 0 };
	let diagonals = 0;
	let total = 0;
	const segments: RulerSegment[] = [];
	for (let i = 1; i < points.length; i++) {
		const from = points[i - 1];
		const to = points[i];
		const rawDx = Math.abs(to.x - from.x) / gridSize;
		const rawDy = Math.abs(to.y - from.y) / gridSize;
		let cells: number;
		if (diagonalRule === "euclidean") {
			cells = Math.hypot(rawDx, rawDy);
		} else {
			const dx = Math.round(rawDx);
			const dy = Math.round(rawDy);
			const diag = Math.min(dx, dy);
			const straight = Math.max(dx, dy) - diag;
			if (diagonalRule === "chebyshev") {
				cells = straight + diag;
			} else {
				cells =
					straight +
					diag +
					Math.floor((diagonals + diag) / 2) -
					Math.floor(diagonals / 2);
				diagonals += diag;
			}
		}
		total += cells;
		segments.push({
			from,
			to,
			cells,
			distance: roundTenth(cells * scaleDistance),
		});
	}
	return {
		segments,
		cells: total,
		distance: roundTenth(total * scaleDistance),
	};
}

function samePoint(a: Point, b: Point) {
	return a.x === b.x && a.y === b.y;
}

function withPoint(points: readonly Point[], point: Point): Point[] {
	const last = points.at(-1);
	return last && samePoint(last, point) ? [...points] : [...points, point];
}

/** Pontos fixados da régua (a origem inclusive). */
export function rulerWaypoints(
	measurement: VTTRulerMeasurement | null | undefined,
): Point[] {
	if (!measurement) return [];
	if (measurement.waypoints?.length) return measurement.waypoints;
	return [{ x: measurement.startX, y: measurement.startY }];
}

/** Caminho desenhado: pontos fixados + a ponta ao vivo (se diferente). */
export function rulerPathPoints(measurement: VTTRulerMeasurement): Point[] {
	return withPoint(rulerWaypoints(measurement), {
		x: measurement.currentX,
		y: measurement.currentY,
	});
}

/** Monta a medição a partir dos pontos e da ponta ao vivo. */
export function rulerFrom(
	waypoints: readonly Point[],
	live: Point | null,
	ctx: RulerContext,
	pinned = false,
): VTTRulerMeasurement | null {
	if (waypoints.length === 0) return null;
	const path = live && !pinned ? withPoint(waypoints, live) : [...waypoints];
	const measure = measureRulerPath(
		path,
		ctx.gridSize,
		ctx.scaleDistance,
		ctx.diagonalRule,
	);
	const start = path[0];
	const end = path[path.length - 1];
	return {
		startX: start.x,
		startY: start.y,
		currentX: end.x,
		currentY: end.y,
		distance: measure.distance,
		unit: ctx.unit,
		waypoints: [...waypoints],
		segments: measure.segments.map((segment) => segment.distance),
		cells: measure.cells,
		pinned,
	};
}

/** Clique ou toque: fixa mais um ponto no caminho. */
export function rulerAddPoint(
	measurement: VTTRulerMeasurement | null,
	point: Point,
	ctx: RulerContext,
): VTTRulerMeasurement | null {
	if (!measurement || measurement.pinned) return rulerFrom([point], point, ctx);
	return rulerFrom(withPoint(rulerWaypoints(measurement), point), point, ctx);
}

/** Move a ponta ao vivo (cursor ou dedo arrastando). */
export function rulerMoveLive(
	measurement: VTTRulerMeasurement | null,
	point: Point,
	ctx: RulerContext,
): VTTRulerMeasurement | null {
	if (!measurement || measurement.pinned) return measurement;
	if (measurement.currentX === point.x && measurement.currentY === point.y)
		return measurement;
	return rulerFrom(rulerWaypoints(measurement), point, ctx);
}

/** Tira o último ponto; só com a origem, a régua some. */
export function rulerUndo(
	measurement: VTTRulerMeasurement | null,
	ctx: RulerContext,
): VTTRulerMeasurement | null {
	const waypoints = rulerWaypoints(measurement);
	if (!measurement || waypoints.length <= 1) return null;
	const rest = waypoints.slice(0, -1);
	if (measurement.pinned)
		return rest.length > 1 ? rulerFrom(rest, null, ctx, true) : null;
	return rulerFrom(
		rest,
		{ x: measurement.currentX, y: measurement.currentY },
		ctx,
	);
}

/** Fixa o caminho nos pontos já marcados; sem trecho, não há o que fixar. */
export function rulerPin(
	measurement: VTTRulerMeasurement | null,
	ctx: RulerContext,
): VTTRulerMeasurement | null {
	const waypoints = rulerWaypoints(measurement);
	if (waypoints.length < 2) return null;
	return rulerFrom(waypoints, null, ctx, true);
}

/** Refaz as contas com outra regra/escala mantendo os mesmos pontos. */
export function rulerRemeasure(
	measurement: VTTRulerMeasurement | null,
	ctx: RulerContext,
): VTTRulerMeasurement | null {
	if (!measurement) return null;
	return rulerFrom(
		rulerWaypoints(measurement),
		{ x: measurement.currentX, y: measurement.currentY },
		ctx,
		measurement.pinned,
	);
}

/** Limite de casas pintadas (régua atravessando um mapa enorme). */
const MAX_PATH_CELLS = 2_000;

/**
 * Casas que o caminho atravessa no grid quadrado (canto superior esquerdo de
 * cada uma), sem repetir. Cada trecho anda casa a casa, diagonal inclusive.
 */
export function rulerPathCells(
	points: readonly Point[],
	gridType: VTTGridType,
	gridSize: number,
	origin: Point = ZERO_ORIGIN,
): Point[] {
	if (gridType !== "square" || !(gridSize > 0) || points.length === 0)
		return [];
	const seen = new Set<string>();
	const cells: Point[] = [];
	const cellOf = (p: Point) => ({
		col: Math.floor((p.x - origin.x) / gridSize),
		row: Math.floor((p.y - origin.y) / gridSize),
	});
	const push = (col: number, row: number) => {
		const key = `${col}:${row}`;
		if (seen.has(key) || cells.length >= MAX_PATH_CELLS) return;
		seen.add(key);
		cells.push({ x: origin.x + col * gridSize, y: origin.y + row * gridSize });
	};
	const first = cellOf(points[0]);
	push(first.col, first.row);
	for (let i = 1; i < points.length; i++) {
		const a = cellOf(points[i - 1]);
		const b = cellOf(points[i]);
		const dc = b.col - a.col;
		const dr = b.row - a.row;
		const steps = Math.max(Math.abs(dc), Math.abs(dr));
		for (let k = 1; k <= steps; k++) {
			push(
				a.col + Math.round((dc * k) / steps),
				a.row + Math.round((dr * k) / steps),
			);
		}
	}
	return cells;
}

/** "4,5 m": número no formato brasileiro com uma casa decimal no máximo. */
export function formatDistance(value: number, unit: string): string {
	const number = value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
	return `${number} ${unit}`;
}

/** "14 casas": só quando a conta dá casas inteiras (fora do euclidiano). */
export function formatCells(
	cells: number | undefined,
	diagonalRule?: VTTDiagonalRule,
): string | null {
	if (cells === undefined || diagonalRule === "euclidean") return null;
	const whole = Math.round(cells);
	if (Math.abs(cells - whole) > 1e-6) return null;
	return `${whole} ${whole === 1 ? "casa" : "casas"}`;
}
