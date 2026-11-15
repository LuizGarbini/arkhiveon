// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTSpellTemplate } from "@/lib/vtt/template-math";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTGMTableBar } from "./vtt-gm-table-bar";

afterEach(cleanup);

const template = (id: string): VTTSpellTemplate =>
	({
		id,
		kind: "cone60",
		originX: 0,
		originY: 0,
		targetX: 100,
		targetY: 0,
		color: "#a855f7",
	}) as VTTSpellTemplate;

const scene = (over: Partial<VTTScene> = {}): VTTScene =>
	({ id: "s", fogEnabled: true, fogExploration: true, ...over }) as VTTScene;

function setup(s: VTTScene | null = scene()) {
	const onClear = vi.fn();
	const view = render(<VTTGMTableBar scene={s} onClearTemplates={onClear} />);
	return { onClear, ...view };
}

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		isCoGM: false,
		placedTemplates: [],
		remoteTemplates: {},
		showPlayerExploration: true,
		showAllVisionCones: false,
	});
});

describe("limpar magias", () => {
	it("sem moldes na mesa o botão não aparece", () => {
		setup();
		expect(screen.queryByText("Limpar magias")).toBeNull();
	});

	it("mostra quantos moldes há, os do mestre e os dos jogadores", () => {
		useVTTStore.setState({
			placedTemplates: [template("a")],
			remoteTemplates: { b: template("b"), c: template("c") },
		});
		setup();
		expect(
			screen.getByRole("button", { name: "Limpar magias da mesa (3)" }),
		).toBeTruthy();
	});

	it("limpa TUDO: avisa os outros com todos os ids e tira da mesa", () => {
		useVTTStore.setState({
			placedTemplates: [template("a")],
			remoteTemplates: { b: template("b"), c: template("c") },
		});
		const { onClear } = setup();
		fireEvent.click(
			screen.getByRole("button", { name: /Limpar magias da mesa/ }),
		);
		expect(onClear).toHaveBeenCalledTimes(1);
		expect([...(onClear.mock.calls[0]?.[0] as string[])].sort()).toEqual([
			"a",
			"b",
			"c",
		]);
		const s = useVTTStore.getState();
		expect(s.placedTemplates).toEqual([]);
		expect(Object.keys(s.remoteTemplates)).toEqual([]);
	});

	it("depois de limpar, o botão some", () => {
		useVTTStore.setState({ placedTemplates: [template("a")] });
		setup();
		fireEvent.click(
			screen.getByRole("button", { name: /Limpar magias da mesa/ }),
		);
		expect(screen.queryByText("Limpar magias")).toBeNull();
	});

	it("funciona também sem névoa de exploração na cena", () => {
		useVTTStore.setState({ placedTemplates: [template("a")] });
		setup(scene({ fogEnabled: false, fogExploration: false }));
		expect(screen.getByText("Limpar magias")).toBeTruthy();
		expect(screen.queryByText("Explorado")).toBeNull();
	});

	it("co-mestre também limpa; jogador não vê nada", () => {
		useVTTStore.setState({
			isGM: false,
			isCoGM: true,
			placedTemplates: [template("a")],
		});
		const co = setup();
		expect(screen.getByText("Limpar magias")).toBeTruthy();
		expect(screen.queryByText("Explorado")).toBeNull(); // o realce é só do mestre
		co.unmount();
		useVTTStore.setState({ isGM: false, isCoGM: false });
		const { container } = setup();
		expect(container.textContent).toBe("");
	});
});

describe("exploração dos jogadores", () => {
	it("só aparece com a Exploração ligada na cena", () => {
		const a = setup(scene({ fogExploration: false }));
		expect(a.container.textContent).toBe("");
		a.unmount();
		const b = setup(scene({ fogEnabled: false }));
		expect(b.container.textContent).toBe("");
		b.unmount();
		setup(scene());
		expect(screen.getByText("Explorado")).toBeTruthy();
		expect(screen.getByText("Cones de todos")).toBeTruthy();
	});

	it("sem cena ativa: nada", () => {
		const { container } = setup(null);
		expect(container.textContent).toBe("");
	});

	it("Explorado vem ligado e Cones de todos desligado (mesa limpa por padrão)", () => {
		setup();
		expect(
			screen
				.getByRole("button", { name: /Explorado/ })
				.getAttribute("aria-pressed"),
		).toBe("true");
		expect(
			screen
				.getByRole("button", { name: /Cones de todos/ })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("os interruptores mudam a store na hora", () => {
		setup();
		fireEvent.click(screen.getByRole("button", { name: /Cones de todos/ }));
		expect(useVTTStore.getState().showAllVisionCones).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: /Explorado/ }));
		expect(useVTTStore.getState().showPlayerExploration).toBe(false);
	});

	it("com Explorado desligado, Cones de todos fica travado", () => {
		useVTTStore.setState({ showPlayerExploration: false });
		setup();
		expect(
			(
				screen.getByRole("button", {
					name: /Cones de todos/,
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);
	});

	it("as duas coisas juntas ficam na mesma barra, separadas", () => {
		useVTTStore.setState({ placedTemplates: [template("a")] });
		setup();
		const bar = screen.getByRole("toolbar", {
			name: "Ferramentas do mestre na mesa",
		});
		expect(bar.textContent).toContain("Limpar magias");
		expect(bar.textContent).toContain("Explorado");
	});
});
