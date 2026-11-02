// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateSheetBatch } from "../../../supabase/functions/_shared/ia-mesa-sheet-batch";
import {
	SheetBatchReview,
	type SheetBatchReviewRow,
} from "./sheet-batch-review";

afterEach(cleanup);

const handlers = {
	onApply: vi.fn(),
	onCancel: vi.fn(),
	onUndo: vi.fn(),
};

function fourteenRows(): SheetBatchReviewRow[] {
	const proposal = validateSheetBatch(
		{
			characterId: "dante-1",
			changes: [
				{ field: "strength", value: "18" },
				{ field: "dexterity", value: "14" },
				{ field: "constitution", value: "16" },
				{ field: "intelligence", value: "12" },
				{ field: "wisdom", value: "15" },
				{ field: "charisma", value: "10" },
				{ field: "health", value: "42" },
				{ field: "armorClass", value: "18" },
				{ field: "speed", value: "30" },
				{ field: "initiative", value: "2" },
				{ field: "level", value: "5" },
				{ field: "skill.perception", value: "proficient" },
				{ field: "skill.athletics", value: "expertise" },
				{ field: "item.quantity", value: "sword|2" },
			],
		},
		{
			id: "dante-1",
			name: "Dante Diavolo",
			itemIds: ["sword"],
			data: {
				strength: 16,
				dexterity: 12,
				constitution: 14,
				intelligence: 10,
				wisdom: 13,
				charisma: 8,
				health: 30,
				armorClass: 16,
				speed: 9,
				skillProficiencies: { athletics: "proficient" },
				inventoryList: [
					{
						id: "sword",
						name: "Espada longa",
						quantity: 1,
						location: "equipped",
						category: "weapon",
					},
				],
			},
		},
	);
	if (!proposal) throw new Error("diff não saiu");
	return proposal.diff.map((row) => ({
		section: row.section,
		field: row.field,
		label: row.label,
		before: row.before,
		after: row.after,
	}));
}

describe("SheetBatchReview", () => {
	it("lista 14 alterações agrupadas, com rolagem e botões fixos", () => {
		const rows = fourteenRows();
		expect(rows).toHaveLength(14);
		const { container } = render(
			<SheetBatchReview
				characterName="Dante Diavolo"
				rows={rows}
				phase="ready"
				{...handlers}
			/>,
		);
		expect(screen.getByRole("heading", { name: "14 alterações" })).toBeTruthy();
		const atributos = screen.getByRole("heading", { name: "Atributos" });
		const pericias = screen.getByRole("heading", { name: "Perícias" });
		const itens = screen.getByRole("heading", { name: "Itens" });
		expect(
			atributos.compareDocumentPosition(pericias) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			pericias.compareDocumentPosition(itens) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		const strength = container.querySelector("[data-field='strength']");
		expect(strength?.querySelector(".line-through")?.textContent).toBe("16");
		expect(strength?.textContent).toContain("18");
		const list = container.querySelector("[data-slot='sheet-batch-list']");
		expect(list?.className).toContain("overflow-y-auto");
		expect(
			container.querySelector("[data-slot='sheet-batch-actions']")?.className,
		).toContain("sticky");
		expect(
			container.querySelector("[data-phase='ready']")?.className,
		).toContain("max-sm:fixed");
		expect(
			container.querySelector("[data-phase='ready']")?.className,
		).toContain("max-sm:inset-0");
	});

	it("com até 10 campos a lista não rola por dentro", () => {
		const { container } = render(
			<SheetBatchReview
				characterName="Dante"
				phase="ready"
				rows={[
					{
						section: "Atributos",
						field: "strength",
						label: "FOR",
						before: "16",
						after: "18",
					},
					{
						section: "Atributos",
						field: "dexterity",
						label: "DES",
						before: "12",
						after: "14",
					},
					{
						section: "Combate",
						field: "health",
						label: "PV",
						before: "30",
						after: "42",
					},
				]}
				{...handlers}
			/>,
		);
		expect(
			container.querySelector("[data-slot='sheet-batch-list']")?.className,
		).not.toContain("overflow-y-auto");
	});

	it("campo rejeitado mostra o motivo e desabilita Aplicar", () => {
		render(
			<SheetBatchReview
				characterName="Dante"
				phase="ready"
				rows={[
					{
						section: "Atributos",
						field: "strength",
						label: "FOR",
						before: "16",
						after: "18",
					},
					{
						section: "Combate",
						field: "armorClass",
						label: "CA",
						reason: "CA tem que ficar entre 0 e 50.",
					},
				]}
				{...handlers}
			/>,
		);
		expect(screen.getByText("CA tem que ficar entre 0 e 50.")).toBeTruthy();
		expect(
			(screen.getByRole("button", { name: "Aplicar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("aplicando trava os dois botões", () => {
		render(
			<SheetBatchReview
				characterName="Dante"
				phase="applying"
				rows={[
					{
						section: "Atributos",
						field: "strength",
						label: "FOR",
						before: "16",
						after: "18",
					},
				]}
				{...handlers}
			/>,
		);
		expect(
			(screen.getByRole("button", { name: "Aplicando" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		expect(
			(screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("aplicado destaca a linha e o erro fica no rodapé", () => {
		const { container } = render(
			<SheetBatchReview
				characterName="Dante"
				phase="applied"
				highlighted
				error="Não foi possível salvar. Nada foi alterado."
				rows={[
					{
						section: "Atributos",
						field: "strength",
						label: "FOR",
						before: "16",
						after: "18",
					},
				]}
				{...handlers}
			/>,
		);
		const row = container.querySelector("[data-field='strength']");
		expect(row?.getAttribute("data-highlighted")).toBe("true");
		expect(row?.className).toContain("bg-primary/15");
		expect(screen.getByRole("alert").textContent).toMatch(/Nada foi alterado/);
	});
});
