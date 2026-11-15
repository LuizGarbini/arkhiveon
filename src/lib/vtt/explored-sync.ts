import { getSupabase } from "@/lib/supabase";
import { decodeBits, type ExploredMeta, sameExploredMeta } from "./explored";
import { useExploredStore } from "./explored-store";

/**
 * Sincroniza a memória de exploração: grava no banco (agrupando as células
 * novas, para não fazer uma chamada por passo), avisa os outros clientes por
 * Broadcast e lê o que já estava salvo ao abrir a cena. Falhas nunca derrubam a
 * mesa: a exploração continua local e tenta de novo.
 */

const FLUSH_MS = 1000;
const RETRY_MS = 5000;
/** O banco aceita até 2000 células por chamada; sobra margem. */
const CHUNK = 1500;
/** Teto de células aceitas de um aviso de outro cliente (anti-lixo). */
const MAX_REMOTE_CELLS = 4000;

export interface RpcResult {
	data: unknown;
	error: { code?: string; message?: string } | null;
}

export interface ExploredSyncDeps {
	rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
	setTimer: (fn: () => void, ms: number) => unknown;
	clearTimer: (handle: unknown) => void;
}

export type ExploredBroadcast = (
	event: "explored_cells" | "explored_reset",
	payload: Record<string, unknown>,
) => void;

/** O banco ainda não tem as funções (migration 0071 pendente)? */
function isMissingFunction(error: { code?: string } | null): boolean {
	return error?.code === "PGRST202" || error?.code === "42883";
}

/** Sem permissão (ex.: jogador em cena inativa): não adianta tentar de novo. */
function isForbidden(error: { code?: string } | null): boolean {
	return error?.code === "42501";
}

export function createExploredSync(deps: ExploredSyncDeps) {
	let broadcast: ExploredBroadcast | null = null;
	let unavailable = false;
	let timer: unknown = null;
	const pending = new Map<string, { meta: ExploredMeta; cells: Set<number> }>();

	function schedule(ms: number) {
		if (timer !== null) return;
		timer = deps.setTimer(() => {
			timer = null;
			void flush();
		}, ms);
	}

	/** Acumula células novas de uma cena; grava em até 1 s. */
	function track(
		sceneId: string,
		meta: ExploredMeta,
		cells: readonly number[],
	) {
		if (cells.length === 0) return;
		let entry = pending.get(sceneId);
		if (!entry || !sameExploredMeta(entry.meta, meta)) {
			entry = { meta, cells: new Set() };
			pending.set(sceneId, entry);
		}
		for (const cell of cells) entry.cells.add(cell);
		if (!unavailable) schedule(FLUSH_MS);
	}

	async function flush(): Promise<void> {
		if (timer !== null) {
			deps.clearTimer(timer);
			timer = null;
		}
		if (unavailable) {
			pending.clear();
			return;
		}
		const batches = [...pending.entries()];
		pending.clear();
		let retry = false;
		for (const [sceneId, { meta, cells }] of batches) {
			const all = [...cells];
			for (let i = 0; i < all.length; i += CHUNK) {
				const chunk = all.slice(i, i + CHUNK);
				// Os outros veem na hora; o banco guarda para quem chegar depois.
				broadcast?.("explored_cells", { sceneId, cells: chunk });
				try {
					const { error } = await deps.rpc("explore_scene_cells", {
						p_scene_id: sceneId,
						p_cell_px: meta.cell,
						p_cols: meta.cols,
						p_rows: meta.rows,
						p_cells: chunk,
					});
					if (error) {
						if (isMissingFunction(error)) {
							unavailable = true;
							pending.clear();
							return;
						}
						if (isForbidden(error)) continue;
						throw error;
					}
				} catch {
					requeue(sceneId, meta, all.slice(i));
					retry = true;
					break;
				}
			}
		}
		if (retry) schedule(RETRY_MS);
	}

	function requeue(sceneId: string, meta: ExploredMeta, cells: number[]) {
		let entry = pending.get(sceneId);
		if (!entry || !sameExploredMeta(entry.meta, meta)) {
			entry = { meta, cells: new Set() };
			pending.set(sceneId, entry);
		}
		for (const cell of cells) entry.cells.add(cell);
	}

	/** Lê o que o grupo já explorou nesta cena e junta ao que está na tela. */
	async function load(
		sceneId: string,
		meta: ExploredMeta,
	): Promise<"ok" | "empty" | "missing" | "error"> {
		if (unavailable) return "missing";
		try {
			const { data, error } = await deps.rpc("get_scene_explored", {
				p_scene_id: sceneId,
			});
			if (error) {
				if (isMissingFunction(error)) {
					unavailable = true;
					return "missing";
				}
				return "error";
			}
			const row = Array.isArray(data) ? data[0] : null;
			if (!row || typeof row !== "object") return "empty";
			const saved = row as Partial<
				ExploredMeta & { bits: string; cell_px: number }
			>;
			const savedMeta = {
				cell: Number(saved.cell_px),
				cols: Number(saved.cols),
				rows: Number(saved.rows),
			};
			// O mapa ou a grade mudou desde que foi salvo: a memória antiga não vale.
			if (!sameExploredMeta(savedMeta, meta) || typeof saved.bits !== "string")
				return "empty";
			const bits = decodeBits(
				saved.bits,
				Math.ceil((meta.cols * meta.rows) / 8),
			);
			if (!bits) return "error";
			useExploredStore.getState().mergeServer(sceneId, meta, bits);
			return "ok";
		} catch {
			return "error";
		}
	}

	/** Mestre/co-mestre: esquecer o mapa. */
	async function reset(
		sceneId: string,
	): Promise<{ ok: true } | { ok: false; message: string }> {
		try {
			const { error } = await deps.rpc("reset_scene_explored", {
				p_scene_id: sceneId,
			});
			if (error) {
				return {
					ok: false,
					message: isForbidden(error)
						? "Só o mestre ou co-mestre pode esquecer o mapa."
						: "Não foi possível esquecer o mapa. Tente de novo.",
				};
			}
			pending.delete(sceneId);
			useExploredStore.getState().clear(sceneId);
			broadcast?.("explored_reset", { sceneId });
			return { ok: true };
		} catch {
			return {
				ok: false,
				message: "Não foi possível esquecer o mapa. Tente de novo.",
			};
		}
	}

	return {
		track,
		flush,
		load,
		reset,
		bind(next: ExploredBroadcast | null) {
			broadcast = next;
		},
		/** Só para testes. */
		pendingCount: () =>
			[...pending.values()].reduce((sum, e) => sum + e.cells.size, 0),
	};
}

/** Aviso de outro cliente → células válidas (ou null). */
export function readExploredCells(
	payload: unknown,
): { sceneId: string; cells: number[] } | null {
	if (!payload || typeof payload !== "object") return null;
	const { sceneId, cells } = payload as { sceneId?: unknown; cells?: unknown };
	if (typeof sceneId !== "string" || !Array.isArray(cells)) return null;
	const out: number[] = [];
	for (const cell of cells.slice(0, MAX_REMOTE_CELLS)) {
		if (Number.isInteger(cell) && cell >= 0) out.push(cell as number);
	}
	return { sceneId, cells: out };
}

export function readExploredReset(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const { sceneId } = payload as { sceneId?: unknown };
	return typeof sceneId === "string" ? sceneId : null;
}

/** Instância real, ligada ao Supabase (cada RPC com os tipos do banco). */
export const exploredSync = createExploredSync({
	rpc: async (name, args) => {
		const client = getSupabase();
		if (!client) return { data: null, error: { message: "offline" } };
		switch (name) {
			case "get_scene_explored":
				return client.rpc("get_scene_explored", {
					p_scene_id: String(args.p_scene_id),
				});
			case "explore_scene_cells":
				return client.rpc("explore_scene_cells", {
					p_scene_id: String(args.p_scene_id),
					p_cell_px: Number(args.p_cell_px),
					p_cols: Number(args.p_cols),
					p_rows: Number(args.p_rows),
					p_cells: args.p_cells as number[],
				});
			case "reset_scene_explored":
				return client.rpc("reset_scene_explored", {
					p_scene_id: String(args.p_scene_id),
				});
			default:
				return { data: null, error: { message: `RPC desconhecida: ${name}` } };
		}
	},
	setTimer: (fn, ms) => setTimeout(fn, ms),
	clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
});

if (typeof window !== "undefined") {
	// Ao fechar/esconder a aba, grava o que ainda não foi.
	window.addEventListener("pagehide", () => void exploredSync.flush());
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") void exploredSync.flush();
	});
}
