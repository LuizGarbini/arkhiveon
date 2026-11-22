// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
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

const openPanel = () =>
	fireEvent.click(
		screen.getByRole("button", { name: /Pontos de vida: .*Abrir dano e cura/ }),
	);

describe("SheetHp · ajuste rápido", () => {
	it("tira e cura PV, sem passar do máximo nem de zero", () => {
		const f = setup();
		openPanel();
		press("Tirar 5 PV");
		expect(f.onChange).toHaveBeenLastCalledWith(15);
		cleanup();
		const g = setup({ current: 28 });
		openPanel();
		press("Curar 5 PV");
		expect(g.onChange).toHaveBeenLastCalledWith(30);
		cleanup();
		const z = setup({ current: 3 });
		openPanel();
		press("Tirar 5 PV");
		expect(z.onChange).toHaveBeenLastCalledWith(0);
	});

	it("o dano come a vida temporária antes do PV", () => {
		const f = setup({ temp: 10 });
		openPanel();
		press("Tirar 5 PV");
		expect(f.onChangeTempHp).toHaveBeenCalledWith(5);
		expect(f.onChange).not.toHaveBeenCalled();
	});

	it("dano maior que a temporária zera ela e o resto vai no PV", async () => {
		const f = setup({ temp: 2 });
		openPanel();
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
		openPanel();
		const minus = screen.getByRole("button", { name: "Tirar 1 PV" });
		fireEvent.click(minus);
		fireEvent.click(minus);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect((minus as HTMLButtonElement).disabled).toBe(true);
		const field = screen.getByRole("textbox", { name: /Dano, cura/ });
		expect((field as HTMLInputElement).readOnly).toBe(true);
		expect(screen.getAllByText("Salvando…").length).toBeGreaterThan(0);
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

describe("SheetHp · Editar valores no painel", () => {
	const open = () => {
		openPanel();
		fireEvent.click(screen.getByRole("button", { name: "Editar valores" }));
	};
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

/** PV controlado, como a mesa: a gravação muda as props. */
function Harness({
	initial,
	canTemp = true,
	onChange,
	onChangeTempHp,
}: {
	initial: { current: number; max: number; temp: number };
	canTemp?: boolean;
	onChange: (next: number) => unknown;
	onChangeTempHp?: (next: number) => unknown;
}) {
	const [hp, setHp] = useState(initial);
	return (
		<SheetHp
			current={hp.current}
			max={hp.max}
			temp={hp.temp}
			showMax
			name="Elara"
			onChange={async (next) => {
				const result = await onChange(next);
				if (result !== false) setHp((prev) => ({ ...prev, current: next }));
				return result;
			}}
			onChangeTempHp={
				canTemp
					? async (next) => {
							await onChangeTempHp?.(next);
							setHp((prev) => ({ ...prev, temp: next }));
						}
					: undefined
			}
		/>
	);
}

describe("SheetHp · dano rápido (campo)", () => {
	const field = () =>
		screen.getByRole("textbox", { name: /Dano, cura/ }) as HTMLInputElement;
	const typeValue = (value: string) =>
		fireEvent.change(field(), { target: { value } });
	const enter = (shiftKey = false) =>
		fireEvent.keyDown(field(), { key: "Enter", shiftKey });

	it("“15” + Enter define o PV, com prévia “Definir 15”", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 27, max: 32, temp: 5 }}
				onChange={onChange}
			/>,
		);
		openPanel();
		typeValue("15");
		expect(screen.getByText(/Definir 15/)).toBeTruthy();
		enter();
		await act(async () => {});
		expect(onChange).toHaveBeenCalledWith(15);
	});

	it("“=15” é sinônimo de definir", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 27, max: 32, temp: 0 }}
				onChange={onChange}
			/>,
		);
		openPanel();
		typeValue("=15");
		enter();
		await act(async () => {});
		expect(onChange).toHaveBeenCalledWith(15);
	});

	it("mestre: −15 come a temporária e depois o PV", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		const onChangeTempHp = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 27, max: 32, temp: 5 }}
				onChange={onChange}
				onChangeTempHp={onChangeTempHp}
			/>,
		);
		openPanel();
		typeValue("-15");
		enter();
		await act(async () => {});
		expect(onChangeTempHp).toHaveBeenCalledWith(0);
		expect(onChange).toHaveBeenCalledWith(17);
	});

	it("jogador: aviso da temporária e o dano vai direto no PV", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 27, max: 32, temp: 5 }}
				canTemp={false}
				onChange={onChange}
			/>,
		);
		openPanel();
		expect(screen.getByText(/só o mestre muda/)).toBeTruthy();
		expect(screen.queryByText("Vida temporária")).toBeNull();
		typeValue("15");
		press("Aplicar 15 de dano");
		await act(async () => {});
		expect(onChange).toHaveBeenCalledWith(12);
	});

	it("Shift+Enter e + Curar curam pelo valor", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 10, max: 32, temp: 0 }}
				onChange={onChange}
			/>,
		);
		openPanel();
		typeValue("8");
		enter(true);
		await act(async () => {});
		expect(onChange).toHaveBeenLastCalledWith(18);
		typeValue("5");
		press("Curar 5");
		await act(async () => {});
		expect(onChange).toHaveBeenLastCalledWith(23);
	});

	it("0 não grava; inválido marca aria-invalid e desliga os botões", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 10, max: 32, temp: 0 }}
				onChange={onChange}
			/>,
		);
		openPanel();
		typeValue("0");
		enter();
		await act(async () => {});
		expect(onChange).not.toHaveBeenCalled();
		typeValue("1d6");
		expect(field().getAttribute("aria-invalid")).toBe("true");
		expect(
			(screen.getByRole("button", { name: "Dano" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("cura no máximo fica desligada", () => {
		render(
			<Harness
				initial={{ current: 32, max: 32, temp: 0 }}
				onChange={vi.fn()}
			/>,
		);
		openPanel();
		typeValue("+5");
		expect(screen.getByText(/Já está no máximo/)).toBeTruthy();
		expect(
			(screen.getByRole("button", { name: "Curar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("Desfazer volta o PV se ninguém mexeu depois", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 27, max: 32, temp: 0 }}
				onChange={onChange}
			/>,
		);
		openPanel();
		typeValue("-15");
		enter();
		await act(async () => {});
		expect(onChange).toHaveBeenLastCalledWith(12);
		press("Desfazer");
		await act(async () => {});
		expect(onChange).toHaveBeenLastCalledWith(27);
	});

	it("Desfazer não grava se o PV mudou depois", async () => {
		const onChange = vi.fn().mockResolvedValue(true);
		render(
			<Harness
				initial={{ current: 27, max: 32, temp: 0 }}
				onChange={onChange}
			/>,
		);
		openPanel();
		typeValue("-15");
		enter();
		await act(async () => {});
		press("Tirar 1 PV");
		await act(async () => {});
		press("Desfazer");
		await act(async () => {});
		// O desfazer vale para o último ajuste (−1): volta a 12.
		expect(onChange).toHaveBeenLastCalledWith(12);
		cleanup();
		const stale = vi.fn().mockResolvedValue(true);
		const { rerender } = render(
			<SheetHp current={27} max={32} temp={0} showMax onChange={stale} />,
		);
		openPanel();
		fireEvent.change(field(), { target: { value: "-15" } });
		enter();
		await act(async () => {});
		// Outro cliente mudou o PV para 20 (não é o 12 que o ajuste deixou).
		rerender(
			<SheetHp current={20} max={32} temp={0} showMax onChange={stale} />,
		);
		press("Desfazer");
		await act(async () => {});
		expect(stale).toHaveBeenCalledTimes(1);
		expect(
			screen.getByText("O PV mudou depois; nada foi desfeito."),
		).toBeTruthy();
	});

	it("falha: o texto fica, aparece Tentar de novo e ele regrava", async () => {
		const onChange = vi
			.fn()
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		render(
			<Harness
				initial={{ current: 27, max: 32, temp: 0 }}
				onChange={onChange}
			/>,
		);
		openPanel();
		typeValue("-15");
		enter();
		await act(async () => {});
		expect(screen.getByRole("alert").textContent).toContain("Não foi salvo");
		expect(field().value).toBe("-15");
		press("Tentar de novo");
		await act(async () => {});
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange).toHaveBeenLastCalledWith(12);
	});
});
