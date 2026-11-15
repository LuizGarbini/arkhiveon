import type { VTTGridType } from "./types";

/**
 * Parede comum, porta ou janela. Porta e janela abrem e fecham; a parede nunca.
 * A janela aberta deixa ver, mas ninguém atravessa (só o mestre move o token).
 */
export type WallKind = "wall" | "door" | "window";

/** Um segmento de parede (coordenadas do mundo da cena). */
export interface VTTWall {
	id: string;
	sceneId: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	/** Sem `kind`, é parede comum (era o único tipo antes da 0073). */
	kind?: WallKind;
	/** Só vale para porta e janela: aberta deixa ver (a porta, também passar). */
	isOpen?: boolean;
}

export function isDoor(wall: Pick<VTTWall, "kind">): boolean {
	return wall.kind === "door";
}

export function isWindow(wall: Pick<VTTWall, "kind">): boolean {
	return wall.kind === "window";
}

/** Abre e fecha: porta e janela (o ícone delas é clicável). */
export function isOpenable(wall: Pick<VTTWall, "kind">): boolean {
	return wall.kind === "door" || wall.kind === "window";
}

/** Parede e porta/janela fechada bloqueiam a visão; aberta, deixa ver. */
export function blocksSight(wall: Pick<VTTWall, "kind" | "isOpen">): boolean {
	return !(isOpenable(wall) && wall.isOpen === true);
}

/**
 * O que barra o MOVIMENTO do jogador: o que bloqueia a visão e também a janela,
 * aberta ou fechada (dá para ver por ela, mas não para passar; quem decide se um
 * personagem passa por uma janela é o mestre, movendo o token).
 */
export function blocksMovement(
	wall: Pick<VTTWall, "kind" | "isOpen">,
): boolean {
	return isWindow(wall) || blocksSight(wall);
}

/** Só o que bloqueia a visão agora (é o que entra no cálculo de visão). */
export function blockingWalls<T extends Pick<VTTWall, "kind" | "isOpen">>(
	walls: readonly T[],
): T[] {
	return walls.filter(blocksSight);
}

/** Só o que barra o movimento do jogador agora (inclui toda janela). */
export function movementBlockingWalls<
	T extends Pick<VTTWall, "kind" | "isOpen">,
>(walls: readonly T[]): T[] {
	return walls.filter(blocksMovement);
}

/** Raio do ícone da porta ou janela (px), proporcional à casa e limitado para ficar legível. */
export function doorIconRadius(gridSize: number): number {
	const cell = gridSize > 0 ? gridSize : 70;
	return Math.min(22, Math.max(12, cell * 0.2));
}

/** Onde fica o ícone da porta ou janela: no meio do vão. */
export function doorIconCenter(
	door: Pick<VTTWall, "x1" | "y1" | "x2" | "y2">,
): WallPoint {
	return { x: (door.x1 + door.x2) / 2, y: (door.y1 + door.y2) / 2 };
}

/**
 * A porta ou janela cujo ÍCONE está sob o ponto (o ícone é a única coisa clicável:
 * o traço do vão não é desenhado). A mais próxima, se houver mais de uma.
 */
export function hitTestDoorIcon(
	walls: readonly VTTWall[],
	p: WallPoint,
	radius: number,
): VTTWall | null {
	let best: VTTWall | null = null;
	let bestDist = radius;
	for (const wall of walls) {
		if (!isOpenable(wall)) continue;
		const c = doorIconCenter(wall);
		const d = Math.hypot(p.x - c.x, p.y - c.y);
		if (d <= bestDist) {
			bestDist = d;
			best = wall;
		}
	}
	return best;
}

/** A porta mais próxima do ponto dentro da tolerância, ou null. */
export function hitTestDoor(
	walls: readonly VTTWall[],
	p: WallPoint,
	tolerance: number,
): VTTWall | null {
	const id = hitTestWall(walls.filter(isOpenable), p, tolerance);
	return id ? (walls.find((w) => w.id === id) ?? null) : null;
}

/** Alcance para abrir uma porta, em casas da grade (do centro do token à porta). */
export const DOOR_REACH_CELLS = 1.5;

/** Algum dos pontos (tokens do jogador) está perto o bastante da porta ou janela? */
export function doorWithinReach(
	door: Pick<VTTWall, "x1" | "y1" | "x2" | "y2">,
	points: readonly WallPoint[],
	gridSize: number,
	reachCells: number = DOOR_REACH_CELLS,
): boolean {
	const reach = (gridSize > 0 ? gridSize : 70) * reachCells;
	return points.some((p) => distanceToSegment(p, door) <= reach);
}

export interface WallPoint {
	x: number;
	y: number;
}

/**
 * Operação de parede no histórico da sessão. `create` põe os segmentos na
 * cena, `delete` tira. Desfazer é aplicar a inversa (os ids se mantêm).
 */
export type WallOp =
	| { kind: "create" | "delete"; walls: VTTWall[] }
	| { kind: "move"; moves: WallMove[] };

/** As quatro coordenadas de um segmento. */
export interface WallCoords {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/** Uma parede que mudou de lugar: de onde saiu e para onde foi (mesmo id). */
export interface WallMove {
	id: string;
	from: WallCoords;
	to: WallCoords;
}

/**
 * Snap aos cantos da grade quadrada. Hex e "sem grade" desenham livre na F1.
 * `free` (Shift segurado) desliga o snap.
 */
export function snapWallPoint(
	point: WallPoint,
	gridType: VTTGridType,
	gridSize: number,
	free = false,
	origin: WallPoint = { x: 0, y: 0 },
): WallPoint {
	if (free || gridType !== "square" || gridSize <= 0) return point;
	return {
		x: Math.round((point.x - origin.x) / gridSize) * gridSize + origin.x,
		y: Math.round((point.y - origin.y) / gridSize) * gridSize + origin.y,
	};
}

export function distanceToSegment(
	p: WallPoint,
	w: Pick<VTTWall, "x1" | "y1" | "x2" | "y2">,
): number {
	const dx = w.x2 - w.x1;
	const dy = w.y2 - w.y1;
	const len2 = dx * dx + dy * dy;
	const t =
		len2 === 0
			? 0
			: Math.max(
					0,
					Math.min(1, ((p.x - w.x1) * dx + (p.y - w.y1) * dy) / len2),
				);
	return Math.hypot(p.x - (w.x1 + t * dx), p.y - (w.y1 + t * dy));
}

/** Parede mais próxima do ponto dentro da tolerância (no mundo), ou null. */
export function hitTestWall(
	walls: readonly VTTWall[],
	p: WallPoint,
	tolerance: number,
): string | null {
	let best: string | null = null;
	let bestDist = tolerance;
	for (const w of walls) {
		const d = distanceToSegment(p, w);
		if (d <= bestDist) {
			bestDist = d;
			best = w.id;
		}
	}
	return best;
}

/** Segmentos da polilinha (pontos consecutivos), ignorando os de tamanho zero. */
export function draftToWalls(
	points: readonly WallPoint[],
	sceneId: string,
	newId: () => string,
	kind: WallKind = "wall",
): VTTWall[] {
	const out: VTTWall[] = [];
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
		if (a.x === b.x && a.y === b.y) continue;
		const wall: VTTWall = {
			id: newId(),
			sceneId,
			x1: a.x,
			y1: a.y,
			x2: b.x,
			y2: b.y,
		};
		// Parede comum fica sem `kind` (igual a antes); porta e janela nascem fechadas.
		if (kind === "door" || kind === "window") {
			wall.kind = kind;
			wall.isOpen = false;
		}
		out.push(wall);
	}
	return out;
}

export function invertWallOp(op: WallOp): WallOp {
	if (op.kind === "move")
		return {
			kind: "move",
			moves: op.moves.map((m) => ({ id: m.id, from: m.to, to: m.from })),
		};
	return { kind: op.kind === "create" ? "delete" : "create", walls: op.walls };
}

/** Aplica a operação à lista local (sem duplicar ids). */
export function applyWallOp(walls: readonly VTTWall[], op: WallOp): VTTWall[] {
	if (op.kind === "move") {
		// Só as coordenadas mudam: tipo e estado (porta aberta) ficam como estavam.
		const target = new Map(op.moves.map((m) => [m.id, m.to]));
		return walls.map((w) => {
			const to = target.get(w.id);
			return to ? { ...w, ...to } : w;
		});
	}
	const ids = new Set(op.walls.map((w) => w.id));
	const rest = walls.filter((w) => !ids.has(w.id));
	return op.kind === "create" ? [...rest, ...op.walls] : rest;
}

/** Erro do PostgREST quando a tabela ainda não existe (migração não aplicada). */
export function isMissingWallsTable(
	error: { code?: string; message?: string } | null | undefined,
): boolean {
	if (!error) return false;
	if (error.code === "42P01" || error.code === "PGRST205") return true;
	return (
		/vtt_walls/.test(error.message ?? "") &&
		/exist|schema cache/i.test(error.message ?? "")
	);
}

/** Linha de `vtt_walls` (como o PostgREST devolve) → parede da mesa. */
export function mapWallRow(row: {
	id: string;
	scene_id: string;
	x1: number | string;
	y1: number | string;
	x2: number | string;
	y2: number | string;
	kind?: string | null;
	is_open?: boolean | null;
}): VTTWall {
	const wall: VTTWall = {
		id: row.id,
		sceneId: row.scene_id,
		x1: Number(row.x1),
		y1: Number(row.y1),
		x2: Number(row.x2),
		y2: Number(row.y2),
	};
	// Parede comum fica sem `kind`; só porta e janela carregam tipo e estado.
	if (row.kind === "door" || row.kind === "window") {
		wall.kind = row.kind;
		wall.isOpen = row.is_open === true;
	}
	return wall;
}

/** Aplica uma mudança a algumas paredes (por id) sem mexer nas outras. */
export function patchWalls(
	walls: readonly VTTWall[],
	ids: ReadonlySet<string>,
	patch: (wall: VTTWall) => VTTWall,
): VTTWall[] {
	return walls.map((wall) => (ids.has(wall.id) ? patch(wall) : wall));
}

/** O que a parede vira ao trocar de tipo: porta e janela nascem fechadas; parede perde o estado. */
export function withWallKind(wall: VTTWall, kind: WallKind): VTTWall {
	const { kind: _kind, isOpen: _isOpen, ...rest } = wall;
	return kind === "door" || kind === "window"
		? { ...rest, kind, isOpen: false }
		: rest;
}
