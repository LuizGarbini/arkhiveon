// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./dropdown-menu";

afterEach(cleanup);

describe("DropdownMenu do DS", () => {
	it("abre um popup sólido, sem blur, com itens de 44px", async () => {
		render(
			<DropdownMenu>
				<DropdownMenuTrigger>Abrir</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Primeira opção</DropdownMenuItem>
					<DropdownMenuItem>Segunda opção</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
		});
		const popup = document.querySelector('[data-slot="dropdown-menu-content"]');
		expect(popup).toBeTruthy();
		const popupClass = popup?.className ?? "";
		expect(popupClass).toContain("bg-popover");
		expect(popupClass).not.toContain("backdrop-blur");
		expect(popupClass).not.toContain("popover/95");
		const item = await screen.findByRole("menuitem", {
			name: "Primeira opção",
		});
		expect(item.className).toContain("min-h-[44px]");
	});
});
