// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Character, characterDefaults } from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { SheetHeader, SheetQuickStats } from "./sheet-header";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
		to,
	}: {
		children?: ReactNode;
		className?: string;
		to?: string;
	}) => (
		<a href={to ?? "#"} className={className}>
			{children}
		</a>
	),
}));

afterEach(cleanup);

const character = {
	...characterDefaults,
	id: "char-1",
	createdAt: 1,
	characterName: "Elara Ventoclaro",
	playerName: "Jogador mock",
	race: "Alta-elfa",
	class: "Mago",
	level: 5,
	system: "dnd5e",
	health: 27,
	healthMax: 32,
} as Character;

const rawColor = /text-(rose|blue|amber|emerald|purple)-/;

function renderHeader(extra?: Partial<ComponentProps<typeof SheetHeader>>) {
	return render(
		<SheetHeader
			character={character}
			config={SYSTEM_CONFIG.dnd5e}
			effectiveHealthMax={32}
			onOpenImageDialog={() => {}}
			onOpenNameDialog={() => {}}
			onOpenTransferDialog={() => {}}
			onOpenExportDialog={() => {}}
			onToggleEditLayout={() => {}}
			{...extra}
		/>,
	);
}

describe("SheetHeader", () => {
	it("não usa cor crua nos números e não corta o nome", () => {
		renderHeader();
		const header = document.querySelector("[data-slot=sheet-header]");
		expect(header).not.toBeNull();
		expect(header?.innerHTML ?? "").not.toMatch(rawColor);
		const name = screen.getByRole("heading", {
			level: 1,
			name: "Elara Ventoclaro",
		});
		expect(name.className).toContain("line-clamp-2");
		expect(name.className).toContain("max-md:text-xl");
		expect(name.className).toContain("break-words");
		expect(name.className).not.toContain("truncate");
		expect(name.getAttribute("title")).toBe("Elara Ventoclaro");
		expect(screen.getByText("Alta-elfa · Mago · Nível 5").className).toContain(
			"text-muted-foreground",
		);
		expect(
			screen.getByText("Alta-elfa · Mago · Nível 5").className,
		).not.toContain("text-primary");
		expect(header?.querySelector("dl")?.className).toContain(
			"max-md:grid-cols-4",
		);
		expect(screen.getByText("D&D 5ª Edição (2014)").className).toContain(
			"text-primary",
		);
		for (const value of header?.querySelectorAll("dd") ?? []) {
			expect(value.className).toContain("text-foreground");
			expect(value.className).not.toMatch(rawColor);
		}
		expect(header?.className).toContain("max-md:shadow-none");
		expect(header?.querySelector(".blur-3xl")?.className).toContain(
			"max-md:hidden",
		);
	});

	it("guarda Equipamento e Editar layout no menu no celular", () => {
		renderHeader();
		const equipment = screen.getByRole("button", { name: "Equipamento" });
		expect(equipment.className).toContain("hidden");
		expect(equipment.className).toContain("md:inline-flex");
		const edit = screen.getByRole("button", { name: "Editar layout" });
		expect(edit.className).toContain("hidden");
		expect(edit.className).toContain("md:inline-flex");
		const name = screen.getByRole("heading", {
			level: 1,
			name: "Elara Ventoclaro",
		});
		const nameRow = name.parentElement;
		const moreButtons = screen.getAllByRole("button", {
			name: "Mais ações da ficha",
		});
		const moreOnNameLine = moreButtons.find((button) =>
			nameRow?.contains(button),
		);
		expect(moreOnNameLine).toBeDefined();
		expect(moreOnNameLine?.className).toContain("md:hidden");
		expect(moreOnNameLine?.className).toContain("size-[44px]");
		expect(
			nameRow?.contains(
				screen.getByRole("button", { name: "Renomear personagem" }),
			),
		).toBe(true);
		expect(
			screen.getByRole("button", { name: "Renomear personagem" }).className,
		).toContain("size-[44px]");
		const desktopMore = moreButtons.find(
			(button) => !nameRow?.contains(button),
		);
		expect(desktopMore?.className).toContain("max-md:hidden");
		expect(desktopMore?.parentElement?.className).toContain("max-md:hidden");

		fireEvent.click(moreOnNameLine as HTMLElement);
		const menuEquipment = screen.getByRole("menuitem", { name: "Equipamento" });
		const menuEdit = screen.getByRole("menuitem", { name: "Editar layout" });
		expect(menuEquipment.className).toContain("min-h-[44px]");
		expect(menuEdit.className).toContain("min-h-[44px]");
	});

	it("a percepção passiva também usa a cor do texto", () => {
		const { container } = render(
			<SheetQuickStats
				character={character}
				config={SYSTEM_CONFIG.dnd5e}
				health="27/32"
				showPassive
			/>,
		);
		expect(container.innerHTML).not.toMatch(rawColor);
		expect(screen.getByText("PASSIVA").parentElement?.innerHTML).toContain(
			"text-foreground",
		);
	});
});
