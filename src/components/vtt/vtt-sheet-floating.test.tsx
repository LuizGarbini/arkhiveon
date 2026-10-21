// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

vi.mock("@tanstack/react-router", () => ({
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

const token = (over: Partial<VTTToken>): VTTToken =>
	({
		id: "tok-1",
		sceneId: "s1",
		name: "Lyra",
		characterId: "char-1",
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

const lyra = {
	id: "char-1",
	system: "dnd5e",
	characterName: "Lyra",
	class: "Maga",
	level: 3,
	armorClass: 12,
	speed: 9,
} as Character;

function mesa(opts: {
	tok?: Partial<VTTToken>;
	characters?: Character[];
	status?: "idle" | "loading" | "ready" | "error";
	isGM?: boolean;
}) {
	useRPGStore.setState({
		characters: opts.characters ?? [lyra],
		campaignLoadStatus: opts.status ?? "ready",
	});
	useVTTStore.setState({
		isGM: opts.isGM ?? true,
		tokens: [token(opts.tok ?? {})],
		showCharacterSheetId: "tok-1",
		showRosterDrawer: false,
		activeTool: "pan",
	});
	render(
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
const sheetOpen = () => useVTTStore.getState().showCharacterSheetId !== null;

beforeEach(() => {
	(document.activeElement as HTMLElement | null)?.blur();
});
afterEach(cleanup);

describe("Ficha na mesa como painel flutuante", () => {
	it("ficha aberta + foco na mesa: atalhos funcionam (R liga a Régua)", () => {
		mesa({});
		expect(
			screen.getByRole("complementary", { name: "Ficha na mesa" }),
		).toBeTruthy();
		expect(document.activeElement).toBe(document.body);
		press(document.body, "r");
		expect(tool()).toBe("ruler");
		press(document.body, "v");
		expect(tool()).toBe("select");
		// O painel não se marca como overlay que bloqueia a mesa toda.
		expect(document.querySelector('[data-vtt-overlay="open"]')).toBeNull();
	});

	it("foco dentro da ficha: R/V/G não disparam", () => {
		mesa({});
		const fechar = screen.getByRole("button", { name: "Fechar ficha" });
		fechar.focus();
		for (const k of ["r", "v", "g", "f"]) press(fechar, k);
		expect(tool()).toBe("pan");
	});

	it("Esc com foco dentro fecha a ficha; com foco na mesa, não", () => {
		mesa({});
		press(document.body, "Escape");
		expect(sheetOpen()).toBe(true);
		const fechar = screen.getByRole("button", { name: "Fechar ficha" });
		fechar.focus();
		press(fechar, "Escape");
		expect(sheetOpen()).toBe(false);
	});

	it("sem title nativo; fechar tem Tooltip do DS", () => {
		mesa({});
		const aside = screen.getByRole("complementary", { name: "Ficha na mesa" });
		expect(aside.querySelector("[title]")).toBeNull();
	});
});

describe("Ficha na mesa: estados", () => {
	it("carregando: skeleton", () => {
		mesa({ characters: [], status: "loading" });
		expect(screen.getByTestId("sheet-skeleton")).toBeTruthy();
		expect(screen.getByText("Carregando ficha…")).toBeTruthy();
	});

	it("erro: aviso e Tentar de novo recarrega", () => {
		const loadCampaigns = vi.fn(async () => {});
		useRPGStore.setState({ loadCampaigns });
		mesa({ characters: [], status: "error" });
		expect(screen.getByRole("alert").textContent).toContain(
			"Não deu para carregar a ficha.",
		);
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
	});

	it("jogador sem acesso à ficha vinculada: aviso, só o PV do token", () => {
		mesa({ characters: [], status: "ready", isGM: false });
		expect(
			screen.getByText("Você não tem acesso a esta ficha nesta campanha."),
		).toBeTruthy();
		expect(screen.queryByText("Maga · Nv. 3")).toBeNull();
	});

	it("token sem ficha: mestre vê Criar ficha; jogador só o aviso", () => {
		mesa({ tok: { characterId: null } });
		expect(screen.getByText(/Este token ainda não tem ficha/)).toBeTruthy();
		expect(screen.getByRole("link", { name: "Criar ficha" })).toBeTruthy();
		cleanup();
		mesa({ tok: { characterId: null }, isGM: false });
		expect(screen.getByText(/Este token ainda não tem ficha/)).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Criar ficha" })).toBeNull();
	});

	it("ficha carregada: mostra a ficha", () => {
		mesa({});
		expect(screen.getByText("Maga · Nv. 3")).toBeTruthy();
	});
});
