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
		showGridSettings: true,
		activeSceneId: scene.id,
		scenes: [{ ...scene }],
	});
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("clampGridSize", () => {
	it("prende em 10–400 e arredonda para inteiro", () => {
		expect(clampGridSize(5)).toBe(10);
		expect(clampGridSize(25.4)).toBe(25);
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
});
