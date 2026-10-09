import { describe, expect, it } from "vitest";
import { resolveSheetHealth } from "./helpers";

const empty = Number.NaN;

describe("resolveSheetHealth (criação pelo assistente)", () => {
	it("keeps a typed max HP and starts the character at full HP", () => {
		expect(resolveSheetHealth({ health: empty, healthMax: 12 })).toEqual({
			health: 12,
			healthMax: 12,
		});
	});

	it("keeps both values when both were typed", () => {
		expect(resolveSheetHealth({ health: 7, healthMax: 12 })).toEqual({
			health: 7,
			healthMax: 12,
		});
		expect(resolveSheetHealth({ health: 0, healthMax: 12 })).toEqual({
			health: 0,
			healthMax: 12,
		});
	});

	it("uses the typed current HP as max when only it was filled", () => {
		expect(resolveSheetHealth({ health: 9, healthMax: empty })).toEqual({
			health: 9,
			healthMax: 9,
		});
	});

	it("never stores max HP 0 when both fields were left empty", () => {
		expect(resolveSheetHealth({ health: empty, healthMax: empty })).toEqual({
			health: 10,
			healthMax: 10,
		});
		expect(
			resolveSheetHealth({ health: undefined, healthMax: undefined }),
		).toEqual({ health: 10, healthMax: 10 });
	});
});

describe("resolveSheetHealth (edição de ficha existente)", () => {
	it("gives full HP to a sheet that never had max HP (0/0) when it gets one", () => {
		expect(
			resolveSheetHealth(
				{ health: 0, healthMax: 12 },
				{ health: 0, healthMax: 0 },
			),
		).toEqual({ health: 12, healthMax: 12 });
	});

	it("keeps an existing current HP, including 0 on a sheet that had a max", () => {
		expect(
			resolveSheetHealth(
				{ health: 0, healthMax: 20 },
				{ health: 0, healthMax: 12 },
			),
		).toEqual({ health: 0, healthMax: 20 });
		expect(
			resolveSheetHealth(
				{ health: 5, healthMax: 12 },
				{ health: 0, healthMax: 0 },
			),
		).toEqual({ health: 5, healthMax: 12 });
	});

	it("leaves an untouched 0/0 sheet as it is", () => {
		expect(
			resolveSheetHealth(
				{ health: 0, healthMax: 0 },
				{ health: 0, healthMax: 0 },
			),
		).toEqual({ health: 0, healthMax: 0 });
	});
});
