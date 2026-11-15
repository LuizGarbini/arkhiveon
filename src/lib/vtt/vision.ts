import { convertDistance, speedUnitOf } from "@/core/rules/units";
import { hasLineOfSight } from "./line-of-sight";
import type { VTTToken } from "./types";

/**
 * Visão dos jogadores na névoa de exploração.
 *
 * Quem enxerga é o token de jogador (com ficha ou com quem o controle) que está
 * visível na cena. O alcance está em casas; aqui já sai em pixels da cena.
 */
export const DEFAULT_VISION_CELLS = 6;

export interface VisionSource {
	id: string;
	x: number;
	y: number;
	/** Alcance em pixels da cena. */
	range: number;
}

type VisionToken = Pick<
	VTTToken,
	| "id"
	| "layer"
	| "isHidden"
	| "characterId"
	| "controlledBy"
	| "x"
	| "y"
	| "visionRange"
>;

/** O token de jogador "enxerga" (ficha ligada ou controlado por alguém)? */
export function isVisionToken(token: VisionToken): boolean {
	return (
		token.layer === "token" &&
		!token.isHidden &&
		Boolean(token.characterId || (token.controlledBy?.length ?? 0) > 0)
	);
}

/**
 * `rangeCells` deixa a ficha mandar: se devolver um alcance (em casas) para o
 * token, vale ele; senão vale o do token, e por fim o padrão.
 */
export function visionSources(
	tokens: readonly VisionToken[],
	gridSize: number,
	rangeCells?: (token: VisionToken) => number | undefined,
): VisionSource[] {
	const cell = gridSize > 0 ? gridSize : 70;
	const out: VisionSource[] = [];
	for (const token of tokens) {
		if (!isVisionToken(token)) continue;
		const fromSheet = rangeCells?.(token);
		const cells =
			fromSheet && fromSheet > 0
				? fromSheet
				: token.visionRange || DEFAULT_VISION_CELLS;
		out.push({ id: token.id, x: token.x, y: token.y, range: cells * cell });
	}
	return out;
}

/**
 * Alcance de visão da ficha, em casas da grade. A ficha guarda o número na
 * unidade do deslocamento (m ou pés, mesma conversão do D&D: 1 casa = 1,5 m =
 * 5 pés). `undefined` quando a ficha não define a visão (vale o do token).
 */
export function characterVisionCells(
	character: { visionDistance?: unknown; speedUnit?: unknown },
	systemUnit: string,
): number | undefined {
	const distance = character.visionDistance;
	if (typeof distance !== "number" || !(distance > 0)) return undefined;
	const cells = convertDistance(
		distance,
		speedUnitOf(character, systemUnit),
		"sq",
	);
	return cells !== null && cells > 0 ? cells : undefined;
}

/** Luz da cena: na escura só vale a visão no escuro. */
export type LightLevel = "bright" | "dark";

/** Valor vindo do banco (ou de um rascunho) → luz válida; o resto é cena clara. */
export function toLightLevel(value: unknown): LightLevel {
	return value === "dark" ? "dark" : "bright";
}

/**
 * No escuro, quem não tem visão no escuro só distingue o que está colado nele
 * (1 casa). Sem isso o personagem ficaria cego e sem como se orientar.
 */
export const NO_DARKVISION_CELLS = 1;

/** Visão no escuro da ficha, em casas (mesma conversão da visão normal). */
export function characterDarkvisionCells(
	character: { darkvisionDistance?: unknown; speedUnit?: unknown },
	systemUnit: string,
): number | undefined {
	return characterVisionCells(
		{
			visionDistance: character.darkvisionDistance,
			speedUnit: character.speedUnit,
		},
		systemUnit,
	);
}

/**
 * Quanto a ficha enxerga, em casas, na luz da cena.
 *  - Cena clara: o maior entre a visão normal e a visão no escuro (quem tem
 *    visão no escuro não enxerga menos na luz).
 *  - Cena escura: a visão no escuro; sem ela, só a casa ao lado.
 * `undefined` na cena clara quando a ficha não define nada (vale o do token).
 */
export function sheetVisionCells(
	character: {
		visionDistance?: unknown;
		darkvisionDistance?: unknown;
		speedUnit?: unknown;
	},
	systemUnit: string,
	light: LightLevel,
): number | undefined {
	const normal = characterVisionCells(character, systemUnit);
	const dark = characterDarkvisionCells(character, systemUnit);
	if (light === "dark") return dark ?? NO_DARKVISION_CELLS;
	if (normal === undefined && dark === undefined) return undefined;
	return Math.max(normal ?? 0, dark ?? 0);
}

/**
 * Alcance (em casas) de um token na luz da cena, vindo da ficha quando há.
 * Token sem ficha, no escuro, também só vê a casa ao lado.
 */
export function resolveTokenVisionCells(
	token: { characterId?: string | null },
	sheetCells: ReadonlyMap<string, number>,
	light: LightLevel,
): number | undefined {
	const fromSheet = token.characterId
		? sheetCells.get(token.characterId)
		: undefined;
	if (fromSheet !== undefined) return fromSheet;
	return light === "dark" ? NO_DARKVISION_CELLS : undefined;
}

/**
 * Alguém que enxerga vê este ponto? Precisa estar no alcance E sem parede no
 * meio. É a regra única para esconder monstros fora da visão.
 */
export function isSeenByAny(
	target: VisionPoint,
	sources: readonly VisionSource[],
	walls: readonly VisionSegment[],
): boolean {
	return sources.some(
		(source) =>
			Math.hypot(source.x - target.x, source.y - target.y) <= source.range &&
			hasLineOfSight({ x: source.x, y: source.y }, target, walls),
	);
}

/**
 * Assinatura das fontes de visão. Só muda quando alguém que enxerga se mexe,
 * entra, sai ou muda o alcance: mover um monstro ou girar um token qualquer
 * não pode refazer a névoa.
 */
export function visionKey(sources: readonly VisionSource[]): string {
	return sources
		.map((s) => `${s.id}:${Math.round(s.x)}:${Math.round(s.y)}:${s.range}`)
		.join("|");
}

/* ------------------------------------------------------------------ */
/* Polígono de visibilidade: o que um token enxerga, com as paredes.   */
/* ------------------------------------------------------------------ */

export interface VisionPoint {
	x: number;
	y: number;
}

export interface VisionSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/** Raios do "círculo" quando nada bloqueia: mais raios, borda mais redonda. */
const CIRCLE_RAYS = 96;
/** Abertura em volta de cada ponta de parede, para o raio passar rente ao canto. */
const CORNER_EPS = 1e-4;

/** Onde o raio (origem + t·dir) cruza o segmento? `null` se não cruza. */
function rayHit(
	ox: number,
	oy: number,
	dx: number,
	dy: number,
	w: VisionSegment,
): number | null {
	const sx = w.x2 - w.x1;
	const sy = w.y2 - w.y1;
	const denom = dx * sy - dy * sx;
	if (Math.abs(denom) < 1e-12) return null; // paralelo
	const qx = w.x1 - ox;
	const qy = w.y1 - oy;
	const t = (qx * sy - qy * sx) / denom;
	const u = (qx * dy - qy * dx) / denom;
	if (t <= 1e-6 || u < 0 || u > 1) return null;
	return t;
}

/**
 * O que o token enxerga: um polígono em volta de `origin`, de raio `radius`,
 * recortado pelas paredes (que bloqueiam o raio). Varredura angular: um raio por
 * ponta de parede (um pouco antes e um pouco depois, para o canto sair certo)
 * mais raios fixos em volta para a borda ficar redonda. Os pontos saem em
 * ordem de ângulo, prontos para preencher.
 */
export function visibilityPolygon(
	origin: VisionPoint,
	radius: number,
	walls: readonly VisionSegment[],
	rays: number = CIRCLE_RAYS,
): VisionPoint[] {
	if (!(radius > 0)) return [];
	const { x: ox, y: oy } = origin;
	// Só paredes cuja caixa encosta no quadrado de visão importam.
	const near = walls.filter((w) => {
		if (w.x1 === w.x2 && w.y1 === w.y2) return false;
		return !(
			Math.max(w.x1, w.x2) < ox - radius ||
			Math.min(w.x1, w.x2) > ox + radius ||
			Math.max(w.y1, w.y2) < oy - radius ||
			Math.min(w.y1, w.y2) > oy + radius
		);
	});

	const angles: number[] = [];
	const steps = Math.max(8, Math.floor(rays));
	for (let i = 0; i < steps; i++) angles.push((i / steps) * Math.PI * 2);
	for (const w of near) {
		for (const [px, py] of [
			[w.x1, w.y1],
			[w.x2, w.y2],
		] as const) {
			if (Math.hypot(px - ox, py - oy) > radius * 1.0001) continue;
			const a = Math.atan2(py - oy, px - ox);
			angles.push(a - CORNER_EPS, a, a + CORNER_EPS);
		}
	}
	const TAU = Math.PI * 2;
	const sorted = angles
		.map((a) => ((a % TAU) + TAU) % TAU)
		.sort((a, b) => a - b);

	const points: VisionPoint[] = [];
	let last = Number.NaN;
	for (const a of sorted) {
		if (a === last) continue;
		last = a;
		const dx = Math.cos(a);
		const dy = Math.sin(a);
		let dist = radius;
		for (const w of near) {
			const t = rayHit(ox, oy, dx, dy, w);
			if (t !== null && t < dist) dist = t;
		}
		points.push({ x: ox + dx * dist, y: oy + dy * dist });
	}
	return points;
}

/** O ponto está dentro do polígono? (par-ímpar) */
export function pointInPolygon(
	point: VisionPoint,
	polygon: readonly VisionPoint[],
): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i] as VisionPoint;
		const b = polygon[j] as VisionPoint;
		if (
			a.y > point.y !== b.y > point.y &&
			point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
		)
			inside = !inside;
	}
	return inside;
}

/** Pontos do polígono em lista plana [x0, y0, x1, y1, ...] (formato do Pixi). */
export function flattenPolygon(points: readonly VisionPoint[]): number[] {
	const flat: number[] = [];
	for (const point of points) flat.push(point.x, point.y);
	return flat;
}
