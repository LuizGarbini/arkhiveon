// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { TableResources } from "@/lib/table-resources";
import { TableResourcesStrip } from "./table-resources-strip";

function mockViewport(mobile: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: mobile,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

const filled: TableResources = {
	inspiration: true,
	fate: 2,
	fateMax: 3,
	bonusDice: [
		{ id: "a", sides: 6, quantity: 2, origin: "dormiu bem" },
		{ id: "b", sides: 8, quantity: 1, origin: "bênção do mestre" },
	],
};

function renderStrip(value: unknown, opts: { readOnly?: boolean } = {}) {
	const onChange = vi.fn();
	render(
		<ToastProvider>
			<TableResourcesStrip
				value={value}
				readOnly={opts.readOnly}
				onChange={onChange}
			/>
		</ToastProvider>,
	);
	return onChange;
}

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("TableResourcesStrip", () => {
	it("vazio: mostra estado vazio e CTA + Dado", () => {
		mockViewport(false);
		renderStrip(undefined);
		expect(screen.getByText("Nenhum dado bônus")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Adicionar dado bônus" }),
		).toBeTruthy();
		expect(
			screen
				.getByRole("button", { name: "Inspiração" })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("inspiração alterna e pip define destino", () => {
		mockViewport(false);
		const onChange = renderStrip(filled);
		fireEvent.click(screen.getByRole("button", { name: "Inspiração" }));
		expect(onChange.mock.calls[0][0].inspiration).toBe(false);
		fireEvent.click(screen.getByRole("button", { name: "Destino 3" }));
		expect(onChange.mock.calls[1][0].fate).toBe(3);
		fireEvent.click(screen.getByRole("button", { name: "Destino 2" }));
		expect(onChange.mock.calls[2][0].fate).toBe(1);
	});

	it("tocar no dado rola e gasta 1; some no 0", () => {
		mockViewport(false);
		const onChange = renderStrip(filled);
		fireEvent.click(screen.getByRole("button", { name: /Rolar d6/ }));
		const afterD6: TableResources = onChange.mock.calls[0][0];
		expect(afterD6.bonusDice.find((d) => d.id === "a")?.quantity).toBe(1);
		fireEvent.click(screen.getByRole("button", { name: /Rolar d8/ }));
		const afterD8: TableResources = onChange.mock.calls[1][0];
		expect(afterD8.bonusDice.find((d) => d.id === "b")).toBeUndefined();
		expect(screen.getByText(/d8 · bênção do mestre →/)).toBeTruthy();
	});

	it("mobile: − / + de destino; sem <select> nativo", () => {
		mockViewport(true);
		const onChange = renderStrip(filled);
		fireEvent.click(
			screen.getByRole("button", { name: "Ganhar 1 ponto de destino" }),
		);
		expect(onChange.mock.calls[0][0].fate).toBe(3);
		fireEvent.click(
			screen.getByRole("button", { name: "Gastar 1 ponto de destino" }),
		);
		expect(onChange.mock.calls[1][0].fate).toBe(1);
		expect(document.querySelector("select")).toBeNull();
	});

	it("mobile: + Dado abre sheet sem X e adiciona", () => {
		mockViewport(true);
		const onChange = renderStrip(undefined);
		fireEvent.click(
			screen.getByRole("button", { name: "Adicionar dado bônus" }),
		);
		const dialog = screen.getByRole("dialog");
		expect(dialog.querySelector('[data-slot="dialog-close"]')).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "d10" }));
		fireEvent.click(screen.getByRole("button", { name: "Mais um" }));
		fireEvent.change(screen.getByLabelText(/Origem/), {
			target: { value: "ideia boa do grupo e mais texto" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
		const next: TableResources = onChange.mock.calls[0][0];
		expect(next.bonusDice).toHaveLength(1);
		expect(next.bonusDice[0]).toMatchObject({ sides: 10, quantity: 2 });
		expect(next.bonusDice[0].origin.length).toBeLessThanOrEqual(24);
	});

	it("viewer: só leitura", () => {
		mockViewport(false);
		const onChange = renderStrip(filled, { readOnly: true });
		expect(
			screen.queryByRole("button", { name: "Adicionar dado bônus" }),
		).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: /Rolar d6/ }));
		expect(onChange).not.toHaveBeenCalled();
	});
});
