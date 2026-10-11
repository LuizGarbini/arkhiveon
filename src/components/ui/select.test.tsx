// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select } from "./select";

afterEach(cleanup);

async function pick(trigger: HTMLElement, optionName: string) {
	await act(async () => {
		fireEvent.click(trigger);
	});
	const option = await screen.findByRole("option", { name: optionName });
	// Base UI só confirma o item destacado (hover/teclado), como no browser.
	await act(async () => {
		fireEvent.mouseMove(option);
	});
	await act(async () => {
		fireEvent.click(option);
	});
}

describe("Select do DS (shadcn/Base UI)", () => {
	it("não renderiza <select> nativo e mostra o rótulo da opção", () => {
		const { container } = render(
			<Select aria-label="Local" value="backpack" onChange={() => {}}>
				<option value="equipped">No Corpo</option>
				<option value="backpack">Mochila</option>
			</Select>,
		);
		expect(container.querySelectorAll("select")).toHaveLength(0);
		const trigger = screen.getByRole("combobox", { name: "Local" });
		expect(trigger.tagName).toBe("BUTTON");
		expect(trigger.textContent).toContain("Mochila");
	});

	it("controlado: onChange entrega e.target.value", async () => {
		const onChange = vi.fn();
		function Harness() {
			const [v, setV] = useState("equipped");
			return (
				<Select
					aria-label="Local"
					value={v}
					onChange={(e) => {
						onChange(e.target.value);
						setV(e.target.value);
					}}
				>
					<option value="equipped">No Corpo</option>
					<option value="backpack">Mochila</option>
				</Select>
			);
		}
		render(<Harness />);
		const trigger = screen.getByRole("combobox", { name: "Local" });
		await pick(trigger, "Mochila");
		expect(onChange).toHaveBeenCalledWith("backpack");
		expect(trigger.textContent).toContain("Mochila");
	});

	it("funciona com register() do react-hook-form (default, troca e reset)", async () => {
		const onSubmit = vi.fn();
		let api: ReturnType<typeof useForm<{ disposition: string }>> | null = null;
		function Form() {
			const form = useForm<{ disposition: string }>({
				defaultValues: { disposition: "neutral" },
			});
			api = form;
			return (
				<form onSubmit={form.handleSubmit((v) => onSubmit(v))}>
					<Select aria-label="Disposição" {...form.register("disposition")}>
						<option value="hostile">Hostil</option>
						<option value="neutral">Neutro</option>
						<option value="ally">Aliado</option>
					</Select>
					<button type="submit">Salvar</button>
				</form>
			);
		}
		render(<Form />);
		const trigger = screen.getByRole("combobox", { name: "Disposição" });
		expect(trigger.textContent).toContain("Neutro");

		await pick(trigger, "Aliado");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
		});
		expect(onSubmit).toHaveBeenLastCalledWith({ disposition: "ally" });

		await act(async () => {
			api?.reset({ disposition: "hostile" });
		});
		expect(trigger.textContent).toContain("Hostil");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
		});
		expect(onSubmit).toHaveBeenLastCalledWith({ disposition: "hostile" });
	});

	it("sem default no form usa a primeira opção, como o nativo", async () => {
		const onSubmit = vi.fn();
		function Form() {
			const form = useForm<{ system: string }>();
			return (
				<form onSubmit={form.handleSubmit((v) => onSubmit(v))}>
					<Select aria-label="Sistema" {...form.register("system")}>
						<option value="dnd5e">D&D 5e</option>
						<option value="ordem">Ordem</option>
					</Select>
					<button type="submit">Salvar</button>
				</form>
			);
		}
		render(<Form />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
		});
		expect(onSubmit).toHaveBeenLastCalledWith({ system: "dnd5e" });
	});
});
