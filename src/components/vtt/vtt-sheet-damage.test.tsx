// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ rollOnTable: vi.fn() }));

vi.mock("@/lib/vtt/feed-sync", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/vtt/feed-sync")>()),
	rollOnTable: h.rollOnTable,
}));
vi.mock("@/components/dice-roll-overlay", () => ({
	DiceRollOverlay: ({
		open,
		modifier,
		result,
		onComplete,
	}: {
		open: boolean;
		modifier: number;
		result?: number;
		onComplete: (n: number) => void;
	}) =>
		open ? (
			<button
				type="button"
				data-modifier={modifier}
				onClick={() => onComplete(result ?? 12)}
			>
				terminar rolagem
			</button>
		) : null,
}));

import { useRPGStore } from "@/lib/store";
import type { Character, InventoryItem, Item } from "@/lib/store/types";
import { useRollStore } from "@/lib/vtt/roll-store";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTSheetDrawer } from "./vtt-sheet-drawer";

const staff = {
	id: "staff",
	createdAt: 0,
	createdBy: "gm",
	worldId: "w1",
	publicationScope: "restricted",
	campaignIds: ["c1"],
	visibility: "public",
	name: "Cajado do Pacto +1",
	type: "Arma",
	weapon: {
		damageDice: "1d6",
		damageType: "bludgeoning",
		magicBonus: 1,
		ability: "charisma",
		weaponCategory: "simple",
		properties: [],
		customProperties: [],
		extraDamage: [],
	},
} as unknown as Item;

const dante = {
	id: "dante",
	system: "dnd5e",
	characterName: "Dante",
	level: 14,
	proficiencyBonus: 5,
	charisma: 20,
	armorClass: 18,
	speed: 12,
	health: 10,
	healthMax: 10,
	inventoryList: [
		{
			id: "e-staff",
			name: staff.name,
			quantity: 1,
			weightLbs: 0,
			location: "equipped",
			campaignItemId: "staff",
			category: "gear",
			proficient: true,
			slot: "mainHand",
		} as InventoryItem,
	],
} as unknown as Character;

beforeEach(() => {
	h.rollOnTable.mockReset();
	useRPGStore.setState({
		campaigns: [
			{ id: "c1", name: "T", worldId: "w1", myRole: "owner" },
		] as never,
		activeCampaignId: "c1",
		items: [staff],
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
				hpCurrent: 10,
				hpMax: 10,
			},
		] as never,
		activeSceneId: "sc1",
		scenes: [{ id: "sc1", name: "Cripta", gridScaleUnit: "m" }] as never,
	});
	useRollStore.setState({ status: "idle" });
});

afterEach(cleanup);

function openAttacks() {
	render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
	fireEvent.click(screen.getByRole("tab", { name: "Ataques" }));
}
const damage = () =>
	screen.getByRole("button", { name: /Rolar dano de Cajado do Pacto \+1/ });

describe("Ficha da mesa · dano da arma", () => {
	it("sem chat da mesa rola aqui mesmo e mostra na ficha (1d6+6 = 7 a 12)", () => {
		openAttacks();
		fireEvent.click(damage());
		const text = screen.getByText(/Cajado do Pacto \+1 · Dano: \d+ \(1d6\+6\)/)
			.textContent as string;
		const total = Number(/: (\d+) \(/.exec(text)?.[1]);
		expect(total).toBeGreaterThanOrEqual(7);
		expect(total).toBeLessThanOrEqual(12);
		expect(h.rollOnTable).not.toHaveBeenCalled();
		expect(screen.queryByText("no chat da mesa")).toBeNull();
	});

	it("com o chat no ar manda a fórmula certa, com o nome da arma e da ficha", async () => {
		useRollStore.setState({ status: "ready" });
		h.rollOnTable.mockResolvedValue({ ok: true, total: 9 });
		openAttacks();
		await act(async () => {
			fireEvent.click(damage());
		});
		expect(h.rollOnTable).toHaveBeenCalledWith({
			campaignId: "c1",
			sceneId: "sc1",
			formula: "1d6+6",
			secret: false,
			characterId: "dante",
			label: "Cajado do Pacto +1 · Dano",
		});
		expect(
			screen.getByText("Cajado do Pacto +1 · Dano: 9 (1d6+6)"),
		).toBeTruthy();
		expect(screen.getByText("no chat da mesa")).toBeTruthy();
	});

	it("trava os botões de rolar enquanto o servidor responde", async () => {
		useRollStore.setState({ status: "ready" });
		let answer: (v: { ok: true; total: number }) => void = () => {};
		h.rollOnTable.mockReturnValue(
			new Promise((resolve) => {
				answer = resolve;
			}),
		);
		openAttacks();
		fireEvent.click(damage());
		fireEvent.click(damage());
		expect(h.rollOnTable).toHaveBeenCalledTimes(1);
		expect((damage() as HTMLButtonElement).disabled).toBe(true);
		await act(async () => answer({ ok: true, total: 8 }));
		expect((damage() as HTMLButtonElement).disabled).toBe(false);
	});

	it("se o servidor falha, rola aqui mesmo em vez de perder a rolagem", async () => {
		useRollStore.setState({ status: "ready" });
		h.rollOnTable.mockResolvedValue({ ok: false, message: "fora do ar" });
		openAttacks();
		await act(async () => {
			fireEvent.click(damage());
		});
		expect(
			screen.getByText(/Cajado do Pacto \+1 · Dano: \d+ \(1d6\+6\)/),
		).toBeTruthy();
		expect(screen.queryByText("no chat da mesa")).toBeNull();
	});

	it("o acerto rola d20 + 11 pelo chat com o nome da arma", async () => {
		useRollStore.setState({ status: "ready" });
		h.rollOnTable.mockResolvedValue({ ok: true, total: 23 });
		openAttacks();
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", {
					name: /Rolar acerto de Cajado do Pacto \+1 \(\+11\)/,
				}),
			);
		});
		expect(h.rollOnTable).toHaveBeenCalledWith(
			expect.objectContaining({
				formula: "1d20+11",
				label: "Cajado do Pacto +1 · Ataque",
				characterId: "dante",
			}),
		);
		fireEvent.click(screen.getByText("terminar rolagem"));
		expect(
			screen.getByText("Cajado do Pacto +1 · Ataque: 12 + 11 = 23"),
		).toBeTruthy();
	});
});
