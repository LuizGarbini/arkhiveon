import { calculateGridDistance, type Point, ZERO_ORIGIN } from "./grid-math";
import type { VTTDiagonalRule, VTTGridType, VTTScene } from "./types";

/** Uma linha do histórico: de onde o token saiu e para onde foi. */
export interface TokenMove {
	id: string;
	sceneId: string;
	tokenId: string;
	tokenName: string;
	from: Point;
	to: Point;
	/** Na unidade da cena, pela regra de diagonal da mesa na hora. */
	distance: number;
	unit: string;
	/** Rodada do combate; nula fora de combate. */
	round: number | null;
	/** `undo`: o mestre devolveu o token ao ponto de origem. */
	kind: "move" | "undo";
	authorId: string;
	authorName: string | null;
	createdAt: string;
}

/** Menos que isto (em px do mapa) é o token só apoiado, não movimento. */
const MIN_MOVE_PX = 1;

export function didMove(from: Point, to: Point): boolean {
	return Math.hypot(to.x - from.x, to.y - from.y) >= MIN_MOVE_PX;
}

/** Distância percorrida em linha reta de `from` a `to`, na unidade da cena. */
export function moveDistance(
	from: Point,
	to: Point,
	scene: Pick<
		VTTScene,
		"gridSize" | "gridScaleDistance" | "gridScaleUnit" | "gridType"
	>,
	rule: VTTDiagonalRule,
): number {
	if (scene.gridType === "none") {
		// Sem grade: mede em "casas" pelo tamanho de célula da cena.
		const cells = Math.hypot(to.x - from.x, to.y - from.y) / scene.gridSize;
		return Number((cells * scene.gridScaleDistance).toFixed(1));
	}
	return calculateGridDistance(
		from,
		to,
		scene.gridSize,
		scene.gridScaleDistance,
		scene.gridScaleUnit,
		rule,
	).distance;
}

/** Linha e coluna (a partir de 1) da casa que contém o ponto. */
export function cellOf(
	point: Point,
	gridType: VTTGridType,
	gridSize: number,
	origin: Point = ZERO_ORIGIN,
): { col: number; row: number } | null {
	if (gridType !== "square" || !(gridSize > 0)) return null;
	return {
		col: Math.floor((point.x - origin.x) / gridSize) + 1,
		row: Math.floor((point.y - origin.y) / gridSize) + 1,
	};
}

/** "C4": coluna em letras (A, B… AA) e linha em número, como no xadrez. */
export function cellLabel(col: number, row: number): string {
	let n = col;
	let letters = "";
	while (n > 0) {
		const rest = (n - 1) % 26;
		letters = String.fromCharCode(65 + rest) + letters;
		n = Math.floor((n - 1) / 26);
	}
	return `${letters || "?"}${row}`;
}

export function pointLabel(
	point: Point,
	scene: Pick<
		VTTScene,
		"gridType" | "gridSize" | "gridOffsetX" | "gridOffsetY"
	>,
): string | null {
	const cell = cellOf(point, scene.gridType, scene.gridSize, {
		x: scene.gridOffsetX ?? 0,
		y: scene.gridOffsetY ?? 0,
	});
	return cell ? cellLabel(cell.col, cell.row) : null;
}

/** Acrescenta o movimento em ordem de hora; o mesmo id nunca entra duas vezes. */
export function addMove(
	log: readonly TokenMove[],
	move: TokenMove,
): TokenMove[] {
	if (log.some((item) => item.id === move.id)) return [...log];
	return [...log, move].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Movimentos de uma cena, os mais novos primeiro, com filtro opcional. */
export function movesForScene(
	log: readonly TokenMove[],
	sceneId: string | null,
	tokenId?: string | null,
): TokenMove[] {
	if (!sceneId) return [];
	return log
		.filter(
			(move) =>
				move.sceneId === sceneId && (!tokenId || move.tokenId === tokenId),
		)
		.slice()
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface RoundGroup {
	round: number | null;
	moves: TokenMove[];
}

/**
 * Agrupa a lista (já do mais novo para o mais velho) por rodada do combate,
 * mantendo a ordem. Movimento fora de combate fica em `round: null`.
 */
export function groupByRound(moves: readonly TokenMove[]): RoundGroup[] {
	const groups: RoundGroup[] = [];
	for (const move of moves) {
		const last = groups.at(-1);
		if (last && last.round === move.round) last.moves.push(move);
		else groups.push({ round: move.round, moves: [move] });
	}
	return groups;
}

/** Soma o que cada token andou, para ver quem passou do deslocamento. */
export function distanceByToken(
	moves: readonly TokenMove[],
): { tokenId: string; tokenName: string; distance: number; moves: number }[] {
	const totals = new Map<
		string,
		{ tokenId: string; tokenName: string; distance: number; moves: number }
	>();
	for (const move of moves) {
		if (move.kind === "undo") continue;
		const entry = totals.get(move.tokenId) ?? {
			tokenId: move.tokenId,
			tokenName: move.tokenName,
			distance: 0,
			moves: 0,
		};
		entry.distance = Number((entry.distance + move.distance).toFixed(1));
		entry.moves += 1;
		totals.set(move.tokenId, entry);
	}
	return [...totals.values()].sort((a, b) => b.distance - a.distance);
}

type DbRow = Record<string, unknown>;

/** Linha do banco para `TokenMove`; `null` se vier fora do formato. */
export function mapMoveRow(value: unknown): TokenMove | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const row = value as DbRow;
	const num = (v: unknown) => (typeof v === "number" ? v : Number(v));
	if (
		typeof row.id !== "string" ||
		typeof row.scene_id !== "string" ||
		typeof row.token_id !== "string" ||
		typeof row.token_name !== "string" ||
		typeof row.author_id !== "string" ||
		typeof row.created_at !== "string"
	)
		return null;
	const coords = [row.from_x, row.from_y, row.to_x, row.to_y].map(num);
	if (coords.some((n) => !Number.isFinite(n))) return null;
	return {
		id: row.id,
		sceneId: row.scene_id,
		tokenId: row.token_id,
		tokenName: row.token_name,
		from: { x: coords[0], y: coords[1] },
		to: { x: coords[2], y: coords[3] },
		distance: Number.isFinite(num(row.distance)) ? num(row.distance) : 0,
		unit: typeof row.unit === "string" ? row.unit : "m",
		round: typeof row.round === "number" ? row.round : null,
		kind: row.kind === "undo" ? "undo" : "move",
		authorId: row.author_id,
		authorName: typeof row.author_name === "string" ? row.author_name : null,
		createdAt: row.created_at,
	};
}

/** "14:32" (24 h) para o horário da linha. */
export function formatMoveTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}
