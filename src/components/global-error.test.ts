import { describe, expect, it } from "vitest";
import { getErrorDetails } from "./global-error";

describe("getErrorDetails", () => {
	it("uses the default copy for an Error with an empty message", () => {
		const details = getErrorDetails(new Error(""));

		expect(details.title).toBe("Algo quebrou no Arkhiveon");
		expect(details.message).toContain("Não foi possível carregar");
	});

	it("normalizes string errors", () => {
		const details = getErrorDetails("  erro lançado como texto  ");

		expect(details.message).toBe("erro lançado como texto");
	});

	it("extracts messages from object errors", () => {
		const details = getErrorDetails({
			code: "SYNC_FAILED",
			message: "Falha de sincronização",
		});

		expect(details.message).toBe("Falha de sincronização");
	});

	it("falls back to the object code when there is no message", () => {
		const details = getErrorDetails({ code: "PREVIEW_OBJECT_ERROR" });

		expect(details.message).toBe(
			"A falha retornou o código PREVIEW_OBJECT_ERROR.",
		);
	});

	it("keeps aggregate errors readable", () => {
		const details = getErrorDetails(
			new AggregateError([new Error("Falha interna")]),
		);

		expect(details.message).toBe("Falha interna");
	});
});
