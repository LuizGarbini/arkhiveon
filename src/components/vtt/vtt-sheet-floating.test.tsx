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
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { sheetStorageKey } from "@/lib/vtt/floating-sheet";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

vi.mock("@tanstack/react-router", async (orig) => ({
	...(await orig<typeof import("@tanstack/react-router")>()),
	Link: ({
		children,
		className,
	}: {
		children: ReactNode;
		className?: string;
	}) => (
		<a href="/sheets/new" className={className}>
			{children}
		</a>
	),
}));
vi.mock("@/components/dice-roll-overlay", () => ({
	DiceRollOverlay: () => null,
}));

import { VTTSheetDrawer } from "./vtt-sheet-drawer";
import { VTTToolbar } from "./vtt-toolbar";

const CAMPAIGN = "camp-qa";

const token = (id: string, over: Partial<VTTToken> = {}): VTTToken =>
	({
		id,
		sceneId: "s1",
		name: `Token ${id}`,
		characterId: `char-${id}`,
		layer: "token",
		x: 0,
		y: 0,
		sizeCells: 1,
		rotation: 0,
		elevation: 0,
		hpCurrent: 8,
		hpMax: 10,
		conditions: [],
		auras: [],
		visionRange: 0,
		isLocked: false,
		isHidden: false,
		controlledBy: [],
		...over,
	}) as VTTToken;

const char = (id: string, name: string) =>
	({
		id: `char-${id}`,
		system: "dnd5e",
		characterName: name,
		race: "Elfa",
		class: "Maga",
		level: 3,
		strength: 8,
		dexterity: 14,
		constitution: 12,
		intelligence: 16,
		wisdom: 12,
		charisma: 10,
		speed: 9,
		health: 8,
		healthMax: 10,
	}) as unknown as Character;

function mobile(matches: boolean) {
	window.matchMedia = ((q: string) => ({
		matches,
		media: q,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

function mesa(opts: {
	tokens?: VTTToken[];
	characters?: Character[];
	status?: "idle" | "loading" | "ready" | "error";
	isGM?: boolean;
	open?: string[];
}) {
	useRPGStore.setState({
		characters: opts.characters ?? [char("1", "Lyra")],
		campaignLoadStatus: opts.status ?? "ready",
		activeCampaignId: CAMPAIGN,
	});
	useVTTStore.setState({
		isGM: opts.isGM ?? true,
		tokens: opts.tokens ?? [token("1")],
		showCharacterSheetId: null,
		openSheetIds: [],
		showRosterDrawer: false,
		activeTool: "pan",
	});
	for (const id of opts.open ?? ["1"])
		useVTTStore.getState().setShowCharacterSheetId(id);
	return render(
		<>
			<VTTToolbar />
			<VTTSheetDrawer onUpdateToken={vi.fn(async () => {})} />
		</>,
	);
}

const press = (el: Element, key: string) =>
	act(() => {
		fireEvent.keyDown(el, { key });
	});
const tool = () => useVTTStore.getState().activeTool;
const panels = () => screen.queryAllByTestId("vtt-floating-sheet");

beforeEach(() => {
	mobile(false);
	localStorage.clear();
	Object.assign(window, { innerWidth: 1440, innerHeight: 900 });
	HTMLElement.prototype.setPointerCapture = () => {};
	(document.activeElement as HTMLElement | null)?.blur();
});
afterEach(cleanup);

describe("Ficha flutuante: atalhos (painel tipo Figma)", () => {
	it("ficha aberta + foco na mesa: R liga a Régua, V volta", () => {
		mesa({});
		expect(panels()).toHaveLength(1);
		press(document.body, "r");
		expect(tool()).toBe("ruler");
		press(document.body, "v");
		expect(tool()).toBe("select");
		expect(document.querySelector('[data-vtt-overlay="open"]')).toBeNull();
	});

	it("foco num botão dentro da ficha: R/V/G/F não disparam", () => {
		mesa({});
		const fechar = screen.getByRole("button", { name: "Fechar ficha" });
		fechar.focus();
		for (const k of ["r", "v", "g", "f"]) press(fechar, k);
		expect(tool()).toBe("pan");
	});

	it("foco num botão de rolar (conteúdo) também bloqueia", () => {
		mesa({});
		const rolar = screen.getByRole("button", { name: /Rolar Força/ });
		rolar.focus();
		press(rolar, "r");
		expect(tool()).toBe("pan");
	});

	it("Esc com foco dentro fecha só essa ficha; com foco na mesa, nada", () => {
		mesa({
			tokens: [token("1"), token("2")],
			characters: [char("1", "Lyra"), char("2", "Borin")],
			open: ["1", "2"],
		});
		press(document.body, "Escape");
		expect(panels()).toHaveLength(2);
		const lyra = screen.getByRole("region", { name: "Ficha de Lyra" });
		const fechar = lyra.querySelector<HTMLElement>(
			'button[aria-label="Fechar ficha"]',
		);
		fechar?.focus();
		press(fechar as HTMLElement, "Escape");
		expect(useVTTStore.getState().openSheetIds).toEqual(["2"]);
	});
});

describe("Ficha flutuante: painel", () => {
	it("até 3 abertas; a 4ª fecha a mais antiga", () => {
		const ids = ["1", "2", "3", "4"];
		mesa({
			tokens: ids.map((i) => token(i)),
			characters: ids.map((i) => char(i, `Herói ${i}`)),
			open: ids,
		});
		expect(panels()).toHaveLength(3);
		expect(useVTTStore.getState().openSheetIds).toEqual(["2", "3", "4"]);
		expect(
			screen.queryByRole("region", { name: "Ficha de Herói 1" }),
		).toBeNull();
	});

	it("arrastar pelo cabeçalho move, fica na viewport e é lembrado", () => {
		const view = mesa({});
		const panel = panels()[0];
		const start = { left: panel.style.left, top: panel.style.top };
		const handle = screen.getByTestId("vtt-sheet-drag-handle");
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 500,
			clientY: 200,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, { clientX: 300, clientY: 260, pointerId: 1 });
		fireEvent.pointerUp(handle, { clientX: 300, clientY: 260, pointerId: 1 });
		const moved = {
			x: Number.parseFloat(start.left) - 200,
			y: Number.parseFloat(start.top) + 60,
		};
		expect(panel.style.left).toBe(`${moved.x}px`);
		expect(panel.style.top).toBe(`${moved.y}px`);
		const saved = JSON.parse(
			localStorage.getItem(sheetStorageKey(CAMPAIGN, "char-1")) ?? "{}",
		);
		expect(saved).toMatchObject({ x: moved.x, y: moved.y });

		// Arrastar para fora: fica preso à borda.
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 300,
			clientY: 260,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, {
			clientX: -2000,
			clientY: -2000,
			pointerId: 1,
		});
		fireEvent.pointerUp(handle, { pointerId: 1 });
		expect(panel.style.left).toBe("8px");
		expect(panel.style.top).toBe("8px");

		// Reabrir: volta onde estava.
		view.unmount();
		mesa({});
		expect(panels()[0].style.left).toBe("8px");
	});

	it("redimensiona pelo canto, com mínimo", () => {
		mesa({});
		const panel = panels()[0];
		const w0 = Number.parseFloat(panel.style.width);
		const handle = screen.getByTestId("vtt-sheet-resize-handle");
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 0,
			clientY: 0,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, { clientX: -40, clientY: 30, pointerId: 1 });
		fireEvent.pointerUp(handle, { pointerId: 1 });
		expect(Number.parseFloat(panel.style.width)).toBe(w0 - 40);
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 0,
			clientY: 0,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, {
			clientX: -2000,
			clientY: -2000,
			pointerId: 1,
		});
		fireEvent.pointerUp(handle, { pointerId: 1 });
		expect(panel.style.width).toBe("320px");
		expect(panel.style.height).toBe("280px");
	});

	it("retrato/identidade da ficha e atributos em lista (sem grade de caixinhas)", () => {
		mesa({});
		const panel = screen.getByRole("region", { name: "Ficha de Lyra" });
		expect(panel.querySelector('[data-slot="sheet-header"]')).toBeNull();
		expect(
			screen.getByRole("heading", { level: 2, name: "Lyra" }),
		).toBeTruthy();
		expect(screen.getByText("Elfa · Maga · Nível 3")).toBeTruthy();
		const list = screen.getByRole("list");
		expect(list.querySelectorAll("li")).toHaveLength(6);
		expect(panel.querySelector("[title]")).toBeNull();
	});
});

describe("Ficha flutuante: estados", () => {
	it("carregando: skeleton", () => {
		mesa({ characters: [], status: "loading" });
		expect(screen.getByTestId("sheet-skeleton")).toBeTruthy();
	});

	it("erro: Tentar de novo recarrega", () => {
		const loadCampaigns = vi.fn(async () => {});
		useRPGStore.setState({ loadCampaigns });
		mesa({ characters: [], status: "error" });
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
	});

	it("sem acesso à ficha vinculada (jogador): aviso", () => {
		mesa({ characters: [], isGM: false });
		expect(
			screen.getByText("Você não tem acesso a esta ficha nesta campanha."),
		).toBeTruthy();
	});

	it("token sem ficha: mestre vê Criar ficha; jogador não", () => {
		mesa({ tokens: [token("1", { characterId: null })] });
		expect(screen.getByRole("link", { name: "Criar ficha" })).toBeTruthy();
		cleanup();
		mesa({ tokens: [token("1", { characterId: null })], isGM: false });
		expect(screen.queryByRole("link", { name: "Criar ficha" })).toBeNull();
	});
});

describe("Ficha no celular (390): Sheet de baixo", () => {
	it("abre como Sheet sem X e fecha arrastando para baixo", async () => {
		mobile(true);
		mesa({});
		const dialog = await screen.findByRole("dialog", { name: "Ficha de Lyra" });
		expect(panels()).toHaveLength(0);
		expect(screen.queryByRole("button", { name: "Fechar ficha" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
		expect(dialog.className).toContain("left-[4.75rem]");
		const handle = screen.getByTestId("bottom-sheet-handle");
		fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
		fireEvent.pointerMove(handle, { clientY: 260, pointerId: 1 });
		fireEvent.pointerUp(handle, { pointerId: 1 });
		await waitFor(() =>
			expect(useVTTStore.getState().showCharacterSheetId).toBeNull(),
		);
	});
});
