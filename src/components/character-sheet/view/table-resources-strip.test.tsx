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
	fateTotal: 10,
	divine: 0,
	divineTotal: 10,
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

	it("total editável inline com o Input do DS; Enter grava e ajusta a sobra", () => {
		mockViewport(false);
		const onChange = renderStrip({ ...filled, fate: 3, fateTotal: 4 });
		expect(screen.getByRole("group", { name: "Destino 3 de 4" })).toBeTruthy();
		const bar = document.querySelector('[data-slot="fate-bar"]') as HTMLElement;
		expect(bar.style.width).toBe("75%");
		fireEvent.click(
			screen.getByRole("button", { name: "Editar total de destino (4)" }),
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		const input = screen.getByLabelText(
			"Total de pontos de destino",
		) as HTMLInputElement;
		expect(input.getAttribute("data-slot")).toBe("input");
		expect(input.value).toBe("4");
		expect(document.activeElement).toBe(input);
		fireEvent.change(input, { target: { value: "2" } });
		fireEvent.submit(input.closest("form") as HTMLFormElement);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][0]).toMatchObject({ fate: 2, fateTotal: 2 });
		expect(screen.queryByLabelText("Total de pontos de destino")).toBeNull();
	});

	it("total: Esc cancela, blur grava, valor vazio não muda nada", () => {
		mockViewport(false);
		const onChange = renderStrip({ ...filled, fate: 3, fateTotal: 4 });
		const open = () =>
			fireEvent.click(
				screen.getByRole("button", { name: "Editar total de destino (4)" }),
			);
		const input = () =>
			screen.getByLabelText("Total de pontos de destino") as HTMLInputElement;
		open();
		fireEvent.change(input(), { target: { value: "9" } });
		fireEvent.keyDown(input(), { key: "Escape" });
		expect(onChange).not.toHaveBeenCalled();
		open();
		fireEvent.change(input(), { target: { value: "" } });
		fireEvent.blur(input());
		expect(onChange).not.toHaveBeenCalled();
		open();
		fireEvent.change(input(), { target: { value: "6" } });
		fireEvent.blur(input());
		expect(onChange.mock.calls[0][0]).toMatchObject({ fate: 3, fateTotal: 6 });
	});

	it("queimar pede confirmação no Dialog do DS e tira 1 do total", () => {
		mockViewport(false);
		const onChange = renderStrip({ ...filled, fate: 4, fateTotal: 4 });
		fireEvent.click(
			screen.getByRole("button", { name: "Queimar 1 ponto de destino" }),
		);
		expect(onChange).not.toHaveBeenCalled();
		const dialog = screen.getByRole("dialog");
		expect(dialog.textContent).toContain("3 / 3");
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("button", { name: "Queimar 1 ponto de destino" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Queimar" }));
		expect(onChange.mock.calls[0][0]).toMatchObject({ fate: 3, fateTotal: 3 });
	});

	it("queimar fica desabilitado com total 0", () => {
		mockViewport(true);
		renderStrip({ ...filled, fate: 0, fateTotal: 0 });
		const burn = screen.getByRole("button", {
			name: "Queimar 1 ponto de destino",
		}) as HTMLButtonElement;
		expect(burn.disabled).toBe(true);
		expect(screen.getByRole("group", { name: "Destino 0 de 0" })).toBeTruthy();
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
		expect(
			screen.queryByRole("button", { name: /Editar total de destino/ }),
		).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: /Rolar d6/ }));
		expect(onChange).not.toHaveBeenCalled();
	});
});

describe("TableResourcesStrip · Pontos Divinos", () => {
	it("ficha antiga abre com ☀ 0/10 e − desligado, sem mudar o Destino", () => {
		mockViewport(false);
		renderStrip({ fate: 4, fateTotal: 10 });
		expect(
			screen.getByRole("group", { name: "Pontos Divinos 0 de 10" }),
		).toBeTruthy();
		expect(screen.getByRole("group", { name: "Destino 4 de 10" })).toBeTruthy();
		expect(
			(
				screen.getByRole("button", {
					name: "Gastar 1 ponto divino",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	it("− / + mexem só nos Divinos e preservam chave desconhecida", () => {
		mockViewport(false);
		const onChange = renderStrip({
			...filled,
			divine: 2,
			divineTotal: 3,
			futuro: { x: 1 },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Ganhar 1 ponto divino" }),
		);
		expect(onChange.mock.calls[0][0]).toMatchObject({
			divine: 3,
			divineTotal: 3,
			fate: 4,
			fateTotal: 10,
			futuro: { x: 1 },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Gastar 1 ponto divino" }),
		);
		expect(onChange.mock.calls[1][0].divine).toBe(1);
	});

	it("total editável inline: Enter grava e a sobra desce junto", () => {
		mockViewport(false);
		const onChange = renderStrip({ ...filled, divine: 5, divineTotal: 8 });
		fireEvent.click(
			screen.getByRole("button", {
				name: "Editar total de pontos divinos (8)",
			}),
		);
		const input = screen.getByLabelText(
			"Total de pontos divinos",
		) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "3" } });
		fireEvent.submit(input.closest("form") as HTMLFormElement);
		expect(onChange.mock.calls[0][0]).toMatchObject({
			divine: 3,
			divineTotal: 3,
			fateTotal: 10,
		});
	});

	it("Queimar pede confirmação no Dialog e tira 1 do total", () => {
		mockViewport(false);
		const onChange = renderStrip({ ...filled, divine: 4, divineTotal: 4 });
		fireEvent.click(
			screen.getByRole("button", { name: "Queimar 1 ponto divino" }),
		);
		const dialog = screen.getByRole("dialog");
		expect(dialog.textContent).toMatch(/Pontos Divinos ficam\s*3 \/ 3/);
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Queimar" }));
		expect(onChange.mock.calls[0][0]).toMatchObject({
			divine: 3,
			divineTotal: 3,
			fateTotal: 10,
		});
	});

	it("viewer vê ☀ n / t sem botões, também no 390", () => {
		mockViewport(true);
		renderStrip({ ...filled, divine: 2, divineTotal: 5 }, { readOnly: true });
		expect(
			screen.getByRole("group", { name: "Pontos Divinos 2 de 5" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /ponto divino|pontos divinos/ }),
		).toBeNull();
	});
});

describe("TableResourcesStrip · Queimar com Destino e Divinos diferentes", () => {
	it("cada Dialog mostra os próprios números e queimar um não mexe no outro", () => {
		mockViewport(false);
		const onChange = renderStrip({
			...filled,
			fate: 3,
			fateTotal: 4,
			divine: 0,
			divineTotal: 10,
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Queimar 1 ponto divino" }),
		);
		const divineText = screen.getByRole("dialog").textContent ?? "";
		expect(divineText).toMatch(/de 10 para 9/);
		expect(divineText).toMatch(/Pontos Divinos ficam\s*0 \/ 9/);
		expect(divineText).not.toMatch(/de 4 para 3/);
		fireEvent.click(screen.getByRole("button", { name: "Queimar" }));
		expect(onChange.mock.calls[0][0]).toMatchObject({
			divine: 0,
			divineTotal: 9,
			fate: 3,
			fateTotal: 4,
		});

		fireEvent.click(
			screen.getByRole("button", { name: "Queimar 1 ponto de destino" }),
		);
		const fateText = screen.getByRole("dialog").textContent ?? "";
		expect(fateText).toMatch(/de 4 para 3/);
		expect(fateText).toMatch(/Destino fica\s*3 \/ 3/);
		expect(fateText).not.toMatch(/de 10 para 9/);
		fireEvent.click(screen.getByRole("button", { name: "Queimar" }));
		expect(onChange.mock.calls[1][0]).toMatchObject({
			fate: 3,
			fateTotal: 3,
			divine: 0,
			divineTotal: 10,
		});
	});

	it("viewer 390: Destino e Divinos com rótulo na própria linha", () => {
		mockViewport(true);
		renderStrip({ ...filled, divine: 2, divineTotal: 5 }, { readOnly: true });
		const labels = Array.from(
			document.querySelectorAll(
				'section[aria-label="Recursos da mesa"] span.uppercase',
			),
		).map((el) => el.textContent);
		expect(labels).toEqual(expect.arrayContaining(["Destino", "Divinos"]));
	});
});
