// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VTTRulerMeasurement } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTPinnedRuler } from "./vtt-pinned-ruler";

afterEach(cleanup);

const measurement = (
	over: Partial<VTTRulerMeasurement> = {},
): VTTRulerMeasurement => ({
	startX: 35,
	startY: 35,
	currentX: 315,
	currentY: 35,
	distance: 6,
	unit: "m",
	waypoints: [
		{ x: 35, y: 35 },
		{ x: 315, y: 35 },
	],
	segments: [6],
	cells: 4,
	pinned: true,
	...over,
});

beforeEach(() => {
	useVTTStore.setState({
		activeMeasurement: measurement(),
		activeTool: "select",
	});
});

describe("selo da régua fixada", () => {
	it("aparece com a régua fixada e outra ferramenta, com a distância", () => {
		render(<VTTPinnedRuler />);
		expect(screen.getByText("Régua fixada")).toBeTruthy();
		expect(screen.getByText(/6/)).toBeTruthy();
	});

	it("aparece também com a ferramenta de ping, parede, etc.", () => {
		for (const tool of ["pan", "ping", "wall", "light", "template"] as const) {
			useVTTStore.setState({ activeTool: tool });
			const { container, unmount } = render(<VTTPinnedRuler />);
			expect(container.textContent).toContain("Régua fixada");
			unmount();
		}
	});

	it("não aparece na própria régua (o painel dela já mostra e limpa)", () => {
		useVTTStore.setState({ activeTool: "ruler" });
		const { container } = render(<VTTPinnedRuler />);
		expect(container.textContent).toBe("");
	});

	it("não aparece sem medição, nem com a medição ainda ao vivo", () => {
		useVTTStore.setState({ activeMeasurement: null });
		expect(render(<VTTPinnedRuler />).container.textContent).toBe("");
		cleanup();
		useVTTStore.setState({ activeMeasurement: measurement({ pinned: false }) });
		expect(render(<VTTPinnedRuler />).container.textContent).toBe("");
	});

	it("Limpar apaga a régua e o selo some", () => {
		const { container } = render(<VTTPinnedRuler />);
		fireEvent.click(
			screen.getByRole("button", { name: "Limpar régua fixada" }),
		);
		expect(useVTTStore.getState().activeMeasurement).toBeNull();
		expect(container.textContent).toBe("");
	});

	it("o botão de limpar tem alvo de toque de 44 px", () => {
		render(<VTTPinnedRuler />);
		expect(
			screen.getByRole("button", { name: "Limpar régua fixada" }).className,
		).toContain("size-11");
	});
});

describe("trocar de ferramenta na store congela a régua", () => {
	it("de ruler para select a medição ao vivo fica fixada (e não some)", () => {
		useVTTStore.setState({
			activeTool: "ruler",
			activeMeasurement: measurement({
				pinned: false,
				waypoints: [{ x: 35, y: 35 }],
			}),
		});
		useVTTStore.getState().setActiveTool("select");
		const kept = useVTTStore.getState().activeMeasurement;
		expect(kept?.pinned).toBe(true);
		expect(kept?.waypoints).toEqual([
			{ x: 35, y: 35 },
			{ x: 315, y: 35 },
		]);
	});

	it("só o clique inicial (sem trecho) é descartado ao sair da régua", () => {
		useVTTStore.setState({
			activeTool: "ruler",
			activeMeasurement: measurement({
				pinned: false,
				currentX: 35,
				currentY: 35,
				waypoints: [{ x: 35, y: 35 }],
				distance: 0,
			}),
		});
		useVTTStore.getState().setActiveTool("select");
		expect(useVTTStore.getState().activeMeasurement).toBeNull();
	});

	it("a régua fixada sobrevive a várias trocas de ferramenta", () => {
		useVTTStore.setState({ activeTool: "select" });
		const pinned = useVTTStore.getState().activeMeasurement;
		for (const tool of [
			"pan",
			"ping",
			"select",
			"wall",
			"light",
			"select",
		] as const) {
			useVTTStore.getState().setActiveTool(tool);
			expect(useVTTStore.getState().activeMeasurement).toBe(pinned);
		}
	});

	it("voltar à régua não apaga a fixada", () => {
		useVTTStore.getState().setActiveTool("ruler");
		expect(useVTTStore.getState().activeMeasurement?.pinned).toBe(true);
	});
});
