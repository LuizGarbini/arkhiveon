import type { VTTGridScaleUnit, VTTGridType } from "./types";

export interface Point {
	x: number;
	y: number;
}

/**
 * Snap pixel coordinates (world position) to the center of the nearest grid cell.
 */
export function snapToGrid(
	point: Point,
	gridType: VTTGridType,
	gridSize: number,
	tokenSizeCells = 1,
): Point {
	if (gridType === "none" || gridSize <= 0) return point;

	if (gridType === "square") {
		const halfCell = gridSize / 2;
		const offset = (tokenSizeCells % 2 === 0) ? 0 : halfCell;
		const cellX = Math.floor((point.x - offset) / gridSize);
		const cellY = Math.floor((point.y - offset) / gridSize);
		return {
			x: cellX * gridSize + offset + (tokenSizeCells > 1 && tokenSizeCells % 2 === 0 ? (tokenSizeCells * gridSize) / 2 : 0),
			y: cellY * gridSize + offset + (tokenSizeCells > 1 && tokenSizeCells % 2 === 0 ? (tokenSizeCells * gridSize) / 2 : 0),
		};
	}

	if (gridType === "hex_pointy") {
		// Pointy-topped hexagon center snapping
		const r = gridSize / 2;
		const h = r * Math.sqrt(3);
		const col = Math.round(point.x / (1.5 * r));
		const row = Math.round((point.y - (col % 2 !== 0 ? h / 2 : 0)) / h);
		return {
			x: col * 1.5 * r,
			y: row * h + (col % 2 !== 0 ? h / 2 : 0),
		};
	}

	if (gridType === "hex_flat") {
		// Flat-topped hexagon center snapping
		const r = gridSize / 2;
		const w = r * Math.sqrt(3);
		const row = Math.round(point.y / (1.5 * r));
		const col = Math.round((point.x - (row % 2 !== 0 ? w / 2 : 0)) / w);
		return {
			x: col * w + (row % 2 !== 0 ? w / 2 : 0),
			y: row * 1.5 * r,
		};
	}

	return point;
}

/**
 * Calculate distance between two points in game world units (meters / feet).
 */
export function calculateGridDistance(
	p1: Point,
	p2: Point,
	gridSize: number,
	scaleDistance: number,
	scaleUnit: VTTGridScaleUnit,
	diagonalRule: "euclidean" | "5105" = "5105",
): { distance: number; formatted: string } {
	if (gridSize <= 0) return { distance: 0, formatted: `0 ${scaleUnit}` };

	const dx = Math.abs(p2.x - p1.x) / gridSize;
	const dy = Math.abs(p2.y - p1.y) / gridSize;

	let cellDistance = 0;
	if (diagonalRule === "5105") {
		const max = Math.max(dx, dy);
		const min = Math.min(dx, dy);
		// D&D 5e optional rule: 1st diagonal is 1 cell, 2nd is 2 cells (average 1.5x)
		const diagonals = Math.floor(min);
		const straight = max - min;
		cellDistance = straight + diagonals + Math.floor(diagonals / 2) * 0.5;
	} else {
		// Euclidean distance
		cellDistance = Math.sqrt(dx * dx + dy * dy);
	}

	const realDistance = Number((cellDistance * scaleDistance).toFixed(1));
	return {
		distance: realDistance,
		formatted: `${realDistance} ${scaleUnit}`,
	};
}

/**
 * Generate corners for a Pointy-topped hexagon.
 */
export function getPointyHexCorners(centerX: number, centerY: number, radius: number): Point[] {
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
export function getFlatHexCorners(centerX: number, centerY: number, radius: number): Point[] {
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
