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
});
