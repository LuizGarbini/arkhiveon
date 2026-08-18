// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpellSearchDialog } from "./spell-search-dialog";

// Mock matchMedia for jsdom environment
window.matchMedia =
	window.matchMedia ||
	(() => ({
		matches: false,
		media: "",
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));

const mockSpells = [
	{
		id: "spell-1",
		name: "Bola de Fogo",
		level: 3,
		school: "Evocação",
		description: "Uma explosão de fogo.",
		system: "dnd5e",
	},
	{
		id: "spell-2",
		name: "Mísseis Mágicos",
		level: 1,
		school: "Evocação",
		description: "Dardos de força.",
		system: "dnd5e",
	},
];

const mockSelect = vi.fn().mockImplementation(() => ({
	in: vi.fn().mockImplementation(() => ({
		order: vi.fn().mockResolvedValue({
			data: mockSpells,
			error: null,
		}),
	})),
}));

const mockSupabase = {
	from: vi.fn().mockImplementation(() => ({
		select: mockSelect,
	})),
	auth: {
		getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } } }),
	},
};

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => mockSupabase,
}));

describe("SpellSearchDialog State Resets", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders when open and resets states when closed", async () => {
		const onOpenChange = vi.fn();
		const onSelectSpell = vi.fn();

		const { rerender } = render(
			<SpellSearchDialog
				system="dnd5e"
				open={true}
				onOpenChange={onOpenChange}
				onSelectSpell={onSelectSpell}
				currentSpells={[]}
			/>,
		);

		// Verify it loads spells
		await waitFor(() => {
			expect(screen.getByText("Grimório de Magias")).toBeDefined();
			expect(screen.getAllByText("Bola de Fogo").length).toBeGreaterThan(0);
		});

		// Type in the search input
		const searchInput = screen.getByPlaceholderText(/Buscar por nome/i);
		fireEvent.change(searchInput, { target: { value: "Fogo" } });
		expect((searchInput as HTMLInputElement).value).toBe("Fogo");

		// Now close the dialog by rerendering with open=false
		rerender(
			<SpellSearchDialog
				system="dnd5e"
				open={false}
				onOpenChange={onOpenChange}
				onSelectSpell={onSelectSpell}
				currentSpells={[]}
			/>,
		);

		// Open it again to verify search query is reset to empty string
		rerender(
			<SpellSearchDialog
				system="dnd5e"
				open={true}
				onOpenChange={onOpenChange}
				onSelectSpell={onSelectSpell}
				currentSpells={[]}
			/>,
		);

		await waitFor(() => {
			const reopenedSearchInput =
				screen.getByPlaceholderText(/Buscar por nome/i);
			expect((reopenedSearchInput as HTMLInputElement).value).toBe("");
		});
	});
});
