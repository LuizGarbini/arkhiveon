import type { Point } from "./grid-math";

export type VTTTemplateKind = "cone15" | "cone60" | "sphere" | "line" | "cube";

export interface VTTSpellTemplate {
	id: string;
	kind: VTTTemplateKind;
	originX: number;
	originY: number;
	targetX: number;
	targetY: number;
	color: string;
	userId?: string;
	userName?: string;
}

const CONE_HALF_DEGREES: Record<"cone15" | "cone60", number> = {
	cone15: 7.5,
	cone60: 30,
};

export function templateReachCells(
	origin: Point,
	target: Point,
	gridSize: number,
): number {
	if (gridSize <= 0) return 1;
	const dist = Math.hypot(target.x - origin.x, target.y - origin.y);
	return Math.max(1, Math.round(dist / gridSize));
}

export function templatePolygon(
	kind: VTTTemplateKind,
	origin: Point,
	target: Point,
	gridSize: number,
): Point[] {
	const reach = templateReachCells(origin, target, gridSize);
	const length = reach * gridSize;
	const aim = Math.atan2(target.y - origin.y, target.x - origin.x);

	if (kind === "cone15" || kind === "cone60") {
		return conePolygon(origin, aim, length, CONE_HALF_DEGREES[kind]);
	}
	if (kind === "sphere") {
		return circlePolygon(origin, length, 32);
	}
	if (kind === "line") {
		return linePolygon(origin, aim, length, gridSize);
	}
	return cubePolygon(origin, target, length);
}

function conePolygon(
	origin: Point,
	aimRad: number,
	length: number,
	halfDegrees: number,
): Point[] {
	const half = (halfDegrees * Math.PI) / 180;
	const steps = Math.max(10, Math.round(halfDegrees * 2));
	const points: Point[] = [{ x: origin.x, y: origin.y }];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const a = aimRad - half + t * half * 2;
		points.push({
			x: origin.x + Math.cos(a) * length,
			y: origin.y + Math.sin(a) * length,
		});
	}
	return points;
}

function circlePolygon(
	center: Point,
	radius: number,
	segments: number,
): Point[] {
	const points: Point[] = [];
	for (let i = 0; i < segments; i++) {
		const a = (i / segments) * Math.PI * 2;
		points.push({
			x: center.x + Math.cos(a) * radius,
			y: center.y + Math.sin(a) * radius,
		});
	}
	return points;
}

function linePolygon(
	origin: Point,
	aimRad: number,
	length: number,
	width: number,
): Point[] {
	const half = width / 2;
	const end = {
		x: origin.x + Math.cos(aimRad) * length,
		y: origin.y + Math.sin(aimRad) * length,
	};
	const nx = -Math.sin(aimRad) * half;
	const ny = Math.cos(aimRad) * half;
	return [
		{ x: origin.x + nx, y: origin.y + ny },
		{ x: end.x + nx, y: end.y + ny },
		{ x: end.x - nx, y: end.y - ny },
		{ x: origin.x - nx, y: origin.y - ny },
	];
}

function cubePolygon(origin: Point, target: Point, size: number): Point[] {
	const dx = Math.sign(target.x - origin.x) || 1;
	const dy = Math.sign(target.y - origin.y) || 1;
	const x1 = origin.x + dx * size;
	const y1 = origin.y + dy * size;
	return [
		{ x: origin.x, y: origin.y },
		{ x: x1, y: origin.y },
		{ x: x1, y: y1 },
		{ x: origin.x, y: y1 },
	];
}

function isOnSegment(point: Point, a: Point, b: Point): boolean {
	const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
	if (Math.abs(cross) > 0.5) return false;
	const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
	if (dot < 0) return false;
	const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
	return dot <= lenSq;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
	if (polygon.length < 3) return false;

	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		if (isOnSegment(point, polygon[j], polygon[i])) return true;
	}

	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i].x;
		const yi = polygon[i].y;
		const xj = polygon[j].x;
		const yj = polygon[j].y;
		const intersects =
			yi > point.y !== yj > point.y &&
			point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
}
