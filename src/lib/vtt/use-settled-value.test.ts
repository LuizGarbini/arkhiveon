// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSettledValue } from "./use-settled-value";

describe("useSettledValue", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("começa no valor inicial e só assenta depois do atraso", () => {
		const { result, rerender } = renderHook(
			({ value }) => useSettledValue(value, 120),
			{ initialProps: { value: "a" } },
		);
		expect(result.current).toBe("a");
		rerender({ value: "b" });
		expect(result.current).toBe("a");
		act(() => {
			vi.advanceTimersByTime(119);
		});
		expect(result.current).toBe("a");
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toBe("b");
	});

	it("uma rajada de mudanças assenta UMA vez, no último valor", () => {
		const seen: string[] = [];
		const { result, rerender } = renderHook(
			({ value }) => {
				const settled = useSettledValue(value, 120);
				seen.push(settled);
				return settled;
			},
			{ initialProps: { value: "v0" } },
		);
		for (let i = 1; i <= 20; i++) {
			rerender({ value: `v${i}` });
			act(() => {
				vi.advanceTimersByTime(45);
			});
		}
		expect(result.current).toBe("v0");
		act(() => {
			vi.advanceTimersByTime(120);
		});
		expect(result.current).toBe("v20");
		expect(new Set(seen)).toEqual(new Set(["v0", "v20"]));
	});

	it("voltar ao valor já assentado cancela a atualização pendente", () => {
		const { result, rerender } = renderHook(
			({ value }) => useSettledValue(value, 120),
			{ initialProps: { value: "a" } },
		);
		rerender({ value: "b" });
		rerender({ value: "a" });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(result.current).toBe("a");
	});
});
