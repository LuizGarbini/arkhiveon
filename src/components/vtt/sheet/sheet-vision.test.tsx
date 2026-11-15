// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Character } from "@/lib/store/types";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { VisionSection } from "./sheet-vision";
import type { SheetResourceApi } from "./use-sheet-resources";

afterEach(cleanup);

const dnd = SYSTEM_CONFIG.dnd5e;
const character = (extra: Partial<Character> = {}) =>
	({
		id: "c1",
		system: "dnd5e",
		characterName: "Dante",
		...extra,
	}) as Character;
const api = (over: Partial<SheetResourceApi> = {}): SheetResourceApi => ({
	canEdit: true,
	isStaff: false,
	save: vi.fn(),
	saveVision: vi.fn(),
	...over,
});

function setup(c: Character, r: SheetResourceApi, sceneUnit?: string) {
	render(
		<VisionSection
			character={c}
			config={dnd}
			sceneUnit={sceneUnit}
			resources={r}
		/>,
	);
}

describe("VisionSection · leitura", () => {
	it("mostra a visão na luz e no escuro na unidade da cena (18 m → 60 ft)", () => {
		setup(
			character({ speedUnit: "m", visionDistance: 18, darkvisionDistance: 36 }),
			api({ canEdit: false }),
			"ft",
		);
		expect(screen.getByText("Na luz").nextElementSibling?.textContent).toBe(
			"60ft",
		);
		expect(screen.getByText("No escuro").nextElementSibling?.textContent).toBe(
			"120ft",
		);
	});

	it("campo sem valor aparece como traço", () => {
		setup(character({ visionDistance: 30 }), api({ canEdit: false }));
		expect(screen.getByText("No escuro").nextElementSibling?.textContent).toBe(
			"—",
		);
	});

	it("sem nenhum valor e sem permissão: a seção não aparece", () => {
		setup(character(), api({ canEdit: false }));
		expect(screen.queryByRole("region", { name: "Visão" })).toBeNull();
		expect(screen.queryByText("Na luz")).toBeNull();
	});

	it("sem nenhum valor mas com permissão: aparece, para poder definir", () => {
		setup(character(), api());
		expect(screen.getByRole("button", { name: "Editar visão" })).toBeTruthy();
	});

	it("quem não pode editar vê os valores, sem o botão", () => {
		setup(character({ visionDistance: 30 }), api({ canEdit: false }));
		expect(screen.getByText("Na luz")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Editar visão" })).toBeNull();
	});
});

describe("VisionSection · edição", () => {
	const open = () =>
		fireEvent.click(screen.getByRole("button", { name: "Editar visão" }));
	const inputs = () => ({
		light: screen.getByLabelText(/Na luz/) as HTMLInputElement,
		dark: screen.getByLabelText(/No escuro/) as HTMLInputElement,
	});

	it("abre com os valores atuais, na unidade da ficha", () => {
		setup(character({ visionDistance: 30, darkvisionDistance: 60 }), api());
		open();
		const { light, dark } = inputs();
		expect(light.value).toBe("30");
		expect(dark.value).toBe("60");
		expect(screen.getByText("Na luz (ft)")).toBeTruthy();
	});

	it("clicar no rótulo foca o campo", () => {
		setup(character(), api());
		open();
		const { light } = inputs();
		fireEvent.click(screen.getByText("Na luz (ft)"));
		expect(light.id).toBeTruthy();
		expect((screen.getByText("Na luz (ft)") as HTMLLabelElement).htmlFor).toBe(
			light.id,
		);
	});

	it("salvar manda os dois valores e fecha o formulário", () => {
		const r = api();
		setup(character({ visionDistance: 30 }), r);
		open();
		const { light, dark } = inputs();
		fireEvent.change(light, { target: { value: "40" } });
		fireEvent.change(dark, { target: { value: "90.5" } });
		fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
		expect(r.saveVision).toHaveBeenCalledWith({
			visionDistance: 40,
			darkvisionDistance: 90.5,
		});
		expect(screen.queryByRole("form", { name: "Editar visão" })).toBeNull();
	});

	it("Enter envia o formulário (submit nativo)", () => {
		const r = api();
		setup(character({ visionDistance: 30 }), r);
		open();
		fireEvent.submit(screen.getByRole("form", { name: "Editar visão" }));
		expect(r.saveVision).toHaveBeenCalledTimes(1);
	});

	it("apagar um campo manda sem valor (volta ao padrão)", () => {
		const r = api();
		setup(character({ visionDistance: 30, darkvisionDistance: 60 }), r);
		open();
		fireEvent.change(inputs().dark, { target: { value: "" } });
		fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
		expect(r.saveVision).toHaveBeenCalledWith({
			visionDistance: 30,
			darkvisionDistance: undefined,
		});
	});

	it("valor inválido mostra o erro junto do campo e trava o salvar", () => {
		const r = api();
		setup(character(), r);
		open();
		fireEvent.change(inputs().dark, { target: { value: "-4" } });
		expect(screen.getByRole("alert").textContent).toBe(
			"Use um número maior que 0.",
		);
		expect(
			(screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		fireEvent.submit(screen.getByRole("form", { name: "Editar visão" }));
		expect(r.saveVision).not.toHaveBeenCalled();
		fireEvent.change(inputs().dark, { target: { value: "5000" } });
		expect(screen.getByRole("alert").textContent).toBe("O máximo é 1000.");
	});

	it("cancelar descarta o que foi digitado; Esc também", () => {
		const r = api();
		setup(character({ visionDistance: 30 }), r);
		open();
		fireEvent.change(inputs().light, { target: { value: "99" } });
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(r.saveVision).not.toHaveBeenCalled();
		open();
		expect(inputs().light.value).toBe("30");
		fireEvent.keyDown(screen.getByRole("form", { name: "Editar visão" }), {
			key: "Escape",
		});
		expect(screen.queryByRole("form", { name: "Editar visão" })).toBeNull();
		expect(r.saveVision).not.toHaveBeenCalled();
	});
});
