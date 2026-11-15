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
