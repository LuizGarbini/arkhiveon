// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { snapshotFromCharacter } from "@/lib/ai-mesa/sheet-batch";
import type { Character, CharacterUpdateOptions } from "@/lib/store/types";
import { parseCharacterPatch } from "../../../supabase/functions/_shared/ia-mesa-character";
import { validateSheetBatch } from "../../../supabase/functions/_shared/ia-mesa-sheet-batch";

const h = vi.hoisted(() => ({
	/** Save quiet do lote: `updateCharacter(id, changes, { quiet: true })`. */
	quietSave: vi.fn((_id: string, _changes: Record<string, unknown>) =>
		Promise.resolve(),
	),
	state: {
		activeCampaignId: "rise",
		characters: [] as unknown[],
		campaigns: [] as { id: string; myRole?: string }[],
		updateCharacter: vi.fn(
			(
				_id: string,
				_changes: Partial<Character>,
				_options?: CharacterUpdateOptions,
			): Promise<void> => Promise.resolve(),
		),
		addNpc: vi.fn(),
		removeNpc: vi.fn(),
		syncError: null,
	},
	ask: vi.fn(),
}));

vi.mock("@/lib/store", () => {
	const useRPGStore = (selector: (s: typeof h.state) => unknown) =>
		selector(h.state);
	useRPGStore.getState = () => h.state;
	return { useRPGStore };
});
vi.mock("@/lib/ai-mesa/client", () => ({ askMesaAssistant: h.ask }));

import { readingPrompt, VTTAiChat } from "./vtt-ai-chat";

const dante = {
	id: "dante-1",
	characterName: "Dante Diavolo",
	strength: 16,
	inventoryList: [
		{
			id: "sword",
			name: "Espada longa",
			quantity: 1,
			weightLbs: 3,
			location: "equipped",
			category: "weapon",
			weapon: {
				damageDice: "1d8",
				damageType: "slashing",
				ability: "strength",
			},
		},
	],
};

const proposal = parseCharacterPatch(
	{
		characterId: "dante-1",
		summary: "FOR 18 e espada +1.",
		fields: { strength: 18 },
		updateItems: [
			{
				itemId: "sword",
				weapon: {
					damageDice: "1d8",
					damageType: "slashing",
					ability: "strength",
					magicBonus: 1,
				},
			},
		],
	},
	{
		characters: [{ id: "dante-1", name: "Dante Diavolo", itemIds: ["sword"] }],
	},
);

/** Bolha arredondada de assistente (`bg-muted`) sem texto visível. */
function emptyAssistantBubbles(): Element[] {
	return [...document.querySelectorAll("p, output, div")].filter((el) => {
		const className = typeof el.className === "string" ? el.className : "";
		if (!/(?:^|\s)bg-muted(?:\s|$)/.test(className)) return false;
		if (!className.includes("rounded-2xl")) return false;
		return (el.textContent ?? "").trim().length === 0;
	});
}

function expectCompactLoading(status: HTMLElement) {
	expect(status.getAttribute("aria-label")).toBe("Carregando resposta");
	expect(status.classList.contains("flex")).toBe(true);
	expect(status.classList.contains("items-center")).toBe(true);
	expect(status.classList.contains("gap-1")).toBe(true);
	expect(status.classList.contains("h-5")).toBe(true);
	expect(status.classList.contains("px-3.5")).toBe(true);
	expect(status.className).not.toContain("bg-muted");
	expect(status.className).not.toContain("rounded-2xl");
	expect(status.className).not.toMatch(/animate-pulse/);
	expect(status.querySelectorAll("[data-slot='skeleton']").length).toBe(0);
	expect(status.querySelector(":scope > .sr-only")).toBeNull();
	const dots = [...status.querySelectorAll(":scope > [aria-hidden='true']")];
	expect(dots).toHaveLength(3);
	const delays = ["0ms", "150ms", "300ms"];
	for (const [index, dot] of dots.entries()) {
		expect(dot.tagName).toBe("SPAN");
		expect(dot.classList.contains("size-1.5")).toBe(true);
		expect(dot.classList.contains("rounded-full")).toBe(true);
		expect(dot.classList.contains("bg-muted-foreground")).toBe(true);
		expect(dot.className).toMatch(/(?:^|\s)motion-safe:animate-pulse(?:\s|$)/);
		expect(dot.className).not.toMatch(/(?:^|\s)animate-pulse(?:\s|$)/);
		expect((dot as HTMLElement).style.animationDelay).toBe(delays[index]);
		expect(dot.textContent).toBe("");
	}
}

async function askForPatch(header = /Alterar ficha · 2 mudanças/) {
	h.ask.mockResolvedValue({ ok: true, reply: "Proposta pronta.", proposal });
	render(<VTTAiChat campaignId="rise" campaignName="Rise" />);
	fireEvent.click(screen.getByLabelText("Abrir assistente da mesa"));
	fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
		target: { value: "atualiza Dante: FOR 18 e espada +1" },
	});
	fireEvent.click(screen.getByLabelText("Enviar"));
	await waitFor(() => expect(screen.getByText(header)).toBeTruthy());
}

beforeEach(() => {
	h.state.activeCampaignId = "rise";
	h.state.characters = [dante];
	h.state.campaigns = [];
	h.state.updateCharacter.mockReset();
	h.state.updateCharacter.mockImplementation((id, changes, options) =>
		options?.quiet ? h.quietSave(id, changes) : Promise.resolve(),
	);
	h.quietSave.mockReset();
	h.quietSave.mockImplementation(() => Promise.resolve());
	h.ask.mockReset();
});
afterEach(cleanup);

/** Chamadas de `updateCharacter` fora do save quiet do lote. */
function loudUpdates() {
	return h.state.updateCharacter.mock.calls.filter(
		([, , options]) => !options?.quiet,
	);
}

describe("VTTAiChat: estados do painel", () => {
	async function openAndType(text: string) {
		render(<VTTAiChat campaignId="rise" campaignName="Rise" />);
		fireEvent.click(screen.getByLabelText("Abrir assistente da mesa"));
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: text },
		});
	}

	it("carregando é uma linha compacta e some no sucesso sem bolha vazia", async () => {
		let resolveAsk: (value: unknown) => void = () => {};
		h.ask.mockReturnValue(
			new Promise((resolve) => {
				resolveAsk = resolve;
			}),
		);
		await openAndType("quem está na cena?");
		fireEvent.click(screen.getByLabelText("Enviar"));
		const status = await screen.findByRole("status", {
			name: "Carregando resposta",
		});
		expectCompactLoading(status);
		expect(screen.queryByText("Pensando…")).toBeNull();
		resolveAsk({
			ok: true,
			reply: "A cripta está em silêncio.",
			proposal: null,
		});
		expect(await screen.findByText("A cripta está em silêncio.")).toBeTruthy();
		expect(
			screen.queryByRole("status", { name: "Carregando resposta" }),
		).toBeNull();
		expect(emptyAssistantBubbles().length).toBe(0);
	});

	it("resposta em branco não deixa bolha de assistente vazia", async () => {
		h.ask.mockResolvedValue({ ok: true, reply: "   ", proposal: null });
		await openAndType("quem está na cena?");
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(await screen.findByText("quem está na cena?")).toBeTruthy();
		expect(
			screen.queryByRole("status", { name: "Carregando resposta" }),
		).toBeNull();
		expect(emptyAssistantBubbles().length).toBe(0);
	});

	it("erro tira o indicador e não deixa bolha de assistente vazia", async () => {
		let resolveAsk: (value: unknown) => void = () => {};
		h.ask.mockReturnValue(
			new Promise((resolve) => {
				resolveAsk = resolve;
			}),
		);
		await openAndType("qual é a CA do Dante?");
		fireEvent.click(screen.getByLabelText("Enviar"));
		const status = await screen.findByRole("status", {
			name: "Carregando resposta",
		});
		expectCompactLoading(status);
		resolveAsk({ ok: false, code: "unavailable" });
		expect(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("status", { name: "Carregando resposta" }),
		).toBeNull();
		expect(emptyAssistantBubbles().length).toBe(0);
		expect(screen.getByRole("alert").textContent).toMatch(
			/Não consegui responder agora/,
		);
	});

	it("413 fica no painel sem Tentar de novo e a pergunta continua na conversa", async () => {
		h.ask.mockResolvedValue({ ok: false, code: "input_too_large" });
		await openAndType("resumo colado que o servidor recusou");
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(screen.getByRole("alert").textContent).toMatch(/20\.000 caracteres/);
		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.value).toBe("");
		expect(
			screen.getByText("resumo colado que o servidor recusou"),
		).toBeTruthy();
		expect(h.ask).toHaveBeenCalledTimes(1);
	});

	it("erro de rede mostra Tentar de novo e reenvia a pergunta", async () => {
		h.ask.mockResolvedValue({ ok: false, code: "offline" });
		await openAndType("resumo colado que o servidor recusou");
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(await screen.findByRole("alert")).toBeTruthy();
		h.ask.mockResolvedValue({ ok: false, code: "offline" });
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		expect(await screen.findByText(/Sem conexão com o servidor/)).toBeTruthy();
		expect(h.ask).toHaveBeenLastCalledWith(
			expect.objectContaining({
				message: "resumo colado que o servidor recusou",
			}),
		);
	});

	it("chave ausente ou falha do modelo diz que não conseguiu responder", async () => {
		h.ask.mockResolvedValue({ ok: false, code: "unavailable" });
		await openAndType("atualiza a ficha");
		fireEvent.click(screen.getByLabelText("Enviar"));
		const retry = await screen.findByRole("button", { name: "Tentar de novo" });
		expect(
			screen.getByText("Não consegui responder agora. Nada foi enviado."),
		).toBeTruthy();
		expect(screen.queryByText(/não está disponível/i)).toBeNull();
		expect(screen.getByRole("alert").className).toContain(
			"border-destructive/40",
		);
		expect(retry.className).toContain("focus-visible:ring-2");
		expect(retry.className).toContain("focus-visible:ring-ring");
		expect(retry.className).toContain("focus-visible:ring-offset-2");
		expect(retry.className).toContain("focus-visible:ring-offset-background");
		expect(retry.className).toContain("[@media(hover:hover)]:hover:ring-2");
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.value).toBe("");
		expect(input.disabled).toBe(false);
		fireEvent.change(input, { target: { value: "texto que não deve ir" } });
		h.ask.mockResolvedValue({ ok: false, code: "model_error" });
		fireEvent.click(retry);
		expect(
			await screen.findByText(
				"Não consegui responder agora. Nada foi enviado.",
			),
		).toBeTruthy();
		expect(h.ask).toHaveBeenCalledTimes(2);
		expect(h.ask.mock.calls[1][0]).toMatchObject({
			message: "atualiza a ficha",
			history: [],
		});
		expect(input.value).toBe("texto que não deve ir");
		expect(
			screen
				.getAllByText("atualiza a ficha")
				.filter((el) => el.tagName === "P"),
		).toHaveLength(1);
	});

	it("campanha fora da allowlist mantém a copy de não disponível", async () => {
		h.ask.mockResolvedValue({ ok: false, code: "not_allowed" });
		await openAndType("quem está na cena?");
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(
			await screen.findByText(/não está disponível nesta campanha/i),
		).toBeTruthy();
		expect(
			screen.queryByText("Não consegui responder agora. Nada foi enviado."),
		).toBeNull();
	});

	it("limite diário trava o campo e mostra a hora de volta em São Paulo", async () => {
		h.ask.mockResolvedValue({
			ok: false,
			code: "daily_limit",
			resetsAt: "2026-11-03T03:00:00.000Z",
		});
		await openAndType("quem está na cena?");
		fireEvent.click(screen.getByLabelText("Enviar"));
		const bubble = await screen.findByText(
			"Limite diário da mesa atingido. Volta terça-feira, 3 de novembro às 00:00.",
		);
		const bubbleClass = bubble.className.split(/\s+/);
		expect(bubbleClass).toContain("bg-muted/40");
		expect(bubbleClass).toContain("border-border");
		expect(bubbleClass).toContain("text-foreground");
		expect(bubble.className).not.toContain("destructive");
		expect(bubble.className).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(bubble.querySelector("svg")?.getAttribute("class")).toContain(
			"text-muted-foreground",
		);
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.disabled).toBe(true);
		expect(input.value).toBe("");
		expect(input.placeholder).toBe("");
		const hint = screen.getByText("Limite diário atingido · volta às 00:00");
		expect(hint.className).toContain("text-muted-foreground");
		expect(hint.className).not.toContain("destructive");
		expect(
			screen
				.getAllByText("quem está na cena?")
				.filter((el) => el.tagName === "P"),
		).toHaveLength(1);
		expect(
			(screen.getByLabelText("Enviar") as HTMLButtonElement).disabled,
		).toBe(true);
		expect(
			screen.queryByRole("status", { name: "Carregando resposta" }),
		).toBeNull();
		expect(emptyAssistantBubbles().length).toBe(0);
	});

	it("a pergunta vira bolha na hora e o envio fica travado", async () => {
		let resolveAsk: (value: unknown) => void = () => {};
		h.ask.mockReturnValue(
			new Promise((resolve) => {
				resolveAsk = resolve;
			}),
		);
		await openAndType("quem está na cena?");
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		fireEvent.click(screen.getByLabelText("Enviar"));
		const bubble = screen
			.getAllByText("quem está na cena?")
			.find((el) => el.tagName === "P");
		expect(bubble?.className).toContain("bg-primary/15");
		expect(input.value).toBe("");
		expect(input.disabled).toBe(true);
		expect(
			(screen.getByLabelText("Enviar") as HTMLButtonElement).disabled,
		).toBe(true);
		fireEvent.keyDown(input, { key: "Enter" });
		fireEvent.submit(input.closest("form") as HTMLFormElement);
		expect(h.ask).toHaveBeenCalledTimes(1);
		resolveAsk({
			ok: true,
			reply: "A cripta está em silêncio.",
			proposal: null,
		});
		expect(await screen.findByText("A cripta está em silêncio.")).toBeTruthy();
		expect(
			screen
				.getAllByText("quem está na cena?")
				.filter((el) => el.tagName === "P"),
		).toHaveLength(1);
	});
});

describe("VTTAiChat: estados visíveis", () => {
	it("sem mensagens, o painel mostra um texto curto", () => {
		render(<VTTAiChat campaignId="rise" campaignName="Rise" />);
		fireEvent.click(screen.getByLabelText("Abrir assistente da mesa"));
		const empty = screen.getByText("Pergunte sobre regras, a cena ou a ficha.");
		expect(empty.className).toContain("text-muted-foreground");
		expect(screen.queryByText("Nenhuma mensagem ainda.")).toBeNull();
		expect(screen.queryByText(/Posso propor NPCs/)).toBeNull();
	});

	it("Enviar e o botão flutuante têm hover e focus-visible", () => {
		render(<VTTAiChat campaignId="rise" campaignName="Rise" />);
		const fab = screen.getByLabelText("Abrir assistente da mesa");
		expect(fab.className).toContain("focus-visible:ring-2");
		expect(fab.className).toContain("[@media(hover:hover)]:hover:ring-2");
		fireEvent.click(fab);
		const send = screen.getByLabelText("Enviar");
		expect(send.className).toContain("focus-visible:ring-2");
		expect(send.className).toContain("[@media(hover:hover)]:hover:ring-2");
		expect(send.className).toContain("focus-visible:ring-ring");
	});
});

describe("VTTAiChat: editar ficha existente", () => {
	it("mostra o diff antes → depois, sem gravar nada", async () => {
		await askForPatch();
		expect(screen.getByText("Dante Diavolo")).toBeTruthy();
		expect(screen.getByText("FOR")).toBeTruthy();
		expect(screen.getByText("16")).toBeTruthy();
		expect(screen.getByText("18")).toBeTruthy();
		expect(
			(screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		expect(loudUpdates()).toEqual([]);
	});

	it("Ignorar (rejeitar) não grava nada", async () => {
		await askForPatch();
		fireEvent.click(screen.getByRole("button", { name: "Ignorar" }));
		expect(screen.getByText(/Nada foi salvo/)).toBeTruthy();
		expect(loudUpdates()).toEqual([]);
	});

	it("Confirmar → Aplicar grava o patch; Desfazer volta o antes", async () => {
		await askForPatch();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirmar alteração" }),
		);
		expect(loudUpdates()).toEqual([]);
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		expect(h.state.updateCharacter).toHaveBeenCalledTimes(1);
		const [id, changes] = h.state.updateCharacter.mock.calls[0];
		expect(id).toBe("dante-1");
		expect(changes.strength).toBe(18);
		expect(changes.inventoryList?.[0]?.weapon?.magicBonus).toBe(1);
		expect(screen.getByText(/ficha de Dante Diavolo atualizada/)).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
		expect(h.state.updateCharacter).toHaveBeenCalledTimes(2);
		const [, before] = h.state.updateCharacter.mock.calls[1];
		expect(before.strength).toBe(16);
		expect(before.inventoryList).toBe(dante.inventoryList);
	});

	it("ficha fora da campanha ativa: não deixa confirmar", async () => {
		h.state.characters = [];
		await askForPatch(/Alterar ficha · 0 mudanças/);
		expect(screen.getByText(/não está na campanha ativa/)).toBeTruthy();
		expect(
			(
				screen.getByRole("button", {
					name: "Confirmar alteração",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		expect(loudUpdates()).toEqual([]);
	});
});

const batchSheet = {
	id: "dante-1",
	characterName: "Dante Diavolo",
	createdBy: "other",
	strength: 16,
	dexterity: 12,
	health: 30,
	armorClass: 16,
	inventoryList: dante.inventoryList,
};

function batchProposal(
	changes: { field: string; value: string }[],
	character: typeof batchSheet = batchSheet,
) {
	const proposal = validateSheetBatch(
		{ characterId: character.id, changes },
		snapshotFromCharacter(character as never),
	);
	if (!proposal) throw new Error("lote inválido no teste");
	return proposal;
}

describe("VTTAiChat: edição em lote", () => {
	async function openPanel() {
		render(<VTTAiChat campaignId="rise" campaignName="Rise" />);
		fireEvent.click(screen.getByLabelText("Abrir assistente da mesa"));
	}

	it("lendo um prompt longo mostra o skeleton", async () => {
		let resolveAsk: (value: unknown) => void = () => {};
		h.ask.mockReturnValue(
			new Promise((resolve) => {
				resolveAsk = resolve;
			}),
		);
		await openPanel();
		const paste = `${"Força 18 Destreza 14 Constituição 16. ".repeat(20)}atualiza a ficha`;
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: paste },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(
			await screen.findByRole("status", { name: "Lendo o prompt" }),
		).toBeTruthy();
		expect(document.querySelector("[data-slot='skeleton']")).toBeTruthy();
		resolveAsk({ ok: true, reply: "Pronto.", proposal: null });
		expect(await screen.findByText("Pronto.")).toBeTruthy();
	});

	it("pergunta curta mostra os três pontos, não o skeleton", async () => {
		let resolveAsk: (value: unknown) => void = () => {};
		h.ask.mockReturnValue(
			new Promise((resolve) => {
				resolveAsk = resolve;
			}),
		);
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "O que muda na ficha do mago?" },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		const status = await screen.findByRole("status", {
			name: "Carregando resposta",
		});
		expectCompactLoading(status);
		expect(screen.queryByRole("status", { name: "Lendo o prompt" })).toBeNull();
		expect(document.querySelector("[data-slot='skeleton']")).toBeNull();
		resolveAsk({ ok: true, reply: "Pronto.", proposal: null });
		expect(await screen.findByText("Pronto.")).toBeTruthy();
	});

	it("skeleton mostra o texto Lendo o prompt e barras visíveis", async () => {
		h.ask.mockReturnValue(new Promise(() => {}));
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "Atualiza a ficha do Dante: Força 18" },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		const status = await screen.findByRole("status", {
			name: "Lendo o prompt",
		});
		expect(status.textContent).toContain("Lendo o prompt");
		for (const bar of status.querySelectorAll("[data-slot='skeleton']")) {
			expect(bar.className).toContain("bg-muted-foreground/20");
		}
	});

	it("campo rejeitado desabilita Aplicar e o campo esvazia no envio", async () => {
		h.state.characters = [batchSheet];
		const proposal = batchProposal([
			{ field: "strength", value: "18" },
			{ field: "armorClass", value: "80" },
		]);
		h.ask.mockResolvedValue({
			ok: true,
			reply: "Encontrei campos que não dá para aplicar.",
			proposal,
		});
		await openPanel();
		const pasted = "resumo colado da ficha com CA 80";
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: pasted },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(
			await screen.findByText("CA tem que ficar entre 0 e 50."),
		).toBeTruthy();
		expect(
			(screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		const stored = document.querySelector("textarea");
		expect(stored?.closest("form")?.hidden).toBe(true);
		expect((stored as HTMLTextAreaElement).value).toBe("");
		expect(loudUpdates()).toEqual([]);
		expect(h.quietSave).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(
			(
				screen.getByLabelText(
					"Mensagem para o assistente",
				) as HTMLTextAreaElement
			).value,
		).toBe("");
	});

	it("lote: o texto colado fica no campo na proposta e só limpa após Aplicar", async () => {
		h.state.characters = [batchSheet];
		h.state.campaigns = [{ id: "rise", myRole: "owner" }];
		h.ask.mockResolvedValue({
			ok: true,
			reply: "Revise e aplique.",
			proposal: batchProposal([{ field: "strength", value: "18" }]),
		});
		await openPanel();
		const pasted = `FOR 18. ${"x".repeat(1300)}`;
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: pasted },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		await screen.findByRole("heading", { name: "1 alteração" });
		const input = document.querySelector("textarea") as HTMLTextAreaElement;
		expect(input.value).toBe(pasted);
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		expect(
			await screen.findByText("Aplicado. A ficha foi atualizada."),
		).toBeTruthy();
		expect(input.value).toBe("");
	});

	it("lote: no catch de salvar usa a mensagem do erro", async () => {
		h.state.characters = [batchSheet];
		h.state.campaigns = [{ id: "rise", myRole: "owner" }];
		h.ask.mockResolvedValue({
			ok: true,
			reply: "Revise e aplique.",
			proposal: batchProposal([{ field: "strength", value: "18" }]),
		});
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "atualiza a ficha: FOR 18" },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		await screen.findByRole("heading", { name: "1 alteração" });
		h.quietSave.mockImplementationOnce(async () => {
			throw new Error("Disco cheio na ficha.");
		});
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(screen.getByRole("alert").textContent).toBe("Disco cheio na ficha.");
		expect(screen.getByRole("button", { name: "Aplicar" })).toBeTruthy();
	});

	it("lote: no erro e no 413 o texto colado continua no campo", async () => {
		await openPanel();
		const pasted = "y".repeat(1500);
		for (const code of ["offline", "input_too_large"]) {
			h.ask.mockResolvedValueOnce({ ok: false, code });
			const input = screen.getByLabelText(
				"Mensagem para o assistente",
			) as HTMLTextAreaElement;
			fireEvent.change(input, { target: { value: pasted } });
			fireEvent.click(screen.getByLabelText("Enviar"));
			expect(await screen.findByRole("alert")).toBeTruthy();
			expect(input.value).toBe(pasted);
		}
	});

	it("Aplicar grava uma vez e destaca a linha", async () => {
		h.state.characters = [batchSheet];
		h.state.campaigns = [{ id: "rise", myRole: "owner" }];
		h.ask.mockResolvedValue({
			ok: true,
			reply: "Revise e aplique.",
			proposal: batchProposal([{ field: "strength", value: "18" }]),
		});
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "atualiza a ficha: FOR 18" },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		await screen.findByRole("heading", { name: "1 alteração" });
		expect(document.querySelector("textarea")?.closest("form")?.hidden).toBe(
			true,
		);
		let releaseSave: () => void = () => {};
		h.quietSave.mockImplementation(
			(id: string, changes: Record<string, unknown>) => {
				return new Promise<void>((resolve) => {
					releaseSave = () => {
						h.state.characters = h.state.characters.map((character) => {
							if (!character || typeof character !== "object") return character;
							const current = character as Record<string, unknown>;
							return current.id === id ? { ...current, ...changes } : character;
						});
						resolve();
					};
				});
			},
		);
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		const applying = await screen.findByRole("button", { name: "Aplicando…" });
		expect((applying as HTMLButtonElement).disabled).toBe(true);
		expect(
			(screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		expect(screen.queryByText("Aplicado. A ficha foi atualizada.")).toBeNull();
		expect(h.quietSave).toHaveBeenCalledTimes(1);
		releaseSave();
		expect(
			await screen.findByText("Aplicado. A ficha foi atualizada."),
		).toBeTruthy();
		const [id, changes] = h.quietSave.mock.calls[0];
		expect(id).toBe("dante-1");
		expect(changes.strength).toBe(18);
		expect(Object.keys(changes)).toEqual(["strength"]);
		expect(loudUpdates()).toEqual([]);
		const dock = document.querySelector("[data-slot='sheet-batch-dock']");
		expect(dock?.className).toContain("flex-1");
		const row = dock?.querySelector("[data-field='strength']");
		expect(row?.getAttribute("data-highlighted")).toBe("true");
		expect(row?.className).toContain("bg-primary/15");
		expect(dock?.textContent).toContain("Desfazer");
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.closest("form")?.hidden).toBe(false);
		expect(input.value).toBe("");
	});

	it("falha do save não mostra Aplicado, mantém o lote e deixa tentar de novo", async () => {
		h.state.characters = [batchSheet];
		h.state.campaigns = [{ id: "rise", myRole: "owner" }];
		h.quietSave.mockImplementationOnce(() => {
			h.state.characters = [{ ...batchSheet, strength: 18 }];
			return Promise.reject(new Error("blocked")).catch((error: unknown) => {
				h.state.characters = [batchSheet];
				throw error;
			});
		});
		h.quietSave.mockImplementationOnce(() => Promise.resolve());
		h.ask.mockResolvedValue({
			ok: true,
			reply: "Revise e aplique.",
			proposal: batchProposal([{ field: "strength", value: "18" }]),
		});
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "atualiza a ficha: FOR 18" },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		await screen.findByRole("button", { name: "Aplicar" });
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("blocked");
		expect(screen.queryByText("Aplicado. A ficha foi atualizada.")).toBeNull();
		expect(
			(document.querySelector("textarea") as HTMLTextAreaElement).value,
		).toBe("");
		const row = document.querySelector("[data-field='strength']");
		expect(row?.textContent).toContain("16");
		expect(row?.textContent).toContain("18");
		const retry = screen.getByRole("button", { name: "Aplicar" });
		expect((retry as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(retry);
		expect(
			await screen.findByText("Aplicado. A ficha foi atualizada."),
		).toBeTruthy();
		expect(screen.queryByRole("alert")).toBeNull();
		expect(h.quietSave).toHaveBeenCalledTimes(2);
		expect(loudUpdates()).toEqual([]);
		expect(
			(
				screen.getByLabelText(
					"Mensagem para o assistente",
				) as HTMLTextAreaElement
			).value,
		).toBe("");
	});

	it("Cancelar não grava", async () => {
		h.state.characters = [batchSheet];
		h.state.campaigns = [{ id: "rise", myRole: "owner" }];
		h.ask.mockResolvedValue({
			ok: true,
			reply: "Revise.",
			proposal: batchProposal([{ field: "strength", value: "18" }]),
		});
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "atualiza a ficha" },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		await screen.findByRole("button", { name: "Cancelar" });
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(screen.getByText(/Nada foi salvo/)).toBeTruthy();
		expect(loudUpdates()).toEqual([]);
	});

	it("permissão negada não grava", async () => {
		h.state.characters = [batchSheet];
		h.state.campaigns = [{ id: "rise", myRole: "viewer" }];
		h.ask.mockResolvedValue({
			ok: true,
			reply: "Revise.",
			proposal: batchProposal([{ field: "strength", value: "18" }]),
		});
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "atualiza a ficha" },
		});
		fireEvent.click(screen.getByLabelText("Enviar"));
		await screen.findByRole("button", { name: "Aplicar" });
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(screen.getByRole("alert").textContent).toMatch(/Nada foi alterado/);
		expect(loudUpdates()).toEqual([]);
	});

	it("mostra o contador e trava o envio acima do limite", async () => {
		await openPanel();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "abc" },
		});
		expect(screen.queryByText(/\/20000/)).toBeNull();
		expect(screen.queryByText(/Modo edição em lote/)).toBeNull();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "a".repeat(1201) },
		});
		expect(screen.getByText(/1201\/20000/)).toBeTruthy();
		expect(
			screen.getByText(
				"Modo edição em lote · texto longo vira proposta de alteração",
			),
		).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: "a".repeat(20_001) },
		});
		expect(screen.getByText(/20001\/20000/).className).toContain(
			"text-destructive",
		);
		expect(
			(screen.getByLabelText("Enviar") as HTMLButtonElement).disabled,
		).toBe(true);
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		fireEvent.keyDown(input, { key: "Enter" });
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(h.ask).not.toHaveBeenCalled();
		expect(screen.queryByRole("alert")).toBeNull();
		expect(input.value).toHaveLength(20_001);
	});
});

describe("readingPrompt", () => {
	it.each([
		"Atualiza a ficha do Dante: Força 18",
		"edita a ficha do mago",
		"Muda na ficha do mago a CA para 15",
		"Dante subiu de nível. Altera a ficha com PV 40",
		"Por favor, atualiza a ficha do mago",
	])("comando de edição liga o skeleton: %s", (text) => {
		expect(readingPrompt(text)).toBe(true);
	});

	it.each([
		"O que muda na ficha do mago?",
		"Como edito a ficha?",
		"Qual atributo da ficha muda com o nível?",
		"Quanto dano faz uma espada longa?",
		"Muda o clima da cena",
	])("pergunta ou texto curto fica nos pontos: %s", (text) => {
		expect(readingPrompt(text)).toBe(false);
	});

	it("texto de 400+ caracteres liga o skeleton", () => {
		expect(readingPrompt("a".repeat(400))).toBe(true);
	});
});
