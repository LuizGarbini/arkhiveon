import { describe, expect, it } from "vitest";
import {
	createExploredGrid,
	decodeBits,
	encodeBits,
	exploredMeta,
	exploredRuns,
	isExplored,
	MAX_EXPLORED_CELLS,
	markIndexes,
	markPolygon,
	mergeBits,
	sameExploredMeta,
} from "./explored";
import { visibilityPolygon } from "./vision";

const grid = (w = 400, h = 300, cell = 35) =>
	createExploredGrid(exploredMeta(w, h, cell * 2));

function setOf(g: ReturnType<typeof grid>): number[] {
	const out: number[] = [];
	for (let i = 0; i < g.cols * g.rows; i++) if (isExplored(g, i)) out.push(i);
	return out;
}

describe("exploredMeta", () => {
	it("a célula é meia casa da grade", () => {
		expect(exploredMeta(4000, 3000, 70)).toEqual({
			cell: 35,
			cols: 115,
			rows: 86,
		});
	});

	it("mapa gigante aumenta a célula para caber nos limites do banco", () => {
		const m = exploredMeta(40000, 40000, 70);
		expect(m.cols * m.rows).toBeLessThanOrEqual(MAX_EXPLORED_CELLS);
		expect(m.cols).toBeLessThanOrEqual(5000);
		expect(m.cell).toBeGreaterThan(35);
		expect(m.cell).toBeLessThanOrEqual(2000);
	});

	it("entradas inválidas não quebram", () => {
		const m = exploredMeta(0, -5, 0);
		expect(m.cols).toBeGreaterThanOrEqual(1);
		expect(m.rows).toBeGreaterThanOrEqual(1);
		expect(m.cell).toBeGreaterThanOrEqual(4);
	});

	it("sameExploredMeta compara os três campos", () => {
		const a = { cell: 35, cols: 10, rows: 8 };
		expect(sameExploredMeta(a, { ...a })).toBe(true);
		expect(sameExploredMeta(a, { ...a, cell: 36 })).toBe(false);
		expect(sameExploredMeta(a, { ...a, rows: 9 })).toBe(false);
	});
});

describe("formato dos bits · igual ao do Postgres", () => {
	it("bit 0 é o menos significativo do primeiro byte (células 0,1,7,8 → 131 e 1)", () => {
		const g = createExploredGrid({ cell: 35, cols: 40, rows: 30 });
		markIndexes(g, [0, 1, 7, 8, 100, 1199]);
		expect(g.bits.length).toBe(150);
		expect(g.bits[0]).toBe(131);
		expect(g.bits[1]).toBe(1);
		expect(isExplored(g, 100)).toBe(true);
		expect(isExplored(g, 99)).toBe(false);
		expect(isExplored(g, 1199)).toBe(true);
	});

	it("fora do mapa, negativo, fracionário ou NaN é ignorado", () => {
		const g = createExploredGrid({ cell: 35, cols: 40, rows: 30 });
		expect(markIndexes(g, [5000, -1, 1.5, Number.NaN])).toBe(0);
		expect(g.bits.every((b) => b === 0)).toBe(true);
	});

	it("base64 ida e volta; tamanho errado ou lixo viram null", () => {
		const g = createExploredGrid({ cell: 35, cols: 40, rows: 30 });
		markIndexes(g, [0, 9, 777]);
		const text = encodeBits(g.bits);
		expect(text).not.toContain("\n");
		expect(decodeBits(text, 150)).toEqual(g.bits);
		expect(decodeBits(text, 149)).toBeNull();
		expect(decodeBits("%%%não é base64%%%", 150)).toBeNull();
	});
});

describe("markPolygon", () => {
	it("marca as células cujo centro está dentro; devolve só as novas", () => {
		const g = grid();
		const square = [
			{ x: 0, y: 0 },
			{ x: 70, y: 0 },
			{ x: 70, y: 70 },
			{ x: 0, y: 70 },
		];
		const first = markPolygon(g, square);
		expect(first.sort((a, b) => a - b)).toEqual([0, 1, g.cols, g.cols + 1]);
		expect(markPolygon(g, square)).toEqual([]);
	});

	it("quem decide é o CENTRO da célula: cobrir só o centro marca; só o canto, não", () => {
		const centerOnly = [
			{ x: 12, y: 12 },
			{ x: 23, y: 12 },
			{ x: 23, y: 23 },
			{ x: 12, y: 23 },
		];
		expect(markPolygon(grid(), centerOnly)).toEqual([0]);
		const cornerOnly = [
			{ x: 1, y: 1 },
			{ x: 8, y: 1 },
			{ x: 8, y: 8 },
			{ x: 1, y: 8 },
		];
		expect(markPolygon(grid(), cornerOnly)).toEqual([]);
	});

	it("marcar duas vezes o mesmo círculo de visão não acrescenta nada", () => {
		const g = grid(1000, 800);
		const poly = visibilityPolygon({ x: 500, y: 400 }, 210, []);
		const first = markPolygon(g, poly);
		expect(first.length).toBeGreaterThan(100);
		expect(markPolygon(g, poly)).toEqual([]);
	});

	it("a área marcada é a do círculo (±10%)", () => {
		const g = grid(1000, 800);
		const poly = visibilityPolygon({ x: 500, y: 400 }, 210, []);
		const cells = markPolygon(g, poly).length;
		const expected = (Math.PI * 210 * 210) / (35 * 35);
		expect(cells / expected).toBeGreaterThan(0.9);
		expect(cells / expected).toBeLessThan(1.1);
	});

	it("a parede impede marcar o que está atrás", () => {
		const g = grid(1000, 800);
		const poly = visibilityPolygon({ x: 500, y: 400 }, 280, [
			{ x1: 600, y1: 200, x2: 600, y2: 600 },
		]);
		markPolygon(g, poly);
		const at = (x: number, y: number) =>
			isExplored(g, Math.floor(y / 35) * g.cols + Math.floor(x / 35));
		expect(at(560, 400)).toBe(true);
		expect(at(700, 400)).toBe(false);
	});

	it("polígono fora do mapa ou degenerado não quebra", () => {
		const g = grid();
		expect(markPolygon(g, [])).toEqual([]);
		expect(
			markPolygon(g, [
				{ x: 0, y: 0 },
				{ x: 5, y: 5 },
			]),
		).toEqual([]);
		const far = visibilityPolygon({ x: 9000, y: 9000 }, 200, []);
		expect(markPolygon(g, far)).toEqual([]);
	});

	it("polígono que sai do mapa marca só o que está dentro", () => {
		const g = grid(400, 300);
		const poly = visibilityPolygon({ x: 10, y: 10 }, 200, []);
		const cells = markPolygon(g, poly);
		expect(cells.length).toBeGreaterThan(0);
		for (const i of cells) expect(i).toBeLessThan(g.cols * g.rows);
	});
});

describe("mergeBits", () => {
	it("junta (OR) sem perder o que já tinha", () => {
		const g = createExploredGrid({ cell: 35, cols: 8, rows: 8 });
		markIndexes(g, [0, 1]);
		const remote = new Uint8Array(8);
		remote[0] = 0b00000110; // células 1 e 2
		expect(mergeBits(g, remote)).toBe(true);
		expect([0, 1, 2].every((i) => isExplored(g, i))).toBe(true);
		expect(mergeBits(g, remote)).toBe(false);
	});

	it("tamanho diferente é ignorado", () => {
		const g = createExploredGrid({ cell: 35, cols: 8, rows: 8 });
		expect(mergeBits(g, new Uint8Array(3))).toBe(false);
	});
});

describe("exploredRuns", () => {
	it("sem células: nenhum retângulo", () => {
		expect(exploredRuns(grid())).toEqual([]);
	});

	it("um bloco 3×2 vira UM retângulo", () => {
		const g = createExploredGrid({ cell: 10, cols: 10, rows: 10 });
		markIndexes(g, [11, 12, 13, 21, 22, 23]);
		expect(exploredRuns(g)).toEqual([{ x: 10, y: 10, w: 30, h: 20 }]);
	});

	it("cobre exatamente as células marcadas (ida e volta, em formas variadas)", () => {
		const g = createExploredGrid({ cell: 10, cols: 30, rows: 25 });
		// pseudo-aleatório determinístico + um círculo
		let seed = 7;
		const rnd = () => {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			return seed / 0x7fffffff;
		};
		const picks: number[] = [];
		for (let i = 0; i < 300; i++) picks.push(Math.floor(rnd() * 750));
		markIndexes(g, picks);
		markPolygon(g, visibilityPolygon({ x: 150, y: 120 }, 90, []));
		const covered = new Set<number>();
		for (const r of exploredRuns(g)) {
			for (let y = r.y; y < r.y + r.h; y += 10) {
				for (let x = r.x; x < r.x + r.w; x += 10) {
					const i = (y / 10) * 30 + x / 10;
					expect(covered.has(i), `célula ${i} coberta duas vezes`).toBe(false);
					covered.add(i);
				}
			}
		}
		expect([...covered].sort((a, b) => a - b)).toEqual(setOf(g));
	});

	it("poucos retângulos para uma sala grande explorada", () => {
		const g = grid(4000, 3000);
		markPolygon(g, visibilityPolygon({ x: 2000, y: 1500 }, 800, []));
		expect(exploredRuns(g).length).toBeLessThan(200);
	});
});
