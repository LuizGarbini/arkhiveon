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
