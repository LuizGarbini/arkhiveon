// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VttHpAdjust } from "./vtt-hp-adjust";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function renderAdjust(
	onChange: (next: number) => Promise<unknown> | unknown = () => undefined,
) {
	render(
		<VttHpAdjust
			hpCurrent={33}
			hpMax={38}
			showMax={false}
			onChange={onChange}
		/>,
	);
}

describe("VttHpAdjust — Salvando", () => {
	it("reserva a faixa de 18px e não move a linha de PV", async () => {
		let resolveSave: (value: boolean) => void = () => {};
		renderAdjust(
			() =>
				new Promise<boolean>((resolve) => {
					resolveSave = resolve;
				}),
		);
		const slot = screen.getByTestId("vtt-hp-saving");
		const row = screen.getByText("Pontos de vida").parentElement;
		const topBefore = row?.offsetTop ?? -1;
		expect(slot.textContent).toBe("Salvando…");
		expect(slot.classList.contains("h-[18px]")).toBe(true);
		expect(slot.classList.contains("opacity-0")).toBe(true);
		expect(slot.getAttribute("aria-hidden")).toBe("true");
		expect(slot.nextElementSibling).toBe(row);

		fireEvent.click(screen.getByRole("button", { name: "-5" }));

		expect(slot.classList.contains("h-[18px]")).toBe(true);
		expect(slot.classList.contains("opacity-0")).toBe(false);
		expect(slot.classList.contains("opacity-100")).toBe(true);
		expect(slot.getAttribute("aria-hidden")).toBeNull();
		expect(slot.nextElementSibling).toBe(row);
		expect(row?.offsetTop).toBe(topBefore);

		await act(async () => {
			resolveSave(true);
			await Promise.resolve();
		});

		expect(slot.classList.contains("opacity-0")).toBe(true);
		expect(slot.classList.contains("h-[18px]")).toBe(true);
		expect(row?.offsetTop).toBe(topBefore);
	});
});

describe("VttHpAdjust — foco depois da gravação", () => {
	async function settleFailedSave(result: false | Error) {
		const blurred: HTMLElement[] = [];
		const original = HTMLElement.prototype.blur;
		vi.spyOn(HTMLElement.prototype, "blur").mockImplementation(function (
			this: HTMLElement,
		) {
			blurred.push(this);
			original.call(this);
		});
		let settle: (value: boolean) => void = () => {};
		let fail: (error: Error) => void = () => {};
		renderAdjust(() => {
			screen.getByRole("button", { name: "-5" }).focus();
			return new Promise<boolean>((resolve, reject) => {
				settle = resolve;
				fail = reject;
			});
		});
		const button = screen.getByRole("button", { name: "-5" });
		fireEvent.click(button);
		const blurredOnClick = blurred.filter((node) => node === button).length;
		expect(blurredOnClick).toBeGreaterThan(0);

		await act(async () => {
			if (result instanceof Error) fail(result);
			else settle(result);
			await Promise.resolve();
		});

		expect(blurred.filter((node) => node === button).length).toBeGreaterThan(
			blurredOnClick,
		);
		expect(document.activeElement).not.toBe(button);
		expect(button.matches(":focus")).toBe(false);
		expect(button.getAttribute("aria-pressed")).toBeNull();
		expect((button as HTMLButtonElement).disabled).toBe(false);
	}

	it("depois de um erro o botão −5 não continua focado", async () => {
		await settleFailedSave(new Error("rede"));
	});

	it("depois de uma reversão o botão −5 não continua focado", async () => {
		await settleFailedSave(false);
	});
});
