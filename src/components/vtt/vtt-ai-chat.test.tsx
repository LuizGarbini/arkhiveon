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
	expect(status.className).toContain("text-muted-foreground");
	expect(status.className).toContain("h-5");
	expect(status.className).toContain("leading-5");
	expect(status.className).toMatch(/motion-safe:animate-pulse/);
	expect(status.className).not.toContain("bg-muted");
	expect(status.className).not.toContain("rounded-2xl");
	expect(status.querySelectorAll("[data-slot='skeleton']").length).toBe(0);
	expect(status.querySelector("[aria-hidden='true']")?.textContent).toBe("...");
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
		await openAndType("atualiza a ficha");
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
			/não está disponível/,
		);
	});

	it("erro do Claude fica no painel, com tentar de novo e o texto preservado", async () => {
		h.ask.mockResolvedValue({ ok: false, code: "unavailable" });
		await openAndType("atualiza a ficha");
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		).toBeTruthy();
		expect(screen.getByRole("alert").textContent).toMatch(
			/não está disponível/,
		);
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.value).toBe("atualiza a ficha");
		expect(input.disabled).toBe(false);
		h.ask.mockResolvedValue({ ok: true, reply: "Pronto.", proposal: null });
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		expect(await screen.findByText("Pronto.")).toBeTruthy();
		expect(h.ask).toHaveBeenCalledTimes(2);
	});

	it("limite diário substitui a resposta e trava o envio", async () => {
		h.ask.mockResolvedValue({
			ok: false,
			code: "daily_limit",
			resetsAt: "2026-11-03T03:00:00.000Z",
		});
		await openAndType("quem está na cena?");
		fireEvent.click(screen.getByLabelText("Enviar"));
		expect(
			await screen.findByText(
				"Limite diário da mesa atingido. Volta terça-feira, 3 de novembro às 00:00.",
			),
		).toBeTruthy();
		const input = screen.getByLabelText(
			"Mensagem para o assistente",
		) as HTMLTextAreaElement;
		expect(input.disabled).toBe(true);
		expect(input.value).toBe("quem está na cena?");
		expect(
			(screen.getByLabelText("Enviar") as HTMLButtonElement).disabled,
		).toBe(true);
		expect(
			screen.queryByRole("status", { name: "Carregando resposta" }),
		).toBeNull();
		expect(emptyAssistantBubbles().length).toBe(0);
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
