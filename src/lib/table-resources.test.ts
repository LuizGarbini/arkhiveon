import { describe, expect, it } from "vitest";
import {
	addBonusDie,
	BONUS_DIE_ORIGIN_MAX,
	EMPTY_TABLE_RESOURCES,
	normalizeTableResources,
	rollDie,
	setFate,
	spendBonusDie,
	toggleInspiration,
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
		expect(res.inspiration).toBe(true);
		expect(res.fate).toBe(3);
		expect(res.bonusDice).toEqual([
			{ id: "a", sides: 6, quantity: 2, origin: "dormiu bem" },
		]);
	});

	it("inspiração alterna e destino fica entre 0 e o máximo", () => {
		expect(toggleInspiration(EMPTY_TABLE_RESOURCES).inspiration).toBe(true);
		expect(setFate(EMPTY_TABLE_RESOURCES, 2).fate).toBe(2);
		expect(setFate(EMPTY_TABLE_RESOURCES, 5).fate).toBe(3);
		expect(setFate(EMPTY_TABLE_RESOURCES, -1).fate).toBe(0);
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
