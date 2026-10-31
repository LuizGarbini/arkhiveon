// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearAllDrafts,
	clearDraft,
	readDraft,
	writeDraft,
} from "./form-draft";

const key = (formId: string, entityId: string) =>
	`arkhiveon:draft:${formId}:${entityId}`;

afterEach(() => {
	sessionStorage.clear();
	vi.restoreAllMocks();
});

describe("form draft", () => {
	it("grava e lê o envelope v1 na chave do formulário e da entidade", () => {
		const before = Date.now();
		writeDraft("character-name", "thalia", { name: "Lyra" });
		const raw = sessionStorage.getItem(key("character-name", "thalia"));
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "") as {
			v: number;
			savedAt: number;
			values: { name: string };
		};
		expect(parsed.v).toBe(1);
		expect(parsed.values).toEqual({ name: "Lyra" });
		expect(parsed.savedAt).toBeGreaterThanOrEqual(before);
		expect(parsed.savedAt).toBeLessThanOrEqual(Date.now());
		expect(readDraft("character-name", "thalia")).toEqual({ name: "Lyra" });
	});

	it("usa o sufixo novo quando a entidade ainda não existe", () => {
		writeDraft("character-name", null, { name: "" });
		expect(
			sessionStorage.getItem(key("character-name", "novo")),
		).not.toBeNull();
		expect(readDraft("character-name", undefined)).toEqual({ name: "" });
		expect(readDraft("character-name", "")).toEqual({ name: "" });
	});

	it("devolve null se não há rascunho, o JSON é inválido ou o envelope não é v1", () => {
		expect(readDraft("character-name", "thalia")).toBeNull();

		sessionStorage.setItem(key("character-name", "thalia"), "{");
		expect(readDraft("character-name", "thalia")).toBeNull();

		sessionStorage.setItem(
			key("character-name", "thalia"),
			JSON.stringify({ v: 2, savedAt: 1, values: { name: "Lyra" } }),
		);
		expect(readDraft("character-name", "thalia")).toBeNull();

		sessionStorage.setItem(
			key("character-name", "thalia"),
			JSON.stringify({ v: 1, values: { name: "Lyra" } }),
		);
		expect(readDraft("character-name", "thalia")).toBeNull();

		sessionStorage.setItem(
			key("character-name", "thalia"),
			JSON.stringify({ v: 1, savedAt: 1 }),
		);
		expect(readDraft("character-name", "thalia")).toBeNull();
	});

	it("clearDraft apaga só aquela chave e clearAllDrafts apaga o prefixo", () => {
		writeDraft("character-name", "thalia", { name: "Lyra" });
		writeDraft("character-name", "borin", { name: "Borin" });
		writeDraft("outro", null, { name: "X" });
		sessionStorage.setItem("rpg-notes-storage", "fica");

		clearDraft("character-name", "thalia");
		expect(sessionStorage.getItem(key("character-name", "thalia"))).toBeNull();
		expect(readDraft("character-name", "borin")).toEqual({ name: "Borin" });

		clearAllDrafts();
		expect(readDraft("character-name", "borin")).toBeNull();
		expect(readDraft("outro", null)).toBeNull();
		expect(sessionStorage.getItem("rpg-notes-storage")).toBe("fica");
	});

	it("não lança se sessionStorage estiver indisponível ou recusar a escrita", () => {
		const original = Object.getOwnPropertyDescriptor(window, "sessionStorage");
		Object.defineProperty(window, "sessionStorage", {
			configurable: true,
			get() {
				throw new DOMException("blocked");
			},
		});
		try {
			expect(() =>
				writeDraft("character-name", "thalia", { name: "Lyra" }),
			).not.toThrow();
			expect(readDraft("character-name", "thalia")).toBeNull();
			expect(() => clearDraft("character-name", "thalia")).not.toThrow();
			expect(() => clearAllDrafts()).not.toThrow();
		} finally {
			if (original) Object.defineProperty(window, "sessionStorage", original);
		}

		sessionStorage.setItem(key("character-name", "thalia"), "velho");
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("quota");
		});
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(() =>
			writeDraft("character-name", "thalia", { name: "Lyra" }),
		).not.toThrow();
		expect(readDraft("character-name", "thalia")).toBeNull();
		expect(() => clearDraft("character-name", "thalia")).not.toThrow();
		expect(() => clearAllDrafts()).not.toThrow();
	});
});
