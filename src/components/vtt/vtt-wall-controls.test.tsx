// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTWall } from "@/lib/vtt/walls";

const mock = vi.hoisted(() => ({
	setWallsKind: vi.fn(),
	deleteSelectedWalls: vi.fn(),
}));
vi.mock("@/lib/vtt/wall-sync", () => ({
	setWallsKind: (...args: unknown[]) => mock.setWallsKind(...args),
	deleteSelectedWalls: () => mock.deleteSelectedWalls(),
}));

import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTWallControls } from "./vtt-wall-controls";

afterEach(cleanup);

const plain = (id: string): VTTWall => ({
	id,
	sceneId: "s",
	x1: 0,
	y1: 0,
	x2: 70,
	y2: 0,
});
const door = (id: string): VTTWall => ({
	...plain(id),
	kind: "door",
	isOpen: false,
});

beforeEach(() => {
	mock.setWallsKind.mockReset();
	mock.deleteSelectedWalls.mockReset();
	useVTTStore.setState({
		isGM: true,
		activeTool: "wall",
		wallKind: "wall",
		walls: [plain("a"), plain("b"), door("d")],
		selectedWallIds: [],
	});
});

describe("painel da ferramenta Parede", () => {
	it("só aparece para o mestre com a ferramenta Parede ativa", () => {
		const { container, rerender } = render(<VTTWallControls />);
		expect(screen.getByText("Paredes e portas")).toBeTruthy();
		useVTTStore.setState({ activeTool: "select" });
		rerender(<VTTWallControls />);
		expect(container.textContent).toBe("");
		useVTTStore.setState({ activeTool: "wall", isGM: false });
		rerender(<VTTWallControls />);
		expect(container.textContent).toBe("");
	});

	it("o seletor escolhe o que desenhar (parede por padrão)", () => {
		render(<VTTWallControls />);
		const wall = screen.getByRole("button", { name: "Parede" });
		const doorButton = screen.getByRole("button", { name: "Porta" });
		expect(wall.getAttribute("aria-pressed")).toBe("true");
		expect(doorButton.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(doorButton);
		expect(useVTTStore.getState().wallKind).toBe("door");
		expect(
			screen
				.getByRole("button", { name: "Porta" })
				.getAttribute("aria-pressed"),
		).toBe("true");
		fireEvent.click(screen.getByRole("button", { name: "Parede" }));
		expect(useVTTStore.getState().wallKind).toBe("wall");
	});

	it("sem seleção não há ações de conversão", () => {
		render(<VTTWallControls />);
		expect(screen.queryByText("Virar porta")).toBeNull();
		expect(screen.queryByText("Virar parede")).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Apagar selecionadas" }),
		).toBeNull();
	});

	it("paredes comuns selecionadas: oferece Virar porta (e conta a seleção)", () => {
		useVTTStore.setState({ selectedWallIds: ["a", "b"] });
		render(<VTTWallControls />);
		expect(screen.getByText("2 selecionadas")).toBeTruthy();
		expect(screen.queryByText("Virar parede")).toBeNull();
		fireEvent.click(screen.getByText("Virar porta"));
		expect(mock.setWallsKind).toHaveBeenCalledWith(["a", "b"], "door");
	});

	it("portas selecionadas: oferece Virar parede", () => {
		useVTTStore.setState({ selectedWallIds: ["d"] });
		render(<VTTWallControls />);
		expect(screen.getByText("1 selecionada")).toBeTruthy();
		expect(screen.queryByText("Virar porta")).toBeNull();
		fireEvent.click(screen.getByText("Virar parede"));
		expect(mock.setWallsKind).toHaveBeenCalledWith(["d"], "wall");
	});

	it("seleção mista: oferece as duas conversões", () => {
		useVTTStore.setState({ selectedWallIds: ["a", "d"] });
		render(<VTTWallControls />);
		expect(screen.getByText("Virar porta")).toBeTruthy();
		expect(screen.getByText("Virar parede")).toBeTruthy();
	});

	it("Apagar chama a exclusão da seleção", () => {
		useVTTStore.setState({ selectedWallIds: ["a"] });
		render(<VTTWallControls />);
		fireEvent.click(
			screen.getByRole("button", { name: "Apagar selecionadas" }),
		);
		expect(mock.deleteSelectedWalls).toHaveBeenCalledTimes(1);
	});

	it("fechar volta para a ferramenta Selecionar", () => {
		render(<VTTWallControls />);
		fireEvent.click(
			screen.getByRole("button", { name: "Fechar ferramenta de paredes" }),
		);
		expect(useVTTStore.getState().activeTool).toBe("select");
	});

	it("selecionada que sumiu da cena (apagada por outro) não conta", () => {
		useVTTStore.setState({ selectedWallIds: ["fantasma"] });
		render(<VTTWallControls />);
		expect(screen.queryByText(/selecionada/)).toBeNull();
	});
});
