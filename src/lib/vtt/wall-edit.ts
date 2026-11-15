import type { VTTGridType } from "./types";
import {
	hitTestWall,
	snapWallPoint,
	type VTTWall,
	type WallCoords,
	type WallMove,
	type WallPoint,
} from "./walls";

/**
 * Edição livre das paredes (sem depender da grade): precisão de pixel, ímã nas
 * pontas das outras paredes, arrastar parede/vértice e ajuste fino pelas setas.
 * Só funções puras sobre geometria (sem store, sem Pixi), para testar sem navegador.
 */

/** Alcance do ímã das pontas, em px de TELA (convertido pelo zoom na hora de usar). */
export const WALL_MAGNET_SCREEN_PX = 10;
/** Alcance para pegar um vértice (handle) ou o corpo de uma parede, em px de tela. */
export const WALL_HIT_SCREEN_PX = 8;
/** Duas pontas a menos que isto uma da outra (no mundo) são o mesmo ponto. */
const SAME_POINT_EPS = 1e-6;

/** 2 casas decimais: precisão de sobra e o banco não enche de dígitos. */
export function roundWallCoord(n: number): number {
	return Math.round(n * 100) / 100;
}

export function roundWallPoint(p: WallPoint): WallPoint {
	return { x: roundWallCoord(p.x), y: roundWallCoord(p.y) };
}

export function samePoint(a: WallPoint, b: WallPoint): boolean {
	return (
		Math.abs(a.x - b.x) < SAME_POINT_EPS && Math.abs(a.y - b.y) < SAME_POINT_EPS
	);
}

export function wallCoordsOf(w: WallCoords): WallCoords {
	return { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 };
}

/* ------------------------------------------------------------------ */
/* Preferência "Encaixar na grade" (lembrada neste navegador)           */
/* ------------------------------------------------------------------ */

const SNAP_PREF_KEY = "arkhiveon.vtt.wallSnapGrid";

/** Padrão DESLIGADO: a parede segue o ponteiro com precisão de pixel. */
export function loadWallSnapPref(): boolean {
	try {
		return globalThis.localStorage?.getItem(SNAP_PREF_KEY) === "1";
	} catch {
		return false;
	}
}

export function saveWallSnapPref(snap: boolean): void {
	try {
		globalThis.localStorage?.setItem(SNAP_PREF_KEY, snap ? "1" : "0");
	} catch {
		// Sem armazenamento (modo privado): vale só para esta sessão.
	}
}

/* ------------------------------------------------------------------ */
/* Ponto sob o ponteiro: grade, Shift e ímã                              */
/* ------------------------------------------------------------------ */

export interface WallSnapContext {
	gridType: VTTGridType;
	gridSize: number;
	origin: WallPoint;
	/** Preferência do painel: encaixar nos cantos da grade. */
	snapGrid: boolean;
	/** Shift segurado: inverte a preferência só enquanto estiver apertado. */
	invert: boolean;
	/** Alt segurado: desliga o ímã das pontas. */
	magnetOff: boolean;
	/** Alcance do ímã no mundo (`WALL_MAGNET_SCREEN_PX / zoom`). */
	magnetRadius: number;
}

/** A grade encaixa agora? (preferência, invertida pelo Shift) */
export function gridSnapActive(snapGrid: boolean, invert: boolean): boolean {
	return snapGrid !== invert;
}

/** A ponta de `candidates` mais perto de `p` dentro do `radius`, ou null. */
export function nearestPoint(
	candidates: readonly WallPoint[],
	p: WallPoint,
	radius: number,
): WallPoint | null {
	let best: WallPoint | null = null;
	let bestDist = radius;
	for (const c of candidates) {
		const d = Math.hypot(c.x - p.x, c.y - p.y);
		if (d <= bestDist) {
			bestDist = d;
			best = c;
		}
	}
	return best;
}

/** As duas pontas de cada parede (as de `exclude` ficam de fora). */
export function wallEndpoints(
	walls: readonly VTTWall[],
	exclude?: ReadonlySet<string>,
): WallPoint[] {
	const out: WallPoint[] = [];
	for (const w of walls) {
		if (exclude?.has(w.id)) continue;
		out.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
	}
	return out;
}

export interface ResolvedWallPoint {
	point: WallPoint;
	/** Ponta em que o ímã encaixou (null se não encaixou em nenhuma). */
	magnet: WallPoint | null;
}

/**
 * Onde a ponta da parede cai quando o ponteiro está em `raw`. O ímã vence: se há
 * uma ponta (de `candidates`) por perto, usa EXATAMENTE as coordenadas dela, para
 * as paredes se unirem sem fresta. Senão encaixa na grade (se ligada) ou fica no
 * pixel do mapa, com 2 casas decimais.
 */
export function resolveWallPoint(
	raw: WallPoint,
	ctx: WallSnapContext,
	candidates: readonly WallPoint[],
): ResolvedWallPoint {
	if (!ctx.magnetOff) {
		const hit = nearestPoint(candidates, raw, ctx.magnetRadius);
		if (hit) return { point: { x: hit.x, y: hit.y }, magnet: hit };
	}
	const snapped = snapWallPoint(
		raw,
		ctx.gridType,
		ctx.gridSize,
		!gridSnapActive(ctx.snapGrid, ctx.invert),
		ctx.origin,
	);
	return { point: roundWallPoint(snapped), magnet: null };
}

/* ------------------------------------------------------------------ */
/* Mover paredes                                                        */
/* ------------------------------------------------------------------ */

/** Desloca a parede pelo mesmo vetor nas duas pontas (2 casas decimais). */
export function translateCoords(
	c: WallCoords,
	dx: number,
	dy: number,
): WallCoords {
	return {
		x1: roundWallCoord(c.x1 + dx),
		y1: roundWallCoord(c.y1 + dy),
		x2: roundWallCoord(c.x2 + dx),
		y2: roundWallCoord(c.y2 + dy),
	};
}

/** Paredes que têm uma ponta exatamente em `p` (a que o vértice arrastado carrega). */
export function wallsSharingPoint(
	walls: readonly VTTWall[],
	p: WallPoint,
): VTTWall[] {
	return walls.filter(
		(w) =>
			samePoint({ x: w.x1, y: w.y1 }, p) || samePoint({ x: w.x2, y: w.y2 }, p),
	);
}

/** O vértice (das paredes selecionadas) sob o ponto, o mais próximo do alcance, ou null. */
export function hitTestVertex(
	walls: readonly VTTWall[],
	selectedIds: readonly string[],
	p: WallPoint,
	radius: number,
): WallPoint | null {
	const selected = new Set(selectedIds);
	return nearestPoint(
		wallEndpoints(walls.filter((w) => selected.has(w.id))),
		p,
		radius,
	);
}

/** Troca a ponta que está em `from` por `to` (as duas, se a parede começa e termina ali). */
function moveEndpoint(w: VTTWall, from: WallPoint, to: WallPoint): VTTWall {
	const next = { ...w };
	if (samePoint({ x: w.x1, y: w.y1 }, from)) {
		next.x1 = to.x;
		next.y1 = to.y;
	}
	if (samePoint({ x: w.x2, y: w.y2 }, from)) {
		next.x2 = to.x;
		next.y2 = to.y;
	}
	return next;
}

/** Parede reduzida a um ponto: o banco recusa (e não bloquearia nada). */
export function isDegenerate(c: WallCoords): boolean {
	return samePoint({ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 });
}

/** O que mudou entre as listas, só entre os `ids` (para gravar e desfazer). */
export function movesBetween(
	before: readonly VTTWall[],
	after: readonly VTTWall[],
	ids: ReadonlySet<string>,
): WallMove[] {
	const next = new Map(after.map((w) => [w.id, w]));
	const out: WallMove[] = [];
	for (const w of before) {
		if (!ids.has(w.id)) continue;
		const n = next.get(w.id);
		if (!n) continue;
		const from = wallCoordsOf(w);
		const to = wallCoordsOf(n);
		if (
			from.x1 !== to.x1 ||
			from.y1 !== to.y1 ||
			from.x2 !== to.x2 ||
			from.y2 !== to.y2
		)
			out.push({ id: w.id, from, to });
	}
	return out;
}

/* ------------------------------------------------------------------ */
/* O que o clique pegou                                                  */
/* ------------------------------------------------------------------ */

export type WallGrab =
	/** Shift+clique: entra ou sai da seleção, sem arrastar. */
	| { type: "toggle"; id: string }
	/** Pegou um vértice ou o corpo de uma parede; vira arrasto se o ponteiro andar. */
	| {
			type: "press";
			mode: "body" | "vertex";
			hitId: string;
			/** Quem se move junto. */
			ids: string[];
			vertex?: WallPoint;
			wasMultiSelected: boolean;
			/** Seleção a aplicar já no clique (parede ainda não selecionada). */
			select: string[] | null;
	  };

/**
 * O que está sob o clique da ferramenta Parede (sem desenho em andamento): um
 * vértice de parede selecionada (vence o corpo), o corpo de uma parede, ou nada.
 * `scale` é o zoom: os alcances são em px de tela.
 */
export function pickWallGrab(args: {
	walls: readonly VTTWall[];
	selectedIds: readonly string[];
	world: WallPoint;
	scale: number;
	shift: boolean;
}): WallGrab | null {
	const { walls, selectedIds, world, shift } = args;
	const reach = WALL_HIT_SCREEN_PX / Math.max(args.scale, 0.01);
	const vertex = hitTestVertex(walls, selectedIds, world, reach);
	if (vertex) {
		const sharing = wallsSharingPoint(walls, vertex);
		if (sharing.length > 0)
			return {
				type: "press",
				mode: "vertex",
				hitId: sharing[0].id,
				ids: sharing.map((w) => w.id),
				vertex,
				wasMultiSelected: false,
				select: null,
			};
	}
	const hit = hitTestWall(walls, world, reach);
	if (!hit) return null;
	if (shift) return { type: "toggle", id: hit };
	const selected = selectedIds.includes(hit);
	return {
		type: "press",
		mode: "body",
		hitId: hit,
		ids: selected ? [...selectedIds] : [hit],
		wasMultiSelected: selected && selectedIds.length > 1,
		select: selected ? null : [hit],
	};
}

/* ------------------------------------------------------------------ */
/* Arrasto (estado do ponteiro, sem React)                               */
/* ------------------------------------------------------------------ */

export interface WallPress {
	mode: "body" | "vertex";
	/** A parede em que o clique caiu (a que o clique sem arrasto seleciona). */
	hitId: string;
	/** Clique caiu numa parede que já estava selecionada junto com outras. */
	wasMultiSelected: boolean;
	startScreen: WallPoint;
	/** Ponteiro no mundo ao pressionar. */
	startWorld: WallPoint;
	moved: boolean;
	/** Todas as paredes da cena quando o clique começou (o arrasto parte delas). */
	snapshot: VTTWall[];
	/** Quem se move: as selecionadas (corpo) ou as que compartilham o vértice. */
	ids: Set<string>;
	/** Vértice original (só no modo vértice). */
	vertex: WallPoint | null;
	/** Vértice da parede clicada mais perto do clique: referência da grade no corpo. */
	anchor: WallPoint;
	/** Último resultado válido (o vértice não pode colar na outra ponta da parede). */
	last: WallDragPreview;
}

export interface WallDragPreview {
	walls: VTTWall[];
	magnet: WallPoint | null;
	moves: WallMove[];
}

export function beginWallPress(args: {
	mode: "body" | "vertex";
	hitId: string;
	wasMultiSelected: boolean;
	screen: WallPoint;
	world: WallPoint;
	walls: readonly VTTWall[];
	/** Paredes que acompanham: as selecionadas (corpo) ou as do vértice. */
	ids: readonly string[];
	vertex?: WallPoint;
}): WallPress {
	const hit = args.walls.find((w) => w.id === args.hitId);
	const corners: WallPoint[] = hit
		? [
				{ x: hit.x1, y: hit.y1 },
				{ x: hit.x2, y: hit.y2 },
			]
		: [args.world];
	const anchor =
		args.vertex ??
		corners.reduce((best, c) =>
			Math.hypot(c.x - args.world.x, c.y - args.world.y) <
			Math.hypot(best.x - args.world.x, best.y - args.world.y)
				? c
				: best,
		);
	return {
		mode: args.mode,
		hitId: args.hitId,
		wasMultiSelected: args.wasMultiSelected,
		startScreen: args.screen,
		startWorld: args.world,
		moved: false,
		snapshot: [...args.walls],
		ids: new Set(args.ids),
		vertex: args.vertex ?? null,
		anchor,
		last: { walls: [...args.walls], magnet: null, moves: [] },
	};
}

/**
 * Prévia do arrasto com o ponteiro em `raw` (mundo). Corpo: todas as paredes
 * movem pelo mesmo vetor; o ímã alinha qualquer vértice que se mova a uma ponta
 * parada, a grade alinha o vértice mais perto do clique. Vértice: a ponta (e as
 * que compartilham exatamente o ponto) vai para o ponto resolvido.
 */
export function computeWallDrag(
	press: WallPress,
	raw: WallPoint,
	ctx: WallSnapContext,
): WallDragPreview {
	const { snapshot, ids } = press;
	const fixedPoints = wallEndpoints(snapshot, ids);
	let result: WallDragPreview;

	if (press.mode === "vertex" && press.vertex) {
		const target = resolveWallPoint(raw, ctx, fixedPoints);
		const vertex = press.vertex;
		const walls = snapshot.map((w) =>
			ids.has(w.id) ? moveEndpoint(w, vertex, target.point) : w,
		);
		if (walls.some((w) => ids.has(w.id) && isDegenerate(w))) return press.last;
		result = {
			walls,
			magnet: target.magnet,
			moves: movesBetween(snapshot, walls, ids),
		};
	} else {
		const rawDx = raw.x - press.startWorld.x;
		const rawDy = raw.y - press.startWorld.y;
		let dx = rawDx;
		let dy = rawDy;
		let magnet: WallPoint | null = null;
		if (!ctx.magnetOff) {
			// Qualquer ponta que se move perto de uma ponta parada gruda nela.
			let bestDist = ctx.magnetRadius;
			for (const w of snapshot) {
				if (!ids.has(w.id)) continue;
				for (const v of [
					{ x: w.x1, y: w.y1 },
					{ x: w.x2, y: w.y2 },
				]) {
					const moved = { x: v.x + rawDx, y: v.y + rawDy };
					const hit = nearestPoint(fixedPoints, moved, bestDist);
					if (!hit) continue;
					bestDist = Math.hypot(hit.x - moved.x, hit.y - moved.y);
					dx = hit.x - v.x;
					dy = hit.y - v.y;
					magnet = hit;
				}
			}
		}
		if (!magnet && gridSnapActive(ctx.snapGrid, ctx.invert)) {
			const a = press.anchor;
			const target = snapWallPoint(
				{ x: a.x + rawDx, y: a.y + rawDy },
				ctx.gridType,
				ctx.gridSize,
				false,
				ctx.origin,
			);
			dx = target.x - a.x;
			dy = target.y - a.y;
		}
		const walls = snapshot.map((w) =>
			ids.has(w.id) ? { ...w, ...translateCoords(w, dx, dy) } : w,
		);
		result = { walls, magnet, moves: movesBetween(snapshot, walls, ids) };
	}
	press.last = result;
	return result;
}

/* ------------------------------------------------------------------ */
/* Setas: ajuste fino                                                   */
/* ------------------------------------------------------------------ */

/** Passo de uma seta, em px do mapa: 1; Shift 10; Alt a casa inteira da grade. */
export function nudgeDelta(
	key: string,
	opts: { shift: boolean; alt: boolean; gridSize: number },
): { dx: number; dy: number } | null {
	const dir =
		key === "ArrowLeft"
			? { x: -1, y: 0 }
			: key === "ArrowRight"
				? { x: 1, y: 0 }
				: key === "ArrowUp"
					? { x: 0, y: -1 }
					: key === "ArrowDown"
						? { x: 0, y: 1 }
						: null;
	if (!dir) return null;
	const step = opts.alt
		? opts.gridSize > 0
			? opts.gridSize
			: 70
		: opts.shift
			? 10
			: 1;
	return { dx: dir.x * step, dy: dir.y * step };
}

/** Pausa mínima entre dois passos de seta mantida apertada (ms). */
export const NUDGE_REPEAT_MS = 40;
/** Silêncio depois do último passo para gravar o lote de uma vez (ms). */
export const NUDGE_FLUSH_MS = 300;

/* Arrasto em andamento: as setas esperam (o arrasto parte do que havia no clique). */
let wallDragging = false;
export function setWallDragging(active: boolean): void {
	wallDragging = active;
}
export function isWallDragging(): boolean {
	return wallDragging;
}
