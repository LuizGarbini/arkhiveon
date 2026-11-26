// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillsFieldsView } from "./skills-fields";

const diceOverlaySpy = vi.fn();

vi.mock("@/components/dice-roll-overlay", () => ({
	DiceRollOverlay: (props: {
		open: boolean;
		attributeLabel: string;
		modifier?: number;
		diceType: string;
		onClose: () => void;
	}) => {
		diceOverlaySpy(props);
		return props.open ? (
			<div data-testid="dice-overlay-mock">
				<span>{props.attributeLabel}</span>
				<span data-testid="dice-overlay-modifier">
					{String(props.modifier ?? "")}
				</span>
			</div>
		) : null;
	},
}));

afterEach(() => {
	cleanup();
	diceOverlaySpy.mockClear();
});

const baseProps = {
	proficiencyBonus: 3,
	strength: 16, // +3
	dexterity: 14, // +2
	constitution: 12, // +1
	intelligence: 10, // +0
	wisdom: 14, // +2
	charisma: 8, // -1
	skillProficiencies: {
		perception: "proficient",
		stealth: "expertise",
		investigation: "half",
	},
	savingThrowProficiencies: {
		strength: true,
		constitution: true,
	},
};

describe("SkillsFieldsView", () => {
	it("exibe bônus de proficiência e sentidos passivos calculados corretamente", () => {
		render(<SkillsFieldsView {...baseProps} />);

		// Proficiência: +3
		expect(screen.getByText("+3", { selector: "p" })).toBeTruthy();
		// Percepção Passiva: 10 + 2 (SAB) + 3 (proficiente) = 15
		expect(screen.getByText("15")).toBeTruthy();
		// Investigação Passiva: 10 + 0 (INT) + 1 (meia de +3) = 11
		expect(screen.getByText("11")).toBeTruthy();
		// Intuição Passiva: 10 + 2 (SAB) + 0 = 12
		expect(screen.getByText("12")).toBeTruthy();
	});

	it("soma bônus de itens nas salvaguardas e exibe breakdown e notas", () => {
		render(
			<SkillsFieldsView
				{...baseProps}
				savesBonus={{
					total: 1,
					parts: [{ label: "Anel de Proteção", value: 1 }],
					notes: [
						"Amuleto Arcano: +2 em salvaguardas contra magia (não soma).",
					],
				}}
			/>,
		);

		// Força: +3 (attr) + 3 (prof) + 1 (item) = +7
		expect(
			screen.getByRole("button", {
				name: "Rolar salvaguarda de Força (+7)",
			}),
		).toBeTruthy();
		// Carisma: -1 (attr) + 0 + 1 (item) = +0
		expect(
			screen.getByRole("button", {
				name: "Rolar salvaguarda de Carisma (+0)",
			}),
		).toBeTruthy();

		expect(screen.getByText("Itens +1")).toBeTruthy();
		expect(
			screen.getByText("Bônus ativo de itens: Anel de Proteção (+1)"),
		).toBeTruthy();
		expect(
			screen.getByText(
				"Amuleto Arcano: +2 em salvaguardas contra magia (não soma).",
			),
		).toBeTruthy();
	});

	it("passa o modificador correto para DiceRollOverlay ao rolar salvaguarda e perícia", () => {
		render(<SkillsFieldsView {...baseProps} />);

		fireEvent.click(
			screen.getByRole("button", { name: "Rolar salvaguarda de Força (+6)" }),
		);
		expect(screen.getByTestId("dice-overlay-modifier").textContent).toBe("6");

		// Furtividade: +2 (DES) + 6 (expertise 2x3) = +8
		fireEvent.click(
			screen.getByRole("button", { name: "Rolar Furtividade (+8)" }),
		);
		expect(screen.getByTestId("dice-overlay-modifier").textContent).toBe("8");
	});

	it("dispara callbacks de alternância inline para salvaguardas e perícias", () => {
		const onToggleSavingThrow = vi.fn();
		const onCycleSkillProficiency = vi.fn();

		render(
			<SkillsFieldsView
				{...baseProps}
				onToggleSavingThrow={onToggleSavingThrow}
				onCycleSkillProficiency={onCycleSkillProficiency}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Alternar proficiência em salvaguarda de Destreza",
			}),
		);
		expect(onToggleSavingThrow).toHaveBeenCalledWith("dexterity");

		fireEvent.click(
			screen.getByRole("button", {
				name: "Alternar proficiência em Furtividade (atual: Especialista)",
			}),
		);
		expect(onCycleSkillProficiency).toHaveBeenCalledWith("stealth");
	});

	it("filtra por proficiência, atributo e busca, com empty state e botão de limpar filtros", () => {
		render(<SkillsFieldsView {...baseProps} />);

		// Filtro por atributo FOR -> somente Atletismo
		fireEvent.click(screen.getByRole("button", { name: "FOR" }));
		expect(screen.getByText("Atletismo")).toBeTruthy();
		expect(screen.queryByText("Furtividade")).toBeNull();

		// Combinação sem resultado (FOR + Especialista) -> empty state
		fireEvent.click(screen.getByRole("button", { name: /Especialista/i }));
		expect(
			screen.getByText("Nenhuma perícia encontrada para os filtros atuais."),
		).toBeTruthy();

		// Limpar filtros restaura todas as perícias
		fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
		expect(screen.getByText("Furtividade")).toBeTruthy();
		expect(screen.getByText("Atletismo")).toBeTruthy();
	});
});
