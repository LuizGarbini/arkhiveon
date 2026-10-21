// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ session: null }) }));
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

import { SceneMapTab, VTTRosterDrawer } from "./vtt-roster-drawer";

const MAP = "https://cdn.test/mapa-caverna.webp";
const scene: VTTScene = {
	id: "scene-1",
	campaignId: "camp-1",
	name: "Caverna",
	mapImageUrl: MAP,
	gridType: "square",
	gridSize: 70,
	gridColor: "#ffffff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	width: 2000,
	height: 1400,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
} as VTTScene;

const thumbName = "Ver mapa de Caverna em tela cheia";
const itemName = "Ver mapa em tela cheia";
const onSetSceneMap = vi.fn(async () => {});

function renderTab(isGM: boolean, s: VTTScene = scene) {
	useVTTStore.setState({ isGM });
	render(<SceneMapTab scene={s} onSetSceneMap={onSetSceneMap} />);
}

beforeEach(() => {
	useVTTStore.setState({ isGM: false, showRosterDrawer: false });
	onSetSceneMap.mockClear();
});
afterEach(cleanup);

describe("Mapa da cena em tela cheia (aba Mapa)", () => {
	it("mestre: miniatura e item abrem o mapa em tela cheia", async () => {
		renderTab(true);
		const thumb = screen.getByRole("button", { name: thumbName });
		expect(thumb.getAttribute("aria-haspopup")).toBe("dialog");
		fireEvent.click(thumb);
		const dialog = await screen.findByRole("dialog");
		expect(dialog.textContent).toContain("Caverna");
		expect(
			dialog.querySelector(`img[src="${MAP}"]`) ??
				document.querySelector(`[role="dialog"] img[src="${MAP}"]`),
		).toBeTruthy();
		act(() => {
			fireEvent.keyDown(dialog, { key: "Escape" });
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		fireEvent.click(screen.getByRole("button", { name: itemName }));
		expect(await screen.findByRole("dialog")).toBeTruthy();
		expect(onSetSceneMap).not.toHaveBeenCalled();
	});

	it("miniatura sem Tooltip: mantém aria-label e ícone, não abre tooltip no foco", async () => {
		renderTab(true);
		const thumb = screen.getByRole("button", { name: thumbName });
		expect(thumb.getAttribute("data-slot")).toBeNull();
		expect(thumb.querySelector("svg")).toBeTruthy();
		act(() => {
			thumb.focus();
		});
		await new Promise((r) => setTimeout(r, 50));
		expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
	});

	it("mestre: Esc fecha só a tela cheia e o foco volta à miniatura", async () => {
		renderTab(true);
		const thumb = screen.getByRole("button", { name: thumbName });
		thumb.focus();
		fireEvent.click(thumb);
		const dialog = await screen.findByRole("dialog");
		act(() => {
			fireEvent.keyDown(dialog, { key: "Escape" });
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(thumb));
	});

	it("cena sem mapa não tem gatilho de tela cheia", () => {
		renderTab(true, { ...scene, mapImageUrl: null });
		expect(screen.queryByRole("button", { name: thumbName })).toBeNull();
		expect(screen.queryByRole("button", { name: itemName })).toBeNull();
	});

	it("jogador: mesmo com a aba Mapa renderizada à força, não há gatilho", () => {
		renderTab(false);
		expect(screen.queryByRole("button", { name: thumbName })).toBeNull();
		expect(screen.queryByRole("button", { name: itemName })).toBeNull();
		// A miniatura continua só imagem.
		expect(screen.getByRole("img", { name: "Mapa Mapa atual" })).toBeTruthy();
	});

	it("jogador: a Biblioteca da mesa não tem a aba Mapa", () => {
		useVTTStore.setState({ isGM: false, showRosterDrawer: true });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
			/>,
		);
		expect(screen.queryByRole("button", { name: "Mapa" })).toBeNull();
		expect(screen.queryByRole("button", { name: itemName })).toBeNull();
	});

	it("mestre: a Biblioteca da mesa tem a aba Mapa com os gatilhos", () => {
		useVTTStore.setState({ isGM: true, showRosterDrawer: true });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Mapa" }));
		expect(screen.getByRole("button", { name: thumbName })).toBeTruthy();
		expect(screen.getByRole("button", { name: itemName })).toBeTruthy();
	});
});

describe("Biblioteca: busca sem resultado", () => {
	const lyra = {
		id: "t1",
		sceneId: "scene-1",
		name: "Lyra",
		layer: "token",
		x: 100,
		y: 100,
		sizeCells: 1,
		hpCurrent: 7,
		hpMax: 10,
		conditions: [],
		controlledBy: [],
	} as unknown as VTTToken;

	function renderDrawer(tokens: VTTToken[]) {
		useVTTStore.setState({ isGM: true, showRosterDrawer: true, tokens });
		render(
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={onSetSceneMap}
			/>,
		);
	}

	it('com termo: "Nada encontrado para" + Limpar busca devolve a lista e o foco', async () => {
		renderDrawer([lyra]);
		const input = screen.getByLabelText(
			"Buscar na biblioteca",
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "zzz" } });
		expect(await screen.findByText('Nada encontrado para "zzz"')).toBeTruthy();
		expect(screen.queryByText("A cena está pronta para seu grupo")).toBeNull();
		expect(screen.queryByText("Escolher personagens")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
		expect(input.value).toBe("");
		expect(document.activeElement).toBe(input);
		expect(
			await screen.findByRole("button", { name: "Localizar Lyra" }),
		).toBeTruthy();
	});

	it("sem termo e sem tokens: segue o vazio da cena", () => {
		renderDrawer([]);
		expect(screen.getByText("A cena está pronta para seu grupo")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Limpar busca" })).toBeNull();
	});
});
