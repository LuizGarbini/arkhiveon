// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";
import { SYSTEM_CONFIG } from "@/lib/systems";
import type { CharacterFormValues } from "../types";
import { CombatFields } from "./combat-fields";

window.matchMedia =
	window.matchMedia ||
	(() =>
		({
			matches: false,
			media: "",
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}) as unknown as MediaQueryList);

let latest: CharacterFormValues | null = null;

function Harness({ speedUnit }: { speedUnit?: "m" | "ft" }) {
	const form = useForm<CharacterFormValues>({
		defaultValues: {
			health: 10,
			healthMax: 10,
			armorClass: 10,
			initiative: 0,
			speed: 12,
			proficiencyBonus: 2,
			...(speedUnit ? { speedUnit } : {}),
		} as CharacterFormValues,
	});
	latest = form.watch() as CharacterFormValues;
	return (
		<CombatFields
			register={form.register}
			control={form.control}
			setValue={form.setValue}
			config={SYSTEM_CONFIG.dnd5e}
		/>
	);
}

afterEach(() => {
	cleanup();
	latest = null;
});

async function pick(optionName: string) {
	await act(async () => {
		fireEvent.click(
			screen.getByRole("combobox", { name: "Unidade do deslocamento" }),
		);
	});
	const option = await screen.findByRole("option", { name: optionName });
	await act(async () => {
		fireEvent.mouseMove(option);
	});
	await act(async () => {
		fireEvent.click(option);
	});
}

describe("CombatFields · unidade do deslocamento", () => {
	it("sem escolha, usa a unidade do sistema (D&D 5e: pés)", () => {
		render(<Harness />);
		expect(screen.getByText("Deslocamento (ft)")).toBeTruthy();
		expect(
			screen.getByRole("combobox", { name: "Unidade do deslocamento" })
				.textContent,
		).toContain("Pés");
	});

	it("a ficha que já escolheu metros mostra metros", () => {
		render(<Harness speedUnit="m" />);
		expect(screen.getByText("Deslocamento (m)")).toBeTruthy();
	});

	it("trocar para metros muda o rótulo e grava speedUnit na ficha", async () => {
		render(<Harness />);
		await pick("Metros (m)");
		expect(screen.getByText("Deslocamento (m)")).toBeTruthy();
		expect(latest?.speedUnit).toBe("m");
		// o número digitado não é reescrito: só muda o que ele significa
		expect(latest?.speed).toBe(12);
	});

	it("dá para voltar para pés", async () => {
		render(<Harness speedUnit="m" />);
		await pick("Pés (ft)");
		expect(latest?.speedUnit).toBe("ft");
		expect(screen.getByText("Deslocamento (ft)")).toBeTruthy();
	});
});
