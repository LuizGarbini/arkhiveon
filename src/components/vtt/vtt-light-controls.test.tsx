// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTLightZone } from "@/lib/vtt/light-zones";
import type { VTTScene } from "@/lib/vtt/types";

const mock = vi.hoisted(() => ({
	deleteLightZone: vi.fn(),
	setLightZoneLevel: vi.fn(),
}));
vi.mock("@/lib/vtt/light-zone-sync", () => ({
	deleteLightZone: (...args: unknown[]) => mock.deleteLightZone(...args),
	setLightZoneLevel: (...args: unknown[]) => mock.setLightZoneLevel(...args),
}));

import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTLightControls } from "./vtt-light-controls";

afterEach(cleanup);

const scene = {
	id: "scene-1",
	campaignId: "c",
	name: "Mapa",
	fogEnabled: true,
	fogExploration: true,
	lightLevel: "bright",
} as unknown as VTTScene;

const zone = (id: string, level: VTTLightZone["level"]): VTTLightZone => ({
	id,
	sceneId: "scene-1",
	level,
	shape: "circle",
	x: 100,
	y: 100,
	radius: 50,
});

const renderPanel = (over: Partial<VTTScene> = {}, onUpdateScene = vi.fn()) => {
	render(
		<VTTLightControls
			scene={{ ...scene, ...over }}
			onUpdateScene={onUpdateScene}
		/>,
	);
	return onUpdateScene;
};
const group = (name: string) => screen.getByRole("group", { name });
const pressed = (g: HTMLElement, name: string) =>
	within(g).getByRole("button", { name }).getAttribute("aria-pressed");

beforeEach(() => {
	mock.deleteLightZone.mockReset();
	mock.setLightZoneLevel.mockReset();
	useVTTStore.setState({
		isGM: true,
		activeTool: "light",
		lightDrawLevel: "dark",
		lightDrawShape: "circle",
		lightZones: [],
		lightZonesStatus: "ready",
		selectedLightZoneId: null,
		lightDraft: [],
	});
});

describe("quando aparece", () => {
	it("só para o mestre, com a ferramenta Luz ativa e uma cena", () => {
		const { container } = render(<VTTLightControls scene={scene} />);
		expect(container.textContent).not.toBe("");
		cleanup();
		useVTTStore.setState({ isGM: false });
		expect(
			render(<VTTLightControls scene={scene} />).container.textContent,
		).toBe("");
		cleanup();
		useVTTStore.setState({ isGM: true, activeTool: "select" });
		expect(
			render(<VTTLightControls scene={scene} />).container.textContent,
		).toBe("");
		cleanup();
		useVTTStore.setState({ activeTool: "light" });
		expect(
			render(<VTTLightControls scene={null} />).container.textContent,
		).toBe("");
		expect(
			render(<VTTLightControls scene={undefined} />).container.textContent,
		).toBe("");
	});

	it("fechar volta para a ferramenta de seleção", () => {
		renderPanel();
		fireEvent.click(
			screen.getByRole("button", { name: "Fechar ferramenta de luz" }),
		);
		expect(useVTTStore.getState().activeTool).toBe("select");
	});
});

describe("luz padrão da cena", () => {
	it("mostra a atual e cena sem luz definida conta como luz do dia", () => {
		renderPanel({ lightLevel: undefined });
		const g = group("Luz padrão da cena");
		expect(pressed(g, "Luz do dia")).toBe("true");
		expect(pressed(g, "Penumbra")).toBe("false");
		expect(pressed(g, "Escuridão")).toBe("false");
	});

	it("tocar em Penumbra ou Escuridão grava lightLevel; tocar na atual não grava", () => {
		const onUpdate = renderPanel({ lightLevel: "bright" });
		const g = group("Luz padrão da cena");
		fireEvent.click(within(g).getByRole("button", { name: "Luz do dia" }));
		expect(onUpdate).not.toHaveBeenCalled();
		fireEvent.click(within(g).getByRole("button", { name: "Penumbra" }));
		expect(onUpdate).toHaveBeenLastCalledWith("scene-1", { lightLevel: "dim" });
		fireEvent.click(within(g).getByRole("button", { name: "Escuridão" }));
		expect(onUpdate).toHaveBeenLastCalledWith("scene-1", {
			lightLevel: "dark",
		});
	});

	it("reflete a luz que a cena já tem", () => {
		renderPanel({ lightLevel: "dim" });
		expect(pressed(group("Luz padrão da cena"), "Penumbra")).toBe("true");
	});
});

describe("nova área", () => {
	it("escolher a forma e a luz da próxima área grava na store", () => {
		renderPanel();
		const mode = group("Modo da ferramenta");
		expect(pressed(mode, "Círculo")).toBe("true");
		fireEvent.click(within(mode).getByRole("button", { name: "Polígono" }));
		expect(useVTTStore.getState().lightDrawShape).toBe("polygon");
		fireEvent.click(within(mode).getByRole("button", { name: "Selecionar" }));
		expect(useVTTStore.getState().lightDrawShape).toBe("select");
		fireEvent.click(within(mode).getByRole("button", { name: "Retângulo" }));
		expect(useVTTStore.getState().lightDrawShape).toBe("rect");

		const level = group("Luz da nova área");
		expect(pressed(level, "Escuridão")).toBe("true");
		fireEvent.click(within(level).getByRole("button", { name: "Penumbra" }));
		expect(useVTTStore.getState().lightDrawLevel).toBe("dim");
	});

	it("escolher a luz da nova área NÃO mexe na luz da cena", () => {
		const onUpdate = renderPanel();
		fireEvent.click(
			within(group("Luz da nova área")).getByRole("button", {
				name: "Luz do dia",
			}),
		);
		expect(onUpdate).not.toHaveBeenCalled();
	});

	it("o botão de modo tem nome acessível mesmo só com ícone", () => {
		renderPanel();
		for (const name of ["Selecionar", "Círculo", "Retângulo", "Polígono"]) {
			expect(
				within(group("Modo da ferramenta")).getByRole("button", { name }),
			).toBeTruthy();
		}
	});
});

describe("área selecionada", () => {
	it("sem seleção, não há grupo nem Apagar", () => {
		useVTTStore.setState({
			lightZones: [zone("a", "dark")],
			selectedLightZoneId: null,
		});
		renderPanel();
		expect(
			screen.queryByRole("group", { name: "Luz da área selecionada" }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Apagar área selecionada" }),
		).toBeNull();
	});

	it("selecionada: mostra a luz dela, troca e apaga", () => {
		useVTTStore.setState({
			lightZones: [zone("a", "dark"), zone("b", "bright")],
			selectedLightZoneId: "a",
		});
		renderPanel();
		const g = group("Luz da área selecionada");
		expect(pressed(g, "Escuridão")).toBe("true");
		fireEvent.click(within(g).getByRole("button", { name: "Penumbra" }));
		expect(mock.setLightZoneLevel).toHaveBeenCalledWith("a", "dim");
		fireEvent.click(
			screen.getByRole("button", { name: "Apagar área selecionada" }),
		);
		expect(mock.deleteLightZone).toHaveBeenCalledWith("a");
	});

	it("trocar a luz da selecionada não muda a luz da nova área", () => {
		useVTTStore.setState({
			lightZones: [zone("a", "dark")],
			selectedLightZoneId: "a",
			lightDrawLevel: "dark",
		});
		renderPanel();
		fireEvent.click(
			within(group("Luz da área selecionada")).getByRole("button", {
				name: "Luz do dia",
			}),
		);
		expect(useVTTStore.getState().lightDrawLevel).toBe("dark");
	});

	it("seleção de uma área que já não existe: sem grupo", () => {
		useVTTStore.setState({ lightZones: [], selectedLightZoneId: "fantasma" });
		renderPanel();
		expect(
			screen.queryByRole("group", { name: "Luz da área selecionada" }),
		).toBeNull();
	});
});

describe("avisos e contagem", () => {
	it("conta as áreas da cena no singular e no plural", () => {
		useVTTStore.setState({ lightZones: [zone("a", "dark")] });
		renderPanel();
		expect(screen.getByText(/1 área na cena/)).toBeTruthy();
		cleanup();
		useVTTStore.setState({ lightZones: [zone("a", "dark"), zone("b", "dim")] });
		renderPanel();
		expect(screen.getByText(/2 áreas na cena/)).toBeTruthy();
	});

	it("sem Exploração a luz não vale: avisa e oferece ligar (liga névoa e exploração)", () => {
		const onUpdate = renderPanel({ fogExploration: false });
		expect(screen.getByText(/só vale com a Exploração ligada/)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Ligar Exploração" }));
		expect(onUpdate).toHaveBeenCalledWith("scene-1", {
			fogEnabled: true,
			fogExploration: true,
		});
	});

	it("com névoa desligada também avisa (a exploração depende dela)", () => {
		renderPanel({ fogEnabled: false, fogExploration: true });
		expect(screen.getByText(/só vale com a Exploração ligada/)).toBeTruthy();
	});

	it("com Exploração ligada não há aviso", () => {
		renderPanel();
		expect(screen.queryByText(/só vale com a Exploração ligada/)).toBeNull();
	});

	it("tabela ainda não existe no servidor: explica", () => {
		useVTTStore.setState({ lightZonesStatus: "missing" });
		renderPanel();
		expect(
			screen.getByText(/ainda não estão disponíveis no servidor/),
		).toBeTruthy();
	});

	it("polígono em desenho mostra a dica de fechar e quantos pontos já tem", () => {
		useVTTStore.setState({
			lightDrawShape: "polygon",
			lightDraft: [
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			],
		});
		renderPanel();
		expect(screen.getByText(/2 pontos/)).toBeTruthy();
		expect(screen.getByText("Enter")).toBeTruthy();
	});

	it("fora do modo polígono não mostra a dica de fechar", () => {
		renderPanel();
		expect(screen.queryByText("Enter")).toBeNull();
	});
});
