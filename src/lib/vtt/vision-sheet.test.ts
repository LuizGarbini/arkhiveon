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

	it("só inclui quem está na mesa; quem não definiu nada fica sem alcance de dia", () => {
		const stamp = selectLinkedVisionStamp(chars, "a|b|c|d");
		const m = parseVisionStamp(stamp);
		expect([...m.keys()]).toEqual(["a", "b", "c", "d"]);
		expect(m.get("a")?.bright).toBe(12);
		expect(m.get("b")?.bright).toBe(6);
		expect(m.get("d")?.bright).toBe(12);
		expect(m.get("c")?.bright).toBeUndefined(); // vale o do token
		expect(m.has("x")).toBe(false);
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
		const messy = parseVisionStamp(
			"sem-dois-pontos;a:abc;b:0,0,0;c:,5,2;d:4,3;e:7,x,2;",
		);
		expect([...messy.keys()]).toEqual(["c"]);
		expect(messy.get("c")).toEqual({ dim: 5, dark: 2 });
	});
});

describe("selectLinkedVisionStamp · as três luzes de cada ficha", () => {
	const chars = [
		{ id: "a", system: "dnd5e", visionDistance: 30, darkvisionDistance: 60 }, // 6 e 12 casas
		{ id: "b", system: "dnd5e", visionDistance: 60 }, // 12 casas, sem visão no escuro
		{ id: "c", system: "dnd5e" }, // nada
	];
	const read = () => parseVisionStamp(selectLinkedVisionStamp(chars, "a|b|c"));

	it("luz do dia: o maior entre visão normal e no escuro", () => {
		expect(read().get("a")?.bright).toBe(12);
		expect(read().get("b")?.bright).toBe(12);
	});

	it("penumbra: metade da visão normal, ou a visão no escuro se for maior", () => {
		expect(read().get("a")?.dim).toBe(12); // max(6/2, 12)
		expect(read().get("b")?.dim).toBe(6); // 12/2
		expect(read().get("c")?.dim).toBe(3); // metade da padrão (6)
	});

	it("escuridão: a visão no escuro; sem ela, 1 casa", () => {
		expect(read().get("a")?.dark).toBe(12);
		expect(read().get("b")?.dark).toBe(1);
		expect(read().get("c")?.dark).toBe(1);
	});

	it("o selo não depende da luz da cena: ele já traz as três", () => {
		// a luz muda a cada passo do token (área de luz), então o selo guarda as três
		expect(selectLinkedVisionStamp(chars, "b")).toContain(":12,6,1;");
	});
});
