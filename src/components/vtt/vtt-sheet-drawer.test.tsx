// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateAbilityModifier, formatModifier } from "@/core/rules";

const h = vi.hoisted(() => ({
	rpg: { characters: [] as unknown[], campaignLoadStatus: "ready" },
	vtt: {
		showCharacterSheetId: "tok-1" as string | null,
		openSheetIds: ["tok-1"],
		setShowCharacterSheetId: () => {},
		closeCharacterSheet: () => {},
		isGM: true,
		tokens: [
			{ id: "tok-1", name: "QA Guerreira", characterId: "char-1" },
		] as unknown[],
	},
}));

vi.mock("@/lib/store", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/store")>();
	return {
		...actual,
		useRPGStore: (selector: (s: typeof h.rpg) => unknown) => selector(h.rpg),
	};
});
vi.mock("@/lib/vtt/vtt-store", () => ({
	useVTTStore: (selector: (s: typeof h.vtt) => unknown) => selector(h.vtt),
}));
// Dado determinístico: o overlay "termina" com 12 ao clicar.
vi.mock("@/components/dice-roll-overlay", () => ({
	DiceRollOverlay: ({
		open,
		modifier,
		onComplete,
	}: {
		open: boolean;
		modifier: number;
		onComplete: (n: number) => void;
	}) =>
		open ? (
			<button
				type="button"
				data-modifier={modifier}
				onClick={() => onComplete(12)}
			>
				terminar rolagem
			</button>
		) : null,
}));

import { VTTSheetDrawer } from "./vtt-sheet-drawer";

const LABELS = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

function setCharacter(scores: Record<string, unknown>) {
	h.rpg.characters = [
		{
			id: "char-1",
			system: "dnd5e",
			characterName: "QA Guerreira",
			armorClass: 0,
			speed: 0,
			health: 10,
			healthMax: 10,
			...scores,
		},
	];
}

/** Botão de rolar da linha do atributo (lista, não grade de caixinhas). */
function chip(label: string): HTMLElement {
	const row = screen
		.getAllByRole("listitem")
		.find((li) => li.firstElementChild?.textContent === label);
	const el = row?.querySelector("button");
	if (!el) throw new Error(`chip ${label}`);
	return el;
}

afterEach(cleanup);

describe("VTTSheetDrawer · atributos", () => {
	it("ficha antiga (tudo 0) mostra +0 em todos, como a ficha", () => {
		setCharacter({
			strength: 0,
			dexterity: 0,
			constitution: 0,
			intelligence: 0,
			wisdom: 0,
			charisma: 0,
		});
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		for (const l of LABELS) expect(chip(l).textContent).toBe("+0");
	});

	it("ficha nova mostra cada modificador no atributo certo", () => {
		const scores = {
			strength: 8,
			dexterity: 14,
			constitution: 12,
			intelligence: 18,
			wisdom: 10,
			charisma: 3,
		};
		setCharacter(scores);
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		const expected = Object.values(scores).map((s) =>
			formatModifier(calculateAbilityModifier(s)),
		);
		expect(expected).toEqual(["-1", "+2", "+1", "+4", "+0", "-4"]);
		LABELS.forEach((l, i) => {
			expect(chip(l).textContent).toBe(expected[i]);
		});
	});

	it("rolagem de FOR usa o modificador certo no texto", () => {
		setCharacter({ strength: 8 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(chip("FOR"));
		const done = screen.getByText("terminar rolagem");
		expect(done.getAttribute("data-modifier")).toBe("-1");
		fireEvent.click(done);
		expect(screen.getByText("FOR: 12 − 1 = 11")).toBeTruthy();
	});

	it("ficha ligada mostra o PV da ficha antes do token", () => {
		h.vtt.isGM = true;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 1,
				hpMax: 2,
			},
		];
		setCharacter({ health: 33, healthMax: 38 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(screen.getAllByText("33 / 38")).toHaveLength(1);
		expect(screen.queryByText("33/38")).toBeNull();
		expect(screen.queryByText("1 / 2")).toBeNull();
		expect(screen.getByRole("spinbutton", { name: "PV máximo" })).toBeTruthy();
	});

	it("jogador não vê nem edita o PV máximo", () => {
		h.vtt.isGM = false;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 1,
				hpMax: 2,
			},
		];
		setCharacter({ health: 33, healthMax: 38 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		expect(screen.getAllByText("33").length).toBeGreaterThan(0);
		expect(screen.queryByText("33 / 38")).toBeNull();
		expect(screen.queryByText("38")).toBeNull();
		expect(screen.queryByRole("spinbutton", { name: "PV máximo" })).toBeNull();
		h.vtt.isGM = true;
	});

	it("enquanto salva, mostra Salvando e ignora o segundo clique", async () => {
		let resolveSave: (value: boolean) => void = () => {};
		const onUpdateToken = vi.fn(
			() =>
				new Promise<boolean>((resolve) => {
					resolveSave = resolve;
				}),
		);
		h.vtt.isGM = true;
		h.vtt.tokens = [
			{
				id: "tok-1",
				name: "QA Guerreira",
				characterId: "char-1",
				hpCurrent: 1,
				hpMax: 2,
			},
		];
		setCharacter({ health: 33, healthMax: 38 });
		render(<VTTSheetDrawer onUpdateToken={onUpdateToken} />);
		const minus = screen.getByRole("button", { name: "-5" });
		fireEvent.click(minus);
		fireEvent.click(minus);
		expect(onUpdateToken).toHaveBeenCalledTimes(1);
		expect(onUpdateToken).toHaveBeenCalledWith("tok-1", { hpCurrent: 28 });
		expect(screen.getByText("Salvando…")).toBeTruthy();
		expect((minus as HTMLButtonElement).disabled).toBe(true);
		await act(async () => {
			resolveSave(true);
		});
		expect((minus as HTMLButtonElement).disabled).toBe(false);
	});

	it("+0 sai sem sufixo (ficha antiga não vira −5)", () => {
		setCharacter({ strength: 0 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(chip("FOR"));
		fireEvent.click(screen.getByText("terminar rolagem"));
		expect(screen.getByText("FOR: 12 = 12")).toBeTruthy();
	});
});
