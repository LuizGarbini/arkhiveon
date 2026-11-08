// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { longsword, thalia } from "@/core/rules/thalia.fixture";
import type { InventoryItem, Item } from "@/lib/store/types";
import { LinkedInventoryRow } from "./linked-inventory-row";

const entry: InventoryItem = {
	id: "inv-1",
	name: "retrato",
	quantity: 1,
	weightLbs: 1.5,
	location: "equipped",
	category: "weapon",
	campaignItemId: longsword.id,
	proficient: true,
};

const item: Item = {
	...longsword,
	stats: "Brilha quando orcs se aproximam.",
	description: "Lâmina forjada para cortar a escuridão.",
	properties: "Versátil (1d10)",
};

afterEach(cleanup);

describe("LinkedInventoryRow", () => {
	it("mostra o efeito e a descrição em largura inteira", () => {
		const { container } = render(
			<LinkedInventoryRow
				entry={entry}
				item={item}
				character={thalia}
				canEditLink
				onChange={vi.fn()}
				onQuantity={vi.fn()}
				onUnlink={vi.fn()}
			/>,
		);
		expect(
			screen.getByText("Arma · 1d8 cortante · +1 · versátil"),
		).toBeTruthy();
		expect(screen.getByText(/Acerto/)).toBeTruthy();
		expect(
			screen.getByText("Lâmina forjada para cortar a escuridão."),
		).toBeTruthy();
		expect(container.firstElementChild?.className).not.toContain("sm:flex-row");
		fireEvent.click(
			screen.getByRole("button", { name: "Ver detalhes de Espada longa +1" }),
		);
		expect(
			screen.getByRole("dialog", { name: "Espada longa +1" }),
		).toBeTruthy();
		expect(screen.getByText("Brilha quando orcs se aproximam.")).toBeTruthy();
		expect(screen.getByText("Versátil (1d10)")).toBeTruthy();
		expect(screen.getByText("Raridade")).toBeTruthy();
		expect(screen.getByText("incomum")).toBeTruthy();
	});
});
