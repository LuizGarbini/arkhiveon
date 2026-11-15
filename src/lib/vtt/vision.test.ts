import { describe, expect, it } from "vitest";
import type { VTTToken } from "./types";
import {
	DEFAULT_VISION_CELLS,
	isVisionToken,
	visionKey,
	visionSources,
} from "./vision";

const token = (over: Partial<VTTToken> = {}): VTTToken => ({
	id: "t",
	sceneId: "s",
	name: "T",
	layer: "token",
	x: 100,
	y: 200,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	...over,
});

describe("isVisionToken", () => {
	it("token com ficha enxerga; com controle também", () => {
		expect(isVisionToken(token({ characterId: "c" }))).toBe(true);
		expect(isVisionToken(token({ controlledBy: ["u"] }))).toBe(true);
	});

	it("monstro sem ficha e sem dono não enxerga", () => {
		expect(isVisionToken(token())).toBe(false);
	});

	it("oculto ou na camada do mestre não enxerga", () => {
		expect(isVisionToken(token({ characterId: "c", isHidden: true }))).toBe(
			false,
		);
		expect(isVisionToken(token({ characterId: "c", layer: "gm" }))).toBe(false);
	});
});

describe("visionSources", () => {
	it("converte o alcance de casas para pixels", () => {
		const [s] = visionSources(
			[token({ characterId: "c", visionRange: 4 })],
			70,
		);
		expect(s).toEqual({ id: "t", x: 100, y: 200, range: 280 });
	});

	it("sem alcance usa o padrão", () => {
		const [s] = visionSources(
			[token({ characterId: "c", visionRange: 0 })],
			50,
		);
		expect(s?.range).toBe(DEFAULT_VISION_CELLS * 50);
	});

	it("grade inválida cai em 70 px", () => {
		const [s] = visionSources([token({ characterId: "c", visionRange: 2 })], 0);
		expect(s?.range).toBe(140);
	});

	it("só tokens que enxergam entram", () => {
		const list = [token({ id: "pc", characterId: "c" }), token({ id: "mob" })];
		expect(visionSources(list, 70).map((s) => s.id)).toEqual(["pc"]);
	});
});

describe("visionKey · só muda quando a visão muda", () => {
	const pc = token({ id: "pc", characterId: "c" });
	const mob = token({ id: "mob", x: 500, y: 500 });
	const key = (list: VTTToken[]) => visionKey(visionSources(list, 70));

	it("mover um monstro NÃO muda a assinatura", () => {
		const a = key([pc, mob]);
		const b = key([pc, { ...mob, x: 900, y: 40 }]);
		expect(b).toBe(a);
	});

	it("girar, mudar PV ou condição de qualquer token NÃO muda a assinatura", () => {
		const a = key([pc, mob]);
		expect(
			key([{ ...pc, rotation: 90, hpCurrent: 3, conditions: ["caido"] }, mob]),
		).toBe(a);
	});

	it("mover quem enxerga muda", () => {
		expect(key([{ ...pc, x: 400 }])).not.toBe(key([pc]));
	});

	it("mudar o alcance muda", () => {
		expect(key([{ ...pc, visionRange: 9 }])).not.toBe(key([pc]));
	});

	it("entrar ou sair quem enxerga muda", () => {
		expect(key([pc, { ...pc, id: "pc2" }])).not.toBe(key([pc]));
		expect(key([])).not.toBe(key([pc]));
	});

	it("movimento de menos de meio pixel não refaz a névoa", () => {
		expect(key([{ ...pc, x: 100.2 }])).toBe(key([pc]));
	});
});

import { pointInPolygon, visibilityPolygon } from "./vision";

const wall = (x1: number, y1: number, x2: number, y2: number) => ({
	x1,
	y1,
	x2,
	y2,
});
const O = { x: 500, y: 500 };

function area(poly: { x: number; y: number }[]): number {
	let s = 0;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i] as { x: number; y: number };
		const b = poly[(i + 1) % poly.length] as { x: number; y: number };
		s += a.x * b.y - b.x * a.y;
	}
	return Math.abs(s) / 2;
}

describe("visibilityPolygon · sem paredes é um círculo", () => {
	it("todos os pontos ficam à distância do alcance", () => {
		const poly = visibilityPolygon(O, 300, []);
		for (const p of poly)
			expect(Math.hypot(p.x - O.x, p.y - O.y)).toBeCloseTo(300, 6);
	});

	it("a área é a de um círculo (≥ 99%)", () => {
		const a = area(visibilityPolygon(O, 300, []));
		expect(a / (Math.PI * 300 * 300)).toBeGreaterThan(0.99);
		expect(a / (Math.PI * 300 * 300)).toBeLessThanOrEqual(1);
	});

	it("alcance zero, negativo ou inválido: nada", () => {
		expect(visibilityPolygon(O, 0, [])).toEqual([]);
		expect(visibilityPolygon(O, -5, [])).toEqual([]);
		expect(visibilityPolygon(O, Number.NaN, [])).toEqual([]);
	});

	it("a origem e pontos dentro do alcance estão dentro; fora do alcance, não", () => {
		const poly = visibilityPolygon(O, 300, []);
		expect(pointInPolygon(O, poly)).toBe(true);
		expect(pointInPolygon({ x: 700, y: 500 }, poly)).toBe(true);
		expect(pointInPolygon({ x: 900, y: 500 }, poly)).toBe(false);
	});
});

describe("visibilityPolygon · paredes bloqueiam", () => {
	it("o que está atrás de uma parede não é visto; o ao lado, sim", () => {
		const poly = visibilityPolygon(O, 400, [wall(600, 300, 600, 700)]);
		expect(pointInPolygon({ x: 560, y: 500 }, poly)).toBe(true); // antes da parede
		expect(pointInPolygon({ x: 700, y: 500 }, poly)).toBe(false); // atrás
		expect(pointInPolygon({ x: 400, y: 500 }, poly)).toBe(true); // outro lado
		expect(pointInPolygon({ x: 500, y: 700 }, poly)).toBe(true); // ao lado
	});

	it("a sombra de um pilar pequeno é uma fatia, não o mapa inteiro", () => {
		const poly = visibilityPolygon(O, 400, [wall(600, 480, 600, 520)]);
		expect(pointInPolygon({ x: 800, y: 500 }, poly)).toBe(false); // na sombra
		expect(pointInPolygon({ x: 800, y: 700 }, poly)).toBe(true); // fora da sombra
		expect(pointInPolygon({ x: 800, y: 300 }, poly)).toBe(true);
	});

	it("a borda da sombra é exata (os raios passam rente aos cantos)", () => {
		// pilar de 40 px a 100 px da origem: a sombra a 300 px tem borda em ±60
		const poly = visibilityPolygon(O, 450, [wall(600, 480, 600, 520)]);
		for (const dy of [0, 20, 40, 57]) {
			expect(pointInPolygon({ x: 800, y: 500 + dy }, poly), `+${dy}`).toBe(
				false,
			);
			expect(pointInPolygon({ x: 800, y: 500 - dy }, poly), `-${dy}`).toBe(
				false,
			);
		}
		for (const dy of [63, 80, 120]) {
			expect(pointInPolygon({ x: 800, y: 500 + dy }, poly), `+${dy}`).toBe(
				true,
			);
			expect(pointInPolygon({ x: 800, y: 500 - dy }, poly), `-${dy}`).toBe(
				true,
			);
		}
	});

	it("dentro de uma sala fechada a visão fica na sala", () => {
		const room = [
			wall(400, 400, 600, 400),
			wall(600, 400, 600, 600),
			wall(600, 600, 400, 600),
			wall(400, 600, 400, 400),
		];
		const poly = visibilityPolygon(O, 1000, room);
		expect(pointInPolygon({ x: 550, y: 550 }, poly)).toBe(true);
		expect(pointInPolygon({ x: 650, y: 500 }, poly)).toBe(false);
		expect(pointInPolygon({ x: 500, y: 350 }, poly)).toBe(false);
		// e a área é praticamente a da sala (200 × 200)
		expect(area(poly)).toBeGreaterThan(200 * 200 * 0.97);
		expect(area(poly)).toBeLessThan(200 * 200 * 1.03);
	});

	it("uma porta aberta no meio da parede deixa passar só a fresta", () => {
		const walls = [wall(600, 300, 600, 480), wall(600, 520, 600, 700)];
		const poly = visibilityPolygon(O, 500, walls);
		expect(pointInPolygon({ x: 750, y: 500 }, poly)).toBe(true); // pela fresta
		expect(pointInPolygon({ x: 750, y: 380 }, poly)).toBe(false); // atrás da parede
		expect(pointInPolygon({ x: 750, y: 640 }, poly)).toBe(false);
	});

	it("parede fora do alcance, de comprimento zero ou longe não muda nada", () => {
		const base = visibilityPolygon(O, 200, []);
		const same = visibilityPolygon(O, 200, [
			wall(2000, 2000, 2100, 2000),
			wall(520, 520, 520, 520),
		]);
		expect(same).toEqual(base);
	});

	it("parede que passa por cima da origem não derruba a visão", () => {
		const poly = visibilityPolygon(O, 300, [wall(400, 500, 600, 500)]);
		expect(poly.length).toBeGreaterThan(8);
		expect(
			poly.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
		).toBe(true);
	});

	it("os pontos saem em ordem de ângulo (polígono simples, sem laços)", () => {
		const poly = visibilityPolygon(O, 300, [wall(600, 400, 600, 600)]);
		const angles = poly.map(
			(p) =>
				((Math.atan2(p.y - O.y, p.x - O.x) % (2 * Math.PI)) + 2 * Math.PI) %
				(2 * Math.PI),
		);
		for (let i = 1; i < angles.length; i++) {
			expect(angles[i] as number).toBeGreaterThanOrEqual(
				angles[i - 1] as number,
			);
		}
	});

	it("muitas paredes continuam rápidas (500 paredes, 8 tokens)", () => {
		const walls = Array.from({ length: 500 }, (_, i) =>
			wall(
				(i * 37) % 2000,
				(i * 91) % 2000,
				((i * 37) % 2000) + 60,
				((i * 91) % 2000) + 10,
			),
		);
		const t0 = performance.now();
		for (let k = 0; k < 8; k++)
			visibilityPolygon({ x: 300 + k * 150, y: 900 }, 420, walls);
		expect(performance.now() - t0).toBeLessThan(150);
	});
});

import { visibleTokenIds } from "./token-motion";
import { characterVisionCells, isSeenByAny } from "./vision";

describe("characterVisionCells · visão da ficha em casas", () => {
	it("D&D em pés: 60 pés = 12 casas; em metros: 18 m = 12 casas", () => {
		expect(characterVisionCells({ visionDistance: 60 }, "ft")).toBeCloseTo(
			12,
			6,
		);
		expect(
			characterVisionCells({ visionDistance: 18, speedUnit: "m" }, "ft"),
		).toBeCloseTo(12, 6);
	});

	it("a unidade da ficha vence a do sistema", () => {
		expect(
			characterVisionCells({ visionDistance: 9, speedUnit: "m" }, "ft"),
		).toBeCloseTo(6, 6);
	});

	it("sem visão definida (vazio, zero, negativo, texto) cai no token", () => {
		expect(characterVisionCells({}, "ft")).toBeUndefined();
		expect(characterVisionCells({ visionDistance: 0 }, "ft")).toBeUndefined();
		expect(characterVisionCells({ visionDistance: -3 }, "ft")).toBeUndefined();
		expect(
			characterVisionCells({ visionDistance: "18" }, "ft"),
		).toBeUndefined();
	});
});

describe("visionSources · a ficha manda no alcance", () => {
	it("usa o alcance da ficha; sem ele, o do token", () => {
		const pc = token({ id: "pc", characterId: "c", visionRange: 6 });
		const [fromSheet] = visionSources([pc], 70, () => 12);
		expect(fromSheet?.range).toBe(12 * 70);
		const [fromToken] = visionSources([pc], 70, () => undefined);
		expect(fromToken?.range).toBe(6 * 70);
	});
});

describe("isSeenByAny · alcance e paredes", () => {
	const src = [{ id: "pc", x: 0, y: 0, range: 300 }];

	it("no alcance e sem parede: visto", () => {
		expect(isSeenByAny({ x: 200, y: 0 }, src, [])).toBe(true);
	});

	it("fora do alcance: não visto", () => {
		expect(isSeenByAny({ x: 400, y: 0 }, src, [])).toBe(false);
	});

	it("com parede no meio: não visto, mesmo perto", () => {
		expect(isSeenByAny({ x: 200, y: 0 }, src, [wall(100, -50, 100, 50)])).toBe(
			false,
		);
	});

	it("basta UM jogador ver", () => {
		const two = [...src, { id: "pc2", x: 200, y: 100, range: 300 }];
		expect(isSeenByAny({ x: 200, y: 0 }, two, [wall(100, -50, 100, 50)])).toBe(
			true,
		);
	});

	it("sem ninguém que enxerga: não visto", () => {
		expect(isSeenByAny({ x: 10, y: 0 }, [], [])).toBe(false);
	});
});

describe("visibleTokenIds · monstros atrás de parede somem para o jogador", () => {
	const scene = { gridSize: 70, fogEnabled: true, fogExploration: true };
	const pc = token({ id: "pc", characterId: "c", x: 0, y: 0, visionRange: 6 });
	const near = token({ id: "near", x: 140, y: 0 });
	const far = token({ id: "far", x: 900, y: 0 });
	const tokens = [pc, near, far];
	const behindWall = [wall(70, -100, 70, 100)];

	it("sem paredes: vê o perto, não o longe", () => {
		expect(visibleTokenIds(tokens, false, scene)).toBe("pc|near");
	});

	it("com parede entre os dois: o perto some", () => {
		expect(visibleTokenIds(tokens, false, scene, { walls: behindWall })).toBe(
			"pc",
		);
	});

	it("o mestre vê tudo, parede ou não", () => {
		expect(visibleTokenIds(tokens, true, scene, { walls: behindWall })).toBe(
			"pc|near|far",
		);
	});

	it("usa o alcance da ficha quando passado", () => {
		const sources = [{ id: "pc", x: 0, y: 0, range: 15 * 70 }];
		expect(visibleTokenIds(tokens, false, scene, { sources })).toBe(
			"pc|near|far",
		);
	});
});

import { parseVisionStamp, selectLinkedVisionStamp } from "./vision";

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
