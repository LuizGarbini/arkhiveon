// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	FOG_BRUSH_SIZES,
	fogBrushDiameterLabel,
	VTTFogControls,
} from "./vtt-fog-controls";

const scene = {
	id: "scene-1",
	campaignId: "qa",
	name: "QA",
	gridType: "square",
	gridSize: 70,
	width: 1600,
	height: 1200,
	fogEnabled: false,
	fogExploration: false,
} as VTTScene;

function setup(fogEnabled: boolean) {
	const onUpdateScene = vi.fn(async () => {});
	const onClearFog = vi.fn();
	render(
		<ToastProvider>
			<VTTFogControls
				scene={{ ...scene, fogEnabled }}
				onUpdateScene={onUpdateScene}
				onClearFog={onClearFog}
			/>
		</ToastProvider>,
	);
	return { onUpdateScene, onClearFog };
}

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		showFogControls: true,
		activeFogTool: "brush",
		fogBrushRadius: 40,
	});
});
afterEach(cleanup);

describe("VTTFogControls — Cobrir/Revelar Tudo", () => {
	it.each([
		["Cobrir Tudo", "all_hidden", "Névoa ativada e mapa coberto"],
		["Revelar Tudo", "all_revealed", "Névoa ativada e mapa revelado"],
	] as const)(
		"%s com a névoa inativa ativa a névoa, aplica e avisa",
		async (label, mode, toastText) => {
			const { onUpdateScene, onClearFog } = setup(false);
			fireEvent.click(screen.getByRole("button", { name: label }));
			await waitFor(() => expect(onClearFog).toHaveBeenCalledWith(mode));
			expect(onUpdateScene).toHaveBeenCalledWith("scene-1", {
				fogEnabled: true,
			});
			expect(await screen.findByText(toastText)).toBeTruthy();
		},
	);

	it("com a névoa ativa só aplica, sem mexer na cena nem avisar", async () => {
		const { onUpdateScene, onClearFog } = setup(true);
		fireEvent.click(screen.getByRole("button", { name: "Cobrir Tudo" }));
		await waitFor(() => expect(onClearFog).toHaveBeenCalledWith("all_hidden"));
		expect(onUpdateScene).not.toHaveBeenCalled();
		expect(screen.queryByText(/Névoa ativada/)).toBeNull();
	});
});

describe("VTTFogControls — pincel em diâmetro", () => {
	it.each(FOG_BRUSH_SIZES)(
		"tamanho $label: cabeçalho igual ao botão selecionado",
		({ label, radius }) => {
			useVTTStore.setState({ fogBrushRadius: radius });
			setup(true);
			const diameter = fogBrushDiameterLabel(radius);
			const button = screen.getByRole("button", {
				name: `${label}(${diameter})`,
			});
			expect(button.className).toContain("bg-white/20");
			// cabeçalho "Espessura do Pincel" mostra o mesmo número do botão
			expect(screen.getByText(diameter)).toBeTruthy();
		},
	);

	it("M mostra 80px no botão e no cabeçalho (antes: 40px e 80px)", () => {
		setup(true);
		expect(screen.getByRole("button", { name: "M(80px)" })).toBeTruthy();
		expect(screen.getByText("80px")).toBeTruthy();
		expect(screen.queryByText("(20px)")).toBeNull();
	});
});
