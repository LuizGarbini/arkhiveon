import { type LightLevel, pointInPolygon, toLightLevel } from "./vision";

/**
 * Áreas de luz da cena (pura, sem React nem banco). O mestre marca áreas com
 * luz do dia, penumbra ou escuridão; o alcance de visão de quem está dentro
 * muda conforme a luz DAQUELE lugar. Fora de qualquer área vale a luz padrão da
 * cena; se duas áreas se sobrepõem, vale a criada por último.
 */

export type LightZoneShape = "circle" | "rect" | "polygon";

export interface LightPoint {
	x: number;
	y: number;
}

export type LightZoneGeometry =
	| { shape: "circle"; x: number; y: number; radius: number }
	| { shape: "rect"; x: number; y: number; width: number; height: number }
	| { shape: "polygon"; points: LightPoint[] };

export type VTTLightZone = LightZoneGeometry & {
	id: string;
	sceneId: string;
	level: LightLevel;
};

export const LIGHT_LEVEL_LABEL: Record<LightLevel, string> = {
	bright: "Luz do dia",
	dim: "Penumbra",
	dark: "Escuridão",
};

/** O que a ferramenta Luz faz ao clicar: escolher uma área ou desenhar uma forma. */
export type LightToolMode = "select" | LightZoneShape;

export const LIGHT_SHAPE_LABEL: Record<LightToolMode, string> = {
	select: "Selecionar",
	circle: "Círculo",
	rect: "Retângulo",
	polygon: "Polígono",
};

export const MAX_ZONES_PER_SCENE = 200;
export const MIN_POLYGON_POINTS = 3;
export const MAX_POLYGON_POINTS = 64;
/** Menor área que vale criar (px): evita um clique acidental virar uma área. */
export const MIN_ZONE_SIZE = 12;

/** O ponto está dentro da área? (borda conta como dentro) */
export function zoneContains(zone: LightZoneGeometry, p: LightPoint): boolean {
	if (zone.shape === "circle")
		return Math.hypot(p.x - zone.x, p.y - zone.y) <= zone.radius;
	if (zone.shape === "rect")
		return (
			p.x >= zone.x &&
			p.x <= zone.x + zone.width &&
			p.y >= zone.y &&
			p.y <= zone.y + zone.height
		);
	return pointInPolygon(p, zone.points);
}

/**
 * A luz num ponto: a da última área que o contém (a mais nova ganha), senão a
 * luz padrão da cena.
 */
export function lightAt(
	p: LightPoint,
	zones: readonly (LightZoneGeometry & { level: LightLevel })[],
	base: LightLevel,
): LightLevel {
	for (let i = zones.length - 1; i >= 0; i--) {
		const zone = zones[i] as LightZoneGeometry & { level: LightLevel };
		if (zoneContains(zone, p)) return zone.level;
	}
	return base;
}

/** A área mais nova que contém o ponto (para clicar e selecionar), ou null. */
export function zoneAt<T extends LightZoneGeometry>(
	p: LightPoint,
	zones: readonly T[],
): T | null {
	for (let i = zones.length - 1; i >= 0; i--) {
		const zone = zones[i] as T;
		if (zoneContains(zone, p)) return zone;
	}
	return null;
}

const finite = (n: unknown): n is number =>
	typeof n === "number" && Number.isFinite(n);

/** Valida e normaliza uma geometria vinda do banco ou do desenho. */
export function readGeometry(
	shape: unknown,
	raw: unknown,
): LightZoneGeometry | null {
	if (!raw || typeof raw !== "object") return null;
	const g = raw as Record<string, unknown>;
	if (shape === "circle") {
		if (!finite(g.x) || !finite(g.y) || !finite(g.radius) || g.radius <= 0)
			return null;
		return { shape: "circle", x: g.x, y: g.y, radius: g.radius };
	}
	if (shape === "rect") {
		if (
			!finite(g.x) ||
			!finite(g.y) ||
			!finite(g.width) ||
			!finite(g.height) ||
			g.width <= 0 ||
			g.height <= 0
		)
			return null;
		return {
			shape: "rect",
			x: g.x,
			y: g.y,
			width: g.width,
			height: g.height,
		};
	}
	if (shape === "polygon") {
		if (!Array.isArray(g.points)) return null;
		if (
			g.points.length < MIN_POLYGON_POINTS ||
			g.points.length > MAX_POLYGON_POINTS
		)
			return null;
		const points: LightPoint[] = [];
		for (const point of g.points) {
			if (!point || typeof point !== "object") return null;
			const { x, y } = point as Record<string, unknown>;
			if (!finite(x) || !finite(y)) return null;
			points.push({ x, y });
		}
		return { shape: "polygon", points };
	}
	return null;
}

/** Linha do banco → área, ou null se estiver inválida (nunca quebra a mesa). */
export function mapLightZoneRow(row: {
	id: string;
	scene_id: string;
	shape: string;
	level: string;
	geometry: unknown;
}): VTTLightZone | null {
	const geometry = readGeometry(row.shape, row.geometry);
	if (!geometry) return null;
	return {
		...geometry,
		id: row.id,
		sceneId: row.scene_id,
		level: toLightLevel(row.level),
	};
}

/** A parte `geometry` (jsonb) que vai para o banco. */
export function geometryToJson(
	zone: LightZoneGeometry,
): Record<string, unknown> {
	if (zone.shape === "circle")
		return { x: zone.x, y: zone.y, radius: zone.radius };
	if (zone.shape === "rect")
		return { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
	return { points: zone.points.map((p) => ({ x: p.x, y: p.y })) };
}

/**
 * Forma do arrasto (círculo: do centro até a borda; retângulo: de canto a
 * canto). null quando é pequeno demais, para um clique solto não criar área.
 */
export function geometryFromDrag(
	shape: "circle" | "rect",
	start: LightPoint,
	end: LightPoint,
): LightZoneGeometry | null {
	if (shape === "circle") {
		const radius = Math.hypot(end.x - start.x, end.y - start.y);
		return radius >= MIN_ZONE_SIZE / 2
			? { shape: "circle", x: start.x, y: start.y, radius }
			: null;
	}
	const width = Math.abs(end.x - start.x);
	const height = Math.abs(end.y - start.y);
	return width >= MIN_ZONE_SIZE && height >= MIN_ZONE_SIZE
		? {
				shape: "rect",
				x: Math.min(start.x, end.x),
				y: Math.min(start.y, end.y),
				width,
				height,
			}
		: null;
}

/**
 * Polígono do rascunho (pontos clicados): precisa de 3 a 64 pontos e de área,
 * não uma linha reta. Pontos repetidos em seguida são ignorados.
 */
export function geometryFromPolygonDraft(
	draft: readonly LightPoint[],
): LightZoneGeometry | null {
	const points: LightPoint[] = [];
	for (const p of draft) {
		const last = points[points.length - 1];
		if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1) continue;
		points.push({ x: p.x, y: p.y });
	}
	if (points.length < MIN_POLYGON_POINTS || points.length > MAX_POLYGON_POINTS)
		return null;
	let area2 = 0;
	for (let i = 0; i < points.length; i++) {
		const a = points[i] as LightPoint;
		const b = points[(i + 1) % points.length] as LightPoint;
		area2 += a.x * b.y - b.x * a.y;
	}
	return Math.abs(area2) / 2 >= (MIN_ZONE_SIZE * MIN_ZONE_SIZE) / 2
		? { shape: "polygon", points }
		: null;
}
