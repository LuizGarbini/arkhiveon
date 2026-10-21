import { type Container, type Graphics, Text, TextStyle } from "pixi.js";
import { type Point, rulerTickPoints } from "./grid-math";
import { templatePolygon, type VTTSpellTemplate } from "./template-math";
import type { VTTDiagonalRule, VTTGridScaleUnit } from "./types";

export function parseHexColor(color: string, fallback = 0xa855f7): number {
	const parsed = Number.parseInt(color.replace("#", "0x"), 16);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function fillPolygon(
	layer: Graphics,
	points: Point[],
	color: number,
	fillAlpha: number,
	strokeWidth: number,
) {
	if (points.length < 2) return;
	layer.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length; i++) {
		layer.lineTo(points[i].x, points[i].y);
	}
	layer.closePath();
	layer.fill({ color, alpha: fillAlpha });
	layer.stroke({ width: strokeWidth, color, alpha: 0.92 });
}

export function drawSpellTemplate(
	layer: Graphics,
	template: VTTSpellTemplate,
	gridSize: number,
) {
	const polygon = templatePolygon(
		template.kind,
		{ x: template.originX, y: template.originY },
		{ x: template.targetX, y: template.targetY },
		gridSize,
	);
	fillPolygon(layer, polygon, parseHexColor(template.color), 0.22, 2);
	layer.circle(template.originX, template.originY, 5);
	layer.fill({ color: parseHexColor(template.color), alpha: 0.95 });
}

export function drawRulerMeasurement(
	layer: Graphics,
	labels: Container,
	start: Point,
	end: Point,
	gridSize: number,
	scaleDistance: number,
	unit: VTTGridScaleUnit,
	color: string,
	diagonalRule: VTTDiagonalRule = "euclidean",
	caption?: string,
) {
	const colorHex = parseHexColor(color, 0x38bdf8);
	const ticks = rulerTickPoints(
		start,
		end,
		gridSize,
		scaleDistance,
		unit,
		diagonalRule,
	);

	layer.moveTo(start.x, start.y);
	layer.lineTo(end.x, end.y);
	layer.stroke({ width: 3, color: colorHex, alpha: 0.9 });

	layer.circle(start.x, start.y, 6);
	layer.fill({ color: colorHex });
	layer.circle(end.x, end.y, 6);
	layer.fill({ color: colorHex });

	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const length = Math.hypot(dx, dy) || 1;
	const nx = (-dy / length) * 8;
	const ny = (dx / length) * 8;

	for (const tick of ticks) {
		layer.moveTo(tick.x - nx, tick.y - ny);
		layer.lineTo(tick.x + nx, tick.y + ny);
		layer.stroke({ width: 2, color: colorHex, alpha: 0.85 });
	}

	const labelStyle = new TextStyle({
		fontFamily: "system-ui, sans-serif",
		fontSize: 11,
		fontWeight: "bold",
		fill: color,
		dropShadow: {
			alpha: 0.9,
			angle: Math.PI / 4,
			blur: 3,
			color: "#000000",
			distance: 1.5,
		},
	});

	const showEvery = ticks.length > 10 ? 2 : 1;
	for (const tick of ticks) {
		if (tick.cells % showEvery !== 0) continue;
		const label = new Text({
			text: `${tick.distance}${unit}`,
			style: labelStyle,
		});
		label.anchor.set(0.5);
		label.position.set(tick.x + nx * 2.2, tick.y + ny * 2.2);
		labels.addChild(label);
	}

	if (caption) {
		const captionText = new Text({ text: caption, style: labelStyle });
		captionText.anchor.set(0.5);
		captionText.position.set((start.x + end.x) / 2, (start.y + end.y) / 2 - 16);
		labels.addChild(captionText);
	}
}

/** Cor padrão das paredes: a mesma do anel de token. */
const WALL_COLOR = 0xd4d4d8;
/** Prévia do desenho (mesma cor da seleção de token), diferente da seleção. */
const WALL_PREVIEW_COLOR = 0x38bdf8;

const dsColorCache = new Map<string, number>();

/**
 * Cor de uma variável do DS (ex.: `--primary`, em oklch) como número para o
 * Pixi: o navegador converte pintando 1 pixel num canvas 2D. Sem canvas (jsdom)
 * ou sem a variável, usa `fallback`. Cache pelo valor da variável (tema).
 */
export function dsColor(cssVar: string, fallback: number): number {
	if (typeof document === "undefined") return fallback;
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(cssVar)
		.trim();
	if (!value) return fallback;
	const cached = dsColorCache.get(value);
	if (cached !== undefined) return cached;
	let color = fallback;
	try {
		const ctx = document.createElement("canvas").getContext("2d");
		if (ctx) {
			ctx.fillStyle = value;
			ctx.fillRect(0, 0, 1, 1);
			const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
			color = (r << 16) | (g << 8) | b;
		}
	} catch {
		color = fallback;
	}
	dsColorCache.set(value, color);
	return color;
}

/** Vértices (sem repetir) das paredes selecionadas, para os handles. */
export function selectedWallVertices(
	walls: readonly {
		id: string;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}[],
	selectedIds: readonly string[],
): Point[] {
	const selected = new Set(selectedIds);
	const seen = new Set<string>();
	const out: Point[] = [];
	for (const w of walls) {
		if (!selected.has(w.id)) continue;
		for (const p of [
			{ x: w.x1, y: w.y1 },
			{ x: w.x2, y: w.y2 },
		]) {
			const k = `${p.x},${p.y}`;
			if (seen.has(k)) continue;
			seen.add(k);
			out.push(p);
		}
	}
	return out;
}

/** Lado do handle quadrado do vértice, em unidades do mapa. */
export const WALL_HANDLE_SIZE = 10;

/**
 * Todas as paredes num único Graphics: um caminho para as normais e outro para
 * as selecionadas, mais os handles quadrados nos vértices das selecionadas
 * (estilo path do Figma: miolo `--background`, borda `--primary`).
 * Espessura em unidades do mapa (acompanha o zoom, como a grade), para o zoom
 * não exigir redesenho.
 */
export function drawWalls(
	layer: Graphics,
	walls: readonly {
		id: string;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}[],
	selectedIds: readonly string[],
) {
	layer.clear();
	if (walls.length === 0) return;
	const selected = new Set(selectedIds);
	let normal = 0;
	for (const w of walls) {
		if (selected.has(w.id)) continue;
		layer.moveTo(w.x1, w.y1);
		layer.lineTo(w.x2, w.y2);
		normal++;
	}
	if (normal > 0)
		layer.stroke({ width: 4, color: WALL_COLOR, alpha: 0.95, cap: "round" });
	if (selected.size === 0) return;
	const primary = dsColor("--primary", 0xa855f7);
	const background = dsColor("--background", 0x18181b);
	for (const w of walls) {
		if (!selected.has(w.id)) continue;
		layer.moveTo(w.x1, w.y1);
		layer.lineTo(w.x2, w.y2);
	}
	layer.stroke({ width: 5, color: primary, cap: "round" });
	const h = WALL_HANDLE_SIZE;
	for (const p of selectedWallVertices(walls, selectedIds))
		layer.rect(p.x - h / 2, p.y - h / 2, h, h);
	layer.fill({ color: background });
	layer.stroke({ width: 2, color: primary });
}

/** Polilinha em desenho + segmento até o cursor (mais leve) e os pontos. */
export function drawWallPreview(
	layer: Graphics,
	points: readonly Point[],
	cursor: Point | null,
) {
	layer.clear();
	if (points.length === 0) return;
	layer.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length; i++)
		layer.lineTo(points[i].x, points[i].y);
	if (points.length > 1)
		layer.stroke({ width: 4, color: WALL_PREVIEW_COLOR, cap: "round" });
	const last = points[points.length - 1];
	if (cursor) {
		layer.moveTo(last.x, last.y);
		layer.lineTo(cursor.x, cursor.y);
		layer.stroke({
			width: 3,
			color: WALL_PREVIEW_COLOR,
			alpha: 0.55,
			cap: "round",
		});
	}
	for (const p of points) layer.circle(p.x, p.y, 5);
	if (cursor) layer.circle(cursor.x, cursor.y, 5);
	layer.fill({ color: WALL_PREVIEW_COLOR });
}
