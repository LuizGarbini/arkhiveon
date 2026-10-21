// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

	it("+0 sai sem sufixo (ficha antiga não vira −5)", () => {
		setCharacter({ strength: 0 });
		render(<VTTSheetDrawer onUpdateToken={async () => {}} />);
		fireEvent.click(chip("FOR"));
		fireEvent.click(screen.getByText("terminar rolagem"));
		expect(screen.getByText("FOR: 12 = 12")).toBeTruthy();
	});
});
