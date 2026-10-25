// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import {
	characterSheetOwnsHp,
	commitCharacterHp,
	readLinkedSheetHp,
	resolveTokenHp,
	saveLinkedCharacterHp,
	selectLinkedSheetHpStamp,
	selectSheetHealth,
	selectSheetHealthMax,
	toCharacterHpSaveError,
	tokenHpInsert,
} from "./character-hp";

const characters = [
	{ id: "lyra", system: "dnd5e", health: 33, healthMax: 38 },
	{ id: "agente", system: "ordem", health: 40, healthMax: 40 },
];

const previousCharacters = useRPGStore.getState().characters;

afterEach(() => {
	cleanup();
	useRPGStore.setState({ characters: previousCharacters });
});

describe("selectSheetHealth", () => {
	it("returns the linked sheet's current HP as a stable primitive", () => {
		const first = selectSheetHealth({ characters }, "lyra");
		const again = selectSheetHealth(
			{
				characters: characters.map((character) => ({ ...character })),
			},
			"lyra",
		);
		expect(first).toBe(33);
		expect(Object.is(first, again)).toBe(true);
		expect(selectSheetHealthMax({ characters }, "lyra")).toBe(38);
	});

	it("changes the canvas stamp only when linked sheet HP changes", () => {
		const ids = "lyra|agente";
		const before = selectLinkedSheetHpStamp(characters, ids);
		const same = selectLinkedSheetHpStamp(
			characters.map((character) => ({ ...character })),
			ids,
		);
		const after = selectLinkedSheetHpStamp(
			characters.map((character) =>
				character.id === "lyra" ? { ...character, health: 28 } : character,
			),
			ids,
		);
		expect(before).toBe(same);
		expect(after).not.toBe(before);
		expect(after).toContain("28");
		expect(after).not.toContain("agente");
		expect(readLinkedSheetHp(before, "lyra")).toEqual({
			health: 33,
			healthMax: 38,
		});
		expect(readLinkedSheetHp(before, "agente")).toBeUndefined();
	});

	it("ignores Ordem/CRIS and a token with no sheet", () => {
		expect(characterSheetOwnsHp(characters[1])).toBe(false);
		expect(selectSheetHealth({ characters }, "agente")).toBeUndefined();
		expect(selectSheetHealth({ characters }, null)).toBeUndefined();
		expect(selectSheetHealth({ characters }, "missing")).toBeUndefined();
	});
});

describe("resolveTokenHp", () => {
	it("prefers the sheet over the token copy", () => {
		expect(
			resolveTokenHp({
				tokenHpCurrent: 1,
				tokenHpMax: 2,
				sheetHealth: 33,
				sheetHealthMax: 38,
			}),
		).toEqual({ current: 33, max: 38, fromSheet: true });
	});

	it("keeps token hp when there is no sheet HP", () => {
		expect(
			resolveTokenHp({
				tokenHpCurrent: 7,
				tokenHpMax: 10,
				sheetHealth: undefined,
				sheetHealthMax: undefined,
				characterHealth: 33,
				characterHealthMax: 38,
			}),
		).toEqual({ current: 7, max: 10, fromSheet: false });
		expect(
			resolveTokenHp({
				tokenHpCurrent: null,
				tokenHpMax: null,
				sheetHealth: undefined,
				sheetHealthMax: undefined,
				characterHealth: 12,
				characterHealthMax: 20,
			}),
		).toEqual({ current: 12, max: 20, fromSheet: false });
	});
});

describe("tokenHpInsert", () => {
	it("stores null HP when the sheet owns it", () => {
		expect(
			tokenHpInsert({
				characterId: "lyra",
				sheetOwnsHp: true,
				hpCurrent: 33,
				hpMax: 38,
			}),
		).toEqual({ hp_current: null, hp_max: null });
	});

	it("keeps token HP for Ordem and for tokens without a sheet", () => {
		expect(
			tokenHpInsert({
				characterId: "agente",
				sheetOwnsHp: false,
				hpCurrent: 12,
				hpMax: 20,
			}),
		).toEqual({ hp_current: 12, hp_max: 20 });
		expect(
			tokenHpInsert({
				characterId: null,
				sheetOwnsHp: false,
				hpCurrent: undefined,
				hpMax: undefined,
			}),
		).toEqual({ hp_current: 20, hp_max: 20 });
	});
});

describe("commitCharacterHp", () => {
	it("shows the HP returned by the RPC, already clamped", async () => {
		let stored = { health: 33, healthMax: 38 };
		const ok = await commitCharacterHp({
			characterId: "lyra",
			current: 50,
			canEditMax: true,
			previous: stored,
			read: () => stored,
			write: (next) => {
				stored = next;
			},
			rpc: async (args) => {
				expect(args).toEqual({
					p_character_id: "lyra",
					p_current: 50,
				});
				return { health: 38, healthMax: 38 };
			},
			onError: () => {
				throw new Error("should not toast");
			},
		});
		expect(ok).toBe(true);
		expect(stored).toEqual({ health: 38, healthMax: 38 });
	});

	it("sends p_max when the GM changes the maximum", async () => {
		let stored = { health: 33, healthMax: 38 };
		const seen: unknown[] = [];
		await commitCharacterHp({
			characterId: "lyra",
			current: 30,
			max: 40,
			canEditMax: true,
			previous: stored,
			read: () => stored,
			write: (next) => {
				stored = next;
			},
			rpc: async (args) => {
				seen.push(args);
				return { health: 30, healthMax: 40 };
			},
			onError: () => {
				throw new Error("should not toast");
			},
		});
		expect(seen).toEqual([
			{ p_character_id: "lyra", p_current: 30, p_max: 40 },
		]);
		expect(stored).toEqual({ health: 30, healthMax: 40 });
	});

	it("reverts and keeps 42501 apart from other failures", async () => {
		let stored = { health: 33, healthMax: 38 };
		const codes: Array<string | null> = [];
		const ok = await commitCharacterHp({
			characterId: "lyra",
			current: 28,
			canEditMax: false,
			previous: { health: 33, healthMax: 38 },
			read: () => stored,
			write: (next) => {
				stored = next;
			},
			rpc: async () => {
				throw toCharacterHpSaveError({
					message: "Você não pode alterar os PV desta ficha.",
					code: "42501",
				});
			},
			onError: (error) => {
				codes.push(error.code);
			},
		});
		expect(ok).toBe(false);
		expect(stored).toEqual({ health: 33, healthMax: 38 });
		expect(codes).toEqual(["42501"]);
		expect(
			toCharacterHpSaveError(new Error("Failed to fetch")).code,
		).toBeNull();
	});

	it("never sends p_max for a player", async () => {
		let stored = { health: 33, healthMax: 38 };
		const seen: unknown[] = [];
		await commitCharacterHp({
			characterId: "lyra",
			current: 28,
			max: 99,
			canEditMax: false,
			previous: { health: 33, healthMax: 38 },
			read: () => stored,
			write: (next) => {
				stored = next;
			},
			rpc: async (args) => {
				seen.push(args);
				return { health: 28, healthMax: 38 };
			},
			onError: () => {
				throw new Error("should not toast");
			},
		});
		expect(seen).toEqual([{ p_character_id: "lyra", p_current: 28 }]);
		expect(seen[0]).not.toHaveProperty("p_max");
		expect(stored.healthMax).toBe(38);
	});
});

describe("saveLinkedCharacterHp", () => {
	it("network failure offers retry of the same save and hides the raw error", async () => {
		useRPGStore.setState({
			characters: [
				{
					id: "lyra",
					system: "dnd5e",
					health: 33,
					healthMax: 38,
				} as Character,
			],
		});
		render(createElement(ToastProvider, null, createElement("div")));
		let calls = 0;
		await act(async () => {
			await saveLinkedCharacterHp({
				characterId: "lyra",
				current: 28,
				canEditMax: false,
				rpc: async (args) => {
					calls += 1;
					expect(args).toEqual({ p_character_id: "lyra", p_current: 28 });
					if (calls === 1) throw new Error("Failed to fetch");
					return { health: 28, healthMax: 38 };
				},
			});
		});
		expect(calls).toBe(1);
		expect(useRPGStore.getState().characters[0]?.health).toBe(33);
		expect(document.body.textContent).toContain(
			"Não foi possível salvar os PV",
		);
		expect(document.body.textContent).not.toContain("Failed to fetch");
		expect(document.body.textContent).not.toContain(
			"Você não pode alterar os PV desta ficha.",
		);
		await act(async () => {
			screen.getByRole("button", { name: "Tentar de novo" }).click();
		});
		await waitFor(() => {
			expect(useRPGStore.getState().characters[0]?.health).toBe(28);
		});
		expect(calls).toBe(2);
	});

	it("shows a permission message only for error 42501", async () => {
		useRPGStore.setState({
			characters: [
				{
					id: "lyra",
					system: "dnd5e",
					health: 33,
					healthMax: 38,
				} as Character,
			],
		});
		render(createElement(ToastProvider, null, createElement("div")));
		await act(async () => {
			await saveLinkedCharacterHp({
				characterId: "lyra",
				current: 28,
				canEditMax: false,
				rpc: async () => {
					throw toCharacterHpSaveError({
						message: "Você não pode alterar os PV desta ficha.",
						code: "42501",
					});
				},
			});
		});
		expect(document.body.textContent).toContain(
			"Você não pode alterar os PV desta ficha.",
		);
		expect(document.body.textContent).not.toContain(
			"Não foi possível salvar os PV",
		);
		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
		expect(useRPGStore.getState().characters[0]?.health).toBe(33);
	});
});
