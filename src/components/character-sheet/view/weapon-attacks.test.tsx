// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Character } from "@/lib/store";
import { WeaponAttacksSection } from "./weapon-attacks";

function mockViewport(mobile: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: mobile,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

const character = {
	id: "c1",
	system: "dnd5e",
	level: 15,
	proficiencyBonus: 5,
	strength: 20,
	dexterity: 14,
	inventoryList: [
		{
			id: "sword",
			name: "Espada Longa da Tempestade",
			quantity: 1,
			weightLbs: 3,
			location: "equipped",
			category: "weapon",
			weapon: {
				damageDice: "1d8",
				damageType: "slashing",
				ability: "strength",
				magicBonus: 1,
				extraDamage: [
					{
						id: "r",
						label: "Runa da tempestade",
						amount: "2",
						type: "lightning",
					},
				],
			},
		},
	],
} as unknown as Character;

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("WeaponAttacksSection", () => {
	it("sem arma equipada não mostra número de dano", () => {
		mockViewport(false);
		render(
			<WeaponAttacksSection
				character={{ ...character, inventoryList: [] } as Character}
			/>,
		);
		expect(screen.getByText(/Nenhuma arma equipada/)).toBeTruthy();
		expect(screen.queryByLabelText(/Dano .*: ver a conta/)).toBeNull();
	});

	it("mostra acerto e dano da arma equipada", () => {
		mockViewport(false);
		render(<WeaponAttacksSection character={character} />);
		expect(screen.getByLabelText("Acerto +11: ver a conta").textContent).toBe(
			"+11",
		);
		expect(screen.getByLabelText("Dano 1d8+8: ver a conta").textContent).toBe(
			"1d8+8",
		);
	});

	it("mobile: detalhe abre em sheet sem botão X", async () => {
		mockViewport(true);
		render(<WeaponAttacksSection character={character} />);
		fireEvent.click(screen.getByLabelText("Dano 1d8+8: ver a conta"));
		const dialog = await screen.findByRole("dialog");
		expect(dialog.textContent).toContain("Por tipo");
		expect(dialog.textContent).toContain("Raio 2");
		expect(dialog.querySelector('[data-slot="dialog-close"]')).toBeNull();
		expect(screen.queryByRole("button", { name: /close|fechar/i })).toBeNull();
	});
});
