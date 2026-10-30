// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ImageAudience } from "@/lib/image-visibility";
import { ImageVisibilityMenuItems } from "./image-visibility-menu";

function renderMenu(isPrivate: boolean, audience: ImageAudience) {
	const onChange = vi.fn();
	render(
		<DropdownMenu defaultOpen>
			<DropdownMenuTrigger>Quem vê</DropdownMenuTrigger>
			<DropdownMenuContent>
				<ImageVisibilityMenuItems
					isPrivate={isPrivate}
					audience={audience}
					onChange={onChange}
				/>
			</DropdownMenuContent>
		</DropdownMenu>,
	);
	return onChange;
}

const item = (name: string) => screen.getByRole("menuitemcheckbox", { name });

afterEach(cleanup);

describe("ImageVisibilityMenuItems", () => {
	it("pública: co-mestres e jogadores ficam desligados", () => {
		renderMenu(false, { coGms: true, players: false });
		expect(item("Pública").getAttribute("aria-checked")).toBe("true");
		expect(item("Co-mestres").getAttribute("aria-disabled")).toBe("true");
		expect(item("Jogadores").getAttribute("aria-disabled")).toBe("true");
		expect(screen.getByText("O mestre sempre vê.")).toBeTruthy();
	});

	it("desmarcar Pública torna privada mantendo quem vê", () => {
		const onChange = renderMenu(false, { coGms: true, players: false });
		fireEvent.click(item("Pública"));
		expect(onChange).toHaveBeenCalledWith({
			isPrivate: true,
			audience: { coGms: true, players: false },
		});
	});

	it("privada: marca co-mestres e jogadores de forma independente", () => {
		const onChange = renderMenu(true, { coGms: true, players: false });
		fireEvent.click(item("Jogadores"));
		expect(onChange).toHaveBeenLastCalledWith({
			isPrivate: true,
			audience: { coGms: true, players: true },
		});
		fireEvent.click(item("Co-mestres"));
		expect(onChange).toHaveBeenLastCalledWith({
			isPrivate: true,
			audience: { coGms: false, players: false },
		});
	});
});
