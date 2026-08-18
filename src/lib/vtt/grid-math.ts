import type { VTTGridScaleUnit, VTTGridType } from "./types";

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
