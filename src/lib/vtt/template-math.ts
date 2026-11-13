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
	/** Nome da magia. Sem ele, a lista usa o nome da forma. */
	spellName?: string;
	/** Alcance fixo em casas; sem ele, o arrasto define o alcance. */
	sizeCells?: number;
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

/** Alcance do molde em casas: o fixo, se houver, ou o do arrasto. */
export function templateReach(
	template: Pick<
		VTTSpellTemplate,
		"originX" | "originY" | "targetX" | "targetY" | "sizeCells"
	>,
	gridSize: number,
): number {
	if (template.sizeCells && template.sizeCells > 0) return template.sizeCells;
	return templateReachCells(
		{ x: template.originX, y: template.originY },
		{ x: template.targetX, y: template.targetY },
		gridSize,
	);
}

export function templatePolygon(
	kind: VTTTemplateKind,
	origin: Point,
	target: Point,
	gridSize: number,
	reachCells?: number,
): Point[] {
	const reach =
		reachCells && reachCells > 0
			? reachCells
			: templateReachCells(origin, target, gridSize);
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

const TEMPLATE_NAMES: Record<VTTTemplateKind, string> = {
	cone15: "Cone 15°",
	cone60: "Cone 60°",
	sphere: "Raio",
	line: "Linha",
	cube: "Cubo",
};

export function templateKindLabel(kind: VTTTemplateKind): string {
	return TEMPLATE_NAMES[kind];
}

/** Nome na lista: o da magia, ou o da forma quando ninguém nomeou. */
export function spellTemplateTitle(
	template: Pick<VTTSpellTemplate, "kind" | "spellName">,
): string {
	const name = template.spellName?.trim();
	return name || TEMPLATE_NAMES[template.kind];
}

/** Quem colocou, pelo nome. Nunca devolve o id cru. */
export function spellTemplateOwnerName(
	template: Pick<VTTSpellTemplate, "userId" | "userName">,
	selfUserId?: string | null,
): string {
	const name = template.userName?.trim();
	if (name) return name;
	if (selfUserId && template.userId === selfUserId) return "Você";
	return "Jogador";
}

/** Moldes na mesa, locais primeiro, sem repetir id. */
export function listedSpellTemplates(
	placed: readonly VTTSpellTemplate[],
	remote: Readonly<Record<string, VTTSpellTemplate>>,
): VTTSpellTemplate[] {
	const seen = new Set<string>();
	const list: VTTSpellTemplate[] = [];
	for (const template of placed) {
		if (seen.has(template.id)) continue;
		seen.add(template.id);
		list.push(template);
	}
	for (const template of Object.values(remote)) {
		if (seen.has(template.id)) continue;
		seen.add(template.id);
		list.push(template);
	}
	return list;
}

/** O molde de cima (o último desenhado) que contém o ponto. */
export function spellTemplateIdAtPoint(
	templates: readonly VTTSpellTemplate[],
	point: Point,
	gridSize: number,
): string | null {
	if (!(gridSize > 0)) return null;
	for (let index = templates.length - 1; index >= 0; index--) {
		const template = templates[index];
		if (!template) continue;
		const polygon = templatePolygon(
			template.kind,
			{ x: template.originX, y: template.originY },
			{ x: template.targetX, y: template.targetY },
			gridSize,
			templateReach(template, gridSize),
		);
		if (pointInPolygon(point, polygon)) return template.id;
	}
	return null;
}

/** Texto da medida: "Cone 60° · 9 m", "Raio 6 m", "Cubo 4,5 m". */
export function templateMeasureText(
	kind: VTTTemplateKind,
	reachCells: number,
	scaleDistance: number,
	unit: string,
): string {
	const size = Number((reachCells * scaleDistance).toFixed(1)).toLocaleString(
		"pt-BR",
		{ maximumFractionDigits: 1 },
	);
	const name = TEMPLATE_NAMES[kind];
	return kind === "cone15" || kind === "cone60"
		? `${name} · ${size} ${unit}`
		: `${name} ${size} ${unit}`;
}

/**
 * Onde o alcance termina: ponta do cone/linha, borda da esfera na direção do
 * arrasto, centro do cubo. `dir` aponta para fora (o rótulo vai além da ponta).
 */
export function templateReachPoint(
	kind: VTTTemplateKind,
	origin: Point,
	target: Point,
	gridSize: number,
	reachCells: number,
): { point: Point; dir: Point } {
	const length = reachCells * gridSize;
	if (kind === "cube") {
		const dx = Math.sign(target.x - origin.x) || 1;
		const dy = Math.sign(target.y - origin.y) || 1;
		return {
			point: {
				x: origin.x + (dx * length) / 2,
				y: origin.y + (dy * length) / 2,
			},
			dir: { x: 0, y: 0 },
		};
	}
	const aim = Math.atan2(target.y - origin.y, target.x - origin.x);
	const dir = { x: Math.cos(aim), y: Math.sin(aim) };
	return {
		point: { x: origin.x + dir.x * length, y: origin.y + dir.y * length },
		dir,
	};
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
