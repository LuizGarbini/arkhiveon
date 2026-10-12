import { describe, expect, it } from "vitest";
import {
	addBonusDie,
	BONUS_DIE_ORIGIN_MAX,
	EMPTY_TABLE_RESOURCES,
	FATE_MAX,
	normalizeTableResources,
	rollDie,
	setFate,
	setInspiration,
	spendBonusDie,
	spendInspiration,
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
		expect(res.fateMax).toBe(10);
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
		expect(old.fateMax).toBe(FATE_MAX);
		expect(normalizeTableResources({ fate: -4 }).fate).toBe(0);
		expect(normalizeTableResources({ fate: 7.9, fateMax: 99 })).toMatchObject({
			fate: 7,
			fateMax: 10,
		});
	});

	it("inspiração é quantidade sem teto; usar 1 não baixa de 0", () => {
		expect(setInspiration(EMPTY_TABLE_RESOURCES, 12).inspiration).toBe(12);
		expect(setInspiration(EMPTY_TABLE_RESOURCES, -1).inspiration).toBe(0);
		const two = setInspiration(EMPTY_TABLE_RESOURCES, 2);
		expect(spendInspiration(two).inspiration).toBe(1);
		expect(spendInspiration(EMPTY_TABLE_RESOURCES).inspiration).toBe(0);
	});

	it("destino fica entre 0 e 10", () => {
		expect(setFate(EMPTY_TABLE_RESOURCES, 4).fate).toBe(4);
		expect(setFate(EMPTY_TABLE_RESOURCES, 11).fate).toBe(10);
		expect(setFate(EMPTY_TABLE_RESOURCES, -1).fate).toBe(0);
		expect(setFate({ ...EMPTY_TABLE_RESOURCES, fateMax: 3 }, 8)).toMatchObject({
			fate: 8,
			fateMax: 10,
		});
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
