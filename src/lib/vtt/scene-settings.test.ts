import { describe, expect, it } from "vitest";
import { sceneSaveSucceeded, sceneSettingsPatchToDb } from "./scene-settings";

describe("sceneSaveSucceeded", () => {
	it("confirma quando o banco devolve a linha", () => {
		expect(sceneSaveSucceeded({ data: [{ id: "s1" }], error: null })).toBe(
			true,
		);
	});
	it("trata 0 linhas (RLS bloqueou) como falha", () => {
		expect(sceneSaveSucceeded({ data: [], error: null })).toBe(false);
		expect(sceneSaveSucceeded({ data: null, error: null })).toBe(false);
	});
	it("trata erro do banco como falha", () => {
		expect(sceneSaveSucceeded({ data: null, error: { message: "x" } })).toBe(
			false,
		);
	});
	it("manda só as colunas do patch", () => {
		expect(sceneSettingsPatchToDb({ gridSize: 70 })).toEqual({ grid_size: 70 });
	});
});
