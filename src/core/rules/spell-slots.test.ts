import { describe, expect, it } from "vitest";
import {
	hasSpellSlots,
	hitDiceTotal,
	longRestHitDiceUsed,
	longRestSlots,
	normalizeSpellSlots,
	parseSpellSlotsText,
	pickSlotFor,
	restoreSlot,
	shortRestSlots,
	spellSlotsOf,
	spendSlot,
} from "./spell-slots";

describe("parseSpellSlotsText · o texto que as fichas já têm", () => {
	it.each([
		["Nv1: 4 / Nv2: 3", { 1: 4, 2: 3 }],
		["1º: 4, 2º: 3, 3º: 2", { 1: 4, 2: 3, 3: 2 }],
		["Nível 1: 4; Nível 2: 3", { 1: 4, 2: 3 }],
		["nv1=4 nv2=3", { 1: 4, 2: 3 }],
		["1: 4 | 2: 3", { 1: 4, 2: 3 }],
		["Nv 1: 4  /  Nv 5: 1", { 1: 4, 5: 1 }],
	])("%s", (text, totals) => {
		const state = parseSpellSlotsText(text);
		const got = Object.fromEntries(
			Object.entries(state.slots).map(([k, v]) => [k, v.total]),
		);
		expect(got).toEqual(totals);
		for (const v of Object.values(state.slots)) expect(v.used).toBe(0);
	});

	it('"3/4" significa restam 3 de 4 (1 gasto)', () => {
		expect(parseSpellSlotsText("Nv1: 3/4").slots["1"]).toEqual({
			total: 4,
			used: 1,
		});
	});

	it("Pacto vira espaços de Pacto, não de um nível comum", () => {
		const s = parseSpellSlotsText("Pacto nv5: 3");
		expect(s.pact).toEqual({ level: 5, total: 3, used: 0 });
		expect(s.slots).toEqual({});
	});

	it("texto vazio, só lixo ou sem número não inventa espaços", () => {
		for (const t of ["", "   ", "nenhum", "sem magia", undefined]) {
			expect(hasSpellSlots(parseSpellSlotsText(t))).toBe(false);
		}
	});

	it("limita absurdos (nível 0 e 10 não existem; total vai a no máximo 20)", () => {
		const s = parseSpellSlotsText("Nv0: 3, Nv1: 99");
		expect(s.slots["0"]).toBeUndefined();
		expect(s.slots["1"]?.total).toBe(20);
	});
});

describe("spellSlotsOf", () => {
	it("usa o contador estruturado quando existe, ignorando o texto", () => {
		const s = spellSlotsOf({
			spellSlots: "Nv1: 9",
			spellSlotsState: { slots: { "1": { total: 4, used: 1 } } },
		});
		expect(s.slots["1"]).toEqual({ total: 4, used: 1 });
	});

	it("sem contador, lê o texto", () => {
		expect(spellSlotsOf({ spellSlots: "Nv2: 3" }).slots["2"]?.total).toBe(3);
	});

	it("bruxo com um nível só no texto: são os espaços de Pacto", () => {
		const s = spellSlotsOf({ spellSlots: "Nv5: 3", class: "Bruxo" });
		expect(s.pact).toEqual({ level: 5, total: 3, used: 0 });
		expect(s.slots).toEqual({});
	});

	it("outra classe com um nível só continua nível comum", () => {
		const s = spellSlotsOf({ spellSlots: "Nv1: 2", class: "Mago" });
		expect(s.slots["1"]?.total).toBe(2);
		expect(s.pact).toBeUndefined();
	});
});

describe("normalizeSpellSlots · dado vindo de fora", () => {
	it("corrige gasto maior que o total, negativos e lixo", () => {
		const s = normalizeSpellSlots({
			slots: {
				"1": { total: 4, used: 9 },
				"2": { total: -3, used: 1 },
				"3": { total: Number.NaN, used: 0 },
				"4": { total: 2, used: -5 },
			},
		});
		expect(s.slots).toEqual({
			"1": { total: 4, used: 4 },
			"4": { total: 2, used: 0 },
		});
	});

	it("ignora níveis fora de 1 a 9", () => {
		const s = normalizeSpellSlots({
			slots: { "0": { total: 2, used: 0 }, "10": { total: 2, used: 0 } },
		});
		expect(s.slots).toEqual({});
	});
});

describe("gastar e devolver", () => {
	const base = {
		slots: { "1": { total: 2, used: 0 }, "2": { total: 1, used: 1 } },
		pact: { level: 5, total: 2, used: 1 },
	};

	it("gasta um espaço do nível e não muta o original", () => {
		const next = spendSlot(base, 1);
		expect(next?.slots["1"]).toEqual({ total: 2, used: 1 });
		expect(base.slots["1"].used).toBe(0);
	});

	it("sem espaço sobrando devolve null", () => {
		expect(spendSlot(base, 2)).toBeNull();
		expect(spendSlot(base, 3)).toBeNull();
		expect(spendSlot({ slots: {} }, "pact")).toBeNull();
	});

	it("gasta e devolve os de Pacto", () => {
		expect(spendSlot(base, "pact")?.pact?.used).toBe(2);
		expect(
			spendSlot({ ...base, pact: { level: 5, total: 2, used: 2 } }, "pact"),
		).toBeNull();
		expect(restoreSlot(base, "pact")?.pact?.used).toBe(0);
	});

	it("devolver quando nada foi gasto devolve null", () => {
		expect(restoreSlot(base, 1)).toBeNull();
		expect(restoreSlot(base, 2)?.slots["2"]?.used).toBe(0);
	});
});

describe("descansos", () => {
	const gasto = {
		slots: { "1": { total: 4, used: 3 }, "3": { total: 2, used: 2 } },
		pact: { level: 5, total: 2, used: 2 },
	};

	it("curto: só o Pacto volta", () => {
		const s = shortRestSlots(gasto);
		expect(s.pact?.used).toBe(0);
		expect(s.slots["1"]?.used).toBe(3);
		expect(s.slots["3"]?.used).toBe(2);
	});

	it("curto sem Pacto não muda nada (mesma referência)", () => {
		const s = { slots: { "1": { total: 1, used: 1 } } };
		expect(shortRestSlots(s)).toBe(s);
	});

	it("longo: tudo volta", () => {
		const s = longRestSlots(gasto);
		expect(s.slots["1"]?.used).toBe(0);
		expect(s.slots["3"]?.used).toBe(0);
		expect(s.pact?.used).toBe(0);
		expect(s.slots["1"]?.total).toBe(4);
	});
});

describe("dados de vida", () => {
	it("lê o total de '14d8' e de várias fontes", () => {
		expect(hitDiceTotal("14d8")).toBe(14);
		expect(hitDiceTotal("10d10 + 4d8")).toBe(14);
		expect(hitDiceTotal("3 d 6")).toBe(3);
		expect(hitDiceTotal("")).toBe(0);
		expect(hitDiceTotal(undefined)).toBe(0);
		expect(hitDiceTotal("muitos")).toBe(0);
	});

	it("descanso longo devolve metade (mínimo 1)", () => {
		expect(longRestHitDiceUsed(14, 14)).toBe(7);
		expect(longRestHitDiceUsed(3, 3)).toBe(2);
		expect(longRestHitDiceUsed(1, 1)).toBe(0);
		expect(longRestHitDiceUsed(0, 14)).toBe(0);
		expect(longRestHitDiceUsed(5, 0)).toBe(0);
	});
});

describe("pickSlotFor · qual espaço gastar ao lançar", () => {
	const state = {
		slots: {
			"1": { total: 2, used: 2 },
			"2": { total: 2, used: 0 },
			"4": { total: 1, used: 0 },
		},
		pact: { level: 3, total: 2, used: 0 },
	};

	it("truque não gasta nada", () => {
		expect(pickSlotFor(state, 0)).toBeNull();
	});

	it("usa o espaço do próprio nível quando há", () => {
		expect(pickSlotFor(state, 2)).toBe(2);
	});

	it("sem espaço do nível, usa o Pacto se ele alcança o nível", () => {
		expect(pickSlotFor(state, 1)).toBe("pact");
	});

	it("Pacto que não alcança o nível não serve; sobe para o menor nível com espaço", () => {
		expect(pickSlotFor(state, 4)).toBe(4);
		expect(
			pickSlotFor({ ...state, slots: { "2": { total: 1, used: 1 } } }, 4),
		).toBeNull();
	});

	it("tudo gasto: null", () => {
		const gasto = {
			slots: { "1": { total: 1, used: 1 } },
			pact: { level: 1, total: 1, used: 1 },
		};
		expect(pickSlotFor(gasto, 1)).toBeNull();
		expect(pickSlotFor({ slots: {} }, 3)).toBeNull();
	});

	it("sobe até o nível 9 e não passa dele", () => {
		expect(pickSlotFor({ slots: { "9": { total: 1, used: 0 } } }, 7)).toBe(9);
		expect(pickSlotFor({ slots: {} }, 9)).toBeNull();
	});
});
