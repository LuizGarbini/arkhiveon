// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SheetHp } from "./sheet-hp";

afterEach(cleanup);

type Props = Parameters<typeof SheetHp>[0];

function setup(props: Partial<Props> = {}) {
	const fns = {
		onChange: vi.fn().mockResolvedValue(undefined),
		onChangeTempHp: vi.fn().mockResolvedValue(undefined),
		onChangeMax: vi.fn().mockResolvedValue(undefined),
		onChangeHp: vi.fn().mockResolvedValue(undefined),
	};
	render(
		<SheetHp current={20} max={30} showMax temp={0} {...fns} {...props} />,
	);
	return fns;
}

const press = (name: string) =>
	fireEvent.click(screen.getByRole("button", { name }));

describe("SheetHp · ajuste rápido", () => {
	it("tira e cura PV, sem passar do máximo nem de zero", () => {
		const f = setup();
		press("Tirar 5 PV");
		expect(f.onChange).toHaveBeenLastCalledWith(15);
		cleanup();
		const g = setup({ current: 28 });
		press("Curar 5 PV");
		expect(g.onChange).toHaveBeenLastCalledWith(30);
		cleanup();
		const z = setup({ current: 3 });
		press("Tirar 5 PV");
		expect(z.onChange).toHaveBeenLastCalledWith(0);
	});

	it("o dano come a vida temporária antes do PV", () => {
		const f = setup({ temp: 10 });
		press("Tirar 5 PV");
		expect(f.onChangeTempHp).toHaveBeenCalledWith(5);
		expect(f.onChange).not.toHaveBeenCalled();
	});

	it("dano maior que a temporária zera ela e o resto vai no PV", async () => {
		const f = setup({ temp: 2 });
		press("Tirar 5 PV");
		await act(async () => {});
		expect(f.onChangeTempHp).toHaveBeenCalledWith(0);
		expect(f.onChange).toHaveBeenCalledWith(17);
	});

	it("um ajuste por vez: trava e mostra Salvando até gravar", async () => {
		let finish: () => void = () => {};
		const onChange = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		);
		setup({ onChange });
		const minus = screen.getByRole("button", { name: "Tirar 1 PV" });
		fireEvent.click(minus);
		fireEvent.click(minus);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect((minus as HTMLButtonElement).disabled).toBe(true);
		expect(
			screen.getByText("Salvando…").getAttribute("aria-hidden"),
		).toBeNull();
		await act(async () => finish());
		expect((minus as HTMLButtonElement).disabled).toBe(false);
	});

	it("sem permissão de editar PV não há botões nem editor", () => {
		setup({
			onChange: undefined,
			onChangeHp: undefined,
			onChangeMax: undefined,
			onChangeTempHp: undefined,
		});
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByText("20")).toBeTruthy();
	});

	it("quem não vê o máximo não vê '/ 30'", () => {
		setup({ showMax: false });
		expect(screen.queryByText("/ 30")).toBeNull();
	});

	it("PV baixo (≤ 25%) pinta a barra de alerta", () => {
		setup({ current: 7 });
		expect(screen.getByTestId("vtt-hp-bar").className).toContain(
			"bg-destructive",
		);
		cleanup();
		setup({ current: 20 });
		expect(screen.getByTestId("vtt-hp-bar").className).toContain("bg-primary");
	});

	it("mostra a vida temporária em chip e em segmento da barra", () => {
		setup({ temp: 15 });
		expect(screen.getByText("+15 temp")).toBeTruthy();
		expect(screen.getByTestId("vtt-temp-hp-bar")).toBeTruthy();
	});
});

describe("SheetHp · editor ao tocar no número", () => {
	const open = () =>
		fireEvent.click(
			screen.getByRole("button", { name: /Editar pontos de vida/ }),
		);
	const type = (name: string, value: string) =>
		fireEvent.change(screen.getByRole("spinbutton", { name }), {
			target: { value },
		});

	it("aplica PV atual e máximo numa gravação só", async () => {
		const f = setup();
		open();
		type("PV atual", "25");
		type("PV máximo", "40");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeHp).toHaveBeenCalledWith({ current: 25, max: 40 });
		expect(f.onChange).not.toHaveBeenCalled();
	});

	it("sem onChangeHp usa onChange e onChangeMax separados", async () => {
		const f = setup({ onChangeHp: undefined });
		open();
		type("PV atual", "25");
		type("PV máximo", "40");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChange).toHaveBeenCalledWith(25);
		expect(f.onChangeMax).toHaveBeenCalledWith(40);
	});

	it("só manda o que mudou", async () => {
		const f = setup();
		open();
		type("PV atual", "25");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeHp).toHaveBeenCalledWith({
			current: 25,
			max: undefined,
		});
	});

	it("mudar só o máximo não regrava o PV atual", async () => {
		const f = setup();
		open();
		type("PV máximo", "40");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeHp).toHaveBeenCalledWith({
			current: undefined,
			max: 40,
		});
	});

	it("Aplicar sem mudar nada não grava nada", async () => {
		const f = setup({ temp: 10 });
		open();
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeHp).not.toHaveBeenCalled();
		expect(f.onChange).not.toHaveBeenCalled();
		expect(f.onChangeMax).not.toHaveBeenCalled();
		expect(f.onChangeTempHp).not.toHaveBeenCalled();
	});

	it("valor inválido ou igual não grava nada", async () => {
		const f = setup();
		open();
		type("PV atual", "-3");
		type("PV máximo", "0");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeHp).not.toHaveBeenCalled();
		expect(f.onChange).not.toHaveBeenCalled();
	});

	it("digitar a mesma vida temporária não regrava", async () => {
		const f = setup({ temp: 10 });
		open();
		type("Vida temporária", "10");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeTempHp).not.toHaveBeenCalled();
	});

	it("vida temporária nova é gravada", async () => {
		const f = setup({ temp: 0 });
		open();
		type("Vida temporária", "8");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeTempHp).toHaveBeenCalledWith(8);
	});

	it("Zerar a vida temporária e aplicar", async () => {
		const f = setup({ temp: 10 });
		open();
		fireEvent.click(screen.getByRole("button", { name: "Zerar" }));
		fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
		await act(async () => {});
		expect(f.onChangeTempHp).toHaveBeenCalledWith(0);
	});

	it("jogador não edita o máximo", () => {
		setup({ showMax: false, onChangeMax: undefined, onChangeHp: undefined });
		open();
		expect(screen.queryByRole("spinbutton", { name: "PV máximo" })).toBeNull();
		expect(screen.getByRole("spinbutton", { name: "PV atual" })).toBeTruthy();
	});

	it("o rascunho não vaza: fechar sem aplicar e reabrir mostra o valor real", async () => {
		const f = setup();
		open();
		type("PV atual", "99");
		fireEvent.keyDown(document.activeElement ?? document.body, {
			key: "Escape",
		});
		await act(async () => {});
		expect(screen.queryByRole("spinbutton", { name: "PV atual" })).toBeNull();
		open();
		expect(
			(screen.getByRole("spinbutton", { name: "PV atual" }) as HTMLInputElement)
				.value,
		).toBe("20");
		expect(f.onChange).not.toHaveBeenCalled();
		expect(f.onChangeHp).not.toHaveBeenCalled();
	});
});
