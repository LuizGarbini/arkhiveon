import {
	DEFAULT_PING_KIND,
	normalizePingKind,
	type PingKind,
	pingTtl,
} from "./ping-kinds";
import {
	arrowTipDistance,
	glowAlpha,
	glowRadius,
	goingChevrons,
	ICON_SHADOW,
	labelAnchor,
	PING_RIM,
	PING_SHADOW,
	type PingLabelSpec,
	type PingLife,
	pingLabelText,
	pingLife,
	pingPalette,
	waveRings,
	worldRadius,
} from "./ping-motion";
import { type ActivePing, pingVisual } from "./ping-queue";

/**
 * Ondas de energia no chão, com brilho médio. Cada tipo tem um gesto (ondas
 * calmas, pulso rápido, chevrons, pulso duplo, setas no token) na cor da
 * pessoa misturada à do tipo. Um Graphics só desenha tudo; o nome é um Text
 * reaproveitado por cima.
 */

export interface PingTokenGeometry {
	x: number;
	y: number;
	radius: number;
}

export interface PingPaintContext {
	resolveToken: (tokenId: string) => PingTokenGeometry | null;
	resolveColor: (hex: string) => number;
	/** Sem movimento: o ping só aparece e some, sem onda nem pulso. */
	reducedMotion?: boolean;
	/** Escala do mapa. O raio continua em pixels do mundo. */
	zoom?: number;
}

/** @deprecated Use a paleta misturada. Mantido para quem ainda importa a cor crua. */
export const PING_COLORS = {
	danger: 0xef4444,
	going: 0x22c55e,
	help: 0xf59e0b,
	focus: 0xfacc15,
} as const;

export type PingLayer = {
	circle: (x: number, y: number, radius: number) => unknown;
	ellipse: (
		x: number,
		y: number,
		halfWidth: number,
		halfHeight: number,
	) => unknown;
	stroke: (style: { width: number; color: number; alpha: number }) => unknown;
	fill: (style: { color: number; alpha: number }) => unknown;
	poly: (points: number[]) => unknown;
	roundRect: (
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number,
	) => unknown;
	moveTo: (x: number, y: number) => unknown;
	lineTo: (x: number, y: number) => unknown;
};

function ring(
	layer: PingLayer,
	x: number,
	y: number,
	radius: number,
	color: number,
	alpha: number,
	width: number,
) {
	if (alpha <= 0.004 || radius <= 0) return;
	layer.circle(x, y, radius);
	layer.stroke({ width, color, alpha });
}

function dot(
	layer: PingLayer,
	x: number,
	y: number,
	radius: number,
	color: number,
	alpha: number,
) {
	if (alpha <= 0.004 || radius <= 0) return;
	layer.circle(x, y, radius);
	layer.fill({ color, alpha });
}

function strokePath(
	layer: PingLayer,
	points: readonly number[],
	color: number,
	alpha: number,
	width: number,
) {
	if (alpha <= 0.004 || points.length < 4) return;
	layer.moveTo(points[0] ?? 0, points[1] ?? 0);
	for (let i = 2; i < points.length; i += 2) {
		layer.lineTo(points[i] ?? 0, points[i + 1] ?? 0);
	}
	layer.stroke({ width, color, alpha });
}

function fillPoly(
	layer: PingLayer,
	points: number[],
	color: number,
	alpha: number,
) {
	if (alpha <= 0.004) return;
	layer.poly(points);
	layer.fill({ color, alpha });
}

function halo(
	layer: PingLayer,
	x: number,
	y: number,
	life: PingLife,
	color: number,
	zoom: number,
) {
	const radius = worldRadius(glowRadius(life), zoom);
	const alpha = glowAlpha(life);
	if (alpha <= 0.004) return;
	layer.ellipse(x, y + 3, radius * 1.2, radius * 0.46);
	layer.fill({ color, alpha: alpha * 0.85 });
	layer.ellipse(x, y + 3, radius * 1.55, radius * 0.62);
	layer.fill({ color, alpha: alpha * 0.4 });
}

function energyRings(
	layer: PingLayer,
	x: number,
	y: number,
	kind: PingKind,
	elapsed: number,
	life: PingLife,
	color: number,
	reduced: boolean,
	zoom: number,
	scale: number,
) {
	for (const wave of waveRings(kind, elapsed, life, reduced)) {
		const radius = worldRadius(wave.radius * scale, zoom);
		ring(layer, x, y, radius, PING_SHADOW, wave.alpha * 0.7, wave.width + 2.2);
		ring(layer, x, y, radius, PING_RIM, wave.alpha * 0.28, wave.width + 0.5);
		ring(layer, x, y, radius, color, wave.alpha, wave.width);
	}
}

function namePill(
	layer: PingLayer,
	x: number,
	y: number,
	text: string,
	alpha: number,
) {
	if (alpha <= 0.004 || text.length === 0) return;
	const width = Math.min(188, 20 + text.length * 7.2);
	const height = 20;
	const left = x - width / 2;
	const top = y - 3;
	layer.roundRect(left + 1.2, top + 1.6, width, height, 10);
	layer.fill({ color: PING_SHADOW, alpha: alpha * 0.45 });
	layer.roundRect(left, top, width, height, 10);
	layer.fill({ color: 0x0c0e14, alpha: 0.86 * alpha });
	layer.roundRect(left, top, width, height, 10);
	layer.stroke({ width: 1, color: PING_RIM, alpha: 0.4 * alpha });
}

function iconShadowAlpha(alpha: number): number {
	return alpha * 0.62;
}

function drawDanger(
	layer: PingLayer,
	x: number,
	y: number,
	elapsed: number,
	color: number,
	alpha: number,
	reduced: boolean,
) {
	const pulse = reduced ? 1 : 1 + 0.08 * Math.sin(elapsed / 110);
	const s = 15 * pulse;
	const tri = [x, y - s, x + s * 0.86, y + s * 0.7, x - s * 0.86, y + s * 0.7];
	const shadow = tri.map(
		(value, index) => value + (index % 2 === 0 ? ICON_SHADOW.x : ICON_SHADOW.y),
	);
	layer.poly(shadow);
	layer.stroke({ width: 3, color: PING_SHADOW, alpha: iconShadowAlpha(alpha) });
	layer.poly(tri);
	layer.stroke({ width: 2.6, color, alpha });
	strokePath(
		layer,
		[
			x + ICON_SHADOW.x,
			y - s * 0.32 + ICON_SHADOW.y,
			x + ICON_SHADOW.x,
			y + s * 0.16 + ICON_SHADOW.y,
		],
		PING_SHADOW,
		iconShadowAlpha(alpha),
		3,
	);
	strokePath(layer, [x, y - s * 0.32, x, y + s * 0.16], color, alpha, 2.6);
	dot(
		layer,
		x + ICON_SHADOW.x,
		y + s * 0.42 + ICON_SHADOW.y,
		1.7,
		PING_SHADOW,
		iconShadowAlpha(alpha),
	);
	dot(layer, x, y + s * 0.42, 1.7, color, alpha);
}

function drawChevrons(
	layer: PingLayer,
	x: number,
	y: number,
	elapsed: number,
	color: number,
	alpha: number,
	reduced: boolean,
	zoom: number,
) {
	for (const chevron of goingChevrons(elapsed, reduced)) {
		const placed = chevron.points.map(
			(value, index) => worldRadius(value, zoom) + (index % 2 === 0 ? x : y),
		);
		const shadow = placed.map(
			(value, index) =>
				value + (index % 2 === 0 ? ICON_SHADOW.x : ICON_SHADOW.y),
		);
		strokePath(layer, shadow, PING_SHADOW, iconShadowAlpha(alpha), 3.2);
		strokePath(layer, placed, color, alpha, 2.5);
	}
}

function drawHelp(
	layer: PingLayer,
	x: number,
	y: number,
	color: number,
	alpha: number,
) {
	const arm = 9;
	strokePath(
		layer,
		[
			x - arm + ICON_SHADOW.x,
			y + ICON_SHADOW.y,
			x + arm + ICON_SHADOW.x,
			y + ICON_SHADOW.y,
		],
		PING_SHADOW,
		iconShadowAlpha(alpha),
		5,
	);
	strokePath(
		layer,
		[
			x + ICON_SHADOW.x,
			y - arm + ICON_SHADOW.y,
			x + ICON_SHADOW.x,
			y + arm + ICON_SHADOW.y,
		],
		PING_SHADOW,
		iconShadowAlpha(alpha),
		5,
	);
	strokePath(layer, [x - arm, y, x + arm, y], color, alpha, 3.5);
	strokePath(layer, [x, y - arm, x, y + arm], color, alpha, 3.5);
}

function drawFocusMark(
	layer: PingLayer,
	x: number,
	y: number,
	color: number,
	alpha: number,
) {
	const star = [
		x,
		y - 9,
		x + 2.4,
		y - 2.4,
		x + 9,
		y,
		x + 2.4,
		y + 2.4,
		x,
		y + 9,
		x - 2.4,
		y + 2.4,
		x - 9,
		y,
		x - 2.4,
		y - 2.4,
	];
	const shadow = star.map(
		(value, index) => value + (index % 2 === 0 ? ICON_SHADOW.x : ICON_SHADOW.y),
	);
	fillPoly(layer, shadow, PING_SHADOW, iconShadowAlpha(alpha));
	fillPoly(layer, star, color, alpha);
}

function drawArrows(
	layer: PingLayer,
	target: PingTokenGeometry,
	elapsed: number,
	color: number,
	alpha: number,
	reduced: boolean,
	zoom: number,
) {
	const tipDistance = worldRadius(
		arrowTipDistance(elapsed, target.radius, reduced),
		zoom,
	);
	const length = worldRadius(14, zoom);
	const half = worldRadius(8, zoom);
	for (const degrees of [0, 90, 180, 270]) {
		const angle = (degrees * Math.PI) / 180;
		const ux = Math.sin(angle);
		const uy = -Math.cos(angle);
		const px = -uy;
		const py = ux;
		const tipX = target.x + ux * tipDistance;
		const tipY = target.y + uy * tipDistance;
		const base = tipDistance + length;
		const points = [
			tipX,
			tipY,
			target.x + ux * base + px * half,
			target.y + uy * base + py * half,
			target.x + ux * base - px * half,
			target.y + uy * base - py * half,
		];
		fillPoly(
			layer,
			points.map(
				(value, index) =>
					value + (index % 2 === 0 ? ICON_SHADOW.x : ICON_SHADOW.y),
			),
			PING_SHADOW,
			iconShadowAlpha(alpha),
		);
		fillPoly(layer, points, color, alpha);
	}
}

function placeLabel(
	layer: PingLayer,
	ping: ActivePing,
	x: number,
	y: number,
	life: PingLife,
): PingLabelSpec | null {
	const text = pingLabelText(ping.userName);
	if (!text) return null;
	const anchor = labelAnchor(x, y, life);
	namePill(layer, anchor.x, anchor.y, text, life.alpha);
	return { id: ping.id, text, x: anchor.x, y: anchor.y };
}

export function drawPing(
	layer: PingLayer,
	ping: ActivePing,
	now: number,
	context: PingPaintContext,
): PingLabelSpec | null {
	const kind = normalizePingKind(ping.kind ?? DEFAULT_PING_KIND);
	const ttl = pingTtl(kind);
	if (!pingVisual(ping.timestamp, now, ttl).alive) return null;
	const elapsed = Math.max(0, now - ping.timestamp);
	const progress = Math.min(1, elapsed / ttl);
	const reduced = context.reducedMotion === true;
	const life = pingLife(progress, reduced);
	const zoom = context.zoom ?? 1;
	const user = context.resolveColor(ping.color);
	const palette = pingPalette(kind, user);
	const scale = reduced ? 1 : 0.82 + 0.18 * life.enter;

	if (kind === "highlight") {
		const target = ping.tokenId ? context.resolveToken(ping.tokenId) : null;
		if (!target) return null;
		const ringRadius = worldRadius((target.radius + 5) * scale, zoom);
		ring(
			layer,
			target.x,
			target.y,
			ringRadius,
			PING_SHADOW,
			life.alpha * 0.55,
			5,
		);
		ring(layer, target.x, target.y, ringRadius, PING_RIM, life.alpha * 0.3, 3);
		ring(
			layer,
			target.x,
			target.y,
			ringRadius,
			palette.halo,
			life.alpha * 0.85,
			2.2,
		);
		drawArrows(layer, target, elapsed, palette.icon, life.alpha, reduced, zoom);
		return placeLabel(
			layer,
			ping,
			target.x,
			target.y + target.radius + 8,
			life,
		);
	}

	const { x, y } = ping;
	halo(layer, x, y, life, palette.halo, zoom);
	energyRings(
		layer,
		x,
		y,
		kind,
		elapsed,
		life,
		palette.halo,
		reduced,
		zoom,
		scale,
	);
	dot(
		layer,
		x + ICON_SHADOW.x,
		y + ICON_SHADOW.y,
		worldRadius(4.5 * scale, zoom),
		PING_SHADOW,
		life.alpha * 0.45,
	);
	dot(layer, x, y, worldRadius(4.2 * scale, zoom), palette.icon, life.alpha);

	if (kind === "danger") {
		drawDanger(layer, x, y, elapsed, palette.icon, life.alpha, reduced);
	} else if (kind === "going") {
		drawChevrons(layer, x, y, elapsed, palette.icon, life.alpha, reduced, zoom);
	} else if (kind === "help") {
		drawHelp(layer, x, y, palette.icon, life.alpha);
	} else if (kind === "focus") {
		drawFocusMark(layer, x, y, palette.icon, life.alpha);
	}

	return placeLabel(layer, ping, x, y, life);
}
