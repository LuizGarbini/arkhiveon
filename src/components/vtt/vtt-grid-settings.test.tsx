// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clampGridSize } from "@/lib/vtt/grid-math";
import {
	previousSceneSettings,
	sceneSettingsPatchToDb,
} from "@/lib/vtt/scene-settings";
import { isVttShortcutBlocked } from "@/lib/vtt/shortcut-guard";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTGridSettings } from "./vtt-grid-settings";

const scene: VTTScene = {
	id: "scene",
	campaignId: "c",
	name: "Cena",
	gridType: "square",
	gridSize: 70,
	gridColor: "#ffffff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	gridOffsetX: 0,
	gridOffsetY: 0,
	mapScale: 1,
	width: 4096,
	height: 4096,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
};

const size = () => useVTTStore.getState().scenes[0].gridSize;

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		showGridSettings: true,
		activeSceneId: scene.id,
		scenes: [{ ...scene }],
		gridMoreOpen: false,
	});
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("clampGridSize", () => {
	it("prende em 10–400 com até 2 casas decimais", () => {
		expect(clampGridSize(5)).toBe(10);
		expect(clampGridSize(25.4)).toBe(25.4);
		expect(clampGridSize(25.456)).toBe(25.46);
		expect(clampGridSize(400)).toBe(400);
		expect(clampGridSize(9999)).toBe(400);
		expect(clampGridSize(Number.NaN)).toBe(10);
	});
});

describe("patch parcial", () => {
	it("só converte as chaves presentes", () => {
		expect(sceneSettingsPatchToDb({ gridSize: 25 })).toEqual({
			grid_size: 25,
		});
		expect(
			sceneSettingsPatchToDb({ gridScaleDistance: 5, gridScaleUnit: "ft" }),
		).toEqual({ grid_scale_distance: 5, grid_scale_unit: "ft" });
	});
	it("guarda o valor anterior só das chaves do patch", () => {
		expect(previousSceneSettings(scene, { gridSize: 25 })).toEqual({
			gridSize: 70,
		});
	});
});

describe("VTTGridSettings — tamanho da célula", () => {
	it("campo numérico grava 25 px com patch só de gridSize", async () => {
		const save = vi.fn().mockResolvedValue(true);
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		const input = screen.getByLabelText("Tamanho da célula (px)");
		fireEvent.change(input, { target: { value: "25" } });
		await act(async () => {
			fireEvent.keyDown(input, { key: "Enter" });
		});
		expect(save).toHaveBeenCalledWith({ gridSize: 25 });
	});

	it("prende o valor digitado na faixa 10–400", async () => {
		const save = vi.fn().mockResolvedValue(true);
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		const input = screen.getByLabelText("Tamanho da célula (px)");
		fireEvent.change(input, { target: { value: "1000" } });
		await act(async () => {
			fireEvent.blur(input);
		});
		expect(save).toHaveBeenCalledWith({ gridSize: 400 });
	});

	it("− e + mudam 1 px e travam nos limites", async () => {
		const save = vi.fn().mockResolvedValue(true);
		useVTTStore.setState({ scenes: [{ ...scene, gridSize: 10 }] });
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		expect(
			(
				screen.getByRole("button", {
					name: "Diminuir célula",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Aumentar célula" }));
		});
		expect(save).toHaveBeenCalledWith({ gridSize: 11 });
	});

	it("desabilita os controles enquanto salva", async () => {
		let resolve: (ok: boolean) => void = () => {};
		const save = vi.fn(
			() =>
				new Promise<boolean>((r) => {
					resolve = r;
				}),
		);
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Aumentar célula" }));
		});
		expect(
			(screen.getByLabelText("Tamanho da célula (px)") as HTMLInputElement)
				.disabled,
		).toBe(true);
		expect(screen.getByText("Salvando…")).toBeTruthy();
		await act(async () => resolve(true));
		expect(
			(screen.getByLabelText("Tamanho da célula (px)") as HTMLInputElement)
				.disabled,
		).toBe(false);
	});

	it("slider pré-visualiza local e grava uma vez com debounce de 300 ms", async () => {
		vi.useFakeTimers();
		const save = vi.fn().mockResolvedValue(true);
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		const thumb = screen.getByRole("slider", { name: "Tamanho da célula" });
		thumb.focus();
		fireEvent.keyDown(thumb, { key: "ArrowRight" });
		fireEvent.keyDown(thumb, { key: "ArrowRight" });
		expect(size()).toBe(72);
		await act(async () => {
			vi.advanceTimersByTime(299);
		});
		await act(async () => {
			vi.advanceTimersByTime(1);
		});
		expect(save).toHaveBeenLastCalledWith({ gridSize: 72 });
		expect(save.mock.calls.every(([p]) => Object.keys(p).length === 1)).toBe(
			true,
		);
	});

	it("erro ao gravar volta ao tamanho de antes", async () => {
		const save = vi.fn().mockResolvedValue(false);
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		const input = screen.getByLabelText("Tamanho da célula (px)");
		fireEvent.change(input, { target: { value: "120" } });
		await act(async () => {
			fireEvent.keyDown(input, { key: "Enter" });
		});
		expect(size()).toBe(70);
	});

	it("grid livre ainda mostra o tamanho da célula", () => {
		useVTTStore.setState({ scenes: [{ ...scene, gridType: "none" }] });
		render(<VTTGridSettings onUpdateSceneSettings={vi.fn()} />);
		expect(screen.getByText(/Grid livre: a célula de 70 px/)).toBeTruthy();
	});

	it("rótulo da distância é “Distância por célula”", () => {
		render(<VTTGridSettings onUpdateSceneSettings={vi.fn()} />);
		expect(screen.getByLabelText("Distância por célula")).toBeTruthy();
		expect(screen.queryByLabelText("Escala")).toBeNull();
	});

	it("“Mais ajustes” abre e fecha o resto do painel", () => {
		render(<VTTGridSettings onUpdateSceneSettings={() => true} />);
		const toggle = screen.getByRole("button", { name: "Mais ajustes" });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		fireEvent.click(toggle);
		expect(useVTTStore.getState().gridMoreOpen).toBe(true);
		expect(toggle.getAttribute("aria-expanded")).toBe("true");
	});

	it("painel não usa blur, só bg-card", () => {
		render(<VTTGridSettings onUpdateSceneSettings={() => true} />);
		const panel = screen.getByRole("region", { name: "Ajuste do grid" });
		expect(panel.className).not.toContain("backdrop-blur");
		expect(panel.className).toContain("bg-card");
		expect(panel.className).not.toContain("42dvh");
	});

	it("aceita célula decimal", async () => {
		const save = vi.fn().mockResolvedValue(true);
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		const input = screen.getByLabelText("Tamanho da célula (px)");
		fireEvent.change(input, { target: { value: "25.5" } });
		await act(async () => {
			fireEvent.keyDown(input, { key: "Enter" });
		});
		expect(save).toHaveBeenCalledWith({ gridSize: 25.5 });
	});
});

describe("VTTGridSettings — offset", () => {
	it("jogador não vê o painel", () => {
		useVTTStore.setState({ isGM: false });
		render(<VTTGridSettings onUpdateSceneSettings={vi.fn()} />);
		expect(screen.queryByLabelText("Deslocamento X")).toBeNull();
		expect(screen.queryByRole("region", { name: "Ajuste do grid" })).toBeNull();
	});

	it("nudge de 1 px grava o offset e o atalho da mesa fica bloqueado no campo", async () => {
		const save = vi.fn().mockResolvedValue(true);
		useVTTStore.setState({
			scenes: [{ ...scene, gridOffsetX: 12, gridOffsetY: 7 }],
		});
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		const input = screen.getByLabelText("Deslocamento X");
		expect((input as HTMLInputElement).value).toBe("12");
		expect(
			(screen.getByLabelText("Deslocamento Y") as HTMLInputElement).value,
		).toBe("7");
		expect(
			screen.getAllByText("Alinha o grid ao desenho do mapa"),
		).toHaveLength(2);
		expect(screen.queryByText("Velocidade de Movimento (metros)")).toBeNull();
		input.focus();
		const event = new KeyboardEvent("keydown", { key: "g", bubbles: true });
		Object.defineProperty(event, "target", { value: input });
		expect(isVttShortcutBlocked(event)).toBe(true);
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Aumentar deslocamento X" }),
			);
		});
		expect(save).toHaveBeenCalledWith({ gridOffsetX: 13 });
	});

	it("nudge abaixo de zero volta para o fim da célula", async () => {
		const save = vi.fn().mockResolvedValue(true);
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Diminuir deslocamento X" }),
			);
		});
		expect(save).toHaveBeenCalledWith({ gridOffsetX: 69 });
	});

	it("contar 40×30 em 2000×1500 grava célula de 50", async () => {
		const save = vi.fn().mockResolvedValue(true);
		useVTTStore.setState({
			scenes: [{ ...scene, width: 2000, height: 1500 }],
		});
		render(<VTTGridSettings onUpdateSceneSettings={save} />);
		fireEvent.change(screen.getByLabelText("Colunas"), {
			target: { value: "40" },
		});
		fireEvent.change(screen.getByLabelText("Linhas"), {
			target: { value: "30" },
		});
		expect(screen.getByText("40 × 30 → 50 px")).toBeTruthy();
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Usar este tamanho" }),
			);
		});
		expect(save).toHaveBeenCalledWith({ gridSize: 50 });
	});
});
