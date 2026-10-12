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
	inspiration: 2,
	fate: 4,
	fateMax: 10,
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
	it("vazio: ★ 0 apagado, ◆ 0/10, CTA + Dado", () => {
		mockViewport(false);
		renderStrip(undefined);
		expect(screen.getByText(/Nenhum dado bônus/)).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Adicionar dado bônus" }),
		).toBeTruthy();
		const insp = screen.getByRole("button", { name: "Inspiração: 0. Ajustar" });
		expect(insp.className).toContain("text-muted-foreground");
		expect(insp.className).not.toContain("text-amber-300");
		expect(screen.getByRole("group", { name: "Destino 0 de 10" })).toBeTruthy();
		expect(
			(
				screen.getByRole("button", {
					name: "Gastar 1 ponto de destino",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	it("ficha antiga (inspiração true, destino /3) aparece como ★ 1 e ◆ n/10", () => {
		mockViewport(false);
		renderStrip({ inspiration: true, fate: 2, fateMax: 3 });
		const insp = screen.getByRole("button", { name: "Inspiração: 1. Ajustar" });
		expect(insp.className).toContain("text-amber-300");
		expect(screen.getByRole("group", { name: "Destino 2 de 10" })).toBeTruthy();
	});

	it("desktop: Popover ajusta inspiração e 'Usar 1 · vantagem' gasta 1", () => {
		mockViewport(false);
		const onChange = renderStrip(filled);
		fireEvent.click(
			screen.getByRole("button", { name: "Inspiração: 2. Ajustar" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Ganhar 1 inspiração" }),
		);
		expect(onChange.mock.calls[0][0].inspiration).toBe(3);
		fireEvent.click(
			screen.getByRole("button", { name: "Gastar 1 inspiração" }),
		);
		expect(onChange.mock.calls[1][0].inspiration).toBe(1);
		fireEvent.click(screen.getByRole("button", { name: "Usar 1 · vantagem" }));
		expect(onChange.mock.calls[2][0].inspiration).toBe(1);
	});

	it("destino: − / + com teto 10, sem pips", () => {
		mockViewport(false);
		const onChange = renderStrip({ ...filled, fate: 10 });
		const plus = screen.getByRole("button", {
			name: "Ganhar 1 ponto de destino",
		}) as HTMLButtonElement;
		expect(plus.disabled).toBe(true);
		fireEvent.click(
			screen.getByRole("button", { name: "Gastar 1 ponto de destino" }),
		);
		expect(onChange.mock.calls[0][0].fate).toBe(9);
		expect(screen.queryByRole("button", { name: /^Destino \d+$/ })).toBeNull();
	});

	it("+ Dado fica fora da fileira que rola (com fade)", () => {
		mockViewport(false);
		renderStrip(filled);
		const scroll = document.querySelector('[data-slot="bonus-dice-scroll"]');
		expect(scroll?.className).toContain("overflow-x-auto");
		expect(scroll?.className).toContain("mask-image");
		const add = screen.getByRole("button", { name: "Adicionar dado bônus" });
		expect(scroll?.contains(add)).toBe(false);
		expect(scroll?.querySelectorAll("button")).toHaveLength(2);
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
		expect(onChange.mock.calls[0][0].fate).toBe(5);
		fireEvent.click(
			screen.getByRole("button", { name: "Gastar 1 ponto de destino" }),
		);
		expect(onChange.mock.calls[1][0].fate).toBe(3);
		expect(document.querySelector("select")).toBeNull();
	});

	it("mobile: inspiração abre sheet sem X com − / + de 52px", () => {
		mockViewport(true);
		const onChange = renderStrip(filled);
		fireEvent.click(
			screen.getByRole("button", { name: "Inspiração: 2. Ajustar" }),
		);
		const dialog = screen.getByRole("dialog");
		expect(dialog.querySelector('[data-slot="dialog-close"]')).toBeNull();
		const plus = screen.getByRole("button", { name: "Ganhar 1 inspiração" });
		expect(plus.className).toContain("size-[52px]");
		fireEvent.click(screen.getByRole("button", { name: "Usar 1 · vantagem" }));
		expect(onChange.mock.calls[0][0].inspiration).toBe(1);
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
		expect(screen.queryByRole("button", { name: /Inspiração/ })).toBeNull();
		expect(screen.getByRole("img", { name: "Inspiração: 2" })).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /ponto de destino/ }),
		).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: /Rolar d6/ }));
		expect(onChange).not.toHaveBeenCalled();
	});
});
