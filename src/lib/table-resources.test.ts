import { describe, expect, it } from "vitest";
import {
	addBonusDie,
	BONUS_DIE_ORIGIN_MAX,
	burnFate,
	burnPool,
	DIVINE_TOTAL_DEFAULT,
	EMPTY_TABLE_RESOURCES,
	FATE_TOTAL_DEFAULT,
	FATE_TOTAL_MAX,
	fatePercent,
	mergeTableResources,
	normalizeTableResources,
	poolPercent,
	regainFate,
	regainPool,
	rollDie,
	setFate,
	setFateTotal,
	setInspiration,
	setPool,
	setPoolTotal,
	spendBonusDie,
	spendFate,
	spendInspiration,
	spendPool,
} from "./table-resources";

describe("table resources", () => {
	it("normaliza ficha antiga e lixo do JSONB", () => {
		expect(normalizeTableResources(undefined)).toEqual(EMPTY_TABLE_RESOURCES);
		expect(normalizeTableResources("x")).toEqual(EMPTY_TABLE_RESOURCES);
		const res = normalizeTableResources({
			inspiration: true,
			fate: 99,
			bonusDice: [
				{ id: "a", sides: 6, quantity: 2, origin: "  dormiu   bem " },
				{ id: "b", sides: 7, quantity: 1, origin: "inválido" },
				{ id: "c", sides: 8, quantity: 0, origin: "zerado" },
				null,
			],
		});
		expect(res.inspiration).toBe(1);
		expect(res.fate).toBe(10);
		expect(res.fateTotal).toBe(10);
		expect(res.bonusDice).toEqual([
			{ id: "a", sides: 6, quantity: 2, origin: "dormiu bem" },
		]);
	});

	it("migra inspiração boolean → número e destino antigo (máx 3) → 10", () => {
		expect(normalizeTableResources({ inspiration: true }).inspiration).toBe(1);
		expect(normalizeTableResources({ inspiration: false }).inspiration).toBe(0);
		expect(normalizeTableResources({}).inspiration).toBe(0);
		expect(normalizeTableResources({ inspiration: 3 }).inspiration).toBe(3);
		expect(normalizeTableResources({ inspiration: -2 }).inspiration).toBe(0);
		expect(normalizeTableResources({ inspiration: "x" }).inspiration).toBe(0);
		const old = normalizeTableResources({ fate: 2, fateMax: 3 });
		expect(old.fate).toBe(2);
		expect(old.fateTotal).toBe(FATE_TOTAL_DEFAULT);
		expect(normalizeTableResources({ fate: -4 }).fate).toBe(0);
		expect(normalizeTableResources({ fate: 7.9, fateMax: 99 })).toMatchObject({
			fate: 7,
			fateTotal: 10,
		});
	});

	it("inspiração é quantidade sem teto; usar 1 não baixa de 0", () => {
		expect(setInspiration(EMPTY_TABLE_RESOURCES, 12).inspiration).toBe(12);
		expect(setInspiration(EMPTY_TABLE_RESOURCES, -1).inspiration).toBe(0);
		const two = setInspiration(EMPTY_TABLE_RESOURCES, 2);
		expect(spendInspiration(two).inspiration).toBe(1);
		expect(spendInspiration(EMPTY_TABLE_RESOURCES).inspiration).toBe(0);
	});

	it("ficha existente sem fateTotal mantém o valor e fica com total 10", () => {
		const res = normalizeTableResources({ fate: 4, fateMax: 10 });
		expect(res).toMatchObject({ fate: 4, fateTotal: 10 });
		expect(res).not.toHaveProperty("fateMax");
		expect(normalizeTableResources({ fate: 3, fateTotal: 4 })).toMatchObject({
			fate: 3,
			fateTotal: 4,
		});
		expect(normalizeTableResources({ fate: 9, fateTotal: 4 }).fate).toBe(4);
		expect(normalizeTableResources({ fate: 2, fateTotal: 0 })).toMatchObject({
			fate: 0,
			fateTotal: 0,
		});
		expect(normalizeTableResources({ fateTotal: 500 }).fateTotal).toBe(
			FATE_TOTAL_MAX,
		);
		expect(normalizeTableResources({ fateTotal: -3 }).fateTotal).toBe(0);
		expect(normalizeTableResources({ fateTotal: "x" }).fateTotal).toBe(10);
	});

	it("destino fica entre 0 e o total", () => {
		const four = setFateTotal(EMPTY_TABLE_RESOURCES, 4);
		expect(setFate(four, 3).fate).toBe(3);
		expect(setFate(four, 11).fate).toBe(4);
		expect(setFate(four, -1).fate).toBe(0);
		expect(setFate(four, Number.NaN).fate).toBe(0);
		expect(setFate(EMPTY_TABLE_RESOURCES, 11).fate).toBe(10);
	});

	it("− gasta 1 e + devolve 1, sem passar de 0 nem do total", () => {
		const full = setFate(setFateTotal(EMPTY_TABLE_RESOURCES, 4), 4);
		const spent = spendFate(full);
		expect(spent).toMatchObject({ fate: 3, fateTotal: 4 });
		expect(regainFate(spent)).toMatchObject({ fate: 4, fateTotal: 4 });
		expect(regainFate(full).fate).toBe(4);
		const empty = setFate(full, 0);
		expect(spendFate(empty).fate).toBe(0);
	});

	it("mudar o total ajusta o que sobra para baixo, nunca para cima", () => {
		const res = setFate(EMPTY_TABLE_RESOURCES, 7);
		expect(setFateTotal(res, 4)).toMatchObject({ fate: 4, fateTotal: 4 });
		expect(setFateTotal(res, 12)).toMatchObject({ fate: 7, fateTotal: 12 });
		expect(setFateTotal(res, 0)).toMatchObject({ fate: 0, fateTotal: 0 });
		expect(setFateTotal(res, -5).fateTotal).toBe(0);
		expect(setFateTotal(res, 1000).fateTotal).toBe(FATE_TOTAL_MAX);
		expect(setFateTotal(res, 5.8).fateTotal).toBe(5);
		expect(setFateTotal(res, Number.NaN)).toBe(res);
	});

	it("queimar tira 1 do total e ajusta o que sobra (3/4 → 3/3, 4/4 → 3/3)", () => {
		const four = setFateTotal(EMPTY_TABLE_RESOURCES, 4);
		expect(burnFate(setFate(four, 3))).toMatchObject({ fate: 3, fateTotal: 3 });
		expect(burnFate(setFate(four, 4))).toMatchObject({ fate: 3, fateTotal: 3 });
		expect(burnFate(setFate(four, 1))).toMatchObject({ fate: 1, fateTotal: 3 });
		const one = setFate(setFateTotal(EMPTY_TABLE_RESOURCES, 1), 1);
		expect(burnFate(one)).toMatchObject({ fate: 0, fateTotal: 0 });
		const zero = setFateTotal(EMPTY_TABLE_RESOURCES, 0);
		expect(burnFate(zero)).toBe(zero);
	});

	it("barra = sobra / total", () => {
		const four = setFateTotal(EMPTY_TABLE_RESOURCES, 4);
		expect(fatePercent(setFate(four, 3))).toBe(75);
		expect(fatePercent(setFate(four, 4))).toBe(100);
		expect(fatePercent(setFate(four, 0))).toBe(0);
		expect(fatePercent(setFateTotal(EMPTY_TABLE_RESOURCES, 0))).toBe(0);
		expect(fatePercent(setFate(setFateTotal(four, 3), 1))).toBe(33);
	});

	it("adiciona dado, corta origem em 24 e soma no mesmo dado+origem", () => {
		let res = addBonusDie(EMPTY_TABLE_RESOURCES, {
			sides: 6,
			quantity: 2,
			origin: "x".repeat(40),
		});
		expect(res.bonusDice[0].origin).toHaveLength(BONUS_DIE_ORIGIN_MAX);
		res = addBonusDie(EMPTY_TABLE_RESOURCES, {
			sides: 6,
			quantity: 1,
			origin: "Bênção",
		});
		res = addBonusDie(res, { sides: 6, quantity: 2, origin: "bênção" });
		res = addBonusDie(res, { sides: 8, quantity: 1, origin: "bênção" });
		expect(res.bonusDice.map((d) => [d.sides, d.quantity])).toEqual([
			[6, 3],
			[8, 1],
		]);
	});

	it("tocar rola 1 e gasta 1; some no 0", () => {
		const res = addBonusDie(EMPTY_TABLE_RESOURCES, {
			sides: 8,
			quantity: 2,
			origin: "mestre",
		});
		const id = res.bonusDice[0].id;
		const first = spendBonusDie(res, id, () => 5);
		expect(first?.value).toBe(5);
		expect(first?.next.bonusDice[0].quantity).toBe(1);
		const second = spendBonusDie(first?.next ?? res, id, () => 1);
		expect(second?.next.bonusDice).toEqual([]);
		expect(spendBonusDie(res, "nope")).toBeNull();
	});

	it("rollDie fica no intervalo do dado", () => {
		for (let i = 0; i < 200; i++) {
			const v = rollDie(12);
			expect(v).toBeGreaterThanOrEqual(1);
			expect(v).toBeLessThanOrEqual(12);
		}
	});
});

describe("Pontos Divinos (pool genérico)", () => {
	it("ficha antiga sem o campo: 0 / 10 e o Destino não muda", () => {
		const res = normalizeTableResources({ fate: 4, fateTotal: 6 });
		expect(res).toMatchObject({
			divine: 0,
			divineTotal: DIVINE_TOTAL_DEFAULT,
			fate: 4,
			fateTotal: 6,
		});
		expect(DIVINE_TOTAL_DEFAULT).toBe(10);
	});

	it("normaliza lixo: sobra entre 0 e o total, total entre 0 e 99", () => {
		expect(
			normalizeTableResources({ divine: 50, divineTotal: 7 }),
		).toMatchObject({ divine: 7, divineTotal: 7 });
		expect(
			normalizeTableResources({ divine: -3, divineTotal: 500 }),
		).toMatchObject({ divine: 0, divineTotal: 99 });
		expect(normalizeTableResources({ divine: "x" }).divine).toBe(0);
	});

	it("− / + / set ficam entre 0 e o total, sem tocar no Destino", () => {
		const base = setPoolTotal(EMPTY_TABLE_RESOURCES, "divine", 3);
		const full = setPool(base, "divine", 9);
		expect(full.divine).toBe(3);
		expect(regainPool(full, "divine").divine).toBe(3);
		expect(spendPool(full, "divine").divine).toBe(2);
		expect(spendPool(base, "divine").divine).toBe(0);
		expect(spendPool(full, "divine").fate).toBe(EMPTY_TABLE_RESOURCES.fate);
		expect(spendPool(full, "divine").fateTotal).toBe(
			EMPTY_TABLE_RESOURCES.fateTotal,
		);
	});

	it("total 0–99; sobra desce junto; inválido mantém", () => {
		const r = setPool(
			setPoolTotal(EMPTY_TABLE_RESOURCES, "divine", 8),
			"divine",
			6,
		);
		expect(setPoolTotal(r, "divine", 4)).toMatchObject({
			divine: 4,
			divineTotal: 4,
		});
		expect(setPoolTotal(r, "divine", 150).divineTotal).toBe(99);
		expect(setPoolTotal(r, "divine", -1).divineTotal).toBe(0);
		expect(setPoolTotal(r, "divine", Number.NaN)).toBe(r);
	});

	it("queimar: 3/4 → 3/3, 4/4 → 3/3, 0 não muda", () => {
		const t4 = setPoolTotal(EMPTY_TABLE_RESOURCES, "divine", 4);
		expect(burnPool(setPool(t4, "divine", 3), "divine")).toMatchObject({
			divine: 3,
			divineTotal: 3,
		});
		expect(burnPool(setPool(t4, "divine", 4), "divine")).toMatchObject({
			divine: 3,
			divineTotal: 3,
		});
		const zero = setPoolTotal(EMPTY_TABLE_RESOURCES, "divine", 0);
		expect(burnPool(zero, "divine")).toBe(zero);
	});

	it("percentual da barra", () => {
		const r = setPool(
			setPoolTotal(EMPTY_TABLE_RESOURCES, "divine", 3),
			"divine",
			1,
		);
		expect(poolPercent(r, "divine")).toBe(33);
		expect(poolPercent(setPoolTotal(r, "divine", 0), "divine")).toBe(0);
	});

	it("merge preserva chave desconhecida e sobrescreve as conhecidas", () => {
		const raw = { fate: 1, divine: 9, futuro: { x: 1 } };
		const next = spendPool(normalizeTableResources(raw), "divine");
		const merged = mergeTableResources(raw, next);
		expect(merged).toMatchObject({ futuro: { x: 1 }, divine: 8, fate: 1 });
		expect(mergeTableResources(undefined, next)).toBe(next);
		expect(mergeTableResources([1], next)).toBe(next);
	});
});
