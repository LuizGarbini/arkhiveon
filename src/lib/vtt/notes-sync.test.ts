// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Res = {
	data?: unknown[] | null;
	error?: { code?: string; message?: string } | null;
};

const h = vi.hoisted(() => ({
	client: null as null | ReturnType<typeof makeClient>,
	calls: [] as { op: string; payload?: unknown; id?: string }[],
	select: { data: [], error: null } as Res,
	insert: (() => Promise.resolve({ error: null })) as (
		row: unknown,
	) => Promise<Res>,
	update: (() => Promise.resolve({ error: null })) as (
		patch: unknown,
		id: string,
	) => Promise<Res>,
	del: (() => Promise.resolve({ error: null })) as (id: string) => Promise<Res>,
	selectThrows: false,
}));

function makeClient() {
	return {
		from: () => ({
			select: () => {
				h.calls.push({ op: "select" });
				const chain = {
					eq: () => chain,
					order: () => chain,
					limit: () => {
						if (h.selectThrows) return Promise.reject(new Error("rede"));
						return Promise.resolve(h.select);
					},
				};
				return chain;
			},
			insert: (row: unknown) => {
				h.calls.push({ op: "insert", payload: row });
				return h.insert(row);
			},
			update: (patch: unknown) => ({
				eq: (_col: string, id: string) => {
					h.calls.push({ op: "update", payload: patch, id });
					return h.update(patch, id);
				},
			}),
			delete: () => ({
				eq: (_col: string, id: string) => {
					h.calls.push({ op: "delete", id });
					return h.del(id);
				},
			}),
		}),
	};
}

vi.mock("@/lib/supabase", () => ({ getSupabase: () => h.client }));

import { NOTE_TITLE_MAX, type VttNote } from "./notes";
import { useNotesStore } from "./notes-store";
import {
	createNote,
	editNote,
	flushAllNotes,
	flushNote,
	loadNotes,
	NOTE_AUTOSAVE_MS,
	removeNoteById,
	resetNotesSync,
} from "./notes-sync";

const row = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	campaign_id: "c1",
	title: `T${id}`,
	body: `B${id}`,
	created_at: "2026-11-14T10:00:00Z",
	updated_at: "2026-11-14T10:00:00Z",
	...over,
});
const note = (id: string, over: Partial<VttNote> = {}): VttNote => ({
	id,
	campaignId: "c1",
	title: `T${id}`,
	body: `B${id}`,
	createdAt: "2026-11-14T10:00:00Z",
	updatedAt: "2026-11-14T10:00:00Z",
	...over,
});
const state = () => useNotesStore.getState();
const updates = () => h.calls.filter((c) => c.op === "update");
const deferred = <T>() => {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
};

beforeEach(() => {
	vi.useFakeTimers();
	resetNotesSync();
	useNotesStore.getState().reset();
	useNotesStore.getState().setCampaign("c1");
	h.client = makeClient();
	h.calls = [];
	h.select = { data: [], error: null };
	h.selectThrows = false;
	h.insert = () => Promise.resolve({ error: null });
	h.update = () => Promise.resolve({ error: null });
	h.del = () => Promise.resolve({ error: null });
});
afterEach(() => {
	vi.useRealTimers();
});

describe("loadNotes", () => {
	it("carrega as notas da campanha", async () => {
		h.select = { data: [row("a"), row("b")], error: null };
		await loadNotes("c1");
		expect(state().status).toBe("ready");
		expect(state().notes.map((n) => n.id)).toEqual(["a", "b"]);
	});

	it("ignora linhas que não são notas", async () => {
		h.select = { data: [row("a"), { lixo: 1 }, null], error: null };
		await loadNotes("c1");
		expect(state().notes.map((n) => n.id)).toEqual(["a"]);
	});

	it("tabela ainda não existe no banco: status missing", async () => {
		h.select = { data: null, error: { code: "42P01", message: "x" } };
		await loadNotes("c1");
		expect(state().status).toBe("missing");
		h.select = { data: null, error: { code: "PGRST205", message: "x" } };
		await loadNotes("c1");
		expect(state().status).toBe("missing");
	});

	it("outro erro: status error; falha de rede também", async () => {
		h.select = { data: null, error: { code: "XX", message: "boom" } };
		await loadNotes("c1");
		expect(state().status).toBe("error");
		h.selectThrows = true;
		await loadNotes("c1");
		expect(state().status).toBe("error");
	});

	it("sem cliente do Supabase: status error", async () => {
		h.client = null;
		await loadNotes("c1");
		expect(state().status).toBe("error");
	});

	it("trocar de campanha limpa as notas da anterior", async () => {
		h.select = { data: [row("a")], error: null };
		await loadNotes("c1");
		h.select = { data: [row("z", { campaign_id: "c2" })], error: null };
		await loadNotes("c2");
		expect(state().campaignId).toBe("c2");
		expect(state().notes.map((n) => n.id)).toEqual(["z"]);
	});

	it("não pisa em texto digitado e ainda não gravado", async () => {
		h.select = { data: [row("a")], error: null };
		await loadNotes("c1");
		editNote("a", { body: "digitei isto agora" });
		h.select = {
			data: [row("a", { body: "versão velha do banco" })],
			error: null,
		};
		await loadNotes("c1");
		expect(state().notes[0]?.body).toBe("digitei isto agora");
	});

	it("nota recém-criada, ainda gravando, não some se uma recarga chegar antes do banco conhecê-la", async () => {
		const gate = deferred<Res>();
		h.insert = () => gate.promise;
		const created = createNote();
		const id = state().notes[0]?.id as string;
		h.select = { data: [row("outra")], error: null }; // o banco ainda não tem a nova
		await loadNotes("c1");
		expect(
			state()
				.notes.map((n) => n.id)
				.sort(),
		).toEqual([id, "outra"].sort());
		gate.resolve({ error: null });
		await created;
		expect(state().saveState[id]).toBe("saved");
	});

	it("uma resposta antiga não sobrescreve uma carga mais nova", async () => {
		const slow = deferred<Res>();
		let first = true;
		const base = makeClient();
		h.client = {
			from: () => ({
				...base.from(),
				select: () => {
					const chain = {
						eq: () => chain,
						order: () => chain,
						limit: () => {
							if (first) {
								first = false;
								return slow.promise;
							}
							return Promise.resolve({ data: [row("novo")], error: null });
						},
					};
					return chain;
				},
			}),
		} as unknown as ReturnType<typeof makeClient>;
		const p1 = loadNotes("c1");
		await loadNotes("c1");
		slow.resolve({ data: [row("velho")], error: null });
		await p1;
		expect(state().notes.map((n) => n.id)).toEqual(["novo"]);
	});
});

describe("createNote", () => {
	it("a nota aparece e abre na hora; o banco recebe id e campanha", async () => {
		const gate = deferred<Res>();
		h.insert = () => gate.promise;
		const p = createNote();
		expect(state().notes).toHaveLength(1);
		const id = state().notes[0]?.id as string;
		expect(state().activeId).toBe(id);
		expect(state().saveState[id]).toBe("saving");
		gate.resolve({ error: null });
		expect(await p).toBe(id);
		expect(state().saveState[id]).toBe("saved");
		expect(h.calls.find((c) => c.op === "insert")?.payload).toEqual({
			id,
			campaign_id: "c1",
			title: "",
			body: "",
		});
	});

	it("falha no banco: a nota some e aparece o aviso", async () => {
		h.insert = () => Promise.resolve({ error: { code: "XX", message: "x" } });
		expect(await createNote()).toBeNull();
		expect(state().notes).toHaveLength(0);
		expect(state().notice).toBe("Não foi possível criar a nota.");
	});

	it("limite do gatilho (54000) tem aviso próprio", async () => {
		h.insert = () =>
			Promise.resolve({ error: { code: "54000", message: "x" } });
		await createNote();
		expect(state().notice).toBe("Limite de 200 notas por campanha.");
	});

	it("tabela ausente: avisa que depende da atualização do banco", async () => {
		h.insert = () =>
			Promise.resolve({ error: { code: "42P01", message: "x" } });
		await createNote();
		expect(state().notice).toMatch(/atualização do banco/);
	});

	it("sem conexão (cliente nulo ou erro de rede): some e avisa", async () => {
		h.client = null;
		expect(await createNote()).toBeNull();
		expect(state().notice).toMatch(/Sem conexão/);
		h.client = makeClient();
		h.insert = () => Promise.reject(new Error("rede"));
		expect(await createNote()).toBeNull();
		expect(state().notes).toHaveLength(0);
	});

	it("com 200 notas não cria e nem chama o banco", async () => {
		useNotesStore
			.getState()
			.setNotes(Array.from({ length: 200 }, (_, i) => note(`n${i}`)));
		expect(await createNote()).toBeNull();
		expect(state().notice).toBe("Limite de 200 notas por campanha.");
		expect(h.calls.filter((c) => c.op === "insert")).toHaveLength(0);
	});

	it("sem campanha carregada, não faz nada", async () => {
		useNotesStore.getState().setCampaign(null);
		expect(await createNote()).toBeNull();
		expect(state().notes).toHaveLength(0);
	});
});

describe("editNote · salvar sozinho", () => {
	beforeEach(() => {
		useNotesStore.getState().setNotes([note("a")]);
	});

	it("a tela muda na hora e fica pendente", () => {
		editNote("a", { body: "novo" });
		expect(state().notes[0]?.body).toBe("novo");
		expect(state().saveState.a).toBe("dirty");
		expect(updates()).toHaveLength(0);
	});

	it("várias teclas seguidas viram uma gravação só, com o texto final", async () => {
		editNote("a", { body: "n" });
		await vi.advanceTimersByTimeAsync(300);
		editNote("a", { body: "no" });
		await vi.advanceTimersByTimeAsync(300);
		editNote("a", { body: "nov", title: "Novo título" });
		expect(updates()).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		expect(updates()).toEqual([
			{ op: "update", id: "a", payload: { title: "Novo título", body: "nov" } },
		]);
		expect(state().saveState.a).toBe("saved");
	});

	it("título passa do limite: é cortado em 120", () => {
		editNote("a", { title: "x".repeat(NOTE_TITLE_MAX + 30) });
		expect(state().notes[0]?.title).toHaveLength(NOTE_TITLE_MAX);
	});

	it("valor igual ao que já está não gera gravação", async () => {
		editNote("a", { body: "Ba" });
		await vi.advanceTimersByTimeAsync(2000);
		expect(updates()).toHaveLength(0);
		expect(state().saveState.a).toBeUndefined();
	});

	it("nota que não existe é ignorada", async () => {
		editNote("nada", { body: "x" });
		await vi.advanceTimersByTimeAsync(2000);
		expect(updates()).toHaveLength(0);
	});

	it("flushNote grava na hora e o timer não grava de novo", async () => {
		editNote("a", { body: "agora" });
		await flushNote("a");
		expect(updates()).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(5000);
		expect(updates()).toHaveLength(1);
		expect(state().saveState.a).toBe("saved");
	});

	it("flushNote de uma nota já salva não chama o banco", async () => {
		await flushNote("a");
		expect(updates()).toHaveLength(0);
	});

	it("digitar durante a gravação: grava de novo e termina salvo com o texto final", async () => {
		const gate = deferred<Res>();
		let n = 0;
		h.update = () =>
			++n === 1 ? gate.promise : Promise.resolve({ error: null });
		editNote("a", { body: "um" });
		await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		expect(state().saveState.a).toBe("saving");
		editNote("a", { body: "um dois" });
		gate.resolve({ error: null });
		await vi.advanceTimersByTimeAsync(0);
		expect(state().saveState.a).toBe("dirty"); // a primeira resposta não "salva" a edição nova
		await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		expect(updates()).toHaveLength(2);
		expect(updates()[1]?.payload).toMatchObject({ body: "um dois" });
		expect(state().saveState.a).toBe("saved");
	});

	it("falha ao gravar: marca erro, o texto continua na tela e dá para tentar de novo", async () => {
		h.update = () => Promise.resolve({ error: { code: "XX", message: "x" } });
		editNote("a", { body: "importante" });
		await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		expect(state().saveState.a).toBe("error");
		expect(state().notes[0]?.body).toBe("importante");
		h.update = () => Promise.resolve({ error: null });
		await flushNote("a");
		expect(state().saveState.a).toBe("saved");
		expect(updates()).toHaveLength(2);
	});

	it("falha de rede (exceção) também vira erro, sem perder o texto", async () => {
		h.update = () => Promise.reject(new Error("rede"));
		editNote("a", { body: "não perder" });
		await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		expect(state().saveState.a).toBe("error");
		expect(state().notes[0]?.body).toBe("não perder");
	});

	it("sem cliente do Supabase: erro, texto mantido", async () => {
		h.client = null;
		editNote("a", { body: "offline" });
		await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		expect(state().saveState.a).toBe("error");
		expect(state().notes[0]?.body).toBe("offline");
	});

	it("flushAllNotes grava todas as pendentes de uma vez", async () => {
		useNotesStore.getState().setNotes([note("a"), note("b"), note("c")]);
		editNote("a", { body: "1" });
		editNote("c", { body: "3" });
		await flushAllNotes();
		expect(
			updates()
				.map((u) => u.id)
				.sort(),
		).toEqual(["a", "c"]);
		expect(state().saveState.a).toBe("saved");
		expect(state().saveState.c).toBe("saved");
		expect(state().saveState.b).toBeUndefined();
	});
});

describe("removeNoteById", () => {
	beforeEach(() => {
		useNotesStore.getState().setNotes([note("a"), note("b")]);
		useNotesStore.getState().openNote("a");
	});

	it("some da tela na hora e fecha o editor; o banco apaga", async () => {
		const gate = deferred<Res>();
		h.del = () => gate.promise;
		const p = removeNoteById("a");
		expect(state().notes.map((n) => n.id)).toEqual(["b"]);
		expect(state().activeId).toBeNull();
		gate.resolve({ error: null });
		await p;
		expect(h.calls.find((c) => c.op === "delete")?.id).toBe("a");
		expect(state().notes.map((n) => n.id)).toEqual(["b"]);
	});

	it("banco recusou: a nota volta, o editor reabre e aparece o aviso", async () => {
		h.del = () => Promise.resolve({ error: { code: "XX", message: "x" } });
		await removeNoteById("a");
		expect(
			state()
				.notes.map((n) => n.id)
				.sort(),
		).toEqual(["a", "b"]);
		expect(state().activeId).toBe("a");
		expect(state().notice).toBe(
			"Não foi possível apagar a nota. Ela foi mantida.",
		);
	});

	it("falha de rede ao apagar também devolve a nota", async () => {
		h.del = () => Promise.reject(new Error("rede"));
		await removeNoteById("b");
		expect(
			state()
				.notes.map((n) => n.id)
				.sort(),
		).toEqual(["a", "b"]);
	});

	it("apagar cancela a gravação que estava agendada (nada de update depois do delete)", async () => {
		editNote("a", { body: "vai ser apagada" });
		await removeNoteById("a");
		await vi.advanceTimersByTimeAsync(5000);
		expect(updates()).toHaveLength(0);
		expect(state().notes.map((n) => n.id)).toEqual(["b"]);
	});

	it("apagar enquanto grava não ressuscita a nota", async () => {
		const gate = deferred<Res>();
		h.update = () => gate.promise;
		editNote("a", { body: "x" });
		await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		await removeNoteById("a");
		gate.resolve({ error: null });
		await vi.advanceTimersByTimeAsync(0);
		expect(state().notes.map((n) => n.id)).toEqual(["b"]);
		expect(state().saveState.a).toBeUndefined();
	});

	it("nota que não existe: não faz nada", async () => {
		await removeNoteById("nada");
		expect(h.calls.filter((c) => c.op === "delete")).toHaveLength(0);
	});
});
