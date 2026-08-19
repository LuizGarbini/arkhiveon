/**
 * Utility calculations for smooth 2D Fog of War brush polygons and geometric cutouts.
 */

export interface Point2D {
	x: number;
	y: number;
}

/**
 * Returns a 4-point convex polygon bounding box for a thick line segment between p1 and p2 with radius r.
 */
export function getThickLinePolygon(p1: Point2D, p2: Point2D, radius: number): Point2D[] {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const len = Math.hypot(dx, dy);

	if (len === 0) {
		return [
			{ x: p1.x - radius, y: p1.y - radius },
			{ x: p1.x + radius, y: p1.y - radius },
			{ x: p1.x + radius, y: p1.y + radius },
			{ x: p1.x - radius, y: p1.y + radius },
		];
	}

	const nx = (-dy / len) * radius;
	const ny = (dx / len) * radius;

	return [
		{ x: p1.x + nx, y: p1.y + ny },
		{ x: p2.x + nx, y: p2.y + ny },
		{ x: p2.x - nx, y: p2.y - ny },
		{ x: p1.x - nx, y: p1.y - ny },
	];
}
