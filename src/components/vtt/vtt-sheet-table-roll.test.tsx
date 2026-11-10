// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { useRollStore } from "@/lib/vtt/roll-store";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const feed = vi.hoisted(() => ({
	rollOnTable: vi.fn(),
}));
vi.mock("@/lib/vtt/feed-sync", () => ({ rollOnTable: feed.rollOnTable }));
// O dado 3D "termina" mostrando a face recebida (a do servidor, se houver).
vi.mock("@/components/dice-roll-overlay", () => ({
	DiceRollOverlay: ({
		open,
		result,
		onComplete,
	}: {
		open: boolean;
		result?: number;
		onComplete: (n: number) => void;
	}) =>
		open ? (
			<button
				type="button"
				data-result={result ?? "local"}
				onClick={() => onComplete(result ?? 12)}
			>
				terminar rolagem
			</button>
		) : null,
}));

import { VTTSheetDrawer } from "./vtt-sheet-drawer";

const token = {
	id: "t1",
	sceneId: "scene-1",
	name: "Thorin",
	characterId: "c-thorin",
	layer: "token",
	x: 0,
	y: 0,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	hpCurrent: 30,
	hpMax: 40,
	conditions: [],
	auras: [],
	visionRange: 0,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
} as VTTToken;

const thorin = {
	id: "c-thorin",
	system: "dnd5e",
	characterName: "Thorin",
	race: "Anão",
	class: "Guerreiro",
	level: 5,
	strength: 16,
	dexterity: 12,
	constitution: 16,
	intelligence: 8,
	wisdom: 13,
	charisma: 10,
	speed: 9,
	health: 30,
	healthMax: 40,
} as unknown as Character;

beforeEach(() => {
	feed.rollOnTable.mockReset();
	localStorage.clear();
	Object.assign(window, { innerWidth: 1440, innerHeight: 900 });
	window.matchMedia = ((q: string) => ({
		matches: false,
		media: q,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
	useRPGStore.setState({
		characters: [thorin],
		campaignLoadStatus: "ready",
		activeCampaignId: "camp-1",
	});
	useVTTStore.setState({
		isGM: false,
		activeSceneId: "scene-1",
		tokens: [token],
		showCharacterSheetId: null,
		openSheetIds: [],
	});
	useVTTStore.getState().setShowCharacterSheetId("t1");
});

afterEach(() => {
	cleanup();
	useRollStore.getState().reset();
});

describe("rolagem da ficha no chat da mesa", () => {
	it("com o feed no ar, o servidor rola com rótulo e o dado mostra a mesma face", async () => {
		useRollStore.setState({ status: "ready" });
		feed.rollOnTable.mockResolvedValue({ ok: true, total: 17 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);

		fireEvent.click(screen.getByRole("button", { name: "Rolar Força (+3)" }));
		expect(feed.rollOnTable).toHaveBeenCalledWith({
			campaignId: "camp-1",
			sceneId: "scene-1",
			formula: "1d20+3",
			secret: false,
			characterId: "c-thorin",
			label: "Força",
		});
		const done = await screen.findByText("terminar rolagem");
		expect(done.getAttribute("data-result")).toBe("14");
		fireEvent.click(done);
		expect(screen.getByText("FOR: 14 + 3 = 17")).toBeTruthy();
		expect(screen.getByText("no chat da mesa")).toBeTruthy();
	});

	it("enquanto o servidor rola, os botões de rolar ficam desabilitados", async () => {
		useRollStore.setState({ status: "ready" });
		let finish: (value: unknown) => void = () => {};
		feed.rollOnTable.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const forca = screen.getByRole("button", { name: "Rolar Força (+3)" });
		fireEvent.click(forca);
		fireEvent.click(forca);
		expect(feed.rollOnTable).toHaveBeenCalledTimes(1);
		expect((forca as HTMLButtonElement).disabled).toBe(true);
		finish({ ok: true, total: 9 });
		expect(await screen.findByText("terminar rolagem")).toBeTruthy();
	});

	it("sem feed (ou se o servidor falhar), rola só nesta tela como antes", async () => {
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(screen.getByRole("button", { name: "Rolar Força (+3)" }));
		expect(feed.rollOnTable).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("terminar rolagem"));
		expect(screen.getByText("FOR: 12 + 3 = 15")).toBeTruthy();
		expect(screen.queryByText("no chat da mesa")).toBeNull();

		cleanup();
		useRollStore.setState({ status: "ready" });
		feed.rollOnTable.mockResolvedValue({ ok: false, message: "falhou" });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(screen.getByRole("button", { name: "Rolar Força (+3)" }));
		const done = await screen.findByText("terminar rolagem");
		expect(done.getAttribute("data-result")).toBe("local");
	});
});
