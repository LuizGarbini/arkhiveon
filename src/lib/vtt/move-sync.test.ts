import { beforeEach, describe, expect, it, vi } from "vitest";

type ChannelHandler = (payload: Record<string, unknown>) => void;

const db = vi.hoisted(() => ({
	inserts: [] as Record<string, unknown>[],
	/** Resposta de cada tentativa de gravar, na ordem; depois repete `insertError`. */
	insertQueue: [] as ({ code?: string; message?: string } | "throw" | null)[],
	insertError: null as { code?: string; message?: string } | null,
	selectRows: [] as Record<string, unknown>[],
	selectError: null as { code?: string; message?: string } | null,
	selectThrows: false,
	/** O que o banco recebeu em `.order(coluna, { ascending })` e `.limit(n)`. */
	lastOrder: null as { column: string; ascending: boolean } | null,
	lastLimit: null as number | null,
	deletes: 0,
	/** Segura o insert no ar para provar que o próximo lote espera. */
	holdInsert: null as Promise<void> | null,
	channelHandlers: [] as {
		event: string;
		filter?: string;
		handler: (payload: Record<string, unknown>) => void;
	}[],
}));

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		channel: () => {
			const chain = {
				on: (
					_type: string,
					opts: { event: string; filter?: string },
					handler: ChannelHandler,
				) => {
					db.channelHandlers.push({
						event: opts.event,
						filter: opts.filter,
						handler,
					});
					return chain;
				},
				subscribe: () => chain,
			};
			return chain;
		},
		removeChannel: async () => "ok",
		from: () => ({
			insert: async (row: Record<string, unknown>) => {
				db.inserts.push(row);
				if (db.holdInsert) await db.holdInsert;
				const next = db.insertQueue.length
					? db.insertQueue.shift()
					: db.insertError;
				if (next === "throw") throw new Error("rede caiu");
				return { error: next ?? null };
			},
			select: () => ({
				eq: () => ({
					order: (column: string, opts?: { ascending?: boolean }) => {
						db.lastOrder = { column, ascending: opts?.ascending !== false };
						return {
							limit: async (n: number) => {
								db.lastLimit = n;
								if (db.selectThrows) throw new Error("rede caiu");
								// Como o banco: ordena pela coluna e só então corta.
								const sorted = db.selectRows
									.slice()
									.sort((a, b) =>
										String(a[column]).localeCompare(String(b[column])),
									);
								if (!db.lastOrder?.ascending) sorted.reverse();
								return { data: sorted.slice(0, n), error: db.selectError };
							},
						};
					},
				}),
			}),
			delete: () => {
				db.deletes += 1;
				const chain: Promise<{ error: null }> & { eq?: () => unknown } =
					Promise.resolve({ error: null });
				chain.eq = () => chain;
				return chain;
			},
		}),
	}),
}));

import { useMoveStore } from "./move-store";
import {
	clearMoves,
	isMissingMovesTable,
	loadMoves,
	recordMove,
	subscribeMoves,
} from "./move-sync";
import { useVTTStore } from "./vtt-store";

const G = 70;
const at = (col: number, row: number) => ({
	x: (col - 0.5) * G,
	y: (row - 0.5) * G,
});
const scene = {
	id: "s1",
	campaignId: "c1",
	name: "Cripta",
	gridType: "square" as const,
	gridSize: G,
	gridColor: "#fff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m" as const,
	gridOffsetX: 0,
	gridOffsetY: 0,
	mapScale: 1,
	width: 1400,
	height: 900,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
};
const input = {
	sceneId: "s1",
	tokenId: "t1",
	tokenName: "Thorin",
	from: at(1, 1),
	to: at(4, 1),
	authorId: "u1",
	authorName: "Luiz",
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	db.inserts = [];
	db.insertQueue = [];
	db.insertError = null;
	db.lastOrder = null;
	db.lastLimit = null;
	db.channelHandlers = [];
	db.selectRows = [];
	db.selectError = null;
	db.selectThrows = false;
	db.deletes = 0;
	db.holdInsert = null;
	useMoveStore.getState().reset();
	useVTTStore.setState({
		isGM: true,
		isCoGM: false,
		scenes: [scene],
		activeSceneId: "s1",
		diagonalRule: "5105",
	});
});

describe("anotar movimento", () => {
	it("aparece na hora, com a distância, e grava no banco", async () => {
		const move = recordMove(input);
		expect(move?.distance).toBe(4.5);
		expect(move?.unit).toBe("m");
		expect(useMoveStore.getState().moves).toHaveLength(1);
		await flush();
		expect(db.inserts).toHaveLength(1);
		expect(db.inserts[0]).toMatchObject({
			id: move?.id,
			scene_id: "s1",
			token_id: "t1",
			token_name: "Thorin",
			from_x: input.from.x,
			to_x: input.to.x,
			distance: 4.5,
			kind: "move",
			author_id: "u1",
		});
	});

	it("não anota quando o token ficou onde estava", async () => {
		expect(recordMove({ ...input, to: input.from })).toBeNull();
		await flush();
		expect(useMoveStore.getState().moves).toHaveLength(0);
		expect(db.inserts).toHaveLength(0);
	});

	it("servidor recusou a posição: a linha sai do histórico e nada é gravado", async () => {
		recordMove(input, Promise.resolve(false));
		expect(useMoveStore.getState().moves).toHaveLength(1);
		await flush();
		expect(useMoveStore.getState().moves).toHaveLength(0);
		expect(db.inserts).toHaveLength(0);
		// Nada fica marcado como "em gravação" para uma linha que não existe mais.
		expect(useMoveStore.getState().unsavedIds).toEqual([]);
		expect(useMoveStore.getState().failedIds).toEqual([]);
	});

	it("só grava depois que o servidor confirmou a posição", async () => {
		let confirm: (value: unknown) => void = () => {};
		recordMove(
			input,
			new Promise((resolve) => {
				confirm = resolve;
			}),
		);
		await flush();
		expect(db.inserts).toHaveLength(0);
		confirm(true);
		await flush();
		expect(db.inserts).toHaveLength(1);
	});

	it("guarda a rodada do combate quando há combate em andamento", async () => {
		const { useCombatStore } = await import("./combat-store");
		useCombatStore.setState({ status: "ready", round: 3 });
		expect(recordMove(input)?.round).toBe(3);
		useCombatStore.setState({ status: "idle", round: null });
		expect(recordMove(input)?.round).toBeNull();
	});

	it("movimentos do mesmo instante saem num insert só e o seguinte espera a resposta", async () => {
		let release: () => void = () => {};
		db.holdInsert = new Promise((resolve) => {
			release = resolve;
		});
		recordMove(input);
		recordMove({
			...input,
			tokenId: "t2",
			tokenName: "Elara",
			to: at(3, 1),
		});
		await flush();
		expect(db.inserts).toHaveLength(1);
		expect(db.inserts[0]).toEqual([
			expect.objectContaining({ token_id: "t1" }),
			expect.objectContaining({ token_id: "t2" }),
		]);
		recordMove({
			...input,
			tokenId: "t3",
			tokenName: "Dante",
			to: at(5, 1),
		});
		await flush();
		expect(db.inserts).toHaveLength(1);
		release();
		db.holdInsert = null;
		await flush();
		expect(db.inserts).toHaveLength(2);
		expect(db.inserts[1]).toMatchObject({ token_id: "t3" });
	});

	it("jogador grava mas não guarda o histórico na própria tela", async () => {
		useVTTStore.setState({ isGM: false, isCoGM: false });
		recordMove(input);
		await flush();
		expect(useMoveStore.getState().moves).toHaveLength(0);
		expect(db.inserts).toHaveLength(1);
	});

	it("sem a tabela no banco, o histórico vale na sessão e para de tentar gravar", async () => {
		db.insertError = { code: "PGRST205", message: "relation does not exist" };
		recordMove(input);
		await flush();
		expect(useMoveStore.getState().status).toBe("missing");
		expect(useMoveStore.getState().moves).toHaveLength(1);
		recordMove({ ...input, to: at(6, 1) });
		await flush();
		expect(db.inserts).toHaveLength(1);
		expect(useMoveStore.getState().moves).toHaveLength(2);
	});
});

describe("carregar e limpar", () => {
	it("só mestre e co-mestre carregam o histórico", async () => {
		useVTTStore.setState({ isGM: false, isCoGM: false });
		await loadMoves("s1");
		expect(useMoveStore.getState().status).toBe("idle");
	});

	it("co-mestre carrega as linhas do banco", async () => {
		useVTTStore.setState({ isGM: false, isCoGM: true });
		db.selectRows = [
			{
				id: "r1",
				scene_id: "s1",
				token_id: "t1",
				token_name: "Thorin",
				from_x: 35,
				from_y: 35,
				to_x: 245,
				to_y: 35,
				distance: 4.5,
				unit: "m",
				round: null,
				kind: "move",
				author_id: "u1",
				author_name: "Luiz",
				created_at: "2026-11-09T22:00:00.000Z",
			},
			{ id: "quebrada" },
		];
		await loadMoves("s1");
		expect(useMoveStore.getState().status).toBe("ready");
		expect(useMoveStore.getState().moves.map((m) => m.id)).toEqual(["r1"]);
	});

	it("o que acabou de ser anotado não some quando o banco ainda não devolveu", async () => {
		const move = recordMove(input);
		await loadMoves("s1");
		expect(useMoveStore.getState().moves.map((m) => m.id)).toEqual([move?.id]);
	});

	it("falha inesperada na carga vira erro na tela e não estoura", async () => {
		db.selectThrows = true;
		await expect(loadMoves("s1")).resolves.toBeUndefined();
		expect(useMoveStore.getState().status).toBe("error");
	});

	it("tabela ausente na carga vira aviso de sessão, sem erro", async () => {
		db.selectError = { code: "42P01", message: "x" };
		await loadMoves("s1");
		expect(useMoveStore.getState().status).toBe("missing");
		expect(isMissingMovesTable({ code: "PGRST205" })).toBe(true);
		expect(isMissingMovesTable({ code: "23505" })).toBe(false);
	});

	it("limpar apaga no banco e na tela, só o token escolhido quando há filtro", async () => {
		recordMove(input);
		recordMove({ ...input, tokenId: "t2", tokenName: "Elara", to: at(3, 1) });
		useMoveStore.getState().setStatus("ready");
		expect(await clearMoves("s1", "t1")).toBe(true);
		expect(db.deletes).toBe(1);
		expect(useMoveStore.getState().moves.map((m) => m.tokenId)).toEqual(["t2"]);
		expect(await clearMoves("s1")).toBe(true);
		expect(useMoveStore.getState().moves).toHaveLength(0);
	});
});

const row = (n: number, over: Record<string, unknown> = {}) => ({
	id: `r${n}`,
	scene_id: "s1",
	token_id: "t1",
	token_name: "Thorin",
	from_x: 35,
	from_y: 35,
	to_x: 245,
	to_y: 35,
	distance: 4.5,
	unit: "m",
	round: null,
	kind: "move",
	author_id: "u1",
	author_name: "Luiz",
	// Uma por segundo, em ordem.
	created_at: new Date(
		Date.UTC(2026, 10, 9, 22, 0, 0) + n * 1000,
	).toISOString(),
	...over,
});

describe("o que o banco devolve", () => {
	// Causa de "o histórico não guarda": a carga pedia as 1000 linhas MAIS
	// VELHAS (ordem crescente + limite). Passando disso, o movimento novo era
	// gravado mas nunca mais aparecia depois de recarregar.
	it("passando de 1000 linhas, recarregar traz as mais novas", async () => {
		useVTTStore.setState({ isGM: true });
		db.selectRows = Array.from({ length: 1200 }, (_, n) => row(n));
		await loadMoves("s1");
		const ids = useMoveStore.getState().moves.map((m) => m.id);
		expect(ids).toHaveLength(1000);
		expect(ids).toContain("r1199");
		expect(ids).not.toContain("r0");
		// Na tela, em ordem de hora (a mais velha primeiro na lista).
		expect(ids[0]).toBe("r200");
		expect(ids.at(-1)).toBe("r1199");
		expect(db.lastLimit).toBe(1000);
	});

	// Causa de "linhas que somem" e de "fora de ordem" no relógio dos jogadores:
	// a hora gravada era a do computador de quem moveu.
	it("deixa a hora para o servidor (não manda created_at do cliente)", async () => {
		recordMove(input);
		await flush();
		expect(db.inserts).toHaveLength(1);
		expect("created_at" in db.inserts[0]).toBe(false);
	});

	it("a linha que volta pelo tempo real substitui a anotada, com a hora do servidor", async () => {
		const move = recordMove(input);
		await flush();
		const stop = subscribeMoves("s1");
		const insert = db.channelHandlers.find((h) => h.filter);
		expect(insert).toBeDefined();
		insert?.handler({
			eventType: "INSERT",
			new: row(0, {
				id: move?.id,
				created_at: "2000-01-01T00:00:00+00:00",
			}),
		});
		const [only] = useMoveStore.getState().moves;
		expect(useMoveStore.getState().moves).toHaveLength(1);
		expect(only.createdAt).toBe("2000-01-01T00:00:00+00:00");
		stop();
	});

	// "Limpar histórico" feito por outro mestre: o Realtime não entrega DELETE
	// com filtro por coluna (a linha apagada só traz o id), então o ouvinte de
	// DELETE não pode ter filtro.
	it("apagar por outro mestre chega mesmo sem filtro de cena", async () => {
		useMoveStore.getState().setMoves([
			{
				id: "r1",
				sceneId: "s1",
				tokenId: "t1",
				tokenName: "Thorin",
				from: at(1, 1),
				to: at(2, 1),
				distance: 1.5,
				unit: "m",
				round: null,
				kind: "move",
				authorId: "u1",
				authorName: null,
				createdAt: "2026-11-09T22:00:00.000Z",
			},
		]);
		const stop = subscribeMoves("s1");
		const del = db.channelHandlers.find((h) => h.event === "DELETE");
		expect(del).toBeDefined();
		expect(del?.filter).toBeUndefined();
		del?.handler({ eventType: "DELETE", old: { id: "r1" } });
		expect(useMoveStore.getState().moves).toHaveLength(0);
		stop();
	});
});

describe("gravar no banco", () => {
	it("tenta de novo quando a rede falha e acaba gravando", async () => {
		vi.useFakeTimers();
		try {
			db.insertQueue = ["throw", { message: "Failed to fetch" }, null];
			const move = recordMove(input);
			await vi.advanceTimersByTimeAsync(10_000);
			expect(db.inserts).toHaveLength(3);
			expect(db.inserts.every((r) => r.id === move?.id)).toBe(true);
			expect(useMoveStore.getState().failedIds).toEqual([]);
			expect(useMoveStore.getState().unsavedIds).toEqual([]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("desiste depois de algumas tentativas e avisa que não salvou", async () => {
		vi.useFakeTimers();
		try {
			db.insertError = { message: "Failed to fetch" };
			const move = recordMove(input);
			await vi.advanceTimersByTimeAsync(60_000);
			expect(db.inserts).toHaveLength(3);
			expect(useMoveStore.getState().failedIds).toEqual([move?.id]);
			// Continua na tela desta sessão.
			expect(useMoveStore.getState().moves).toHaveLength(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it("recusa do banco (permissão) não repete e avisa que não salvou", async () => {
		db.insertError = { code: "42501", message: "row-level security" };
		const move = recordMove(input);
		await flush();
		expect(db.inserts).toHaveLength(1);
		expect(useMoveStore.getState().failedIds).toEqual([move?.id]);
		expect(useMoveStore.getState().unsavedIds).toEqual([]);
	});

	it("id repetido (23505) quer dizer que já estava gravado: não é falha", async () => {
		db.insertError = { code: "23505", message: "duplicate key" };
		recordMove(input);
		await flush();
		expect(useMoveStore.getState().failedIds).toEqual([]);
		expect(useMoveStore.getState().unsavedIds).toEqual([]);
	});

	// Mexer o token dentro da mesma casa (ou encaixar na grade) não é andar.
	it("encaixar o token no centro da mesma casa não vira movimento de 0 m", async () => {
		const offCenter = { x: at(3, 3).x - 20, y: at(3, 3).y + 15 };
		expect(recordMove({ ...input, from: offCenter, to: at(3, 3) })).toBeNull();
		await flush();
		expect(useMoveStore.getState().moves).toHaveLength(0);
		expect(db.inserts).toHaveLength(0);
	});
});

describe("recarregar não mistura linhas velhas", () => {
	const saved = (id: string) => ({
		id,
		sceneId: "s1",
		tokenId: "t1",
		tokenName: "Thorin",
		from: at(1, 1),
		to: at(2, 1),
		distance: 1.5,
		unit: "m",
		round: null,
		kind: "move" as const,
		authorId: "u1",
		authorName: null,
		createdAt: "2026-11-09T22:00:00.000Z",
	});

	it("linha que já estava no banco e foi apagada por outro mestre sai ao recarregar", async () => {
		useMoveStore.getState().setMoves([saved("apagada")]);
		db.selectRows = [row(1)];
		await loadMoves("s1");
		expect(useMoveStore.getState().moves.map((m) => m.id)).toEqual(["r1"]);
	});

	it("linha ainda sendo gravada continua na tela ao recarregar", async () => {
		let release: (value: unknown) => void = () => {};
		const move = recordMove(
			input,
			new Promise((resolve) => {
				release = resolve;
			}),
		);
		db.selectRows = [row(1)];
		await loadMoves("s1");
		expect(useMoveStore.getState().moves.map((m) => m.id)).toContain(move?.id);
		release(true);
		await flush();
	});

	it("linha que falhou ao gravar continua na tela, sinalizada", async () => {
		db.insertError = { code: "42501", message: "rls" };
		const move = recordMove(input);
		await flush();
		db.selectRows = [row(1)];
		await loadMoves("s1");
		expect(useMoveStore.getState().moves.map((m) => m.id)).toContain(move?.id);
		expect(useMoveStore.getState().failedIds).toEqual([move?.id]);
	});
});
