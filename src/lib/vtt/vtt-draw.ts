import { Container, Graphics, Text } from "pixi.js";
import { type Point, rulerTickPoints, ZERO_ORIGIN } from "./grid-math";
import {
	formatCells,
	formatDistance,
	rulerPathCells,
	rulerPathPoints,
	rulerWaypoints,
} from "./ruler-path";
import {
	templateMeasureText,
	templatePolygon,
	templateReach,
	templateReachPoint,
	type VTTSpellTemplate,
} from "./template-math";
import type { VTTGridType, VTTRulerMeasurement } from "./types";

export function parseHexColor(
	color: string | null | undefined,
	fallback = 0xa855f7,
): number {
	if (typeof color !== "string" || color.length === 0) return fallback;
	const parsed = Number.parseInt(color.replace("#", "0x"), 16);
	return Number.isFinite(parsed) ? parsed : fallback;
}

const LABEL_FONT = ["Inter Variable", "Inter", "system-ui", "sans-serif"];
/** Contorno escuro das linhas: lê sobre mapa claro e escuro. */
const OUTLINE = 0x09090b;

/** Remove e libera os rótulos (Text guarda textura própria). */
export function clearLabels(labels: Container) {
	for (const child of labels.removeChildren())
		child.destroy({ children: true });
}

/**
 * Pílula de medida no mundo, com tamanho fixo na tela: a escala desfaz o zoom
 * (`viewScale`), então o texto não some ao afastar nem cresce ao aproximar.
 */
export interface WorldBounds {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export function addMeasureLabel(
	labels: Container,
	text: string,
	x: number,
	y: number,
	opts: {
		viewScale: number;
		accent: number;
		emphasis?: boolean;
		/** Área visível (mundo): a pílula não passa da borda. */
		bounds?: WorldBounds;
	},
) {
	const pill = new Container();
	pill.eventMode = "none";
	const label = new Text({
		text,
		resolution: Math.max(2, globalThis.devicePixelRatio || 1),
		style: {
			fontFamily: LABEL_FONT,
			fontSize: opts.emphasis ? 14 : 11.5,
			fontWeight: opts.emphasis ? "700" : "600",
			fill: dsColor("--foreground", 0xf4f4f5),
		},
	});
	label.anchor.set(0.5);
	const padX = opts.emphasis ? 10 : 7;
	const padY = opts.emphasis ? 5 : 3;
	const width = label.width + padX * 2;
	const height = label.height + padY * 2;
	const bg = new Graphics();
	bg.roundRect(-width / 2, -height / 2, width, height, height / 2);
	bg.fill({ color: dsColor("--card", 0x1c1a24), alpha: 0.94 });
	bg.stroke({ width: 1.5, color: opts.accent, alpha: 0.95 });
	pill.addChild(bg, label);
	const k = 1 / (opts.viewScale || 1);
	let px = x;
	let py = y;
	const b = opts.bounds;
	if (b) {
		const halfW = (width / 2 + 8) * k;
		const halfH = (height / 2 + 8) * k;
		if (b.x1 - b.x0 > halfW * 2)
			px = Math.min(b.x1 - halfW, Math.max(b.x0 + halfW, px));
		if (b.y1 - b.y0 > halfH * 2)
			py = Math.min(b.y1 - halfH, Math.max(b.y0 + halfH, py));
	}
	pill.position.set(px, py);
	pill.scale.set(k);
	labels.addChild(pill);
}

export interface RulerDrawOptions {
	gridType: VTTGridType;
	gridSize: number;
	origin?: Point;
	viewScale: number;
	color: string | null | undefined;
	/** Prefixo do total (nome de quem mede, na régua de outro jogador). */
	owner?: string;
	/** Área visível: o total junto ao cursor não sai da tela. */
	bounds?: WorldBounds;
}

/**
 * Régua com pontos: casas atravessadas, caminho com contorno, pontos fixados,
 * distância de cada trecho e o total junto à ponta. Espessuras e rótulos
 * acompanham `viewScale` para ficarem iguais em qualquer zoom.
 */
export function drawRulerPath(
	layer: Graphics,
	labels: Container,
	measurement: VTTRulerMeasurement,
	opts: RulerDrawOptions,
) {
	const accent = parseHexColor(opts.color ?? measurement.color, 0x38bdf8);
	const k = 1 / (opts.viewScale || 1);
	const origin = opts.origin ?? ZERO_ORIGIN;
	const path = rulerPathPoints(measurement);
	const fixed = rulerWaypoints(measurement);

	for (const cell of rulerPathCells(
		path,
		opts.gridType,
		opts.gridSize,
		origin,
	)) {
		layer.rect(cell.x, cell.y, opts.gridSize, opts.gridSize);
	}
	layer.fill({ color: accent, alpha: 0.16 });

	if (path.length > 1) {
		layer.moveTo(path[0].x, path[0].y);
		for (let i = 1; i < path.length; i++) layer.lineTo(path[i].x, path[i].y);
		layer.stroke({
			width: 7 * k,
			color: OUTLINE,
			alpha: 0.55,
			cap: "round",
			join: "round",
		});
		layer.moveTo(path[0].x, path[0].y);
		for (let i = 1; i < path.length; i++) layer.lineTo(path[i].x, path[i].y);
		layer.stroke({
			width: 3.5 * k,
			color: accent,
			alpha: 1,
			cap: "round",
			join: "round",
		});
	}

	// Sem casas pintadas (hex ou sem grid), marcas discretas a cada casa.
	if (opts.gridType !== "square") {
		for (let i = 1; i < path.length; i++) {
			const a = path[i - 1];
			const b = path[i];
			const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
			const nx = (-(b.y - a.y) / len) * 5 * k;
			const ny = ((b.x - a.x) / len) * 5 * k;
			for (const tick of rulerTickPoints(a, b, opts.gridSize)) {
				layer.moveTo(tick.x - nx, tick.y - ny);
				layer.lineTo(tick.x + nx, tick.y + ny);
			}
		}
		layer.stroke({ width: 2 * k, color: accent, alpha: 0.85 });
	}

	for (const p of fixed) layer.circle(p.x, p.y, 5.5 * k);
	layer.fill({ color: accent });
	for (const p of fixed) layer.circle(p.x, p.y, 5.5 * k);
	layer.stroke({ width: 2 * k, color: OUTLINE, alpha: 0.8 });
	const end = path[path.length - 1];
	if (!measurement.pinned && path.length > fixed.length) {
		layer.circle(end.x, end.y, 4 * k);
		layer.fill({ color: dsColor("--foreground", 0xf4f4f5) });
		layer.circle(end.x, end.y, 4 * k);
		layer.stroke({ width: 2 * k, color: accent });
	}

	const unit = measurement.unit;
	const segments = measurement.segments ?? [];
	if (segments.length > 1) {
		for (let i = 1; i < path.length && i - 1 < segments.length; i++) {
			const a = path[i - 1];
			const b = path[i];
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			if (len * (opts.viewScale || 1) < 56) continue;
			const nx = (-(b.y - a.y) / len) * 14 * k;
			const ny = ((b.x - a.x) / len) * 14 * k;
			addMeasureLabel(
				labels,
				formatDistance(segments[i - 1], unit),
				(a.x + b.x) / 2 + nx,
				(a.y + b.y) / 2 + ny,
				{ viewScale: opts.viewScale, accent },
			);
		}
	}

	if (path.length > 1) {
		const cells = formatCells(measurement.cells);
		const total = formatDistance(measurement.distance, unit);
		const text = [opts.owner, cells ? `${total} · ${cells}` : total]
			.filter(Boolean)
			.join(" · ");
		addMeasureLabel(labels, text, end.x + 22 * k, end.y - 22 * k, {
			viewScale: opts.viewScale,
			accent,
			emphasis: true,
			bounds: opts.bounds,
		});
	}
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

export interface TemplateDrawOptions {
	viewScale: number;
	scaleDistance: number;
	unit: string;
}

/**
 * Molde com a medida: área preenchida, linha do alcance (raio da esfera,
 * eixo do cone e da linha) e o rótulo "Cone 60° · 9 m" além da ponta.
 */
export function drawSpellTemplate(
	layer: Graphics,
	template: VTTSpellTemplate,
	gridSize: number,
	labels?: Container,
	opts?: TemplateDrawOptions,
) {
	const color = parseHexColor(template.color);
	const origin = { x: template.originX, y: template.originY };
	const target = { x: template.targetX, y: template.targetY };
	const reach = templateReach(template, gridSize);
	const k = 1 / (opts?.viewScale || 1);
	const polygon = templatePolygon(
		template.kind,
		origin,
		target,
		gridSize,
		reach,
	);
	fillPolygon(layer, polygon, color, 0.2, 2 * k);
	const { point, dir } = templateReachPoint(
		template.kind,
		origin,
		target,
		gridSize,
		reach,
	);
	if (template.kind !== "cube") {
		layer.moveTo(origin.x, origin.y);
		layer.lineTo(point.x, point.y);
		layer.stroke({ width: 1.5 * k, color, alpha: 0.75 });
	}
	layer.circle(origin.x, origin.y, 5 * k);
	layer.fill({ color, alpha: 1 });
	layer.circle(origin.x, origin.y, 5 * k);
	layer.stroke({ width: 2 * k, color: OUTLINE, alpha: 0.8 });

	if (!labels || !opts) return;
	addMeasureLabel(
		labels,
		templateMeasureText(template.kind, reach, opts.scaleDistance, opts.unit),
		point.x + dir.x * 26 * k,
		point.y + dir.y * 18 * k,
		{ viewScale: opts.viewScale, accent: color, emphasis: true },
	);
}

/** Cor padrão das paredes: a mesma do anel de token. */
const WALL_COLOR = 0xd4d4d8;
/**
 * Prévia do desenho: token `--chart-1` do DS (violeta claro do tema), diferente
 * do `--primary` da parede selecionada. O número é só o fallback sem DOM.
 */
export const WALL_PREVIEW_TOKEN = "--chart-1";
const WALL_PREVIEW_FALLBACK = 0xc4b5fd;

const dsColorCache = new Map<string, number>();

/**
 * Cor de uma variável do DS (ex.: `--primary`, em oklch) como número para o
 * Pixi: o navegador converte pintando 1 pixel num canvas 2D. Sem canvas (jsdom)
 * ou sem a variável, usa `fallback`. Cache pelo valor da variável (tema).
 */
export function dsColor(cssVar: string, fallback: number): number {
	if (typeof document === "undefined") return fallback;
	// Lida do body: o tema escuro vem da classe `.dark` nele.
	const value = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
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
	const WALL_PREVIEW_COLOR = dsColor(WALL_PREVIEW_TOKEN, WALL_PREVIEW_FALLBACK);
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
