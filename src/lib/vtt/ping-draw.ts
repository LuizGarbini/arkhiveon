import type { Graphics } from "pixi.js";
import { DEFAULT_PING_KIND, pingTtl } from "./ping-kinds";
import { type ActivePing, pingVisual } from "./ping-queue";

/**
 * Desenho de cada tipo de ping no mapa. O ping comum é o anel que cresce; os
 * outros ganham um símbolo (perigo, a caminho, ajuda), o ping do mestre é um
 * conjunto de anéis grandes e o destaque põe setas em volta de um personagem.
 */

/** Onde e de que tamanho está o token, ou null se não deve aparecer. */
export interface PingTokenGeometry {
	x: number;
	y: number;
	radius: number;
}

export interface PingPaintContext {
	/** Posição atual do token na tela; null se ele não está visível para você. */
	resolveToken: (tokenId: string) => PingTokenGeometry | null;
	/** Converte a cor do remetente (texto) em número do desenho. */
	resolveColor: (hex: string) => number;
}

/** Cores fixas dos tipos com significado (o resto usa a cor de quem pingou). */
export const PING_COLORS = {
	danger: 0xef4444,
	going: 0x22c55e,
	help: 0xf59e0b,
	focus: 0xfacc15,
} as const;

export type PingLayer = Pick<
	Graphics,
	"circle" | "stroke" | "fill" | "poly" | "moveTo" | "lineTo"
>;

/** Cheio até os últimos 30% da vida do ping, depois some. */
function glyphAlpha(progress: number): number {
	return Math.max(0, Math.min(1, (1 - progress) / 0.3));
}

function ring(
	layer: PingLayer,
	x: number,
	y: number,
	radius: number,
	color: number,
	alpha: number,
	width = 3,
) {
	if (alpha <= 0) return;
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
	if (alpha <= 0) return;
	layer.circle(x, y, radius);
	layer.fill({ color, alpha });
}

export function drawPing(
	layer: PingLayer,
	ping: ActivePing,
	now: number,
	context: PingPaintContext,
) {
	const kind = ping.kind ?? DEFAULT_PING_KIND;
	const ttl = pingTtl(kind);
	const frame = pingVisual(ping.timestamp, now, ttl);
	if (!frame.alive) return;
	const elapsed = Math.max(0, now - ping.timestamp);
	const progress = Math.min(1, elapsed / ttl);
	const glyph = glyphAlpha(progress);
	const { x, y } = ping;
	const userColor = context.resolveColor(ping.color);

	if (kind === "highlight") {
		const target = ping.tokenId ? context.resolveToken(ping.tokenId) : null;
		if (!target) return; // token que você não vê não ganha setas (não revela onde está)
		const color = userColor;
		ring(layer, target.x, target.y, target.radius + 4, color, 0.6 * glyph, 2);
		const pulse = 5 + 5 * Math.sin(elapsed / 140);
		for (const degrees of [0, 90, 180, 270]) {
			const a = (degrees * Math.PI) / 180;
			const ux = Math.sin(a);
			const uy = -Math.cos(a);
			const tip = target.radius + 6 + pulse;
			const base = tip + 15;
			const px = -uy;
			const py = ux;
			layer.poly([
				target.x + ux * tip,
				target.y + uy * tip,
				target.x + ux * base + px * 9,
				target.y + uy * base + py * 9,
				target.x + ux * base - px * 9,
				target.y + uy * base - py * 9,
			]);
			layer.fill({ color, alpha: glyph });
		}
		return;
	}

	if (kind === "danger") {
		const color = PING_COLORS.danger;
		ring(layer, x, y, frame.radius, color, frame.alpha);
		const s = 16 * (1 + 0.06 * Math.sin(elapsed / 120));
		layer.poly([x, y - s, x + s * 0.9, y + s * 0.7, x - s * 0.9, y + s * 0.7]);
		layer.stroke({ width: 3, color, alpha: glyph });
		layer.moveTo(x, y - s * 0.35);
		layer.lineTo(x, y + s * 0.15);
		layer.stroke({ width: 3, color, alpha: glyph });
		dot(layer, x, y + s * 0.45, 2, color, glyph);
		return;
	}

	if (kind === "going") {
		const color = PING_COLORS.going;
		ring(layer, x, y, frame.radius, color, frame.alpha);
		const bob = 6 * Math.sin(elapsed / 160);
		layer.poly([x, y - 4 + bob, x - 10, y - 18 + bob, x + 10, y - 18 + bob]);
		layer.fill({ color, alpha: glyph });
		layer.poly([
			x - 3,
			y - 18 + bob,
			x + 3,
			y - 18 + bob,
			x + 3,
			y - 34 + bob,
			x - 3,
			y - 34 + bob,
		]);
		layer.fill({ color, alpha: glyph });
		dot(layer, x, y, 4, color, glyph);
		return;
	}

	if (kind === "help") {
		const color = PING_COLORS.help;
		ring(layer, x, y, frame.radius, color, frame.alpha);
		const second = (progress + 0.5) % 1;
		ring(layer, x, y, 20 + second * 60, color, (1 - second) * glyph);
		layer.moveTo(x - 9, y);
		layer.lineTo(x + 9, y);
		layer.stroke({ width: 4, color, alpha: glyph });
		layer.moveTo(x, y - 9);
		layer.lineTo(x, y + 9);
		layer.stroke({ width: 4, color, alpha: glyph });
		return;
	}

	if (kind === "focus") {
		const color = PING_COLORS.focus;
		for (let k = 0; k < 3; k++) {
			const phase = (progress * 2.2 + k / 3) % 1;
			ring(layer, x, y, 20 + phase * 110, color, (1 - phase) * 0.9 * glyph, 4);
		}
		dot(layer, x, y, 8, color, glyph);
		ring(layer, x, y, 12, color, glyph, 2);
		return;
	}

	// Ping comum (e tipo desconhecido): o anel que cresce e some.
	ring(layer, x, y, frame.radius, userColor, frame.alpha);
	dot(layer, x, y, 6, userColor, frame.alpha);
}
