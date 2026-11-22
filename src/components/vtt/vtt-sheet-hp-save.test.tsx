// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTSheetDrawer } from "./vtt-sheet-drawer";

const dante = {
	id: "dante",
	system: "dnd5e",
	characterName: "Dante",
	level: 5,
	armorClass: 15,
	speed: 9,
	health: 20,
	healthMax: 30,
	inventoryList: [],
} as unknown as Character;

const realUpdateCharacter = useRPGStore.getState().updateCharacter;

beforeEach(() => {
	useRPGStore.setState({
		campaigns: [
			{ id: "c1", name: "T", worldId: "w1", myRole: "owner" },
		] as never,
		activeCampaignId: "c1",
		items: [],
		characters: [dante],
		imageAssets: [],
		campaignLoadStatus: "ready" as never,
	});
	useVTTStore.setState({
		isGM: true,
		openSheetIds: ["tok-1"],
		showCharacterSheetId: "tok-1",
		tokens: [
			{
				id: "tok-1",
				name: "Dante",
				characterId: "dante",
				hpCurrent: 20,
				hpMax: 30,
			},
		] as never,
		activeSceneId: "sc1",
		scenes: [{ id: "sc1", name: "Cripta", gridScaleUnit: "m" }] as never,
	});
});

afterEach(() => {
	cleanup();
	useRPGStore.setState({ updateCharacter: realUpdateCharacter });
});

function editMax(value: string) {
	fireEvent.click(
		screen.getByRole("button", { name: /Pontos de vida: .*Abrir dano e cura/ }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
	fireEvent.change(screen.getByRole("spinbutton", { name: "PV máximo" }), {
		target: { value },
	});
	fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
}

describe("Ficha da mesa · Editar valores grava a ficha antes do token", () => {
	it("ficha rejeita o PV máximo: erro aparece e o token não muda", async () => {
		const updateCharacter = vi
			.fn()
			.mockRejectedValue(new Error("sem permissão"));
		useRPGStore.setState({ updateCharacter });
		const onUpdateToken = vi.fn().mockResolvedValue(undefined);
		render(<VTTSheetDrawer onUpdateToken={onUpdateToken} />);

		editMax("40");
		await act(async () => {});

		expect(updateCharacter).toHaveBeenCalledWith(
			"dante",
			{ healthMax: 40 },
			{ quiet: true },
		);
		expect(onUpdateToken).not.toHaveBeenCalled();
		expect(screen.getByRole("alert").textContent).toContain("Não foi salvo");
		expect(screen.getByRole("button", { name: "Aplicar" })).toBeTruthy();
	});

	it("ficha grava: só depois o token recebe o mesmo PV máximo", async () => {
		const order: string[] = [];
		const updateCharacter = vi.fn(async () => {
			order.push("ficha");
		});
		useRPGStore.setState({ updateCharacter });
		const onUpdateToken = vi.fn(async () => {
			order.push("token");
		});
		render(<VTTSheetDrawer onUpdateToken={onUpdateToken} />);

		editMax("40");
		await act(async () => {});

		expect(order).toEqual(["ficha", "token"]);
		expect(onUpdateToken).toHaveBeenCalledWith(
			"tok-1",
			{ hpMax: 40 },
			{ quiet: true },
		);
		expect(screen.queryByRole("alert")).toBeNull();
	});
});
