// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import {
	changedResources,
	saveCharacterResources,
} from "./character-resources";

const base = {
	id: "c1",
	system: "dnd5e",
	characterName: "Dante",
	deathSaves: { successes: 0, failures: 0 },
	tableResources: {
		inspiration: 0,
		fate: 2,
		fateTotal: 3,
		divine: 0,
		divineTotal: 1,
		bonusDice: [],
	},
} as unknown as Character;

const slots = { slots: { "1": { total: 4, used: 1 } } };
const get = () => useRPGStore.getState().characters[0] as Character;

beforeEach(() => {
	useRPGStore.setState({ characters: [structuredClone(base)] });
});

describe("changedResources · só o que mudou", () => {
	it("tira o que já estava igual", () => {
		expect(
			changedResources(base, {
				deathSaves: { successes: 0, failures: 0 },
				hitDiceUsed: 0,
				inspiration: 0,
			}),
		).toEqual({});
	});

	it("mantém o que mudou", () => {
		expect(
			changedResources(base, { spellSlotsState: slots, inspiration: 1 }),
		).toEqual({ spellSlotsState: slots, inspiration: 1 });
	});
});

describe("jogador: função do banco", () => {
	it("manda só o que mudou e a tela muda na hora", async () => {
		let during: unknown;
		const rpc = vi.fn(async () => {
			during = get().spellSlotsState;
			return {};
		});
		const r = await saveCharacterResources({
			characterId: "c1",
			isStaff: false,
			changes: { spellSlotsState: slots, hitDiceUsed: 0 },
			rpc,
		});
		expect(r).toEqual({ ok: true });
		expect(rpc).toHaveBeenCalledWith({
			p_character_id: "c1",
			p_changes: { spellSlotsState: slots },
		});
		expect(during).toEqual(slots); // otimista: já estava na tela durante a chamada
		expect(get().spellSlotsState).toEqual(slots);
	});

	it("inspiração mexe só na inspiração e preserva o resto dos recursos", async () => {
		const rpc = vi.fn(async () => ({}));
		await saveCharacterResources({
			characterId: "c1",
			isStaff: false,
			changes: { inspiration: 2 },
			rpc,
		});
		const tr = get().tableResources;
		expect(tr?.inspiration).toBe(2);
		expect(tr?.fate).toBe(2);
		expect(tr?.fateTotal).toBe(3);
		expect(rpc).toHaveBeenCalledWith({
			p_character_id: "c1",
			p_changes: { inspiration: 2 },
		});
	});

	it("nada mudou: não chama o servidor", async () => {
		const rpc = vi.fn();
		const r = await saveCharacterResources({
			characterId: "c1",
			isStaff: false,
			changes: { deathSaves: { successes: 0, failures: 0 } },
			rpc,
		});
		expect(r).toEqual({ ok: true });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		["42501", "forbidden"],
		["22023", "invalid"],
		["PGRST202", "unavailable"],
		["42883", "unavailable"],
		["offline", "offline"],
		["XX000", "error"],
	])("erro %s volta ao que estava e vira %s", async (code, reason) => {
		const rpc = vi.fn(async () => {
			throw { code, message: "x" };
		});
		const r = await saveCharacterResources({
			characterId: "c1",
			isStaff: false,
			changes: {
				spellSlotsState: slots,
				deathSaves: { successes: 2, failures: 1 },
			},
			rpc,
		});
		expect(r).toMatchObject({ ok: false, reason });
		expect(get().spellSlotsState).toBeUndefined();
		expect(get().deathSaves).toEqual({ successes: 0, failures: 0 });
	});

	it("falha não desfaz se outra mudança chegou nesse meio tempo", async () => {
		const newer = { slots: { "1": { total: 4, used: 3 } } };
		const rpc = vi.fn(async () => {
			useRPGStore.setState((s) => ({
				characters: s.characters.map((c) => ({ ...c, spellSlotsState: newer })),
			}));
			throw { code: "XX000" };
		});
		await saveCharacterResources({
			characterId: "c1",
			isStaff: false,
			changes: { spellSlotsState: slots },
			rpc,
		});
		expect(get().spellSlotsState).toEqual(newer);
	});

	it("ficha que não existe", async () => {
		const r = await saveCharacterResources({
			characterId: "nao-existe",
			isStaff: false,
			changes: { hitDiceUsed: 3 },
			rpc: vi.fn(),
		});
		expect(r).toMatchObject({ ok: false });
	});
});

describe("mestre e co-mestre: grava pela ficha", () => {
	it("usa o update normal, nunca a função do banco", async () => {
		const rpc = vi.fn();
		const update = vi.fn(async () => {});
		const r = await saveCharacterResources({
			characterId: "c1",
			isStaff: true,
			changes: { hitDiceUsed: 3, inspiration: 1 },
			rpc,
			update,
		});
		expect(r).toEqual({ ok: true });
		expect(rpc).not.toHaveBeenCalled();
		expect(update).toHaveBeenCalledWith(
			"c1",
			expect.objectContaining({ hitDiceUsed: 3 }),
		);
		expect(get().hitDiceUsed).toBe(3);
	});

	it("update que falha volta ao que estava", async () => {
		const update = vi.fn(async () => {
			throw new Error("falhou");
		});
		const r = await saveCharacterResources({
			characterId: "c1",
			isStaff: true,
			changes: { hitDiceUsed: 3 },
			update,
		});
		expect(r).toMatchObject({ ok: false });
		expect(get().hitDiceUsed).toBeUndefined();
	});
});
