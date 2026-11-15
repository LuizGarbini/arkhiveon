import { describe, expect, it } from "vitest";
import {
	createExploredGrid,
	exploredMeta,
	isExplored,
	markPolygon,
} from "./explored";
import type { VTTToken } from "./types";
import {
	CONE_DEGREES,
	facingFromMove,
	freezeDragged,
	isSeenByAny,
	pointInPolygon,
	sourcePolygons,
	type VisionSource,
	visibilityPolygon,
	visionSector,
	visionSources,
} from "./vision";

const O = { x: 500, y: 500 };
const wall = (x1: number, y1: number, x2: number, y2: number) => ({
	x1,
	y1,
	x2,
	y2,
});

/** Ponto a `deg` graus da direção `facing` (0 = norte, horário), a `dist` px de O. */
function at(facing: number, offsetDeg: number, dist: number) {
	const t = ((facing + offsetDeg) * Math.PI) / 180;
	return { x: O.x + Math.sin(t) * dist, y: O.y - Math.cos(t) * dist };
}

function area(poly: { x: number; y: number }[]): number {
	let s = 0;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i] as { x: number; y: number };
		const b = poly[(i + 1) % poly.length] as { x: number; y: number };
		s += a.x * b.y - b.x * a.y;
	}
	return Math.abs(s) / 2;
}

describe("visionSector · o cone", () => {
	it("o vértice do cone é a própria origem", () => {
		const poly = visionSector(O, 300, [], 0);
		expect(poly[0]).toEqual(O);
	});

	it.each([
		[0, "norte", { x: 500, y: 400 }, { x: 500, y: 600 }],
		[90, "leste", { x: 600, y: 500 }, { x: 400, y: 500 }],
		[180, "sul", { x: 500, y: 600 }, { x: 500, y: 400 }],
		[270, "oeste", { x: 400, y: 500 }, { x: 600, y: 500 }],
	])(
		"olhando para %i° (%s): vê à frente, não vê atrás",
		(facing, _n, ahead, behind) => {
			const poly = visionSector(O, 300, [], facing);
			expect(pointInPolygon(ahead, poly)).toBe(true);
			expect(pointInPolygon(behind, poly)).toBe(false);
		},
	);

	it("a abertura é exata: ±58° dentro, ±62° fora (raio 200)", () => {
		for (const facing of [0, 37, 90, 200, 315]) {
			const poly = visionSector(O, 300, [], facing);
			for (const off of [-58, -30, 0, 30, 58]) {
				expect(
					pointInPolygon(at(facing, off, 200), poly),
					`${facing}+${off}`,
				).toBe(true);
			}
			for (const off of [-62, -90, 180, 90, 62]) {
				expect(
					pointInPolygon(at(facing, off, 200), poly),
					`${facing}+${off}`,
				).toBe(false);
			}
		}
	});

	it("não passa do alcance", () => {
		const poly = visionSector(O, 300, [], 0);
		expect(pointInPolygon({ x: 500, y: 190 }, poly)).toBe(false);
		expect(pointInPolygon({ x: 500, y: 220 }, poly)).toBe(true);
	});

	it("a área é a de uma fatia de 120° (±3%)", () => {
		const expected = (CONE_DEGREES / 360) * Math.PI * 300 * 300;
		for (const facing of [0, 45, 133, 270]) {
			const a = area(visionSector(O, 300, [], facing));
			expect(a / expected).toBeGreaterThan(0.97);
			expect(a / expected).toBeLessThanOrEqual(1.001);
		}
	});

	it("o cone cruza a direção norte sem quebrar (facing perto de 0 e de 360)", () => {
		for (const facing of [0, 359, 1, 180]) {
			const poly = visionSector(O, 300, [], facing);
			expect(pointInPolygon(at(facing, 0, 200), poly)).toBe(true);
			expect(
				poly.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
			).toBe(true);
		}
	});

	it("aberturas diferentes: 90° e 180°", () => {
		const narrow = visionSector(O, 300, [], 0, 90);
		expect(pointInPolygon(at(0, 40, 200), narrow)).toBe(true);
		expect(pointInPolygon(at(0, 50, 200), narrow)).toBe(false);
		const half = visionSector(O, 300, [], 0, 180);
		expect(pointInPolygon(at(0, 85, 200), half)).toBe(true);
		expect(pointInPolygon(at(0, 95, 200), half)).toBe(false);
	});

	it("360° é o círculo inteiro (igual a visibilityPolygon)", () => {
		expect(visionSector(O, 300, [], 0, 360)).toEqual(
			visibilityPolygon(O, 300, []),
		);
	});

	it("raio zero ou inválido: nada", () => {
		expect(visionSector(O, 0, [], 0)).toEqual([]);
		expect(visionSector(O, Number.NaN, [], 0)).toEqual([]);
	});

	it("paredes cortam o cone: sombra atrás de um pilar dentro do cone", () => {
		const poly = visionSector(O, 400, [wall(470, 400, 530, 400)], 0);
		expect(pointInPolygon({ x: 500, y: 300 }, poly)).toBe(false); // na sombra
		expect(pointInPolygon({ x: 500, y: 430 }, poly)).toBe(true); // antes do pilar
		expect(pointInPolygon(at(0, 40, 250), poly)).toBe(true); // ao lado da sombra
	});

	it("parede FORA do cone não muda nada", () => {
		const free = visionSector(O, 300, [], 0);
		const walled = visionSector(O, 300, [wall(300, 600, 300, 700)], 0);
		expect(walled).toEqual(free);
	});

	it("parede atrás de quem olha não bloqueia a frente", () => {
		const poly = visionSector(O, 300, [wall(400, 560, 600, 560)], 0);
		expect(pointInPolygon({ x: 500, y: 300 }, poly)).toBe(true);
	});

	it("a borda da sombra no cone também é exata (raios rentes ao canto)", () => {
		// pilar de 40 px a 100 px à frente: a sombra a 300 px tem borda em ±60
		const poly = visionSector(O, 450, [wall(480, 400, 520, 400)], 0);
		for (const dx of [0, 20, 40, 57]) {
			expect(pointInPolygon({ x: 500 + dx, y: 200 }, poly), `+${dx}`).toBe(
				false,
			);
			expect(pointInPolygon({ x: 500 - dx, y: 200 }, poly), `-${dx}`).toBe(
				false,
			);
		}
		for (const dx of [63, 80]) {
			expect(pointInPolygon({ x: 500 + dx, y: 200 }, poly), `+${dx}`).toBe(
				true,
			);
			expect(pointInPolygon({ x: 500 - dx, y: 200 }, poly), `-${dx}`).toBe(
				true,
			);
		}
	});
});

describe("facingFromMove · para onde passa a olhar", () => {
	it("as quatro direções e as diagonais (0 = norte, horário)", () => {
		const p = { x: 100, y: 100 };
		expect(facingFromMove(p, { x: 100, y: 40 })).toBe(0);
		expect(facingFromMove(p, { x: 160, y: 100 })).toBe(90);
		expect(facingFromMove(p, { x: 100, y: 160 })).toBe(180);
		expect(facingFromMove(p, { x: 40, y: 100 })).toBe(270);
		expect(facingFromMove(p, { x: 160, y: 40 })).toBe(45);
		expect(facingFromMove(p, { x: 160, y: 160 })).toBe(135);
		expect(facingFromMove(p, { x: 40, y: 160 })).toBe(225);
		expect(facingFromMove(p, { x: 40, y: 40 })).toBe(315);
	});

	it("não saiu do lugar: null (mantém a direção)", () => {
		expect(facingFromMove({ x: 5, y: 5 }, { x: 5, y: 5 })).toBeNull();
	});

	it("ângulos quebrados saem inteiros e nunca 360", () => {
		const f = facingFromMove({ x: 0, y: 0 }, { x: 100, y: -37 }) as number;
		expect(Number.isInteger(f)).toBe(true);
		expect(f).toBeGreaterThanOrEqual(0);
		expect(f).toBeLessThan(360);
		expect(facingFromMove({ x: 0, y: 0 }, { x: -0.001, y: -100 })).toBe(0);
	});

	it("é a mesma convenção do cone: andar para a direita faz o cone apontar para lá", () => {
		const to = { x: 700, y: 500 };
		const facing = facingFromMove(O, to) as number;
		const poly = visionSector(to, 300, [], facing);
		expect(pointInPolygon({ x: 850, y: 500 }, poly)).toBe(true);
		expect(pointInPolygon({ x: 550, y: 500 }, poly)).toBe(false);
	});
});

describe("freezeDragged · a visão só muda quando o movimento termina", () => {
	const A = { id: "a", x: 100, y: 100 };
	const B = { id: "b", x: 300, y: 300 };

	it("sem arrasto, cada token está onde está", () => {
		const m = freezeDragged([A, B], new Set(), new Map());
		expect(m.get("a")).toEqual({ x: 100, y: 100 });
		expect(m.get("b")).toEqual({ x: 300, y: 300 });
	});

	it("quem é arrastado fica na posição de antes, mesmo com x/y mudando", () => {
		const before = freezeDragged([A, B], new Set(), new Map());
		const during = freezeDragged(
			[{ ...A, x: 400, y: 50 }, B],
			new Set(["a"]),
			before,
		);
		expect(during.get("a")).toEqual({ x: 100, y: 100 });
		expect(during.get("b")).toEqual({ x: 300, y: 300 });
		const later = freezeDragged(
			[{ ...A, x: 700, y: 60 }, B],
			new Set(["a"]),
			during,
		);
		expect(later.get("a")).toEqual({ x: 100, y: 100 });
	});

	it("ao soltar (sai do conjunto de arrastados), a visão vai para a posição final", () => {
		const before = freezeDragged([A], new Set(), new Map());
		const during = freezeDragged([{ ...A, x: 400 }], new Set(["a"]), before);
		const dropped = freezeDragged([{ ...A, x: 400 }], new Set(), during);
		expect(dropped.get("a")).toEqual({ x: 400, y: 100 });
	});

	it("soltar no mesmo lugar não muda a visão", () => {
		const before = freezeDragged([A], new Set(), new Map());
		const during = freezeDragged([{ ...A, x: 350 }], new Set(["a"]), before);
		const back = freezeDragged([A], new Set(), during);
		expect(back.get("a")).toEqual(before.get("a"));
	});

	it("arrastado sem posição anterior conhecida usa a atual (não some)", () => {
		const m = freezeDragged([A], new Set(["a"]), new Map());
		expect(m.get("a")).toEqual({ x: 100, y: 100 });
	});

	it("não altera o mapa anterior", () => {
		const before = freezeDragged([A], new Set(), new Map());
		const snapshot = new Map(before);
		freezeDragged([{ ...A, x: 999 }], new Set(), before);
		expect(before).toEqual(snapshot);
	});

	it("visionSources usa a posição congelada, não a do token", () => {
		const token = {
			id: "pc",
			layer: "token",
			isHidden: false,
			characterId: "c",
			controlledBy: [],
			x: 900,
			y: 900,
			visionRange: 3,
			rotation: 0,
		} as unknown as VTTToken;
		const [s] = visionSources([token], 70, undefined, () => ({
			x: 100,
			y: 120,
		}));
		expect(s).toMatchObject({ x: 100, y: 120 });
	});
});

describe("isSeenByAny · cone e percepção em volta", () => {
	const base: VisionSource = {
		id: "pc",
		x: 0,
		y: 0,
		range: 300,
		facing: 0,
		cone: 120,
		near: 70,
	};
	const seen = (
		x: number,
		y: number,
		over: Partial<VisionSource> = {},
		walls: ReturnType<typeof wall>[] = [],
	) => isSeenByAny({ x, y }, [{ ...base, ...over }], walls);

	it("vê à frente (norte) e dentro dos 60° de cada lado", () => {
		expect(seen(0, -200)).toBe(true);
		expect(seen(100, -150)).toBe(true); // ~34°
		expect(seen(-100, -150)).toBe(true);
	});

	it("não vê atrás nem ao lado, a menos que esteja colado (1 casa)", () => {
		expect(seen(0, 200)).toBe(false);
		expect(seen(200, 0)).toBe(false);
		expect(seen(0, 60)).toBe(true); // atrás, mas a menos de 1 casa
		expect(seen(0, 100)).toBe(false); // atrás, passou da 1 casa
	});

	it("o alcance continua valendo no cone", () => {
		expect(seen(0, -299)).toBe(true);
		expect(seen(0, -301)).toBe(false);
	});

	it("a direção vale em qualquer rotação, inclusive cruzando 0°/360°", () => {
		expect(seen(200, 0, { facing: 90 })).toBe(true);
		expect(seen(-200, 0, { facing: 90 })).toBe(false);
		expect(seen(34, -190, { facing: 350 })).toBe(true); // bearing ~10°, diff 20°
		expect(seen(-34, -190, { facing: 10 })).toBe(true);
		expect(seen(0, 200, { facing: 180 })).toBe(true);
	});

	it("parede entre os dois ainda bloqueia, dentro do cone", () => {
		expect(seen(0, -200, {}, [wall(-50, -100, 50, -100)])).toBe(false);
	});

	it("sem cone (360) ou sem direção, é o círculo de antes", () => {
		expect(seen(0, 200, { cone: undefined })).toBe(true);
		expect(seen(0, 200, { cone: 360 })).toBe(true);
	});

	it("um vê por todos: basta um personagem ver", () => {
		const a: VisionSource = { ...base, id: "a" };
		const b: VisionSource = { ...base, id: "b", x: 0, y: 400, facing: 0 };
		expect(isSeenByAny({ x: 0, y: 200 }, [a, b], [])).toBe(true); // b olha para cima e vê
	});
});

describe("sourcePolygons · cone + 1 casa em volta", () => {
	const src: VisionSource = {
		id: "pc",
		x: 500,
		y: 500,
		range: 300,
		facing: 0,
		cone: 120,
		near: 70,
	};

	it("cone com percepção: dois polígonos que se somam", () => {
		const polys = sourcePolygons(src, []);
		expect(polys).toHaveLength(2);
		const inUnion = (p: { x: number; y: number }) =>
			polys.some((poly) => pointInPolygon(p, poly));
		expect(inUnion({ x: 500, y: 300 })).toBe(true); // à frente
		expect(inUnion({ x: 500, y: 540 })).toBe(true); // atrás, mas colado
		expect(inUnion({ x: 500, y: 650 })).toBe(false); // atrás, longe
		expect(inUnion({ x: 700, y: 500 })).toBe(false); // ao lado
	});

	it("sem cone é um círculo só", () => {
		expect(sourcePolygons({ ...src, cone: undefined }, [])).toHaveLength(1);
		expect(sourcePolygons({ ...src, cone: 360 }, [])).toHaveLength(1);
	});

	it("sem percepção em volta, só o cone", () => {
		expect(sourcePolygons({ ...src, near: 0 }, [])).toHaveLength(1);
	});

	it("percepção maior que o alcance é cortada no alcance", () => {
		const [, near] = sourcePolygons({ ...src, range: 50, near: 70 }, []);
		for (const p of near ?? []) {
			expect(Math.hypot(p.x - 500, p.y - 500)).toBeLessThanOrEqual(50.0001);
		}
	});

	it("as paredes cortam também a percepção em volta", () => {
		const polys = sourcePolygons(src, [wall(400, 530, 600, 530)]);
		const inUnion = (p: { x: number; y: number }) =>
			polys.some((poly) => pointInPolygon(p, poly));
		expect(inUnion({ x: 500, y: 560 })).toBe(false); // atrás da parede, colado
		expect(inUnion({ x: 500, y: 520 })).toBe(true);
	});
});

describe("memória da exploração com cone", () => {
	it("só marca as células da frente (e a casa ao redor), não as de trás", () => {
		const grid = createExploredGrid(exploredMeta(1000, 800, 70));
		const src: VisionSource = {
			id: "pc",
			x: 500,
			y: 400,
			range: 280,
			facing: 0,
			cone: 120,
			near: 70,
		};
		for (const poly of sourcePolygons(src, [])) markPolygon(grid, poly);
		const cellAt = (x: number, y: number) =>
			isExplored(grid, Math.floor(y / 35) * grid.cols + Math.floor(x / 35));
		expect(cellAt(500, 250)).toBe(true); // frente
		expect(cellAt(500, 430)).toBe(true); // atrás, colado
		expect(cellAt(500, 600)).toBe(false); // atrás, longe
		expect(cellAt(700, 400)).toBe(false); // lado
	});
});
