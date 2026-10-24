import { showToast } from "@/components/ui/toast";
import { getSupabase } from "@/lib/supabase";
import { useVTTStore } from "./vtt-store";
import {
	draftToWalls,
	invertWallOp,
	isMissingWallsTable,
	type VTTWall,
	type WallOp,
} from "./walls";

/**
 * Paredes F1: carregar (só mestre), criar/apagar com save otimista e
 * rollback, e o histórico de desfazer/refazer só de paredes, por sessão.
 * Funções simples sobre a store (sem React), chamadas pelos handlers do canvas
 * e dos atalhos.
 */

let loadRequest = 0;

export async function loadWalls(sceneId: string): Promise<void> {
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
		.select("id, scene_id, x1, y1, x2, y2")
		.eq("scene_id", sceneId)
		.order("created_at", { ascending: true });
	const now = useVTTStore.getState();
	if (requestId !== loadRequest || now.activeSceneId !== sceneId) return;
	if (error) {
		now.setWalls([]);
		now.setWallsStatus(isMissingWallsTable(error) ? "missing" : "error");
		return;
	}
	now.setWalls(
		(data ?? []).map((r) => ({
			id: r.id,
			sceneId: r.scene_id,
			x1: Number(r.x1),
			y1: Number(r.y1),
			x2: Number(r.x2),
			y2: Number(r.y2),
		})),
	);
	now.setWallsStatus("ready");
}

async function persist(op: WallOp): Promise<boolean> {
	const client = getSupabase();
	if (!client) return false;
	try {
		if (op.kind === "create") {
			const { error } = await client.from("vtt_walls").insert(
				op.walls.map((w) => ({
					id: w.id,
					scene_id: w.sceneId,
					x1: w.x1,
					y1: w.y1,
					x2: w.x2,
					y2: w.y2,
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

type Source = "do" | "undo" | "redo";

/**
 * Aplica `op` na hora (otimista) e grava. Se a gravação falhar, desfaz o
 * efeito local, devolve o histórico ao que era e avisa com toast.
 */
export async function runWallOp(op: WallOp, source: Source): Promise<boolean> {
	if (op.walls.length === 0) return true;
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

	const ok = await persist(applied);
	if (ok) return true;

	const now = useVTTStore.getState();
	if (now.activeSceneId !== sceneId) return false;
	now.applyWallOpLocal(invertWallOp(applied));
	now.setWallHistory(prevUndo, prevRedo);
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

const newWallId = () => crypto.randomUUID();

/** Encerra a polilinha em desenho e grava os segmentos (se houver). */
export function finishWallDraft(): void {
	const store = useVTTStore.getState();
	const sceneId = store.activeSceneId;
	const points = store.wallDraft;
	store.setWallDraft([]);
	if (!sceneId || points.length < 2) return;
	const walls = draftToWalls(points, sceneId, newWallId);
	if (walls.length > 0) void runWallOp({ kind: "create", walls }, "do");
}

export function deleteSelectedWalls(): void {
	const { walls, selectedWallIds } = useVTTStore.getState();
	if (selectedWallIds.length === 0) return;
	const ids = new Set(selectedWallIds);
	const doomed: VTTWall[] = walls.filter((w) => ids.has(w.id));
	void runWallOp({ kind: "delete", walls: doomed }, "do");
}

export function undoWall(): void {
	const op = useVTTStore.getState().wallUndo.at(-1);
	if (op) void runWallOp(op, "undo");
}

export function redoWall(): void {
	const op = useVTTStore.getState().wallRedo.at(-1);
	if (op) void runWallOp(op, "redo");
}

/**
 * Teclas da ferramenta Parede (já passadas pelo shortcut-guard). Devolve true
 * se tratou a tecla.
 */
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
	if (mod || e.altKey) return false;
	const drawing = s.wallDraft.length > 0;
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
