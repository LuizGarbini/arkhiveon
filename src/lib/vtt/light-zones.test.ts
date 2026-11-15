import { describe, expect, it } from "vitest";
import {
	geometryFromDrag,
	geometryFromPolygonDraft,
	geometryToJson,
	LIGHT_LEVEL_LABEL,
	type LightZoneGeometry,
	lightAt,
	MAX_POLYGON_POINTS,
	mapLightZoneRow,
	readGeometry,
	zoneAt,
	zoneContains,
} from "./light-zones";
import type { LightLevel } from "./vision";

const circle = (x: number, y: number, radius: number): LightZoneGeometry => ({
	shape: "circle",
	x,
	y,
	radius,
});
const rect = (
	x: number,
	y: number,
	width: number,
	height: number,
): LightZoneGeometry => ({
	shape: "rect",
	x,
	y,
	width,
	height,
});
const tri: LightZoneGeometry = {
	shape: "polygon",
	points: [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
		{ x: 50, y: 100 },
	],
};
const zone = (g: LightZoneGeometry, level: LightLevel) => ({ ...g, level });

describe("zoneContains", () => {
	it("círculo: dentro, na borda e fora", () => {
		const c = circle(100, 100, 50);
		expect(zoneContains(c, { x: 100, y: 100 })).toBe(true);
		expect(zoneContains(c, { x: 150, y: 100 })).toBe(true); // borda conta
		expect(zoneContains(c, { x: 151, y: 100 })).toBe(false);
		expect(zoneContains(c, { x: 135, y: 135 })).toBe(true); // 49,5 do centro
		expect(zoneContains(c, { x: 140, y: 140 })).toBe(false); // 56,6 do centro
	});

	it("retângulo: dentro, nos cantos e fora", () => {
		const r = rect(10, 20, 100, 50);
		expect(zoneContains(r, { x: 60, y: 45 })).toBe(true);
		expect(zoneContains(r, { x: 10, y: 20 })).toBe(true);
		expect(zoneContains(r, { x: 110, y: 70 })).toBe(true);
		expect(zoneContains(r, { x: 9, y: 45 })).toBe(false);
		expect(zoneContains(r, { x: 60, y: 71 })).toBe(false);
	});

	it("polígono: um triângulo", () => {
		expect(zoneContains(tri, { x: 50, y: 30 })).toBe(true);
		expect(zoneContains(tri, { x: 5, y: 90 })).toBe(false);
		expect(zoneContains(tri, { x: 95, y: 90 })).toBe(false);
		expect(zoneContains(tri, { x: 50, y: 120 })).toBe(false);
	});

	it("polígono côncavo (um L): o vão do L está fora", () => {
		const l: LightZoneGeometry = {
			shape: "polygon",
			points: [
				{ x: 0, y: 0 },
				{ x: 40, y: 0 },
				{ x: 40, y: 60 },
				{ x: 100, y: 60 },
				{ x: 100, y: 100 },
				{ x: 0, y: 100 },
			],
		};
		expect(zoneContains(l, { x: 20, y: 30 })).toBe(true);
		expect(zoneContains(l, { x: 70, y: 80 })).toBe(true);
		expect(zoneContains(l, { x: 70, y: 30 })).toBe(false); // o canto vazio do L
	});
});

describe("lightAt · a luz de um lugar", () => {
	it("fora de qualquer área vale a luz da cena", () => {
		expect(
			lightAt({ x: 500, y: 500 }, [zone(circle(0, 0, 50), "dark")], "bright"),
		).toBe("bright");
		expect(
			lightAt({ x: 500, y: 500 }, [zone(circle(0, 0, 50), "dark")], "dim"),
		).toBe("dim");
		expect(lightAt({ x: 1, y: 1 }, [], "dark")).toBe("dark");
	});

	it("dentro de uma área vale a dela, mesmo diferente da cena", () => {
		const zones = [zone(circle(100, 100, 50), "dark")];
		expect(lightAt({ x: 100, y: 100 }, zones, "bright")).toBe("dark");
		const lit = [zone(rect(0, 0, 100, 100), "bright")];
		expect(lightAt({ x: 50, y: 50 }, lit, "dark")).toBe("bright"); // sala acesa numa cena escura
	});

	it("áreas sobrepostas: vale a criada por último", () => {
		const salaEscura = zone(rect(0, 0, 400, 400), "dark");
		const tocha = zone(circle(200, 200, 60), "bright");
		const buraco = zone(circle(200, 200, 20), "dim");
		const zones = [salaEscura, tocha, buraco];
		expect(lightAt({ x: 10, y: 10 }, zones, "bright")).toBe("dark");
		expect(lightAt({ x: 250, y: 200 }, zones, "dark")).toBe("bright"); // na tocha
		expect(lightAt({ x: 205, y: 200 }, zones, "dark")).toBe("dim"); // o último ganha
		// a ordem importa: invertida, a sala escura cobriria a tocha
		expect(lightAt({ x: 250, y: 200 }, [tocha, salaEscura], "bright")).toBe(
			"dark",
		);
	});

	it("a borda de fora cai na luz da cena", () => {
		const zones = [zone(circle(0, 0, 50), "dark")];
		expect(lightAt({ x: 51, y: 0 }, zones, "bright")).toBe("bright");
		expect(lightAt({ x: 50, y: 0 }, zones, "bright")).toBe("dark");
	});
});

describe("zoneAt · clicar e selecionar", () => {
	it("a área mais nova (a de cima) sob o ponto", () => {
		const a = { id: "a", ...circle(100, 100, 80) };
		const b = { id: "b", ...circle(100, 100, 30) };
		expect(zoneAt({ x: 100, y: 100 }, [a, b])?.id).toBe("b");
		expect(zoneAt({ x: 160, y: 100 }, [a, b])?.id).toBe("a");
		expect(zoneAt({ x: 900, y: 900 }, [a, b])).toBeNull();
		expect(zoneAt({ x: 1, y: 1 }, [])).toBeNull();
	});
});

describe("readGeometry · valida o que vem do banco", () => {
	it("aceita as três formas", () => {
		expect(readGeometry("circle", { x: 1, y: 2, radius: 3 })).toEqual(
			circle(1, 2, 3),
		);
		expect(readGeometry("rect", { x: 1, y: 2, width: 3, height: 4 })).toEqual(
			rect(1, 2, 3, 4),
		);
		expect(
			readGeometry("polygon", {
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 0 },
					{ x: 0, y: 1 },
				],
			}),
		).toEqual({
			shape: "polygon",
			points: [
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
				{ x: 0, y: 1 },
			],
		});
	});

	it("recusa o que quebraria o desenho ou a conta de luz", () => {
		expect(readGeometry("circle", { x: 1, y: 2, radius: 0 })).toBeNull();
		expect(readGeometry("circle", { x: 1, y: 2, radius: -5 })).toBeNull();
		expect(readGeometry("circle", { x: "1", y: 2, radius: 3 })).toBeNull();
		expect(
			readGeometry("circle", { x: Number.NaN, y: 2, radius: 3 }),
		).toBeNull();
		expect(
			readGeometry("circle", { x: 1, y: 2, radius: Number.POSITIVE_INFINITY }),
		).toBeNull();
		expect(
			readGeometry("rect", { x: 1, y: 2, width: 0, height: 4 }),
		).toBeNull();
		expect(readGeometry("rect", { x: 1, y: 2, width: 3 })).toBeNull();
		expect(
			readGeometry("polygon", {
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
				],
			}),
		).toBeNull();
		expect(readGeometry("polygon", { points: "x" })).toBeNull();
		expect(
			readGeometry("polygon", {
				points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, null],
			}),
		).toBeNull();
		expect(
			readGeometry("polygon", {
				points: [
					{ x: 0, y: 0 },
					{ x: 1, y: 1 },
					{ x: "a", y: 0 },
				],
			}),
		).toBeNull();
		expect(readGeometry("triangle", { x: 1, y: 2, radius: 3 })).toBeNull();
		expect(readGeometry("circle", null)).toBeNull();
		expect(readGeometry("circle", "texto")).toBeNull();
	});

	it("polígono de 64 pontos passa e de 65 não", () => {
		const pts = (n: number) =>
			Array.from({ length: n }, (_, i) => ({ x: i, y: i * i }));
		expect(
			readGeometry("polygon", { points: pts(MAX_POLYGON_POINTS) }),
		).not.toBeNull();
		expect(
			readGeometry("polygon", { points: pts(MAX_POLYGON_POINTS + 1) }),
		).toBeNull();
	});
});

describe("mapLightZoneRow", () => {
	it("linha válida vira área", () => {
		expect(
			mapLightZoneRow({
				id: "z1",
				scene_id: "s1",
				shape: "circle",
				level: "dim",
				geometry: { x: 5, y: 6, radius: 7 },
			}),
		).toEqual({
			id: "z1",
			sceneId: "s1",
			level: "dim",
			shape: "circle",
			x: 5,
			y: 6,
			radius: 7,
		});
	});

	it("linha com geometria inválida é descartada (não derruba a mesa)", () => {
		expect(
			mapLightZoneRow({
				id: "z",
				scene_id: "s",
				shape: "circle",
				level: "dark",
				geometry: { x: 1 },
			}),
		).toBeNull();
	});

	it("luz desconhecida cai para luz do dia", () => {
		expect(
			mapLightZoneRow({
				id: "z",
				scene_id: "s",
				shape: "circle",
				level: "sunny",
				geometry: { x: 1, y: 1, radius: 5 },
			})?.level,
		).toBe("bright");
	});
});

describe("geometryToJson · ida e volta com o banco", () => {
	it("o que sai do desenho entra igual de volta", () => {
		for (const g of [circle(1, 2, 3), rect(1, 2, 3, 4), tri]) {
			const json = geometryToJson(g);
			expect(readGeometry(g.shape, json)).toEqual(g);
		}
	});

	it("a forma não vai dentro do jsonb (fica na coluna shape)", () => {
		expect("shape" in geometryToJson(circle(1, 2, 3))).toBe(false);
		expect("shape" in geometryToJson(tri)).toBe(false);
	});
});

describe("geometryFromDrag", () => {
	it("círculo: centro no início, raio até onde soltou", () => {
		expect(
			geometryFromDrag("circle", { x: 100, y: 100 }, { x: 130, y: 140 }),
		).toEqual(circle(100, 100, 50));
	});

	it("retângulo: arrasta em qualquer direção e normaliza", () => {
		expect(
			geometryFromDrag("rect", { x: 200, y: 300 }, { x: 100, y: 250 }),
		).toEqual(rect(100, 250, 100, 50));
	});

	it("clique solto ou arrasto minúsculo não cria área", () => {
		expect(
			geometryFromDrag("circle", { x: 5, y: 5 }, { x: 5, y: 5 }),
		).toBeNull();
		expect(
			geometryFromDrag("circle", { x: 5, y: 5 }, { x: 8, y: 5 }),
		).toBeNull();
		expect(
			geometryFromDrag("rect", { x: 5, y: 5 }, { x: 5, y: 80 }),
		).toBeNull(); // sem largura
		expect(
			geometryFromDrag("rect", { x: 5, y: 5 }, { x: 80, y: 8 }),
		).toBeNull(); // sem altura
	});
});

describe("geometryFromPolygonDraft", () => {
	it("três pontos com área viram polígono", () => {
		const g = geometryFromPolygonDraft([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 0, y: 100 },
		]);
		expect(g?.shape).toBe("polygon");
	});

	it("menos de três pontos, ou pontos em linha reta: nada", () => {
		expect(geometryFromPolygonDraft([])).toBeNull();
		expect(
			geometryFromPolygonDraft([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
			]),
		).toBeNull();
		expect(
			geometryFromPolygonDraft([
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
				{ x: 100, y: 100 },
			]),
		).toBeNull();
	});

	it("pontos repetidos em seguida (duplo clique) não contam", () => {
		expect(
			geometryFromPolygonDraft([
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 0 },
			]),
		).toBeNull(); // viram 2 pontos
		const g = geometryFromPolygonDraft([
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 0 },
			{ x: 0, y: 100 },
		]);
		expect(g?.shape === "polygon" && g.points).toHaveLength(3);
	});

	it("passar de 64 pontos: recusa", () => {
		const many = Array.from({ length: 65 }, (_, i) => ({
			x: Math.cos(i) * 100 + i,
			y: Math.sin(i) * 100,
		}));
		expect(geometryFromPolygonDraft(many)).toBeNull();
	});
});

describe("rótulos", () => {
	it("as três luzes têm nome em português", () => {
		expect(LIGHT_LEVEL_LABEL).toEqual({
			bright: "Luz do dia",
			dim: "Penumbra",
			dark: "Escuridão",
		});
	});
});
