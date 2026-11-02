// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCharacterPatch } from "../../../supabase/functions/_shared/ia-mesa-character";

const h = vi.hoisted(() => ({
	state: {
		activeCampaignId: "rise",
		characters: [] as unknown[],
		updateCharacter: vi.fn(),
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

import { VTTAiChat } from "./vtt-ai-chat";

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
	h.state.characters = [dante];
	h.state.updateCharacter.mockReset();
	h.ask.mockReset();
});
afterEach(cleanup);

describe("VTTAiChat: estados do painel", () => {
	async function openAndType(text: string) {
		render(<VTTAiChat campaignId="rise" campaignName="Rise" />);
		fireEvent.click(screen.getByLabelText("Abrir assistente da mesa"));
		fireEvent.change(screen.getByLabelText("Mensagem para o assistente"), {
			target: { value: text },
		});
	}

	it("carregando usa skeleton e a resposta entra no lugar dele", async () => {
		let resolveAsk: (value: unknown) => void = () => {};
		h.ask.mockReturnValue(
			new Promise((resolve) => {
				resolveAsk = resolve;
			}),
		);
		await openAndType("quem está na cena?");
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(
			await screen.findByRole("status", { name: "Carregando resposta" }),
		).toBeTruthy();
		expect(document.querySelector("[data-slot='skeleton']")).toBeTruthy();
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
		expect(retry.className).toContain("focus-visible:ring-2");
		expect(retry.className).toContain("[@media(hover:hover)]:hover:ring-2");
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.value).toBe("atualiza a ficha");
		expect(input.disabled).toBe(false);
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
		expect(bubble.className).toContain("text-destructive");
		expect(bubble.className).toContain("bg-destructive/10");
		expect(bubble.className).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.disabled).toBe(true);
		expect(input.value).toBe("quem está na cena?");
		expect(input.placeholder).toBe("Limite diário atingido · volta às 00:00");
		expect(
			screen.getByText("Limite diário atingido · volta às 00:00"),
		).toBeTruthy();
		expect(
			(screen.getByLabelText("Enviar") as HTMLButtonElement).disabled,
		).toBe(true);
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
		expect(screen.getByText("Nenhuma mensagem ainda.")).toBeTruthy();
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
		expect(h.state.updateCharacter).not.toHaveBeenCalled();
	});

	it("Ignorar (rejeitar) não grava nada", async () => {
		await askForPatch();
		fireEvent.click(screen.getByRole("button", { name: "Ignorar" }));
		expect(screen.getByText(/Nada foi salvo/)).toBeTruthy();
		expect(h.state.updateCharacter).not.toHaveBeenCalled();
	});

	it("Confirmar → Aplicar grava o patch; Desfazer volta o antes", async () => {
		await askForPatch();
		fireEvent.click(
			screen.getByRole("button", { name: "Confirmar alteração" }),
		);
		expect(h.state.updateCharacter).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		expect(h.state.updateCharacter).toHaveBeenCalledTimes(1);
		const [id, changes] = h.state.updateCharacter.mock.calls[0];
		expect(id).toBe("dante-1");
		expect(changes.strength).toBe(18);
		expect(changes.inventoryList[0].weapon.magicBonus).toBe(1);
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
		expect(h.state.updateCharacter).not.toHaveBeenCalled();
	});
});
