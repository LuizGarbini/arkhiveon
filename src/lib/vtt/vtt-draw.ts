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
