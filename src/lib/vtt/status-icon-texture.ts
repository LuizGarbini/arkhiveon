import { __iconNode as arrowDownToLine } from "lucide-react/dist/esm/icons/arrow-down-to-line.js";
import { __iconNode as biohazard } from "lucide-react/dist/esm/icons/biohazard.js";
import { __iconNode as brain } from "lucide-react/dist/esm/icons/brain.js";
import { __iconNode as circleDot } from "lucide-react/dist/esm/icons/circle-dot.js";
import { __iconNode as eyeOff } from "lucide-react/dist/esm/icons/eye-off.js";
import { __iconNode as flame } from "lucide-react/dist/esm/icons/flame.js";
import { __iconNode as ghost } from "lucide-react/dist/esm/icons/ghost.js";
import { __iconNode as zap } from "lucide-react/dist/esm/icons/zap.js";
import { Graphics, type Renderer, Texture } from "pixi.js";
import {
	STATUS_CHIP,
	STATUS_RING_INNER_FACTOR,
	STATUS_RING_OUTER_FACTOR,
	type VTTConditionDef,
	type VTTStatusIconName,
} from "./conditions";

type IconNode = ReadonlyArray<
	readonly [string, Readonly<Record<string, string>>]
>;

/** Mesmos desenhos do lucide-react 0.545 (fonte única, sem copiar paths). */
const ICON_NODES: Record<VTTStatusIconName, IconNode> = {
	biohazard,
	"arrow-down-to-line": arrowDownToLine,
	"eye-off": eyeOff,
	zap,
	ghost,
	flame,
	brain,
	"circle-dot": circleDot,
};

const escapeAttr = (v: string) =>
	v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * SVG do ícone em branco (o canvas pinta com `tint` = --foreground), traço
 * 1.5 no viewBox 24 escalado para `px`.
 */
export function statusIconSvg(name: VTTStatusIconName, px: number): string {
	const body = ICON_NODES[name]
		.map(([tag, attrs]) => {
			const a = Object.entries(attrs)
				.filter(([k]) => k !== "key")
				.map(([k, v]) => `${k}="${escapeAttr(v)}"`)
				.join(" ");
			return `<${tag} ${a}/>`;
		})
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="${STATUS_CHIP.stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/** Nitidez extra para zoom (textura gerada uma vez, não por frame). */
const TEXTURE_RESOLUTION = 4;

/** Textura do ícone + onde ela fica dentro do viewBox 24 do lucide. */
export interface StatusIconArt {
	texture: Texture;
	/** Caixa do desenho (com o traço) em unidades do viewBox 24. */
	x: number;
	y: number;
	width: number;
	height: number;
}

const cache = new Map<string, StatusIconArt>();

/**
 * Textura do ícone, gerada uma única vez por (renderer, ícone) e reutilizada
 * por todos os tokens em todos os redesenhos. A textura é justa ao desenho;
 * `placeStatusIcon` devolve o lugar dela num ícone de `px` centrado.
 */
export function statusIconTexture(
	renderer: Renderer,
	name: VTTStatusIconName,
): StatusIconArt {
	const key = `${renderer.uid}:${name}`;
	const hit = cache.get(key);
	if (hit && !hit.texture.destroyed) return hit;
	const g = new Graphics().svg(statusIconSvg(name, 24));
	const b = g.getLocalBounds();
	const texture = renderer.generateTexture({
		target: g,
		resolution: TEXTURE_RESOLUTION,
		antialias: true,
	});
	g.destroy();
	const art = { texture, x: b.x, y: b.y, width: b.width, height: b.height };
	cache.set(key, art);
	return art;
}

/** Retângulo do sprite para um ícone de `px` centrado em (cx, cy). */
export function placeStatusIcon(
	art: Pick<StatusIconArt, "x" | "y" | "width" | "height">,
	px: number,
	cx: number,
	cy: number,
): { x: number; y: number; width: number; height: number } {
	const s = px / 24;
	return {
		x: cx + (art.x - 12) * s,
		y: cy + (art.y - 12) * s,
		width: art.width * s,
		height: art.height * s,
	};
}

/** Quantas texturas já foram geradas (para teste de cache). */
export function statusIconTextureCount(): number {
	return cache.size;
}

const RING_CANVAS_SIZE = 512;
const RING_CENTER = RING_CANVAS_SIZE / 2;
const RING_INNER_PX = 186;
const RING_OUTER_PX = Math.round(
	RING_INNER_PX * (STATUS_RING_OUTER_FACTOR / STATUS_RING_INNER_FACTOR),
);
const RING_MID_PX = (RING_INNER_PX + RING_OUTER_PX) / 2;

/**
 * Fator do raio total do Sprite do anel em relação ao `tokenRadius`, mapeando
 * `RING_INNER_PX` exatamente para `tokenRadius * STATUS_RING_INNER_FACTOR`.
 */
export const STATUS_RING_SPRITE_FACTOR =
	STATUS_RING_INNER_FACTOR * (RING_CENTER / RING_INNER_PX);

const ringCache = new Map<string, Texture>();

function hexToRgb(hex: number): { r: number; g: number; b: number } {
	return {
		r: (hex >> 16) & 255,
		g: (hex >> 8) & 255,
		b: hex & 255,
	};
}

function drawCurvedConditionText(
	ctx: CanvasRenderingContext2D,
	rawLabel: string,
	cx: number,
	cy: number,
	radius: number,
	midAngle: number,
	maxArcAngle: number,
	hex: number,
) {
	const label = rawLabel.toUpperCase();
	const chars = Array.from(label);
	if (chars.length === 0) return;

	let fontSize = 21;
	let tracking = 2;
	ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;

	const rawWidth =
		chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
		Math.max(0, chars.length - 1) * tracking;
	const maxWidth = maxArcAngle * radius;
	if (rawWidth > maxWidth && rawWidth > 0) {
		const ratio = maxWidth / rawWidth;
		fontSize = Math.max(12, Math.floor(fontSize * ratio));
		tracking = Math.max(0.6, tracking * ratio);
		ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
	}

	const advances = chars.map((ch) => ctx.measureText(ch).width + tracking);
	const totalWidth = advances.reduce((a, b) => a + b, 0) - tracking;
	const totalAngle = totalWidth / radius;

	const { r, g, b } = hexToRgb(hex);
	const tintR = Math.round(255 * 0.62 + r * 0.38);
	const tintG = Math.round(255 * 0.62 + g * 0.38);
	const tintB = Math.round(255 * 0.62 + b * 0.38);

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.lineJoin = "round";
	ctx.lineWidth = Math.max(3.2, fontSize * 0.22);
	ctx.strokeStyle = "rgba(6, 8, 14, 0.96)";
	ctx.fillStyle = `rgb(${tintR}, ${tintG}, ${tintB})`;

	const isBottom = Math.sin(midAngle) > 0.25;
	if (isBottom) {
		let angle = midAngle + totalAngle / 2;
		for (let i = 0; i < chars.length; i++) {
			const charWidth = advances[i] - tracking;
			const charAngle = angle - charWidth / (2 * radius);
			ctx.save();
			ctx.translate(
				cx + Math.cos(charAngle) * radius,
				cy + Math.sin(charAngle) * radius,
			);
			ctx.rotate(charAngle - Math.PI / 2);
			ctx.strokeText(chars[i], 0, 0);
			ctx.fillText(chars[i], 0, 0);
			ctx.restore();
			angle -= advances[i] / radius;
		}
	} else {
		let angle = midAngle - totalAngle / 2;
		for (let i = 0; i < chars.length; i++) {
			const charWidth = advances[i] - tracking;
			const charAngle = angle + charWidth / (2 * radius);
			ctx.save();
			ctx.translate(
				cx + Math.cos(charAngle) * radius,
				cy + Math.sin(charAngle) * radius,
			);
			ctx.rotate(charAngle + Math.PI / 2);
			ctx.strokeText(chars[i], 0, 0);
			ctx.fillText(chars[i], 0, 0);
			ctx.restore();
			angle += advances[i] / radius;
		}
	}
}

/**
 * Gera (e cacheia) a textura de alta definição do disco/anel de condições ao
 * redor do token, com visual acrílico translúcido e os nomes dos efeitos
 * curvados ao longo do anel (sem cobrir o retrato interno do token).
 */
export function statusRingTexture(
	conditions: readonly VTTConditionDef[],
): Texture {
	const key = conditions.map((c) => `${c.id}:${c.hex}:${c.label}`).join("|");
	const hit = ringCache.get(key);
	if (hit && !hit.destroyed) return hit;

	const canvas = document.createElement("canvas");
	canvas.width = RING_CANVAS_SIZE;
	canvas.height = RING_CANVAS_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx || conditions.length === 0) {
		return Texture.EMPTY;
	}

	const cx = RING_CENTER;
	const cy = RING_CENTER;

	if (conditions.length === 1) {
		const cond = conditions[0];
		const { r, g, b } = hexToRgb(cond.hex);

		ctx.beginPath();
		ctx.arc(cx, cy, RING_OUTER_PX, 0, Math.PI * 2, false);
		ctx.arc(cx, cy, RING_INNER_PX, Math.PI * 2, 0, true);
		ctx.closePath();

		ctx.fillStyle = "rgba(9, 11, 17, 0.82)";
		ctx.fill();

		const grad = ctx.createRadialGradient(
			cx,
			cy,
			RING_INNER_PX,
			cx,
			cy,
			RING_OUTER_PX,
		);
		grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.52)`);
		grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.28)`);
		grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.52)`);
		ctx.fillStyle = grad;
		ctx.fill();

		ctx.lineWidth = 4.5;
		ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.96)`;
		ctx.beginPath();
		ctx.arc(cx, cy, RING_OUTER_PX, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cx, cy, RING_INNER_PX, 0, Math.PI * 2);
		ctx.stroke();

		const labelAngles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
		for (const midAngle of labelAngles) {
			drawCurvedConditionText(
				ctx,
				cond.label,
				cx,
				cy,
				RING_MID_PX,
				midAngle,
				Math.PI * 0.52,
				cond.hex,
			);
		}

		const dotAngles = [-Math.PI / 6, Math.PI / 2, -(5 * Math.PI) / 6];
		for (const dotAngle of dotAngles) {
			const dx = cx + Math.cos(dotAngle) * RING_MID_PX;
			const dy = cy + Math.sin(dotAngle) * RING_MID_PX;
			ctx.beginPath();
			ctx.arc(dx, dy, 5, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
			ctx.fill();
		}
	} else {
		const count = conditions.length;
		const step = (Math.PI * 2) / count;
		const gap = count === 2 ? 0.08 : count <= 4 ? 0.07 : 0.06;
		const startCenter = count === 4 ? -Math.PI / 4 : -Math.PI / 2;

		for (let i = 0; i < count; i++) {
			const cond = conditions[i];
			const { r, g, b } = hexToRgb(cond.hex);
			const midAngle = startCenter + i * step;
			const a0 = midAngle - (step - gap) / 2;
			const a1 = midAngle + (step - gap) / 2;

			ctx.beginPath();
			ctx.arc(cx, cy, RING_OUTER_PX, a0, a1, false);
			ctx.arc(cx, cy, RING_INNER_PX, a1, a0, true);
			ctx.closePath();

			ctx.fillStyle = "rgba(9, 11, 17, 0.84)";
			ctx.fill();

			const grad = ctx.createRadialGradient(
				cx,
				cy,
				RING_INNER_PX,
				cx,
				cy,
				RING_OUTER_PX,
			);
			grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.52)`);
			grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.28)`);
			grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.52)`);
			ctx.fillStyle = grad;
			ctx.fill();

			ctx.lineJoin = "round";
			ctx.lineWidth = 4.5;
			ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.96)`;
			ctx.stroke();

			drawCurvedConditionText(
				ctx,
				cond.label,
				cx,
				cy,
				RING_MID_PX,
				midAngle,
				(a1 - a0) * 0.84,
				cond.hex,
			);
		}
	}

	const texture = Texture.from(canvas);
	ringCache.set(key, texture);
	return texture;
}

/** Ao destruir o app, as texturas daquele renderer saem do cache. */
export function clearStatusIconTextures(): void {
	for (const a of cache.values()) a.texture.destroy(true);
	cache.clear();
	for (const t of ringCache.values()) t.destroy(true);
	ringCache.clear();
}

const colorCache = new Map<string, number>();

/** Cor de um token do DS (`--foreground`) como número para o Pixi; cacheada.
 * Lida do `body` (o tema escuro vem da classe `.dark` nele). */
export function cssVarColor(name: string, fallback: number): number {
	if (typeof document === "undefined") return fallback;
	// Chave inclui as classes do body: trocar de tema lê a cor de novo.
	const key = `${name}|${document.body?.className ?? ""}`;
	const hit = colorCache.get(key);
	if (hit !== undefined) return hit;
	const raw = getComputedStyle(document.body ?? document.documentElement)
		.getPropertyValue(name)
		.trim();
	const ctx = document.createElement("canvas").getContext("2d");
	if (!raw || !ctx) return fallback;
	ctx.fillStyle = "#010203";
	ctx.fillStyle = raw;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	const value = (r << 16) | (g << 8) | b;
	if (value === 0x010203) return fallback;
	colorCache.set(key, value);
	return value;
}
