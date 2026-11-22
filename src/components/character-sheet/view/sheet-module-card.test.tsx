// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SheetModuleConfig } from "@/lib/store";
import { SheetModuleCard } from "./sheet-module-card";

afterEach(cleanup);

const mod = {
	id: "inventory-80",
	kind: "inventory",
	title: "Inventário",
	enabled: true,
	order: 80,
	column: "main",
} as SheetModuleConfig;

describe("SheetModuleCard (cabeçalho uniforme)", () => {
	it("mostra o título uma vez e Editar ≥44px para quem pode editar", () => {
		const onEdit = vi.fn();
		render(
			<SheetModuleCard module={mod} canEdit onEdit={onEdit}>
				<p>conteúdo</p>
			</SheetModuleCard>,
		);
		const heading = screen.getByRole("heading", {
			level: 2,
			name: "Inventário",
		});
		expect(heading.className).toContain("font-display");
		expect(heading.tabIndex).toBe(-1);
		const region = screen.getByRole("region", { name: "Inventário" });
		expect(region.id).toBe("ficha-inventory");
		expect(region.getAttribute("data-module-kind")).toBe("inventory");
		expect(region.className).toContain("scroll-mt-3");
		expect(region.className).toContain("max-md:rounded-none");
		expect(region.className).toContain("max-md:bg-transparent");
		const edit = screen.getByRole("button", { name: "Editar Inventário" });
		expect(edit.className).toContain("min-h-[44px]");
		expect(edit.className).toContain("min-w-[44px]");
		expect(edit.className).toContain("h-[44px]");
		fireEvent.click(edit);
		expect(onEdit).toHaveBeenCalledTimes(1);
	});

	it("esconde Editar para quem não pode editar (viewer)", () => {
		render(
			<SheetModuleCard module={mod} canEdit={false} onEdit={() => {}}>
				<p>conteúdo</p>
			</SheetModuleCard>,
		);
		expect(screen.queryByRole("button", { name: /Editar/ })).toBeNull();
	});
});
