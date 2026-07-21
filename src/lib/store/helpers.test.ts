import { describe, expect, it } from "vitest";
import { remoteErrorMessage } from "./helpers";

describe("remoteErrorMessage", () => {
	it("extracts message from Postgrest-like plain objects (not Error instances)", () => {
		const postgrestError = {
			message: "new row violates row-level security policy",
			code: "42501",
			details: null,
			hint: null,
		};

		// Regression: String(postgrestError) === "[object Object]" — that must never reach the UI
		expect(String(postgrestError)).toBe("[object Object]");
		expect(remoteErrorMessage(postgrestError)).toBe(
			"new row violates row-level security policy — [42501]",
		);
		expect(remoteErrorMessage(postgrestError)).not.toContain("[object Object]");
	});

	it("includes details and hint when present", () => {
		expect(
			remoteErrorMessage({
				message: "duplicate key value violates unique constraint",
				code: "23505",
				details: "Key (campaign_id, user_id)=(…)=(…) already exists.",
				hint: "Check membership uniqueness",
			}),
		).toBe(
			"duplicate key value violates unique constraint — [23505] — Key (campaign_id, user_id)=(…)=(…) already exists. — hint: Check membership uniqueness",
		);
	});

	it("returns Error.message for real Error instances", () => {
		expect(remoteErrorMessage(new Error("usuário não autenticado"))).toBe(
			"usuário não autenticado",
		);
	});

	it("keeps step context from wrapped Errors", () => {
		const wrapped = new Error(
			"falha ao criar membership do owner: new row violates row-level security policy — [42501]",
		);
		expect(remoteErrorMessage(wrapped)).toBe(
			"falha ao criar membership do owner: new row violates row-level security policy — [42501]",
		);
	});

	it("JSON-stringifies plain objects without message instead of [object Object]", () => {
		expect(remoteErrorMessage({ code: "42501", status: 403 })).toBe(
			'{"code":"42501","status":403}',
		);
	});

	it("falls back when the value is empty or unreadable", () => {
		expect(remoteErrorMessage({})).toBe("Falha ao sincronizar com o Supabase.");
		expect(remoteErrorMessage(null)).toBe(
			"Falha ao sincronizar com o Supabase.",
		);
	});
});
