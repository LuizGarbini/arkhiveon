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
export function getThickLinePolygon(
	p1: Point2D,
	p2: Point2D,
	radius: number,
): Point2D[] {
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

/**
 * Draws or cuts out geometric fog shapes (brush ribbons, rect, circle) onto a Pixi Graphics layer.
 */
export function drawFogGeometry(
	graphics: import("pixi.js").Graphics,
	path: import("./types").VTTFogPath,
	isCut: boolean,
	color: number,
	alpha: number,
) {
	if (
		path.type === "rect" &&
		path.x !== undefined &&
		path.y !== undefined &&
		path.width !== undefined &&
		path.height !== undefined
	) {
		graphics.rect(path.x, path.y, path.width, path.height);
		if (isCut) {
			graphics.cut();
		} else {
			graphics.fill({ color, alpha });
		}
	} else if (
		path.type === "circle" &&
		path.x !== undefined &&
		path.y !== undefined &&
		path.radius !== undefined
	) {
		graphics.circle(path.x, path.y, path.radius);
		if (isCut) {
			graphics.cut();
		} else {
			graphics.fill({ color, alpha });
		}
	} else if (path.type === "brush" && path.points && path.points.length > 0) {
		const r = path.brushRadius || 40;

		for (const pt of path.points) {
			graphics.circle(pt.x, pt.y, r);
			if (isCut) {
				graphics.cut();
			} else {
				graphics.fill({ color, alpha });
			}
		}

		if (path.points.length > 1) {
			for (let i = 0; i < path.points.length - 1; i++) {
				const polyPoints = getThickLinePolygon(
					path.points[i],
					path.points[i + 1],
					r,
				);
				graphics.poly(polyPoints);
				if (isCut) {
					graphics.cut();
				} else {
					graphics.fill({ color, alpha });
				}
			}
		}
	}
}
