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

/** Abertura do cone de visão, em graus. */
export const CONE_DEGREES = 120;

export interface VisionSource {
	id: string;
	x: number;
	y: number;
	/** Alcance em pixels da cena. */
	range: number;
	/**
	 * Para onde olha, em graus: 0 = para cima (norte), sentido horário (igual ao
	 * `rotation` do token). Sem ele, 0.
	 */
	facing?: number;
	/** Abertura do cone em graus. Sem ele (ou 360), a visão é um círculo inteiro. */
	cone?: number;
	/** Raio (px) em que enxerga em volta de si, para qualquer lado. */
	near?: number;
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
	| "rotation"
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
	/** Onde o token "está" para a visão (ex.: antes do arrasto terminar). */
	positionOf?: (token: VisionToken) => VisionPoint,
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
		const range = cells * cell;
		const at = positionOf?.(token) ?? token;
		out.push({
			id: token.id,
			x: at.x,
			y: at.y,
			range,
			facing: token.rotation || 0,
			cone: CONE_DEGREES,
			// Percepção em volta de si: 1 casa, sem passar do alcance.
			near: Math.min(cell, range),
		});
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

/**
 * Luz de um lugar: luz do dia (vale a visão normal), penumbra (a visão normal cai
 * à metade) ou escuridão (só vale a visão no escuro).
 */
export type LightLevel = "bright" | "dim" | "dark";

export const LIGHT_LEVELS: readonly LightLevel[] = ["bright", "dim", "dark"];

/** Valor vindo do banco (ou de um rascunho) → luz válida; o resto é luz do dia. */
export function toLightLevel(value: unknown): LightLevel {
	return value === "dark" || value === "dim" ? value : "bright";
}

/**
 * No escuro, quem não tem visão no escuro só distingue o que está colado nele
 * (1 casa). Sem isso o personagem ficaria cego e sem como se orientar.
 */
export const NO_DARKVISION_CELLS = 1;

/** Penumbra para quem a ficha não diz nada: metade da visão padrão. */
export const DIM_DEFAULT_CELLS = DEFAULT_VISION_CELLS / 2;

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
 * Quanto a ficha enxerga, em casas, numa luz.
 *  - Luz do dia: o maior entre a visão normal e a visão no escuro (quem tem visão
 *    no escuro não enxerga menos na luz). `undefined` quando a ficha não define
 *    nada (vale o do token).
 *  - Penumbra: a visão normal pela METADE, ou a visão no escuro se for maior (a
 *    visão no escuro enxerga a penumbra como se fosse luz do dia). Sem visão
 *    normal na ficha, a metade da padrão. Nunca menos que 1 casa.
 *  - Escuridão: a visão no escuro; sem ela, só a casa ao lado.
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
	if (light === "dim") {
		const half = normal !== undefined ? normal / 2 : DIM_DEFAULT_CELLS;
		return Math.max(half, dark ?? 0, NO_DARKVISION_CELLS);
	}
	if (normal === undefined && dark === undefined) return undefined;
	return Math.max(normal ?? 0, dark ?? 0);
}

/** Alcance da ficha em cada luz (casas). `bright` vazio: vale o do token. */
export interface SheetVision {
	bright?: number;
	dim: number;
	dark: number;
}

/**
 * Alcance (em casas) de um token numa luz, vindo da ficha quando há. Token sem
 * ficha: na luz do dia vale o do token, na penumbra a metade da visão padrão, no
 * escuro só a casa ao lado.
 */
export function resolveTokenVisionCells(
	token: { characterId?: string | null },
	sheetCells: ReadonlyMap<string, SheetVision>,
	light: LightLevel,
): number | undefined {
	const sheet = token.characterId
		? sheetCells.get(token.characterId)
		: undefined;
	if (light === "bright") return sheet?.bright;
	if (light === "dim") return sheet?.dim ?? DIM_DEFAULT_CELLS;
	return sheet?.dark ?? NO_DARKVISION_CELLS;
}

/**
 * Alguém que enxerga vê este ponto? Precisa estar no alcance, dentro do cone (ou
 * colado na pessoa) E sem parede no meio. É a regra única para esconder monstros
 * fora da visão.
 */
export function isSeenByAny(
	target: VisionPoint,
	sources: readonly VisionSource[],
	walls: readonly VisionSegment[],
): boolean {
	return sources.some((source) => {
		const dist = Math.hypot(source.x - target.x, source.y - target.y);
		if (dist > source.range) return false;
		const cone = source.cone ?? 360;
		if (cone < 360 && dist > (source.near ?? 0)) {
			const bearing =
				(Math.atan2(target.x - source.x, -(target.y - source.y)) * 180) /
				Math.PI;
			const diff = Math.abs(
				((((bearing - (source.facing ?? 0)) % 360) + 540) % 360) - 180,
			);
			if (diff > cone / 2 + 1e-9) return false;
		}
		return hasLineOfSight({ x: source.x, y: source.y }, target, walls);
	});
}

/**
 * Assinatura das fontes de visão. Só muda quando alguém que enxerga se mexe,
 * gira, entra, sai ou muda o alcance: mover um monstro ou mudar o PV de um
 * token qualquer não pode refazer a névoa.
 */
export function visionKey(sources: readonly VisionSource[]): string {
	return sources
		.map(
			(s) =>
				`${s.id}:${Math.round(s.x)}:${Math.round(s.y)}:${s.range}:${Math.round(s.facing ?? 0)}:${s.cone ?? 360}:${s.near ?? 0}`,
		)
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

/** Faixa de ângulos (radianos, como atan2 com y para baixo) que o raio varre. */
export interface VisionArc {
	start: number;
	/** Largura da faixa, em radianos (menor que uma volta). */
	width: number;
}

const TAU = Math.PI * 2;
const norm = (angle: number) => ((angle % TAU) + TAU) % TAU;

/**
 * O que o token enxerga: um polígono em volta de `origin`, de raio `radius`,
 * recortado pelas paredes (que bloqueiam o raio). Varredura angular: um raio por
 * ponta de parede (um pouco antes e um pouco depois, para o canto sair certo)
 * mais raios fixos em volta para a borda ficar redonda. Os pontos saem em
 * ordem de ângulo, prontos para preencher.
 *
 * Com `arc`, só varre essa faixa (um cone): os raios das bordas do cone são
 * exatos e o polígono começa na própria origem (o vértice do cone).
 */
export function visibilityPolygon(
	origin: VisionPoint,
	radius: number,
	walls: readonly VisionSegment[],
	rays: number = CIRCLE_RAYS,
	arc?: VisionArc,
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

	const full = !arc || arc.width >= TAU - 1e-9;
	const start = full || !arc ? 0 : arc.start;
	const width = full || !arc ? TAU : Math.max(1e-6, arc.width);
	const steps = Math.max(8, Math.floor(rays));

	// Cada raio é guardado pelo deslocamento a partir do início da faixa.
	const offsets: number[] = [];
	if (full) {
		for (let i = 0; i < steps; i++) offsets.push((i / steps) * TAU);
	} else {
		const count = Math.max(2, Math.ceil((width / TAU) * steps));
		for (let i = 0; i <= count; i++) offsets.push((i / count) * width);
	}
	for (const w of near) {
		for (const [px, py] of [
			[w.x1, w.y1],
			[w.x2, w.y2],
		] as const) {
			if (Math.hypot(px - ox, py - oy) > radius * 1.0001) continue;
			const a = Math.atan2(py - oy, px - ox);
			for (const delta of [-CORNER_EPS, 0, CORNER_EPS]) {
				const offset = norm(a + delta - start);
				if (full || offset <= width + 1e-9) offsets.push(offset);
			}
		}
	}
	offsets.sort((p, q) => p - q);

	const points: VisionPoint[] = full ? [] : [{ x: ox, y: oy }];
	let last = Number.NaN;
	for (const offset of offsets) {
		if (offset === last) continue;
		last = offset;
		const a = start + offset;
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

/** Direção em graus (0 = norte, horário) → faixa de ângulos do cone. */
function arcFor(facingDeg: number, widthDeg: number): VisionArc {
	const width = (Math.min(360, Math.max(1, widthDeg)) * Math.PI) / 180;
	// rotation 0 = para cima; atan2 mede a partir do eixo x (y para baixo).
	const facing = ((facingDeg - 90) * Math.PI) / 180;
	return { start: facing - width / 2, width };
}

/**
 * O cone de visão: uma fatia de `widthDeg` graus voltada para `facingDeg`,
 * recortada pelas paredes. A ponta do cone é a própria origem.
 */
export function visionSector(
	origin: VisionPoint,
	radius: number,
	walls: readonly VisionSegment[],
	facingDeg: number,
	widthDeg: number = CONE_DEGREES,
): VisionPoint[] {
	if (widthDeg >= 360) return visibilityPolygon(origin, radius, walls);
	return visibilityPolygon(
		origin,
		radius,
		walls,
		CIRCLE_RAYS,
		arcFor(facingDeg, widthDeg),
	);
}

/**
 * Os polígonos do que uma fonte enxerga: o cone e, se houver, o círculo curto
 * em volta (a percepção de 1 casa). A união dos dois é a visão.
 */
export function sourcePolygons(
	source: VisionSource,
	walls: readonly VisionSegment[],
): VisionPoint[][] {
	const cone = source.cone ?? 360;
	if (cone >= 360) return [visibilityPolygon(source, source.range, walls)];
	const polygons = [
		visionSector(source, source.range, walls, source.facing ?? 0, cone),
	];
	const near = Math.min(source.near ?? 0, source.range);
	if (near > 0) polygons.push(visibilityPolygon(source, near, walls));
	return polygons;
}

/**
 * Para onde o token passa a olhar ao andar de `from` até `to`, em graus
 * (0 = norte, horário, inteiro). `null` se não saiu do lugar.
 */
export function facingFromMove(
	from: VisionPoint,
	to: VisionPoint,
): number | null {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	if (dx === 0 && dy === 0) return null;
	const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
	const rounded = Math.round(((degrees % 360) + 360) % 360);
	return rounded === 360 ? 0 : rounded;
}

/**
 * Onde cada token "está" para a visão. Quem está sendo arrastado fica na última
 * posição de antes do arrasto: a visão só muda quando o movimento termina (o
 * token é solto), não enquanto o dedo/mouse passeia pelo mapa.
 */
export function freezeDragged(
	tokens: readonly { id: string; x: number; y: number }[],
	dragged: ReadonlySet<string>,
	previous: ReadonlyMap<string, VisionPoint>,
): Map<string, VisionPoint> {
	const next = new Map<string, VisionPoint>();
	for (const token of tokens) {
		const before = previous.get(token.id);
		next.set(
			token.id,
			dragged.has(token.id) && before ? before : { x: token.x, y: token.y },
		);
	}
	return next;
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
