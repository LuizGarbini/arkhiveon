// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showToast, ToastProvider } from "./toast";

beforeEach(() => {
	vi.useFakeTimers();
	render(
		<ToastProvider>
			<div />
		</ToastProvider>,
	);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("showToast", () => {
	it("toast sem ação some sozinho no tempo de sempre", () => {
		act(() => showToast("success", { title: "Salvo" }));
		expect(screen.queryByText("Salvo")).not.toBeNull();
		act(() => vi.advanceTimersByTime(4500 + 300));
		expect(screen.queryByText("Salvo")).toBeNull();
	});

	it("toast com 'Tentar de novo' não some sozinho; clicar executa e fecha", () => {
		const retry = vi.fn();
		act(() =>
			showToast("error", {
				title: "A ficha não foi salva.",
				action: { label: "Tentar de novo", onClick: retry },
			}),
		);
		act(() => vi.advanceTimersByTime(10 * 60_000));
		const button = screen.getByRole("button", { name: "Tentar de novo" });
		fireEvent.click(button);
		expect(retry).toHaveBeenCalledTimes(1);
		act(() => vi.advanceTimersByTime(300));
		expect(screen.queryByText("A ficha não foi salva.")).toBeNull();
	});
});
