/**
 * Névoa da mesa: véu escuro e pincel com ponta redonda.
 * O véu do mestre é quase preto, para o mapa continuar legível por baixo.
 */
export const GM_FOG_COLOR = 0x10131c;
export const GM_FOG_ALPHA = 0.72;
export const PLAYER_FOG_COLOR = 0x090a0f;

export interface Point2D {
	x: number;
	y: number;
}

const ARC_STEP = Math.PI / 8;

function pushArc(
	out: Point2D[],
	center: Point2D,
	radius: number,
	from: number,
	sweep: number,
) {
	const steps = Math.max(1, Math.ceil(Math.abs(sweep) / ARC_STEP));
	for (let i = 0; i <= steps; i++) {
		const angle = from + sweep * (i / steps);
		out.push({
			x: center.x + Math.cos(angle) * radius,
			y: center.y + Math.sin(angle) * radius,
		});
	}
}

function leftNormal(dx: number, dy: number): Point2D | null {
	const len = Math.hypot(dx, dy);
	if (len < 0.01) return null;
	return { x: -dy / len, y: dx / len };
}

function shortestSweep(from: number, to: number): number {
	let sweep = to - from;
	while (sweep <= -Math.PI) sweep += Math.PI * 2;
	while (sweep > Math.PI) sweep -= Math.PI * 2;
	return sweep;
}

function sweepThrough(from: number, to: number, through: number): number {
	const positive =
		(((to - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
	const throughDelta =
		(((through - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
	if (throughDelta <= positive + 1e-4) return positive || Math.PI * 2;
	return positive - Math.PI * 2;
}

/**
 * Contorno fechado de um traço com ponta e junção redondas.
 * Um polígono só, para a opacidade não empilhar e o corte não virar triângulo.
 */
export function brushOutline(points: Point2D[], radius: number): Point2D[] {
	if (!(radius > 0)) return [];
	const unique: Point2D[] = [];
	for (const point of points) {
		const prev = unique[unique.length - 1];
		if (!prev || Math.hypot(point.x - prev.x, point.y - prev.y) >= 0.5) {
			unique.push(point);
		}
	}
	if (unique.length === 0) return [];
	if (unique.length === 1) {
		const ring: Point2D[] = [];
		pushArc(ring, unique[0], radius, 0, Math.PI * 2);
		ring.pop();
		return ring;
	}

	const dirs: Point2D[] = [];
	for (let i = 0; i < unique.length - 1; i++) {
		const normal = leftNormal(
			unique[i + 1].x - unique[i].x,
			unique[i + 1].y - unique[i].y,
		);
		if (normal) dirs.push(normal);
	}
	if (dirs.length === 0) return [];

	const left: Point2D[] = [];
	const right: Point2D[] = [];
	for (let i = 0; i < unique.length; i++) {
		const curr = unique[i];
		const incoming = i > 0 ? dirs[i - 1] : null;
		const outgoing = i < dirs.length ? dirs[i] : null;
		if (incoming && outgoing) {
			const fromLeft = Math.atan2(incoming.y, incoming.x);
			const sweepLeft = shortestSweep(
				fromLeft,
				Math.atan2(outgoing.y, outgoing.x),
			);
			pushArc(left, curr, radius, fromLeft, sweepLeft);
			const fromRight = Math.atan2(-incoming.y, -incoming.x);
			const sweepRight = shortestSweep(
				fromRight,
				Math.atan2(-outgoing.y, -outgoing.x),
			);
			pushArc(right, curr, radius, fromRight, sweepRight);
		} else if (outgoing) {
			left.push({
				x: curr.x + outgoing.x * radius,
				y: curr.y + outgoing.y * radius,
			});
			right.push({
				x: curr.x - outgoing.x * radius,
				y: curr.y - outgoing.y * radius,
			});
		} else if (incoming) {
			left.push({
				x: curr.x + incoming.x * radius,
				y: curr.y + incoming.y * radius,
			});
			right.push({
				x: curr.x - incoming.x * radius,
				y: curr.y - incoming.y * radius,
			});
		}
	}

	const endDir = dirs[dirs.length - 1];
	const startDir = dirs[0];
	const end = unique[unique.length - 1];
	const endTravel = Math.atan2(
		end.y - unique[unique.length - 2].y,
		end.x - unique[unique.length - 2].x,
	);
	const endCap: Point2D[] = [];
	pushArc(
		endCap,
		end,
		radius,
		Math.atan2(endDir.y, endDir.x),
		sweepThrough(
			Math.atan2(endDir.y, endDir.x),
			Math.atan2(-endDir.y, -endDir.x),
			endTravel,
		),
	);
	const start = unique[0];
	const startTravel = Math.atan2(unique[1].y - start.y, unique[1].x - start.x);
	const startRight = Math.atan2(-startDir.y, -startDir.x);
	const startCap: Point2D[] = [];
	pushArc(
		startCap,
		start,
		radius,
		startRight,
		sweepThrough(
			startRight,
			Math.atan2(startDir.y, startDir.x),
			startTravel + Math.PI,
		),
	);
	return [...left, ...endCap, ...right.reverse(), ...startCap];
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
 * Desenha ou recorta névoa (pincel, retângulo, círculo).
 * Cada forma começa um caminho novo: depois de um fill, o Pixi deixa o
 * próximo caminho em (0, 0). Sem isso, o recorte vira um triângulo
 * desde o canto do mapa.
 */
export function drawFogGeometry(
	graphics: import("pixi.js").Graphics,
	path: import("./types").VTTFogPath,
	isCut: boolean,
	color: number,
	alpha: number,
) {
	const paint = (draw: () => void) => {
		graphics.beginPath();
		draw();
		if (isCut) graphics.cut();
		else graphics.fill({ color, alpha });
	};

	if (
		path.type === "rect" &&
		path.x !== undefined &&
		path.y !== undefined &&
		path.width !== undefined &&
		path.height !== undefined
	) {
		paint(() => {
			graphics.rect(
				path.x ?? 0,
				path.y ?? 0,
				path.width ?? 0,
				path.height ?? 0,
			);
		});
	} else if (
		path.type === "circle" &&
		path.x !== undefined &&
		path.y !== undefined &&
		path.radius !== undefined
	) {
		paint(() => {
			graphics.circle(path.x ?? 0, path.y ?? 0, path.radius ?? 0);
		});
	} else if (path.type === "brush" && path.points && path.points.length > 0) {
		const outline = brushOutline(path.points, path.brushRadius || 40);
		if (outline.length < 3) return;
		paint(() => {
			graphics.poly(outline, true);
		});
	}
}
