import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAutosaver,
	exportFileName,
	formValuesTooLarge,
	type SaveStatus,
	sameFormValues,
	sanitizeFormValues,
	saveStatusLabel,
	valuesToRestore,
} from "./library-forms";

describe("library-forms", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("sanitiza só texto→texto", () => {
		expect(sanitizeFormValues({ a: "1", b: 2, c: null, "": "x" })).toEqual({
			a: "1",
		});
		expect(sanitizeFormValues(["x"])).toEqual({});
		expect(sanitizeFormValues(null)).toEqual({});
	});

	it("restaura só o que difere do PDF (não marca caixa vazia)", () => {
		expect(
			valuesToRestore(
				{ nome: "Elbereth", caixa: "", marcada: "Yes", sumiu: "x" },
				{ nome: "", caixa: "", marcada: "" },
			),
		).toEqual({ nome: "Elbereth", marcada: "Yes" });
	});

	it("compara valores", () => {
		expect(sameFormValues({ a: "1" }, { a: "1" })).toBe(true);
		expect(sameFormValues({ a: "1" }, { a: "2" })).toBe(false);
		expect(sameFormValues({ a: "1" }, { a: "1", b: "" })).toBe(false);
	});

	it("rótulos e limites", () => {
		expect(saveStatusLabel("saving")).toBe("Salvando…");
		expect(saveStatusLabel("saved")).toBe("✓ Salvo");
		expect(formValuesTooLarge({ a: "x".repeat(250_000) })).toBe(true);
		expect(exportFileName('Ficha: "Elbereth"/v2')).toBe(
			"Ficha Elbereth v2 (preenchido).pdf",
		);
	});

	it("autosave salva só a última versão depois da pausa", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const statuses: SaveStatus[] = [];
		const saver = createAutosaver({
			save,
			onStatus: (s) => statuses.push(s),
			delayMs: 100,
		});
		saver.schedule({ a: "1" });
		saver.schedule({ a: "12" });
		await vi.advanceTimersByTimeAsync(150);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith({ a: "12" });
		expect(statuses.at(-1)).toBe("saved");
	});

	it("não salva o que já estava salvo", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const saver = createAutosaver({ save, onStatus: () => {}, delayMs: 10 });
		saver.markSaved({ a: "1" });
		saver.schedule({ a: "1" });
		await vi.advanceTimersByTimeAsync(20);
		expect(save).not.toHaveBeenCalled();
	});

	it("erro mostra estado e tenta de novo", async () => {
		const save = vi
			.fn()
			.mockRejectedValueOnce(new Error("x"))
			.mockResolvedValue(undefined);
		const statuses: SaveStatus[] = [];
		const saver = createAutosaver({
			save,
			onStatus: (s) => statuses.push(s),
			delayMs: 10,
			retryMs: 50,
		});
		saver.schedule({ a: "1" });
		await vi.advanceTimersByTimeAsync(20);
		expect(statuses).toContain("error");
		await vi.advanceTimersByTimeAsync(60);
		expect(save).toHaveBeenCalledTimes(2);
		expect(statuses.at(-1)).toBe("saved");
	});

	it("flush salva na hora", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const saver = createAutosaver({
			save,
			onStatus: () => {},
			delayMs: 10_000,
		});
		saver.schedule({ a: "1" });
		await saver.flush();
		expect(save).toHaveBeenCalledWith({ a: "1" });
	});
});
