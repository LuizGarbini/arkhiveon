import { __iconNode as arrowDownToLine } from "lucide-react/dist/esm/icons/arrow-down-to-line.js";
import { __iconNode as biohazard } from "lucide-react/dist/esm/icons/biohazard.js";
import { __iconNode as brain } from "lucide-react/dist/esm/icons/brain.js";
import { __iconNode as circleDot } from "lucide-react/dist/esm/icons/circle-dot.js";
import { __iconNode as eyeOff } from "lucide-react/dist/esm/icons/eye-off.js";
import { __iconNode as flame } from "lucide-react/dist/esm/icons/flame.js";
import { __iconNode as ghost } from "lucide-react/dist/esm/icons/ghost.js";
import { __iconNode as zap } from "lucide-react/dist/esm/icons/zap.js";
import { Graphics, type Renderer, type Texture } from "pixi.js";
import { STATUS_CHIP, type VTTStatusIconName } from "./conditions";

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

/** Ao destruir o app, as texturas daquele renderer saem do cache. */
export function clearStatusIconTextures(): void {
	for (const a of cache.values()) a.texture.destroy(true);
	cache.clear();
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
