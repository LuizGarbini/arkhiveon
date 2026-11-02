// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TOOLBAR_WITH_GRID_BAR_CLASS } from "@/lib/vtt/grid-bar-layout";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTToolbar } from "./vtt-toolbar";

const toolbarClass = () =>
	document.querySelector('[data-slot="vtt-toolbar"]')?.className ?? "";

afterEach(() => {
	cleanup();
	useVTTStore.setState({
		isGM: false,
		showGridSettings: false,
		gridMoreOpen: false,
	});
});

describe("toolbar esquerda com a barra do grid em 390 px", () => {
	it("sem barra, mantém a altura padrão", () => {
		useVTTStore.setState({ isGM: true, showGridSettings: false });
		render(<VTTToolbar />);
		expect(toolbarClass()).not.toMatch(/max-sm:(max-h-|hidden)/);
	});

	it("barra fechada: termina acima da barra (mesmo recuo do zoom)", () => {
		useVTTStore.setState({
			isGM: true,
			showGridSettings: true,
			gridMoreOpen: false,
		});
		render(<VTTToolbar />);
		expect(toolbarClass()).toContain(TOOLBAR_WITH_GRID_BAR_CLASS.closed);
	});

	it("'Mais ajustes' aberto: recolhe junto com a barra", () => {
		useVTTStore.setState({
			isGM: true,
			showGridSettings: true,
			gridMoreOpen: true,
		});
		render(<VTTToolbar />);
		expect(toolbarClass()).toContain(TOOLBAR_WITH_GRID_BAR_CLASS.open);
	});

	it("ao fechar 'Mais ajustes' a toolbar volta a aparecer", () => {
		useVTTStore.setState({
			isGM: true,
			showGridSettings: true,
			gridMoreOpen: true,
		});
		render(<VTTToolbar />);
		expect(toolbarClass()).toContain(TOOLBAR_WITH_GRID_BAR_CLASS.open);
		act(() => useVTTStore.setState({ gridMoreOpen: false }));
		expect(toolbarClass()).not.toContain("max-sm:hidden");
		expect(toolbarClass()).toContain(TOOLBAR_WITH_GRID_BAR_CLASS.closed);
	});

	it("jogador não sofre ajuste mesmo com a flag ligada", () => {
		useVTTStore.setState({
			isGM: false,
			showGridSettings: true,
			gridMoreOpen: true,
		});
		render(<VTTToolbar />);
		expect(toolbarClass()).not.toMatch(/max-sm:(max-h-|hidden)/);
	});
});
