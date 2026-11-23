// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryViewToggle } from "./library-view-toggle";

afterEach(cleanup);

describe("LibraryViewToggle", () => {
	it("marca o modo ativo com aria-pressed e troca no clique", () => {
		const onChange = vi.fn();
		render(<LibraryViewToggle value="list" onChange={onChange} />);
		const group = screen.getByRole("group", { name: "Modo de visualização" });
		expect(group).toBeTruthy();
		const list = screen.getByRole("button", { name: "Lista" });
		const grid = screen.getByRole("button", { name: "Grade" });
		expect(list.getAttribute("aria-pressed")).toBe("true");
		expect(grid.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(grid);
		expect(onChange).toHaveBeenCalledWith("grid");
	});
});
