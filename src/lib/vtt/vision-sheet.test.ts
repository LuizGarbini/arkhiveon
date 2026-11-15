import { describe, expect, it } from "vitest";
import { parseVisionStamp, selectLinkedVisionStamp } from "./vision-sheet";

describe("selectLinkedVisionStamp · ponte ficha → mesa", () => {
	const chars = [
		{ id: "a", system: "dnd5e", visionDistance: 60 }, // 60 ft = 12 casas
		{ id: "b", system: "dnd5e", visionDistance: 9, speedUnit: "m" }, // 6 casas
		{ id: "c", system: "dnd5e" }, // sem visão
		{ id: "d", system: "ordem", visionDistance: 18 }, // Ordem usa metros: 12 casas
		{ id: "x", system: "dnd5e", visionDistance: 30 }, // não está na mesa
	];

	it("só inclui quem está na mesa e tem visão definida", () => {
		const stamp = selectLinkedVisionStamp(chars, "a|b|c|d");
		expect([...parseVisionStamp(stamp).entries()]).toEqual([
			["a", 12],
			["b", 6],
			["d", 12],
		]);
	});

	it("sem personagens ligados: vazio", () => {
		expect(selectLinkedVisionStamp(chars, "")).toBe("");
		expect(selectLinkedVisionStamp([], "a")).toBe("");
	});

	it("o selo é estável: mexer em outro campo da ficha não muda", () => {
		const base = selectLinkedVisionStamp(chars, "a|b");
		const changed = chars.map((c) => ({ ...c, name: "outro", health: 3 }));
		expect(selectLinkedVisionStamp(changed, "a|b")).toBe(base);
	});

	it("mudar a visão muda o selo", () => {
		const base = selectLinkedVisionStamp(chars, "a");
		const more = chars.map((c) =>
			c.id === "a" ? { ...c, visionDistance: 90 } : c,
		);
		expect(selectLinkedVisionStamp(more, "a")).not.toBe(base);
	});

	it("parse tolera lixo", () => {
		expect(parseVisionStamp("").size).toBe(0);
		expect(parseVisionStamp("sem-dois-pontos;a:abc;b:0;c:5;").get("c")).toBe(5);
		expect(parseVisionStamp("sem-dois-pontos;a:abc;b:0;c:5;").size).toBe(1);
	});
});

describe("selectLinkedVisionStamp · luz da cena", () => {
	const chars = [
		{ id: "a", system: "dnd5e", visionDistance: 30, darkvisionDistance: 60 }, // 6 e 12
		{ id: "b", system: "dnd5e", visionDistance: 60 }, // 12, sem visão no escuro
		{ id: "c", system: "dnd5e" }, // nada
	];

	it("clara: o maior de cada ficha; quem não definiu nada fica de fora", () => {
		const m = parseVisionStamp(
			selectLinkedVisionStamp(chars, "a|b|c", "bright"),
		);
		expect([...m.entries()]).toEqual([
			["a", 12],
			["b", 12],
		]);
	});

	it("escura: visão no escuro; sem ela, 1 casa (inclusive quem não definiu nada)", () => {
		const m = parseVisionStamp(selectLinkedVisionStamp(chars, "a|b|c", "dark"));
		expect([...m.entries()]).toEqual([
			["a", 12],
			["b", 1],
			["c", 1],
		]);
	});

	it("o padrão é a cena clara (compatível com o uso anterior)", () => {
		expect(selectLinkedVisionStamp(chars, "a|b")).toBe(
			selectLinkedVisionStamp(chars, "a|b", "bright"),
		);
	});

	it("trocar a luz muda o selo (a visão é recalculada)", () => {
		expect(selectLinkedVisionStamp(chars, "b", "bright")).not.toBe(
			selectLinkedVisionStamp(chars, "b", "dark"),
		);
	});
});
