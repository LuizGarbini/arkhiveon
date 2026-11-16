// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type PingWheelState, useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTPingControls } from "./vtt-ping-controls";
import { VTTPingPicker } from "./vtt-ping-picker";
import { VTTPingWheel } from "./vtt-ping-wheel";

afterEach(cleanup);

beforeEach(() => {
	useVTTStore.setState({
		isGM: false,
		isCoGM: false,
		activeTool: "ping",
		pingKind: "attention",
		pingWheel: null,
		pingPicker: null,
	});
});

const names = () =>
	within(screen.getByRole("group", { name: "Tipo do ping" }))
		.getAllByRole("button")
		.map((b) => b.getAttribute("aria-label"));

describe("painel da ferramenta Ping", () => {
	it("só aparece com a ferramenta Ping ativa", () => {
		useVTTStore.setState({ activeTool: "select" });
		expect(render(<VTTPingControls />).container.textContent).toBe("");
	});

	it("o jogador escolhe entre 5 tipos (sem 'Todos aqui')", () => {
		render(<VTTPingControls />);
		expect(names()).toEqual([
			"Atenção",
			"Perigo",
			"A caminho",
			"Ajuda",
			"Destacar",
		]);
	});

	it("o mestre e o co-mestre também veem 'Todos aqui'", () => {
		useVTTStore.setState({ isGM: true });
		render(<VTTPingControls />);
		expect(names()).toContain("Todos aqui");
		cleanup();
		useVTTStore.setState({ isGM: false, isCoGM: true });
		render(<VTTPingControls />);
		expect(names()).toContain("Todos aqui");
	});

	it("mostra qual está escolhido e trocar grava na store", () => {
		render(<VTTPingControls />);
		const group = screen.getByRole("group", { name: "Tipo do ping" });
		expect(
			within(group)
				.getByRole("button", { name: "Atenção" })
				.getAttribute("aria-pressed"),
		).toBe("true");
		fireEvent.click(within(group).getByRole("button", { name: "Ajuda" }));
		expect(useVTTStore.getState().pingKind).toBe("help");
		expect(
			within(group)
				.getByRole("button", { name: "Ajuda" })
				.getAttribute("aria-pressed"),
		).toBe("true");
		expect(
			within(group)
				.getByRole("button", { name: "Atenção" })
				.getAttribute("aria-pressed"),
		).toBe("false");
	});

	it("explica o tipo escolhido e os atalhos", () => {
		useVTTStore.setState({ pingKind: "danger" });
		render(<VTTPingControls />);
		expect(screen.getByText("Cuidado com este lugar")).toBeTruthy();
		expect(screen.getByText("Alt")).toBeTruthy();
		expect(screen.getByText("Ctrl")).toBeTruthy();
		expect(screen.getByText(/segure o botão de ping/)).toBeTruthy();
	});

	it("fechar volta para a seleção", () => {
		render(<VTTPingControls />);
		fireEvent.click(
			screen.getByRole("button", { name: "Fechar ferramenta de ping" }),
		);
		expect(useVTTStore.getState().activeTool).toBe("select");
	});

	it("cada botão tem alvo de toque de 44 px", () => {
		render(<VTTPingControls />);
		for (const b of within(
			screen.getByRole("group", { name: "Tipo do ping" }),
		).getAllByRole("button")) {
			expect(b.className).toContain("min-w-11");
			expect(b.className).toContain("h-11");
		}
	});
});

const wheel = (over: Partial<PingWheelState> = {}): PingWheelState => ({
	x: 400,
	y: 300,
	worldX: 10,
	worldY: 20,
	kinds: ["attention", "danger", "going", "help", "highlight"],
	hover: null,
	visible: true,
	...over,
});

describe("roda de pings", () => {
	it("não aparece com a roda fechada", () => {
		expect(render(<VTTPingWheel />).container.textContent).toBe("");
	});

	it("aberta mas ainda não revelada (Ctrl+clique rápido), não desenha nada: sem piscar", () => {
		useVTTStore.setState({ pingWheel: wheel({ visible: false }) });
		const { container } = render(<VTTPingWheel />);
		expect(container.textContent).toBe("");
		expect(container.querySelector("[data-ping-wheel]")).toBeNull();
	});

	it("aparece no ponto onde abriu, com uma opção por tipo, e não intercepta cliques", () => {
		useVTTStore.setState({ pingWheel: wheel() });
		const { container } = render(<VTTPingWheel />);
		const root = container.querySelector("[data-ping-wheel]") as HTMLElement;
		expect(root.style.left).toBe("400px");
		expect(root.style.top).toBe("300px");
		expect(root.className).toContain("pointer-events-none");
		expect(root.getAttribute("aria-hidden")).toBe("true");
		expect(
			[...root.querySelectorAll("[data-ping-kind]")].map((e) =>
				e.getAttribute("data-ping-kind"),
			),
		).toEqual(["attention", "danger", "going", "help", "highlight"]);
	});

	it("a opção sob o cursor acende e o nome dela aparece", () => {
		useVTTStore.setState({
			pingWheel: wheel({ hover: "danger" }),
		});
		const { container } = render(<VTTPingWheel />);
		expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
		expect(
			container
				.querySelector('[data-ping-kind="danger"]')
				?.getAttribute("data-active"),
		).toBe("true");
		expect(screen.getByText("Perigo")).toBeTruthy();
	});

	it("sem opção sob o cursor, orienta soltar no centro", () => {
		useVTTStore.setState({ pingWheel: wheel() });
		render(<VTTPingWheel />);
		expect(screen.getByText(/Arraste até um tipo e solte/)).toBeTruthy();
		expect(screen.getByText(/Esc cancela/)).toBeTruthy();
	});

	it("a roda do mestre tem a opção 'Todos aqui'", () => {
		useVTTStore.setState({
			pingWheel: wheel({ kinds: [...wheel().kinds, "focus"], hover: "focus" }),
		});
		const { container } = render(<VTTPingWheel />);
		expect(container.querySelectorAll("[data-ping-kind]")).toHaveLength(6);
		expect(screen.getByText("Todos aqui")).toBeTruthy();
	});
});

describe("lista do botão de Ping (celular)", () => {
	const picker = (hover: string | null = null) => ({
		left: 70,
		top: 120,
		kinds: ["attention", "danger", "going", "help", "highlight"] as (
			| "attention"
			| "danger"
			| "going"
			| "help"
			| "highlight"
		)[],
		hover: hover as never,
	});

	it("não aparece fechada", () => {
		expect(render(<VTTPingPicker />).container.textContent).toBe("");
	});

	it("lista os tipos com nome, no lugar pedido, sem interceptar toque", () => {
		useVTTStore.setState({ pingPicker: picker() });
		const { container } = render(<VTTPingPicker />);
		const root = container.querySelector("[data-ping-picker]") as HTMLElement;
		expect(root.style.left).toBe("70px");
		expect(root.style.top).toBe("120px");
		expect(root.className).toContain("pointer-events-none");
		for (const label of [
			"Atenção",
			"Perigo",
			"A caminho",
			"Ajuda",
			"Destacar",
		]) {
			expect(screen.getByText(label)).toBeTruthy();
		}
	});

	it("acende a opção sob o dedo e marca a atual", () => {
		useVTTStore.setState({ pingPicker: picker("going"), pingKind: "help" });
		const { container } = render(<VTTPingPicker />);
		expect(
			container
				.querySelector('[data-ping-kind="going"]')
				?.getAttribute("data-active"),
		).toBe("true");
		expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
		expect(screen.getAllByText("atual")).toHaveLength(1);
		expect(
			container.querySelector('[data-ping-kind="help"]')?.textContent,
		).toContain("atual");
	});
});

describe("estado dos pings na store", () => {
	it("o tipo escolhido começa em atenção e sobrevive à troca de cena", () => {
		expect(useVTTStore.getState().pingKind).toBe("attention");
		useVTTStore.getState().setPingKind("danger");
		useVTTStore.getState().setActiveSceneId("outra-cena");
		expect(useVTTStore.getState().pingKind).toBe("danger");
	});

	it("a roda só atualiza quando a opção sob o cursor muda (não a cada pixel)", () => {
		useVTTStore.getState().openPingWheel(wheel());
		const first = useVTTStore.getState().pingWheel;
		useVTTStore.getState().setPingWheelHover("danger");
		const second = useVTTStore.getState().pingWheel;
		expect(second).not.toBe(first);
		useVTTStore.getState().setPingWheelHover("danger");
		expect(useVTTStore.getState().pingWheel).toBe(second);
		useVTTStore.getState().closePingWheel();
		expect(useVTTStore.getState().pingWheel).toBeNull();
		useVTTStore.getState().setPingWheelHover("help");
		expect(useVTTStore.getState().pingWheel).toBeNull();
	});

	it("a roda abre escondida e só aparece ao ser revelada (uma vez, sem refazer o estado à toa)", () => {
		useVTTStore.getState().openPingWheel(wheel({ visible: false }));
		expect(useVTTStore.getState().pingWheel?.visible).toBe(false);
		useVTTStore.getState().revealPingWheel();
		const shown = useVTTStore.getState().pingWheel;
		expect(shown?.visible).toBe(true);
		useVTTStore.getState().revealPingWheel();
		expect(useVTTStore.getState().pingWheel).toBe(shown);
		useVTTStore.getState().closePingWheel();
		useVTTStore.getState().revealPingWheel();
		expect(useVTTStore.getState().pingWheel).toBeNull();
	});

	it("escolher a opção sob o cursor não revela a roda sozinho", () => {
		useVTTStore.getState().openPingWheel(wheel({ visible: false }));
		useVTTStore.getState().setPingWheelHover("danger");
		expect(useVTTStore.getState().pingWheel?.hover).toBe("danger");
		expect(useVTTStore.getState().pingWheel?.visible).toBe(false);
	});

	it("a lista do celular segue a mesma regra", () => {
		useVTTStore.getState().openPingPicker({
			left: 1,
			top: 2,
			kinds: ["attention", "danger"],
			hover: null,
		});
		const a = useVTTStore.getState().pingPicker;
		useVTTStore.getState().setPingPickerHover("danger");
		const b = useVTTStore.getState().pingPicker;
		expect(b?.hover).toBe("danger");
		useVTTStore.getState().setPingPickerHover("danger");
		expect(useVTTStore.getState().pingPicker).toBe(b);
		expect(a).not.toBe(b);
		useVTTStore.getState().closePingPicker();
		expect(useVTTStore.getState().pingPicker).toBeNull();
	});
});
