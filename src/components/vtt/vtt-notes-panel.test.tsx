// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Res = {
	data?: unknown[] | null;
	error?: { code?: string; message?: string } | null;
};

const h = vi.hoisted(() => ({
	mobile: false,
	calls: [] as { op: string; payload?: unknown; id?: string }[],
	select: { data: [], error: null } as Res,
	insert: (() => Promise.resolve({ error: null })) as () => Promise<Res>,
	update: (() => Promise.resolve({ error: null })) as () => Promise<Res>,
	del: (() => Promise.resolve({ error: null })) as () => Promise<Res>,
}));

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: () => ({
			select: () => {
				h.calls.push({ op: "select" });
				const chain = {
					eq: () => chain,
					order: () => chain,
					limit: () => Promise.resolve(h.select),
				};
				return chain;
			},
			insert: (row: unknown) => {
				h.calls.push({ op: "insert", payload: row });
				return h.insert();
			},
			update: (patch: unknown) => ({
				eq: (_c: string, id: string) => {
					h.calls.push({ op: "update", payload: patch, id });
					return h.update();
				},
			}),
			delete: () => ({
				eq: (_c: string, id: string) => {
					h.calls.push({ op: "delete", id });
					return h.del();
				},
			}),
		}),
	}),
}));
vi.mock("@/components/character-sheet/view/number-detail", async (orig) => ({
	...(await orig<
		typeof import("@/components/character-sheet/view/number-detail")
	>()),
	useIsMobile: () => h.mobile,
}));

import { useCombatStore } from "@/lib/vtt/combat-store";
import { useMoveStore } from "@/lib/vtt/move-store";
import { NOTE_BODY_MAX, NOTE_TITLE_MAX, type VttNote } from "@/lib/vtt/notes";
import { useNotesStore } from "@/lib/vtt/notes-store";
import { NOTE_AUTOSAVE_MS, resetNotesSync } from "@/lib/vtt/notes-sync";
import { useRollStore } from "@/lib/vtt/roll-store";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTNotesPanel } from "./vtt-notes-panel";
import { VTTToolbar } from "./vtt-toolbar";

const note = (id: string, over: Partial<VttNote> = {}): VttNote => ({
	id,
	campaignId: "c1",
	title: `Título ${id}`,
	body: `Texto ${id}`,
	createdAt: "2026-11-14T10:00:00Z",
	updatedAt: "2026-11-14T10:00:00Z",
	...over,
});
const updates = () => h.calls.filter((c) => c.op === "update");
const open = (
	notes: VttNote[] = [],
	status: "ready" | "loading" | "missing" | "error" = "ready",
) => {
	useNotesStore.setState({
		campaignId: "c1",
		notes,
		status,
		panelOpen: true,
		activeId: null,
		query: "",
		saveState: {},
		notice: null,
	});
};

beforeEach(() => {
	vi.useFakeTimers();
	resetNotesSync();
	useNotesStore.getState().reset();
	useVTTStore.setState({ isGM: false, isCoGM: false });
	useCombatStore.getState().setPanelOpen(false);
	useRollStore.getState().setPanelOpen(false);
	useMoveStore.getState().setPanelOpen(false);
	h.mobile = false;
	h.calls = [];
	h.select = { data: [], error: null };
	h.insert = () => Promise.resolve({ error: null });
	h.update = () => Promise.resolve({ error: null });
	h.del = () => Promise.resolve({ error: null });
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("painel de notas · quem vê o quê", () => {
	it("fechado, não desenha nada", () => {
		const { container } = render(<VTTNotesPanel />);
		expect(container.textContent).toBe("");
	});

	it("mestre: 'Notas do mestre' e aviso de que os jogadores não têm acesso", () => {
		useVTTStore.setState({ isGM: true });
		open([note("a")]);
		render(<VTTNotesPanel />);
		expect(
			screen.getByRole("complementary", { name: "Notas do mestre" }),
		).toBeTruthy();
		expect(screen.getByText(/Os jogadores não têm acesso/)).toBeTruthy();
	});

	it("jogador: 'Minhas notas' e aviso de que nem o mestre lê", () => {
		open([note("a")]);
		render(<VTTNotesPanel />);
		expect(
			screen.getByRole("complementary", { name: "Minhas notas" }),
		).toBeTruthy();
		expect(screen.getByText(/Nem o mestre lê/)).toBeTruthy();
	});

	it("co-mestre também é 'Minhas notas' (as notas são só dele, não do mestre)", () => {
		useVTTStore.setState({ isGM: false, isCoGM: true });
		open([note("a")]);
		render(<VTTNotesPanel />);
		expect(
			screen.getByRole("complementary", { name: "Minhas notas" }),
		).toBeTruthy();
	});

	it("no celular vira uma folha de baixo", () => {
		h.mobile = true;
		open([note("a")]);
		render(<VTTNotesPanel />);
		expect(screen.getByRole("dialog", { name: "Minhas notas" })).toBeTruthy();
		expect(screen.getByTestId("notes-panel")).toBeTruthy();
	});
});

describe("painel de notas · estados da lista", () => {
	it("carregando mostra o esqueleto e bloqueia 'Nova nota'", () => {
		open([], "loading");
		render(<VTTNotesPanel />);
		expect(screen.getByText("Carregando notas…")).toBeTruthy();
		expect(
			(screen.getByRole("button", { name: "Nova nota" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("banco sem a tabela: explica que depende da atualização", () => {
		open([], "missing");
		render(<VTTNotesPanel />);
		expect(screen.getByText(/atualização do banco/)).toBeTruthy();
	});

	it("erro de carga: botão tenta de novo e recarrega", async () => {
		open([], "error");
		render(<VTTNotesPanel />);
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		await act(async () => {});
		expect(h.calls.some((c) => c.op === "select")).toBe(true);
	});

	it("vazio: convite com ação clara para criar a primeira nota", async () => {
		open([]);
		render(<VTTNotesPanel />);
		expect(screen.getByText("Nenhuma nota ainda")).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Criar a primeira nota" }),
		);
		await act(async () => {});
		expect(
			screen.getByRole("textbox", { name: "Título da nota" }),
		).toBeTruthy();
		expect(h.calls.find((c) => c.op === "insert")).toBeTruthy();
	});

	it("texto de ajuda do vazio muda para o mestre", () => {
		useVTTStore.setState({ isGM: true });
		open([]);
		render(<VTTNotesPanel />);
		expect(screen.getByText(/segredos, planos da sessão/)).toBeTruthy();
	});

	it("lista as mais recentes primeiro, com título, prévia e quando mexeu", () => {
		open([
			note("velha", { title: "Velha", updatedAt: "2026-11-10T10:00:00Z" }),
			note("nova", {
				title: "Nova",
				body: "linha um\nlinha dois",
				updatedAt: new Date().toISOString(),
			}),
		]);
		render(<VTTNotesPanel />);
		const items = screen.getAllByRole("listitem");
		expect(items[0]?.textContent).toContain("Nova");
		expect(items[0]?.textContent).toContain("linha um linha dois");
		expect(items[0]?.textContent).toContain("agora");
		expect(items[1]?.textContent).toContain("Velha");
	});

	it("busca filtra por título e texto; sem resultado oferece limpar", () => {
		open([
			note("a", { title: "Cripta", body: "porão" }),
			note("b", { title: "Taverna", body: "bardo" }),
		]);
		render(<VTTNotesPanel />);
		fireEvent.change(screen.getByRole("searchbox"), {
			target: { value: "BARDO" },
		});
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
		expect(screen.getByText("Taverna")).toBeTruthy();
		fireEvent.change(screen.getByRole("searchbox"), {
			target: { value: "zzz" },
		});
		expect(screen.getByText("Nenhuma nota encontrada")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	it("aviso de erro (criar/apagar) aparece como alerta", () => {
		open([note("a")]);
		useNotesStore.setState({ notice: "Limite de 200 notas por campanha." });
		render(<VTTNotesPanel />);
		expect(screen.getByRole("alert").textContent).toBe(
			"Limite de 200 notas por campanha.",
		);
	});
});

describe("painel de notas · editor e salvar sozinho", () => {
	const openEditor = (n = note("a")) => {
		open([n]);
		render(<VTTNotesPanel />);
		fireEvent.click(screen.getByRole("button", { name: new RegExp(n.title) }));
	};

	it("abre a nota com título e texto, com os limites do banco", () => {
		openEditor();
		const title = screen.getByRole("textbox", {
			name: "Título da nota",
		}) as HTMLInputElement;
		const body = screen.getByRole("textbox", {
			name: "Texto da nota",
		}) as HTMLTextAreaElement;
		expect(title.value).toBe("Título a");
		expect(body.value).toBe("Texto a");
		expect(title.maxLength).toBe(NOTE_TITLE_MAX);
		expect(body.maxLength).toBe(NOTE_BODY_MAX);
	});

	it("digitar muda na hora e grava sozinho depois de parar (uma vez só)", async () => {
		openEditor();
		const body = screen.getByRole("textbox", { name: "Texto da nota" });
		fireEvent.change(body, { target: { value: "T" } });
		fireEvent.change(body, { target: { value: "Te" } });
		fireEvent.change(body, { target: { value: "Tex novo" } });
		expect((body as HTMLTextAreaElement).value).toBe("Tex novo");
		expect(screen.getByText("Salvando…")).toBeTruthy();
		expect(updates()).toHaveLength(0);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		});
		expect(updates()).toHaveLength(1);
		expect(updates()[0]?.payload).toEqual({
			title: "Título a",
			body: "Tex novo",
		});
		expect(screen.getByText("Salvo")).toBeTruthy();
	});

	it("sair do campo (blur) grava na hora", async () => {
		openEditor();
		const title = screen.getByRole("textbox", { name: "Título da nota" });
		fireEvent.change(title, { target: { value: "Outro título" } });
		fireEvent.blur(title);
		await act(async () => {});
		expect(updates()).toHaveLength(1);
		expect(updates()[0]?.payload).toMatchObject({ title: "Outro título" });
	});

	it("voltar à lista grava o pendente antes de sair", async () => {
		openEditor();
		fireEvent.change(screen.getByRole("textbox", { name: "Texto da nota" }), {
			target: { value: "não pode perder" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Voltar às notas" }));
		await act(async () => {});
		expect(updates()).toHaveLength(1);
		expect(screen.getByRole("searchbox")).toBeTruthy();
		expect(screen.getByText("não pode perder")).toBeTruthy();
	});

	it("fechar o painel grava o pendente", async () => {
		openEditor();
		fireEvent.change(screen.getByRole("textbox", { name: "Texto da nota" }), {
			target: { value: "antes de fechar" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Fechar notas" }));
		await act(async () => {});
		expect(updates()).toHaveLength(1);
		expect(useNotesStore.getState().panelOpen).toBe(false);
	});

	it("falha ao gravar: 'Não salvou' e dá para tentar de novo, sem perder o texto", async () => {
		openEditor();
		h.update = () => Promise.resolve({ error: { code: "XX", message: "x" } });
		const body = screen.getByRole("textbox", { name: "Texto da nota" });
		fireEvent.change(body, { target: { value: "importante" } });
		await act(async () => {
			await vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_MS);
		});
		expect(screen.getByText("Não salvou")).toBeTruthy();
		expect((body as HTMLTextAreaElement).value).toBe("importante");
		h.update = () => Promise.resolve({ error: null });
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		await act(async () => {});
		expect(screen.getByText("Salvo")).toBeTruthy();
		expect(updates()).toHaveLength(2);
	});

	it("contador do texto só aparece perto do limite", () => {
		openEditor(note("a", { body: "x".repeat(100) }));
		expect(screen.getByText(`100/${NOTE_BODY_MAX}`).className).toContain(
			"invisible",
		);
		cleanup();
		useNotesStore.getState().reset();
		openEditor(note("b", { body: "x".repeat(19000) }));
		expect(screen.getByText(`19000/${NOTE_BODY_MAX}`).className).not.toContain(
			"invisible",
		);
	});

	it("apagar pede confirmação; cancelar mantém a nota", () => {
		openEditor();
		fireEvent.click(screen.getByRole("button", { name: "Apagar nota" }));
		expect(screen.getByRole("button", { name: "Apagar de vez" })).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(screen.getByRole("button", { name: "Apagar nota" })).toBeTruthy();
		expect(h.calls.filter((c) => c.op === "delete")).toHaveLength(0);
		expect(useNotesStore.getState().notes).toHaveLength(1);
	});

	it("confirmar apaga e volta para a lista", async () => {
		openEditor();
		fireEvent.click(screen.getByRole("button", { name: "Apagar nota" }));
		fireEvent.click(screen.getByRole("button", { name: "Apagar de vez" }));
		await act(async () => {});
		expect(h.calls.find((c) => c.op === "delete")?.id).toBe("a");
		expect(useNotesStore.getState().notes).toHaveLength(0);
		expect(screen.getByText("Nenhuma nota ainda")).toBeTruthy();
	});

	it("apagar sem a tela tirar o texto antes: nenhuma gravação sobra depois", async () => {
		openEditor();
		fireEvent.change(screen.getByRole("textbox", { name: "Texto da nota" }), {
			target: { value: "vai embora" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Apagar nota" }));
		fireEvent.click(screen.getByRole("button", { name: "Apagar de vez" }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5000);
		});
		expect(updates()).toHaveLength(0);
	});
});

describe("toolbar · botão Notas e atalho N", () => {
	const notesButton = () => screen.getByRole("button", { name: "Notas" });
	const panelOpen = () => useNotesStore.getState().panelOpen;

	it("jogador e mestre têm o botão; a dica diz de quem são as notas", () => {
		render(<VTTToolbar />);
		expect(notesButton()).toBeTruthy();
		cleanup();
		useVTTStore.setState({ isGM: true });
		render(<VTTToolbar />);
		expect(notesButton()).toBeTruthy();
	});

	it("clicar abre e fecha o painel", () => {
		render(<VTTToolbar />);
		fireEvent.click(notesButton());
		expect(panelOpen()).toBe(true);
		fireEvent.click(notesButton());
		expect(panelOpen()).toBe(false);
	});

	it("o botão fica marcado enquanto o painel está aberto", () => {
		render(<VTTToolbar />);
		fireEvent.click(notesButton());
		expect(notesButton().getAttribute("aria-pressed")).toBe("true");
	});

	it("a tecla N alterna o painel", () => {
		render(<VTTToolbar />);
		fireEvent.keyDown(document.body, { key: "n" });
		expect(panelOpen()).toBe(true);
		fireEvent.keyDown(document.body, { key: "N" });
		expect(panelOpen()).toBe(false);
	});

	it("digitar 'n' dentro de uma nota NÃO fecha o painel", () => {
		open([note("a")]);
		render(
			<>
				<VTTToolbar />
				<VTTNotesPanel />
			</>,
		);
		fireEvent.click(screen.getByRole("button", { name: /Título a/ }));
		const body = screen.getByRole("textbox", { name: "Texto da nota" });
		body.focus();
		fireEvent.keyDown(body, { key: "n" });
		fireEvent.keyDown(body, { key: "m" });
		fireEvent.keyDown(body, { key: "c" });
		expect(panelOpen()).toBe(true);
		expect(useCombatStore.getState().panelOpen).toBe(false);
	});

	it("abrir Notas fecha Combate, Rolagens e Movimentos", () => {
		useVTTStore.setState({ isGM: true });
		useCombatStore.getState().setPanelOpen(true);
		render(<VTTToolbar />);
		fireEvent.click(notesButton());
		expect(panelOpen()).toBe(true);
		expect(useCombatStore.getState().panelOpen).toBe(false);
		expect(useRollStore.getState().panelOpen).toBe(false);
		expect(useMoveStore.getState().panelOpen).toBe(false);
	});

	it("abrir outro painel fecha as Notas", () => {
		render(<VTTToolbar />);
		fireEvent.click(notesButton());
		fireEvent.click(screen.getByRole("button", { name: "Rolagens e chat" }));
		expect(panelOpen()).toBe(false);
		expect(useRollStore.getState().panelOpen).toBe(true);
	});

	it("trocar de painel grava a nota que estava sendo digitada", async () => {
		open([note("a")]);
		render(
			<>
				<VTTToolbar />
				<VTTNotesPanel />
			</>,
		);
		fireEvent.click(screen.getByRole("button", { name: /Título a/ }));
		fireEvent.change(screen.getByRole("textbox", { name: "Texto da nota" }), {
			target: { value: "salvar ao trocar" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Combate" }));
		await act(async () => {});
		expect(updates()).toHaveLength(1);
		expect(updates()[0]?.payload).toMatchObject({ body: "salvar ao trocar" });
	});

	it("a nota digitada continua lá depois de fechar e reabrir o painel", () => {
		open([note("a")]);
		render(
			<>
				<VTTToolbar />
				<VTTNotesPanel />
			</>,
		);
		fireEvent.click(screen.getByRole("button", { name: /Título a/ }));
		fireEvent.change(screen.getByRole("textbox", { name: "Texto da nota" }), {
			target: { value: "continua aqui" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Fechar notas" }));
		fireEvent.click(notesButton());
		expect(
			(
				screen.getByRole("textbox", {
					name: "Texto da nota",
				}) as HTMLTextAreaElement
			).value,
		).toBe("continua aqui");
	});
});
