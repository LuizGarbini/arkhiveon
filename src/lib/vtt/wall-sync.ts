import { showToast } from "@/components/ui/toast";
import { getSupabase } from "@/lib/supabase";
import { useVTTStore } from "./vtt-store";
import {
	isWallDragging,
	movesBetween,
	NUDGE_FLUSH_MS,
	NUDGE_REPEAT_MS,
	nudgeDelta,
	translateCoords,
	wallCoordsOf,
} from "./wall-edit";
import {
	draftToWalls,
	invertWallOp,
	isMissingWallsTable,
	isOpenable,
	mapWallRow,
	patchWalls,
	type VTTWall,
	type WallCoords,
	type WallKind,
	type WallMove,
	type WallOp,
	withWallKind,
} from "./walls";

/**
 * Paredes F1: carregar (só mestre), criar/apagar com save otimista e
 * rollback, e o histórico de desfazer/refazer só de paredes, por sessão.
 * Funções simples sobre a store (sem React), chamadas pelos handlers do canvas
 * e dos atalhos.
 */

let loadRequest = 0;

// Paredes movidas cuja gravação ainda não terminou (ou terminou há pouco): uma
// recarga do Realtime que chegar no meio não pode devolver a parede ao lugar
// antigo (ela ainda não está no banco, ou a consulta saiu antes da gravação).
const pendingMoves = new Map<string, WallCoords>();
/** Quanto tempo a posição gravada vale mais que uma recarga já em voo (ms). */
const MOVE_GRACE_MS = 2000;

function holdMoves(moves: readonly WallMove[]): void {
	for (const m of moves) pendingMoves.set(m.id, m.to);
}

function releaseMoves(moves: readonly WallMove[], graceMs: number): void {
	const held = moves.map((m) => [m.id, pendingMoves.get(m.id)] as const);
	const drop = () => {
		for (const [id, coords] of held)
			if (pendingMoves.get(id) === coords) pendingMoves.delete(id);
	};
	if (graceMs <= 0) drop();
	else setTimeout(drop, graceMs);
}

export async function loadWalls(
	sceneId: string,
	isCurrent: () => boolean = () => true,
): Promise<void> {
	const requestId = ++loadRequest;
	const store = useVTTStore.getState();
	const client = getSupabase();
	if (!client) {
		store.setWallsStatus("error");
		return;
	}
	store.setWallsStatus("loading");
	const { data, error } = await client
		.from("vtt_walls")
		.select("id, scene_id, x1, y1, x2, y2, kind, is_open")
		.eq("scene_id", sceneId)
		.order("created_at", { ascending: true });
	const now = useVTTStore.getState();
	if (
		requestId !== loadRequest ||
		now.activeSceneId !== sceneId ||
		!isCurrent()
	)
		return;
	if (error) {
		now.setWalls([]);
		now.setWallsStatus(isMissingWallsTable(error) ? "missing" : "error");
		return;
	}
	now.setWalls(
		(data ?? []).map(mapWallRow).map((wall) => {
			const held = pendingMoves.get(wall.id);
			return held ? { ...wall, ...held } : wall;
		}),
	);
	now.setWallsStatus("ready");
}

/** Só o `id` de um DELETE do Realtime. O resto do payload não é lido. */
export function realtimeDeleteId(old: unknown): string | null {
	if (!old || typeof old !== "object" || !("id" in old)) return null;
	const id = (old as { id: unknown }).id;
	return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Tira a parede `id` só se ela já está na cena atual.
 * Id ausente, desconhecido ou de outra cena devolve a mesma lista.
 */
export function wallsAfterRemoteDelete(
	walls: readonly VTTWall[],
	activeSceneId: string | null,
	id: string | null,
): readonly VTTWall[] {
	if (!id || !activeSceneId) return walls;
	if (!walls.some((wall) => wall.id === id && wall.sceneId === activeSceneId))
		return walls;
	return walls.filter(
		(wall) => !(wall.id === id && wall.sceneId === activeSceneId),
	);
}

/**
 * Aplica o DELETE que o Realtime entregou (só o id). Não grava, não recarrega
 * e não mexe na store se esse id não é uma parede da cena atual.
 */
export function applyRemoteWallDelete(id: string | null): boolean {
	const state = useVTTStore.getState();
	const next = wallsAfterRemoteDelete(state.walls, state.activeSceneId, id);
	if (next === state.walls || !id) return false;
	pendingMoves.delete(id);
	useVTTStore.setState({
		walls: [...next],
		selectedWallIds: state.selectedWallIds.includes(id)
			? state.selectedWallIds.filter((wallId) => wallId !== id)
			: state.selectedWallIds,
	});
	return true;
}

/**
 * Inscrição ao vivo das paredes da cena.
 * INSERT e UPDATE continuam filtrados por `scene_id` e recarregam a lista.
 * DELETE não pode ter filtro: com a identidade padrão o Realtime só manda o
 * id, o filtro não casa e o evento é descartado. Sem filtro, e só removemos
 * um id que já está na cena aberta.
 */
export function subscribeWallChanges(sceneId: string): () => void {
	const client = getSupabase();
	if (!client) return () => {};
	let stopped = false;
	let sawDrop = false;
	const isCurrent = () =>
		!stopped && useVTTStore.getState().activeSceneId === sceneId;
	const channel = client
		.channel(`vtt-walls-live:${sceneId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "vtt_walls",
				filter: `scene_id=eq.${sceneId}`,
			},
			(payload) => {
				if (!isCurrent() || payload.eventType === "DELETE") return;
				void loadWalls(sceneId);
			},
		)
		.on(
			"postgres_changes",
			{ event: "DELETE", schema: "public", table: "vtt_walls" },
			(payload) => {
				if (!isCurrent()) return;
				applyRemoteWallDelete(realtimeDeleteId(payload.old));
			},
		)
		.subscribe((status) => {
			if (stopped) return;
			if (status === "SUBSCRIBED") {
				if (!sawDrop) return;
				sawDrop = false;
				if (useVTTStore.getState().activeSceneId !== sceneId) return;
				void loadWalls(sceneId);
				return;
			}
			if (
				status === "CHANNEL_ERROR" ||
				status === "TIMED_OUT" ||
				status === "CLOSED"
			)
				sawDrop = true;
		});
	return () => {
		stopped = true;
		void client.removeChannel(channel);
	};
}

async function persistNow(op: WallOp): Promise<boolean> {
	const client = getSupabase();
	if (!client) return false;
	try {
		if (op.kind === "move") {
			// Cada parede tem coordenadas próprias: uma gravação por parede, juntas.
			// `select("id")` mostra se a linha foi mesmo atualizada (a política de
			// segurança devolve 0 linhas, sem erro, quando recusa).
			const results = await Promise.all(
				op.moves.map((m) =>
					client
						.from("vtt_walls")
						.update({
							x1: m.to.x1,
							y1: m.to.y1,
							x2: m.to.x2,
							y2: m.to.y2,
						})
						.eq("id", m.id)
						.select("id"),
				),
			);
			return results.every((r) => !r.error && (r.data?.length ?? 0) > 0);
		}
		if (op.kind === "create") {
			const { error } = await client.from("vtt_walls").insert(
				op.walls.map((w) => ({
					id: w.id,
					scene_id: w.sceneId,
					x1: w.x1,
					y1: w.y1,
					x2: w.x2,
					y2: w.y2,
					kind: w.kind ?? "wall",
					is_open: isOpenable(w) && w.isOpen === true,
				})),
			);
			return !error;
		}
		const { error } = await client
			.from("vtt_walls")
			.delete()
			.in(
				"id",
				op.walls.map((w) => w.id),
			);
		return !error;
	} catch {
		return false;
	}
}

// As gravações saem em fila: desenhar uma parede e arrastá-la logo em seguida (ou
// desfazer um movimento ainda em voo) chegam ao banco na ordem em que aconteceram.
let persistQueue: Promise<unknown> = Promise.resolve();

function persist(op: WallOp): Promise<boolean> {
	const run = persistQueue.then(() => persistNow(op));
	persistQueue = run.catch(() => false);
	return run;
}

type Source = "do" | "undo" | "redo";

/**
 * Aplica `op` na hora (otimista) e grava. Se a gravação falhar, desfaz o
 * efeito local, devolve o histórico ao que era e avisa com toast.
 */
export async function runWallOp(op: WallOp, source: Source): Promise<boolean> {
	if (op.kind === "move" ? op.moves.length === 0 : op.walls.length === 0)
		return true;
	const store = useVTTStore.getState();
	const sceneId = store.activeSceneId;
	const prevUndo = store.wallUndo;
	const prevRedo = store.wallRedo;
	const prevSelected = store.selectedWallIds;
	const applied = source === "undo" ? invertWallOp(op) : op;

	store.applyWallOpLocal(applied);
	if (source === "do") store.setWallHistory([...prevUndo, op], []);
	if (source === "undo")
		store.setWallHistory(prevUndo.slice(0, -1), [...prevRedo, op]);
	if (source === "redo")
		store.setWallHistory([...prevUndo, op], prevRedo.slice(0, -1));

	if (applied.kind === "move") holdMoves(applied.moves);
	const ok = await persist(applied);
	if (applied.kind === "move")
		releaseMoves(applied.moves, ok ? MOVE_GRACE_MS : 0);
	if (ok) return true;

	const now = useVTTStore.getState();
	if (now.activeSceneId !== sceneId) return false;
	now.applyWallOpLocal(invertWallOp(applied));
	now.setWallHistory(prevUndo, prevRedo);
	if (applied.kind === "move") {
		// Falhou no meio de um lote: o banco pode ter aceitado parte dele; a
		// mesa confere com o que está salvo.
		if (sceneId) void loadWalls(sceneId);
		showToast("error", {
			title: "Não foi possível mover a parede",
			description: "A mesa voltou ao que estava antes.",
		});
		return false;
	}
	if (applied.kind === "delete") {
		// Falhou ao apagar: a parede volta já selecionada, como estava.
		const back = new Set(applied.walls.map((w) => w.id));
		const keep = prevSelected.filter((id) => back.has(id));
		const current = useVTTStore.getState().selectedWallIds;
		now.setSelectedWallIds([
			...current,
			...keep.filter((id) => !current.includes(id)),
		]);
	}
	showToast("error", {
		title:
			applied.kind === "create"
				? "Não foi possível salvar a parede"
				: "Não foi possível apagar a parede",
		description: "A mesa voltou ao que estava antes.",
	});
	return false;
}

const KIND_NOUN: Record<WallKind, string> = {
	wall: "parede",
	door: "porta",
	window: "janela",
};

const newWallId = () => crypto.randomUUID();

/** Encerra a polilinha em desenho e grava os segmentos (se houver). */
export function finishWallDraft(): void {
	const store = useVTTStore.getState();
	const sceneId = store.activeSceneId;
	const points = store.wallDraft;
	store.setWallDraft([]);
	if (!sceneId || points.length < 2) return;
	const walls = draftToWalls(points, sceneId, newWallId, store.wallKind);
	if (walls.length > 0) void runWallOp({ kind: "create", walls }, "do");
}

export function deleteSelectedWalls(): void {
	flushWallNudge();
	const { walls, selectedWallIds } = useVTTStore.getState();
	if (selectedWallIds.length === 0) return;
	const ids = new Set(selectedWallIds);
	const doomed: VTTWall[] = walls.filter((w) => ids.has(w.id));
	void runWallOp({ kind: "delete", walls: doomed }, "do");
}

/** Grava um movimento já decidido (soltar o arrasto): uma gravação, um passo no desfazer. */
export function commitWallMoves(moves: readonly WallMove[]): void {
	if (moves.length === 0) return;
	void runWallOp({ kind: "move", moves: [...moves] }, "do");
}

/* Ajuste fino pelas setas: cada toque anda na hora (otimista) e o lote todo vira UMA
   gravação e UM passo no desfazer quando a pessoa para de apertar. */
interface NudgeBatch {
	sceneId: string | null;
	/** Posição de cada parede antes do primeiro toque do lote. */
	before: Map<string, WallCoords>;
	timer: ReturnType<typeof setTimeout>;
}
let nudgeBatch: NudgeBatch | null = null;
let lastNudgeAt = 0;

/** Fecha o lote de setas agora: grava e registra no histórico (se saiu do lugar). */
export function flushWallNudge(): void {
	const batch = nudgeBatch;
	if (!batch) return;
	nudgeBatch = null;
	clearTimeout(batch.timer);
	const { walls, activeSceneId } = useVTTStore.getState();
	const ids = new Set(batch.before.keys());
	const original = walls
		.filter((w) => ids.has(w.id))
		.map((w) => ({ ...w, ...batch.before.get(w.id) }));
	const moves = movesBetween(original, walls, ids);
	// O lote segurava a posição de cada parede; sem saldo (foi e voltou) ou em
	// outra cena não há o que gravar, então só solta.
	if (activeSceneId !== batch.sceneId || moves.length === 0) {
		for (const id of ids) pendingMoves.delete(id);
		return;
	}
	void runWallOp({ kind: "move", moves }, "do");
}

/**
 * Empurra as paredes selecionadas por (dx, dy) px do mapa. Segurar a seta repete,
 * mas com um intervalo mínimo; `now` só existe para teste.
 */
export function nudgeSelectedWalls(
	dx: number,
	dy: number,
	repeat = false,
	now: number = Date.now(),
): boolean {
	const store = useVTTStore.getState();
	if (store.selectedWallIds.length === 0) return false;
	if (repeat && now - lastNudgeAt < NUDGE_REPEAT_MS) return true;
	lastNudgeAt = now;
	const ids = new Set(store.selectedWallIds);
	const targets = store.walls.filter((w) => ids.has(w.id));
	if (targets.length === 0) return false;

	if (!nudgeBatch) {
		nudgeBatch = {
			sceneId: store.activeSceneId,
			before: new Map(targets.map((w) => [w.id, wallCoordsOf(w)])),
			timer: setTimeout(flushWallNudge, NUDGE_FLUSH_MS),
		};
	} else {
		clearTimeout(nudgeBatch.timer);
		nudgeBatch.timer = setTimeout(flushWallNudge, NUDGE_FLUSH_MS);
	}
	const moved = targets.map((w) => ({ ...w, ...translateCoords(w, dx, dy) }));
	const next = new Map(moved.map((w) => [w.id, w]));
	store.setWalls(store.walls.map((w) => next.get(w.id) ?? w));
	// Enquanto o lote não grava, uma recarga não pode desfazer o que já andou.
	holdMoves(
		moved.map((w) => ({
			id: w.id,
			from: nudgeBatch?.before.get(w.id) ?? wallCoordsOf(w),
			to: wallCoordsOf(w),
		})),
	);
	return true;
}

export function undoWall(): void {
	flushWallNudge();
	const op = useVTTStore.getState().wallUndo.at(-1);
	if (op) void runWallOp(op, "undo");
}

export function redoWall(): void {
	flushWallNudge();
	const op = useVTTStore.getState().wallRedo.at(-1);
	if (op) void runWallOp(op, "redo");
}

/**
 * Teclas da ferramenta Parede (já passadas pelo shortcut-guard). Devolve true
 * se tratou a tecla.
 */
function activeGridSize(): number {
	const { scenes, activeSceneId } = useVTTStore.getState();
	return scenes.find((scene) => scene.id === activeSceneId)?.gridSize ?? 70;
}

export function handleWallKey(e: KeyboardEvent): boolean {
	const s = useVTTStore.getState();
	if (!s.isGM || s.activeTool !== "wall") return false;
	const mod = e.ctrlKey || e.metaKey;
	const key = e.key.toLowerCase();
	if (mod && key === "z") {
		if (e.shiftKey) redoWall();
		else undoWall();
		return true;
	}
	if (mod && key === "y") {
		redoWall();
		return true;
	}
	if (mod) return false;
	const drawing = s.wallDraft.length > 0;
	// Setas: empurram a seleção (1 px; Shift 10 px; Alt a casa inteira da grade).
	const step = nudgeDelta(e.key, {
		shift: e.shiftKey,
		alt: e.altKey,
		gridSize: activeGridSize(),
	});
	if (step && !drawing && s.selectedWallIds.length > 0) {
		if (isWallDragging()) return true;
		return nudgeSelectedWalls(step.dx, step.dy, e.repeat);
	}
	if (e.altKey) return false;
	if (e.key === "Escape" || e.key === "Enter") {
		if (!drawing) return false;
		finishWallDraft();
		return true;
	}
	if (e.key === "Backspace" && drawing) {
		// Desenhando: remove o último ponto (com 1 ponto, cancela o desenho).
		s.setWallDraft(s.wallDraft.slice(0, -1));
		return true;
	}
	if (
		(e.key === "Delete" || e.key === "Backspace") &&
		s.selectedWallIds.length
	) {
		deleteSelectedWalls();
		return true;
	}
	return false;
}

/* ------------------------------------------------------------------ */
/* Portas                                                              */
/* ------------------------------------------------------------------ */

function doorErrorMessage(error: unknown, noun: string): string {
	const e = (error ?? {}) as { code?: string | null; message?: string | null };
	if (e.code === "PGRST202" || e.code === "42883")
		return "Portas e janelas ainda não estão disponíveis no servidor.";
	if (e.code === "42501")
		return e.message || `Você não pode abrir esta ${noun} agora.`;
	if (e.code === "P0002") return `Essa ${noun} não existe mais.`;
	return `A ${noun} voltou ao que estava.`;
}

function setDoorLocal(wallId: string, open: boolean): void {
	const store = useVTTStore.getState();
	store.setWalls(
		patchWalls(store.walls, new Set([wallId]), (w) => ({ ...w, isOpen: open })),
	);
}

/**
 * Abre ou fecha uma porta: a tela muda na hora (a visão do mapa acompanha) e a
 * função do banco confirma. Se o servidor recusar, a porta volta e um aviso diz
 * por quê. Não desfaz se outra pessoa mexeu na mesma porta nesse meio tempo.
 */
export async function toggleDoor(
	wallId: string,
	open: boolean,
): Promise<boolean> {
	const door = useVTTStore.getState().walls.find((w) => w.id === wallId);
	if (!door || !isOpenable(door)) return false;
	const noun = door.kind === "window" ? "janela" : "porta";
	const previous = door.isOpen === true;
	if (previous === open) return true;

	setDoorLocal(wallId, open);
	try {
		const client = getSupabase();
		if (!client) throw { code: "offline" };
		const { error } = await client.rpc("toggle_wall_door", {
			p_wall_id: wallId,
			p_open: open,
		});
		if (error) throw error;
		return true;
	} catch (error) {
		const now = useVTTStore.getState().walls.find((w) => w.id === wallId);
		if (now && now.isOpen === open) setDoorLocal(wallId, previous);
		showToast("error", {
			title: open
				? `Não foi possível abrir a ${noun}`
				: `Não foi possível fechar a ${noun}`,
			description: doorErrorMessage(error, noun),
		});
		return false;
	}
}

/**
 * Mestre: troca o tipo das paredes escolhidas (parede, porta ou janela). Porta e
 * janela nascem fechadas e a parede perde o estado. Otimista, com volta se o
 * banco recusar.
 */
export async function setWallsKind(
	ids: readonly string[],
	kind: WallKind,
): Promise<boolean> {
	if (ids.length === 0) return true;
	const store = useVTTStore.getState();
	const wanted = new Set(ids);
	const before = store.walls.filter((w) => wanted.has(w.id));
	const changing = before.filter((w) => (w.kind ?? "wall") !== kind);
	if (changing.length === 0) return true;
	const targets = new Set(changing.map((w) => w.id));

	store.setWalls(
		patchWalls(store.walls, targets, (w) => withWallKind(w, kind)),
	);
	try {
		const client = getSupabase();
		if (!client) throw { code: "offline" };
		const { error } = await client
			.from("vtt_walls")
			.update({ kind, is_open: false })
			.in("id", [...targets]);
		if (error) throw error;
		return true;
	} catch {
		const now = useVTTStore.getState();
		const original = new Map(changing.map((w) => [w.id, w]));
		now.setWalls(
			patchWalls(now.walls, targets, (w) => original.get(w.id) ?? w),
		);
		showToast("error", {
			title: `Não foi possível transformar em ${KIND_NOUN[kind]}`,
			description: "As paredes voltaram ao que estavam.",
		});
		return false;
	}
}
