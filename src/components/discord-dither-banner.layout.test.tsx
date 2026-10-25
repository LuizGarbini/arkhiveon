// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscordDitherBanner } from "./discord-dither-banner";

window.matchMedia =
	window.matchMedia ||
	(() => ({
		matches: true,
		media: "",
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));

describe("Banner do Discord no celular", () => {
	afterEach(cleanup);

	it("o texto quebra linha em vez de ser cortado", () => {
		render(<DiscordDitherBanner />);
		const text = screen.getByText(/Conecte-se com mestres e jogadores/);
		expect(text.className).not.toContain("truncate");
		const titleRow = screen.getByText("Comunidade Arkhiveon").parentElement;
		expect(titleRow?.className).toContain("flex-wrap");
	});

	it("reserva a altura do título quebrado no celular, sem mudar o desktop", () => {
		render(<DiscordDitherBanner />);
		const title = screen.getByRole("heading", { name: "Comunidade Arkhiveon" });
		expect(title.className).toContain("max-[400px]:basis-full");
		expect(title.parentElement?.className).toContain(
			"max-[400px]:min-h-[calc(1.75rem+15.5px)]",
		);
	});
});
