import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ExploredMeta,
	encodeBits,
	exploredMeta,
	isExplored,
	markIndexes,
} from "./explored";
import { useExploredStore } from "./explored-store";
import {
	createExploredSync,
	type ExploredBroadcast,
	type RpcResult,
	readExploredCells,
	readExploredReset,
} from "./explored-sync";
import { visibilityPolygon } from "./vision";

const meta: ExploredMeta = { cell: 35, cols: 40, rows: 30 };
const ok: RpcResult = { data: null, error: null };

function setup(
	rpcImpl?: (name: string, args: Record<string, unknown>) => Promise<RpcResult>,
) {
	const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
	const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
		calls.push({ name, args });
		return rpcImpl ? rpcImpl(name, args) : ok;
	});
	const sent: Array<{ event: string; payload: Record<string, unknown> }> = [];
	const broadcast: ExploredBroadcast = (event, payload) =>
		sent.push({ event, payload });
	const sync = createExploredSync({
		rpc,
		setTimer: (fn, ms) => setTimeout(fn, ms),
		clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
	});
	sync.bind(broadcast);
	return { sync, rpc, calls, sent };
}

beforeEach(() => {
	vi.useFakeTimers();
	useExploredStore.setState({ sceneId: null, grid: null, version: 0 });
});
afterEach(() => vi.useRealTimers());

describe("gravar a exploração", () => {
	it("agrupa os passos de 1 s em UMA chamada, com os dados da grade", async () => {
		const { sync, calls, sent } = setup();
		sync.track("s1", meta, [1, 2, 3]);
		await vi.advanceTimersByTimeAsync(300);
		sync.track("s1", meta, [3, 4]);
		expect(calls).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(800);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({
			name: "explore_scene_cells",
			args: {
				p_scene_id: "s1",
				p_cell_px: 35,
				p_cols: 40,
				p_rows: 30,
				p_cells: [1, 2, 3, 4],
			},
		});
		expect(sent).toEqual([
			{
				event: "explored_cells",
				payload: { sceneId: "s1", cells: [1, 2, 3, 4] },
			},
		]);
		expect(sync.pendingCount()).toBe(0);
	});

	it("sem células novas não chama nada", async () => {
		const { sync, rpc } = setup();
		sync.track("s1", meta, []);
		await vi.advanceTimersByTimeAsync(5000);
		expect(rpc).not.toHaveBeenCalled();
	});

	it("divide em blocos de 1500 (o banco aceita até 2000)", async () => {
		const { sync, calls } = setup();
		sync.track(
			"s1",
			meta,
			Array.from({ length: 3200 }, (_, i) => i),
		);
		await vi.advanceTimersByTimeAsync(1100);
		expect(calls.map((c) => (c.args.p_cells as number[]).length)).toEqual([
			1500, 1500, 200,
		]);
	});

	it("cenas diferentes são gravadas separadas", async () => {
		const { sync, calls } = setup();
		sync.track("s1", meta, [1]);
		sync.track("s2", meta, [2]);
		await vi.advanceTimersByTimeAsync(1100);
		expect(calls.map((c) => c.args.p_scene_id).sort()).toEqual(["s1", "s2"]);
	});

	it("falha de rede: guarda as células e tenta de novo em 5 s, sem perder nada", async () => {
		let fail = true;
		const { sync, calls } = setup(async () => {
			if (fail) throw new Error("offline");
			return ok;
		});
		sync.track("s1", meta, [1, 2]);
		await vi.advanceTimersByTimeAsync(1100);
		expect(calls).toHaveLength(1);
		expect(sync.pendingCount()).toBe(2);
		sync.track("s1", meta, [3]);
		fail = false;
		await vi.advanceTimersByTimeAsync(5100);
		expect(calls.length).toBeGreaterThanOrEqual(2);
		expect(calls.at(-1)?.args.p_cells).toEqual([1, 2, 3]);
		expect(sync.pendingCount()).toBe(0);
	});

	it("erro do banco também tenta de novo", async () => {
		let fail = true;
		const { sync, calls } = setup(async () =>
			fail ? { data: null, error: { code: "XX000", message: "boom" } } : ok,
		);
		sync.track("s1", meta, [9]);
		await vi.advanceTimersByTimeAsync(1100);
		expect(sync.pendingCount()).toBe(1);
		fail = false;
		await vi.advanceTimersByTimeAsync(5100);
		expect(calls).toHaveLength(2);
		expect(sync.pendingCount()).toBe(0);
	});

	it("sem permissão (42501): descarta, sem insistir", async () => {
		const { sync, calls } = setup(async () => ({
			data: null,
			error: { code: "42501" },
		}));
		sync.track("s1", meta, [1]);
		await vi.advanceTimersByTimeAsync(20000);
		expect(calls).toHaveLength(1);
		expect(sync.pendingCount()).toBe(0);
	});

	it("função ausente no banco (migration pendente): desliga a gravação, a mesa segue", async () => {
		const { sync, rpc } = setup(async () => ({
			data: null,
			error: { code: "PGRST202" },
		}));
		sync.track("s1", meta, [1]);
		await vi.advanceTimersByTimeAsync(1100);
		expect(rpc).toHaveBeenCalledTimes(1);
		sync.track("s1", meta, [2, 3]);
		await vi.advanceTimersByTimeAsync(20000);
		expect(rpc).toHaveBeenCalledTimes(1);
		expect(await sync.load("s1", meta)).toBe("missing");
	});

	it("flush() grava na hora (fechar a aba)", async () => {
		const { sync, calls } = setup();
		sync.track("s1", meta, [5]);
		await sync.flush();
		expect(calls).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(5000);
		expect(calls).toHaveLength(1);
	});
});

describe("ler a exploração salva", () => {
	function row(cells: number[], m: ExploredMeta = meta) {
		const bits = new Uint8Array(Math.ceil((m.cols * m.rows) / 8));
		for (const c of cells) bits[c >> 3] = (bits[c >> 3] ?? 0) | (1 << (c & 7));
		return {
			cell_px: m.cell,
			cols: m.cols,
			rows: m.rows,
			bits: encodeBits(bits),
			updated_at: "x",
		};
	}

	it("junta o salvo ao que já foi marcado nesta tela (nada se perde)", async () => {
		useExploredStore.getState().ensure("s1", meta);
		useExploredStore.getState().applyRemote("s1", [50]);
		const { sync } = setup(async () => ({
			data: [row([1, 2, 100])],
			error: null,
		}));
		expect(await sync.load("s1", meta)).toBe("ok");
		const grid = useExploredStore.getState().grid;
		expect(grid && [1, 2, 100, 50].every((i) => isExplored(grid, i))).toBe(
			true,
		);
	});

	it("sem nada salvo: vazio", async () => {
		useExploredStore.getState().ensure("s1", meta);
		const { sync } = setup(async () => ({ data: [], error: null }));
		expect(await sync.load("s1", meta)).toBe("empty");
	});

	it("o mapa ou a grade mudou desde que foi salvo: ignora o antigo", async () => {
		useExploredStore.getState().ensure("s1", meta);
		const other = { cell: 50, cols: 20, rows: 20 };
		const { sync } = setup(async () => ({
			data: [row([1], other)],
			error: null,
		}));
		expect(await sync.load("s1", meta)).toBe("empty");
		expect(useExploredStore.getState().version).toBe(1);
	});

	it("dados corrompidos viram erro, sem quebrar", async () => {
		useExploredStore.getState().ensure("s1", meta);
		const bad = { ...row([1]), bits: "%%%" };
		const { sync } = setup(async () => ({ data: [bad], error: null }));
		expect(await sync.load("s1", meta)).toBe("error");
		const { sync: s2 } = setup(async () => {
			throw new Error("x");
		});
		expect(await s2.load("s1", meta)).toBe("error");
	});

	it("o salvo de outra cena não entra na cena atual", async () => {
		useExploredStore.getState().ensure("s2", meta);
		const { sync } = setup(async () => ({ data: [row([1])], error: null }));
		await sync.load("s1", meta);
		const grid = useExploredStore.getState().grid;
		expect(grid && isExplored(grid, 1)).toBe(false);
	});
});

describe("esquecer o mapa", () => {
	it("sucesso: limpa a tela, descarta o pendente e avisa os outros", async () => {
		useExploredStore.getState().ensure("s1", meta);
		useExploredStore.getState().applyRemote("s1", [1, 2]);
		const { sync, sent } = setup();
		sync.track("s1", meta, [1, 2]);
		const result = await sync.reset("s1");
		expect(result).toEqual({ ok: true });
		const grid = useExploredStore.getState().grid;
		expect(grid?.bits.every((b) => b === 0)).toBe(true);
		expect(sync.pendingCount()).toBe(0);
		expect(sent.at(-1)).toEqual({
			event: "explored_reset",
			payload: { sceneId: "s1" },
		});
	});

	it("sem permissão: mensagem clara e nada é limpo", async () => {
		useExploredStore.getState().ensure("s1", meta);
		useExploredStore.getState().applyRemote("s1", [1]);
		const { sync, sent } = setup(async () => ({
			data: null,
			error: { code: "42501" },
		}));
		const result = await sync.reset("s1");
		expect(result.ok).toBe(false);
		expect(!result.ok && result.message).toMatch(/mestre/);
		const grid = useExploredStore.getState().grid;
		expect(grid && isExplored(grid, 1)).toBe(true);
		expect(sent).toHaveLength(0);
	});

	it("falha genérica: mensagem para tentar de novo", async () => {
		const { sync } = setup(async () => {
			throw new Error("offline");
		});
		const result = await sync.reset("s1");
		expect(!result.ok && result.message).toMatch(/Tente de novo/);
	});
});

describe("avisos de outros clientes", () => {
	it("aceita só células inteiras e não negativas", () => {
		expect(
			readExploredCells({ sceneId: "s1", cells: [1, 2.5, -3, "x", 4, null] }),
		).toEqual({
			sceneId: "s1",
			cells: [1, 4],
		});
	});

	it("limita o tamanho do aviso", () => {
		const r = readExploredCells({
			sceneId: "s1",
			cells: Array.from({ length: 50000 }, (_, i) => i),
		});
		expect(r?.cells.length).toBe(4000);
	});

	it("lixo vira null", () => {
		expect(readExploredCells(null)).toBeNull();
		expect(readExploredCells({ cells: [1] })).toBeNull();
		expect(readExploredCells({ sceneId: "s", cells: "no" })).toBeNull();
		expect(readExploredReset({ sceneId: 3 })).toBeNull();
		expect(readExploredReset({ sceneId: "s1" })).toBe("s1");
	});
});

describe("store da exploração", () => {
	const store = () => useExploredStore.getState();

	it("ensure mantém a grade igual e recomeça se a cena ou o tamanho mudam", () => {
		store().ensure("s1", meta);
		const first = store().grid;
		store().ensure("s1", meta);
		expect(store().grid).toBe(first);
		store().ensure("s1", { ...meta, cols: 41 });
		expect(store().grid).not.toBe(first);
		const second = store().grid;
		store().ensure("s2", { ...meta, cols: 41 });
		expect(store().grid).not.toBe(second);
	});

	it("mark devolve só as células novas e só mexe na versão se algo mudou", () => {
		const m = exploredMeta(1000, 800, 70);
		store().ensure("s1", m);
		const poly = visibilityPolygon({ x: 500, y: 400 }, 210, []);
		const v0 = store().version;
		const fresh = store().mark("s1", [poly]);
		expect(fresh.length).toBeGreaterThan(100);
		expect(store().version).toBe(v0 + 1);
		expect(store().mark("s1", [poly])).toEqual([]);
		expect(store().version).toBe(v0 + 1);
	});

	it("outra cena ou sem grade: ignorado", () => {
		expect(
			store().mark("s1", [
				[
					{ x: 0, y: 0 },
					{ x: 9, y: 0 },
					{ x: 9, y: 9 },
				],
			]),
		).toEqual([]);
		store().ensure("s1", meta);
		store().applyRemote("s2", [1]);
		const grid = store().grid;
		expect(grid && isExplored(grid, 1)).toBe(false);
	});

	it("applyRemote só sobe a versão com célula nova", () => {
		store().ensure("s1", meta);
		const v = store().version;
		store().applyRemote("s1", [1, 2]);
		expect(store().version).toBe(v + 1);
		store().applyRemote("s1", [1, 2]);
		expect(store().version).toBe(v + 1);
	});

	it("clear zera as células", () => {
		store().ensure("s1", meta);
		const grid = store().grid;
		if (grid) markIndexes(grid, [1, 2, 3]);
		store().clear("s1");
		expect(store().grid?.bits.every((b) => b === 0)).toBe(true);
	});
});

describe("escurecer de novo (mestre)", () => {
	it("avisa os outros e manda o banco apagar as células, com o tamanho da grade", async () => {
		const { sync, calls, sent } = setup();
		const result = await sync.unexplore("s1", meta, [4, 5, 6]);
		expect(result).toEqual({ ok: true });
		expect(sent).toEqual([
			{
				event: "explored_cleared",
				payload: { sceneId: "s1", cells: [4, 5, 6] },
			},
		]);
		expect(calls).toEqual([
			{
				name: "unexplore_scene_cells",
				args: {
					p_scene_id: "s1",
					p_cell_px: 35,
					p_cols: 40,
					p_rows: 30,
					p_cells: [4, 5, 6],
				},
			},
		]);
	});

	it("nada a apagar: não chama o banco nem avisa", async () => {
		const { sync, rpc, sent } = setup();
		expect(await sync.unexplore("s1", meta, [])).toEqual({ ok: true });
		expect(rpc).not.toHaveBeenCalled();
		expect(sent).toHaveLength(0);
	});

	it("divide em blocos de 1500", async () => {
		const { sync, calls } = setup();
		await sync.unexplore(
			"s1",
			meta,
			Array.from({ length: 3200 }, (_, i) => i),
		);
		expect(calls.map((c) => (c.args.p_cells as number[]).length)).toEqual([
			1500, 1500, 200,
		]);
	});

	it("tira da fila de gravação as células apagadas (senão um envio atrasado as marcaria de novo)", async () => {
		const { sync, calls } = setup();
		sync.track("s1", meta, [1, 2, 3, 4]);
		await sync.unexplore("s1", meta, [2, 3]);
		await sync.flush();
		const explored = calls.filter((c) => c.name === "explore_scene_cells");
		expect(explored).toHaveLength(1);
		expect(explored[0]?.args.p_cells).toEqual([1, 4]);
	});

	it("a fila de outra cena não é mexida", async () => {
		const { sync, calls } = setup();
		sync.track("outra", meta, [2, 3]);
		await sync.unexplore("s1", meta, [2, 3]);
		await sync.flush();
		const explored = calls.filter((c) => c.name === "explore_scene_cells");
		expect(explored[0]?.args.p_cells).toEqual([2, 3]);
	});

	it("sem permissão, função ausente e falha de rede têm mensagens claras", async () => {
		const forbidden = setup(async () => ({
			data: null,
			error: { code: "42501" },
		}));
		const a = await forbidden.sync.unexplore("s1", meta, [1]);
		expect(!a.ok && a.message).toMatch(/mestre ou co-mestre/);
		const missing = setup(async () => ({
			data: null,
			error: { code: "PGRST202" },
		}));
		const b = await missing.sync.unexplore("s1", meta, [1]);
		expect(!b.ok && b.message).toMatch(/ainda não está disponível/);
		const down = setup(async () => {
			throw new Error("offline");
		});
		const c = await down.sync.unexplore("s1", meta, [1]);
		expect(!c.ok && c.message).toMatch(/Não foi possível salvar/);
	});

	it("falhou num bloco: para e avisa (não segue mandando os outros)", async () => {
		let n = 0;
		const { sync, rpc } = setup(async () =>
			++n === 1 ? { data: null, error: { code: "XX000" } } : ok,
		);
		const result = await sync.unexplore(
			"s1",
			meta,
			Array.from({ length: 3200 }, (_, i) => i),
		);
		expect(result.ok).toBe(false);
		expect(rpc).toHaveBeenCalledTimes(1);
	});
});

describe("store · unmark", () => {
	it("apaga as células, sobe a versão só se algo mudou", () => {
		useExploredStore.getState().ensure("s1", meta);
		useExploredStore.getState().applyRemote("s1", [1, 2, 3]);
		const v = useExploredStore.getState().version;
		expect(useExploredStore.getState().unmark("s1", [2, 3, 9])).toBe(2);
		expect(useExploredStore.getState().version).toBe(v + 1);
		expect(useExploredStore.getState().unmark("s1", [2, 3])).toBe(0);
		expect(useExploredStore.getState().version).toBe(v + 1);
		const grid = useExploredStore.getState().grid;
		expect(grid && isExplored(grid, 1)).toBe(true);
		expect(grid && isExplored(grid, 2)).toBe(false);
	});

	it("outra cena ou sem grade: não faz nada", () => {
		expect(useExploredStore.getState().unmark("s1", [1])).toBe(0);
		useExploredStore.getState().ensure("s1", meta);
		useExploredStore.getState().applyRemote("s1", [1]);
		expect(useExploredStore.getState().unmark("s2", [1])).toBe(0);
		const grid = useExploredStore.getState().grid;
		expect(grid && isExplored(grid, 1)).toBe(true);
	});
});
