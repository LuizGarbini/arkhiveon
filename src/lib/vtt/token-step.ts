import { type Point, snapToGrid, ZERO_ORIGIN } from "./grid-math";
import { hasLineOfSight } from "./line-of-sight";
import type { VTTGridType } from "./types";

/**
 * Mover tokens pelas setas do teclado (pura, sem React). Cada toque anda uma casa;
 * quem está selecionado anda junto, como no arrasto.
 */

export type StepDirection = "left" | "right" | "up" | "down";

const DIRECTION_BY_KEY: Record<string, StepDirection> = {
	ArrowLeft: "left",
	ArrowRight: "right",
	ArrowUp: "up",
	ArrowDown: "down",
};

const VECTOR: Record<StepDirection, Point> = {
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
};

/** A seta apertada, ou null se a tecla não é uma seta. */
export function stepDirectionOf(key: string): StepDirection | null {
	return DIRECTION_BY_KEY[key] ?? null;
}

export interface StepMember {
	id: string;
	x: number;
	y: number;
	sizeCells: number;
}

export interface StepGrid {
	gridType: VTTGridType;
	gridSize: number;
	origin?: Point;
}

export interface StepMove {
	id: string;
	from: Point;
	to: Point;
}

const isHex = (type: VTTGridType) =>
	type === "hex_pointy" || type === "hex_flat";

/**
 * Quanto andar (deslocamento) a partir de `lead`: uma casa na direção da seta.
 * Na grade hexagonal, é o vizinho mais alinhado com a seta; quando dois vizinhos
 * empatam (ex.: direita numa grade de colunas), alterna entre os dois a cada casa
 * para a fila andar reta em vez de derivar para um lado, e a seta oposta desfaz
 * o passo.
 */
export function stepDelta(
	lead: Point,
	dir: StepDirection,
	grid: StepGrid,
	sizeCells = 1,
): Point {
	const vec = VECTOR[dir];
	const cell = grid.gridSize > 0 ? grid.gridSize : 70;
	if (!isHex(grid.gridType)) return { x: vec.x * cell, y: vec.y * cell };

	const origin = grid.origin ?? ZERO_ORIGIN;
	const base = snapToGrid(lead, grid.gridType, cell, sizeCells, origin);
	// Todo vizinho de um hexágono está a r·√3 do centro (r = metade da casa).
	const reach = (cell * Math.sqrt(3)) / 2;
	const r = cell / 2;
	// Colunas (pointy) ou linhas (flat): a paridade de onde se SAI decide o lado do
	// empate, em termos absolutos (sai de coluna par subindo meia casa, de ímpar
	// descendo). Assim a fila anda reta e a seta oposta desfaz o passo.
	const index =
		grid.gridType === "hex_pointy"
			? Math.round((base.x - origin.x) / (1.5 * r))
			: Math.round((base.y - origin.y) / (1.5 * r));
	const wantSide = Math.abs(index) % 2 === 0 ? -1 : 1;

	let best: Point | null = null;
	let bestScore = Number.NEGATIVE_INFINITY;
	let bestSideOk = false;
	for (let k = 0; k < 12; k++) {
		const angle = (k * Math.PI) / 6;
		const candidate = snapToGrid(
			{
				x: base.x + Math.cos(angle) * reach,
				y: base.y + Math.sin(angle) * reach,
			},
			grid.gridType,
			cell,
			sizeCells,
			origin,
		);
		const dx = candidate.x - base.x;
		const dy = candidate.y - base.y;
		const length = Math.hypot(dx, dy);
		if (length < cell * 0.3) continue; // caiu no mesmo hexágono
		const score = (dx * vec.x + dy * vec.y) / length;
		// O desvio lateral: para setas horizontais é o dy; para as verticais, o dx.
		const side = vec.x !== 0 ? dy : dx;
		const sideOk = Math.sign(side) === wantSide || Math.abs(side) < 1e-6;
		if (
			score > bestScore + 1e-6 ||
			(Math.abs(score - bestScore) <= 1e-6 && sideOk && !bestSideOk)
		) {
			best = { x: dx, y: dy };
			bestScore = score;
			bestSideOk = sideOk;
		}
	}
	return best ?? { x: vec.x * cell, y: vec.y * cell };
}

/**
 * Para onde cada token vai com uma seta. O deslocamento sai do primeiro token e
 * vale para todos (a formação anda inteira); cada um encaixa na grade pelo próprio
 * tamanho.
 */
export function planStep(
	members: readonly StepMember[],
	dir: StepDirection,
	grid: StepGrid,
): StepMove[] {
	const lead = members[0];
	if (!lead) return [];
	const delta = stepDelta(lead, dir, grid, lead.sizeCells);
	const origin = grid.origin ?? ZERO_ORIGIN;
	return members.map((member) => ({
		id: member.id,
		from: { x: member.x, y: member.y },
		to: snapToGrid(
			{ x: member.x + delta.x, y: member.y + delta.y },
			grid.gridType,
			grid.gridSize,
			member.sizeCells,
			origin,
		),
	}));
}

/**
 * Quem anda com a seta: os selecionados (na ordem da seleção) que o usuário pode
 * mover e que não estão travados. Nunca inclui token fora da seleção.
 */
export function keyboardMovers<
	T extends StepMember & { isLocked: boolean; canMove: boolean },
>(selectedIds: readonly string[], tokens: readonly T[]): StepMember[] {
	const byId = new Map(tokens.map((token) => [token.id, token]));
	const out: StepMember[] = [];
	const seen = new Set<string>();
	for (const id of selectedIds) {
		if (seen.has(id)) continue;
		seen.add(id);
		const token = byId.get(id);
		if (!token || !token.canMove || token.isLocked) continue;
		out.push({
			id: token.id,
			x: token.x,
			y: token.y,
			sizeCells: token.sizeCells,
		});
	}
	return out;
}

/**
 * O caminho de `from` até `to` esbarra numa parede? O mestre nunca é barrado; o
 * jogador é barrado pelo que impede o movimento (parede, porta fechada e toda
 * janela). Mesma regra do arrasto e das setas.
 */
export function moveBlocked(
	from: Point,
	to: Point,
	blockers: Parameters<typeof hasLineOfSight>[2],
	isGM: boolean,
): boolean {
	return !isGM && blockers.length > 0 && !hasLineOfSight(from, to, blockers);
}
