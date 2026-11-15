import { describe, expect, it } from "vitest";
import {
	clearIndexes,
	createExploredGrid,
	decodeBits,
	doorRevealed,
	encodeBits,
	exploredMeta,
	exploredRuns,
	fogPathCells,
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

describe("clearIndexes", () => {
	it("apaga só as células pedidas e conta as que estavam marcadas", () => {
		const g = createExploredGrid({ cell: 35, cols: 40, rows: 30 });
		markIndexes(g, [1, 2, 3, 100]);
		expect(clearIndexes(g, [2, 100, 7])).toBe(2); // o 7 nunca esteve marcado
		expect(isExplored(g, 1) && isExplored(g, 3)).toBe(true);
		expect(isExplored(g, 2) || isExplored(g, 100)).toBe(false);
	});

	it("ignora índice fora do mapa, negativo, fracionário e NaN", () => {
		const g = createExploredGrid({ cell: 35, cols: 8, rows: 8 });
		markIndexes(g, [0]);
		expect(clearIndexes(g, [5000, -1, 1.5, Number.NaN])).toBe(0);
		expect(isExplored(g, 0)).toBe(true);
	});

	it("não mexe nos bits vizinhos do mesmo byte", () => {
		const g = createExploredGrid({ cell: 35, cols: 8, rows: 8 });
		markIndexes(g, [0, 1, 2, 3, 4, 5, 6, 7]);
		clearIndexes(g, [3]);
		expect(g.bits[0]).toBe(0b11110111);
	});
});

describe("fogPathCells · o que a forma da névoa cobre", () => {
	const grid = () => createExploredGrid(exploredMeta(1400, 900, 70)); // célula de 35 px
	const centerOf = (g: ReturnType<typeof grid>, i: number) => ({
		x: (i % g.cols) * g.cell + g.cell / 2,
		y: Math.floor(i / g.cols) * g.cell + g.cell / 2,
	});

	it("círculo: só células com o centro dentro do raio", () => {
		const g = grid();
		const cells = fogPathCells(g, {
			type: "circle",
			x: 490,
			y: 455,
			radius: 70,
		});
		expect(cells.length).toBeGreaterThan(10);
		for (const i of cells) {
			const c = centerOf(g, i);
			expect(Math.hypot(c.x - 490, c.y - 455)).toBeLessThanOrEqual(70);
		}
		const area = (cells.length * 35 * 35) / (Math.PI * 70 * 70);
		expect(area).toBeGreaterThan(0.85);
		expect(area).toBeLessThan(1.15);
	});

	it("retângulo: as células cujo centro cai dentro", () => {
		const g = grid();
		const cells = fogPathCells(g, {
			type: "rect",
			x: 70,
			y: 70,
			width: 70,
			height: 70,
		});
		expect(cells.sort((a, b) => a - b)).toEqual([
			2 * g.cols + 2,
			2 * g.cols + 3,
			3 * g.cols + 2,
			3 * g.cols + 3,
		]);
	});

	it("pincel com vários pontos: a faixa em volta do traço", () => {
		const g = grid();
		const cells = fogPathCells(g, {
			type: "brush",
			brushRadius: 20,
			points: [
				{ x: 100, y: 100 },
				{ x: 300, y: 100 },
			],
		});
		for (const i of cells) {
			const c = centerOf(g, i);
			expect(c.x).toBeGreaterThanOrEqual(80);
			expect(c.x).toBeLessThanOrEqual(320);
			expect(Math.abs(c.y - 100)).toBeLessThanOrEqual(20);
		}
		// faixa de 40 px de altura em torno de y=100: só a linha de células de y≈87,5 (7 colunas)
		expect(cells).toHaveLength(7);
	});

	it("pincel com um traço de vários trechos cobre TODOS os trechos (traço em L)", () => {
		const g = grid();
		const cells = fogPathCells(g, {
			type: "brush",
			brushRadius: 20,
			points: [
				{ x: 100, y: 100 },
				{ x: 300, y: 100 },
				{ x: 300, y: 300 },
			],
		});
		const has = (x: number, y: number) =>
			cells.includes(Math.floor(y / 35) * g.cols + Math.floor(x / 35));
		expect(has(150, 90)).toBe(true); // 1º trecho
		expect(has(300, 250)).toBe(true); // 2º trecho (o que só o 1º segmento não pega)
		expect(has(150, 250)).toBe(false); // dentro do L, longe do traço
	});

	it("pincel com um ponto só é um círculo", () => {
		const g = grid();
		const one = fogPathCells(g, {
			type: "brush",
			brushRadius: 40,
			points: [{ x: 200, y: 200 }],
		});
		const circle = fogPathCells(g, {
			type: "circle",
			x: 200,
			y: 200,
			radius: 40,
		});
		expect(one).toEqual(circle);
	});

	it("forma que sai do mapa só devolve células dentro dele", () => {
		const g = grid();
		const cells = fogPathCells(g, { type: "circle", x: 5, y: 5, radius: 100 });
		for (const i of cells) expect(i).toBeLessThan(g.cols * g.rows);
		expect(cells.length).toBeGreaterThan(0);
		expect(
			fogPathCells(g, { type: "circle", x: 9000, y: 9000, radius: 50 }),
		).toEqual([]);
	});

	it("forma vazia ou inválida: nada", () => {
		const g = grid();
		expect(
			fogPathCells(g, { type: "circle", x: 10, y: 10, radius: 0 }),
		).toEqual([]);
		expect(
			fogPathCells(g, { type: "rect", x: 10, y: 10, width: 0, height: 50 }),
		).toEqual([]);
		expect(
			fogPathCells(g, { type: "brush", brushRadius: 20, points: [] }),
		).toEqual([]);
		expect(
			fogPathCells(g, { type: "brush", points: [{ x: 1, y: 1 }] }),
		).toEqual([]);
	});
});

describe("doorRevealed · o jogador já viu esta porta?", () => {
	const g = () => createExploredGrid(exploredMeta(1400, 900, 70)); // célula 35 px
	const cellAt = (grid: ReturnType<typeof g>, x: number, y: number) =>
		Math.floor(y / 35) * grid.cols + Math.floor(x / 35);
	// porta vertical em x=560 (borda entre as colunas 15 e 16), de y=420 a 560
	const door = { x1: 560, y1: 420, x2: 560, y2: 560 };

	it("sem grade carregada: não aparece", () => {
		expect(doorRevealed(door, null)).toBe(false);
	});

	it("nada explorado: a porta escondida não aparece", () => {
		expect(doorRevealed(door, g())).toBe(false);
	});

	it("explorou só do lado de cá da parede: a porta aparece (é a borda da visão)", () => {
		const grid = g();
		markIndexes(grid, [cellAt(grid, 540, 490)]); // coluna 15, atrás de quem olha
		expect(doorRevealed(door, grid)).toBe(true);
	});

	it("explorou só do outro lado: também aparece (quem está do lado de lá a vê)", () => {
		const grid = g();
		markIndexes(grid, [cellAt(grid, 580, 490)]); // coluna 16
		expect(doorRevealed(door, grid)).toBe(true);
	});

	it("explorou longe da porta: não aparece", () => {
		const grid = g();
		markIndexes(grid, [cellAt(grid, 100, 100), cellAt(grid, 900, 700)]);
		expect(doorRevealed(door, grid)).toBe(false);
	});

	it("funciona com porta horizontal e diagonal", () => {
		const grid = g();
		markIndexes(grid, [cellAt(grid, 490, 420 - 20)]); // acima de uma porta horizontal
		expect(doorRevealed({ x1: 420, y1: 420, x2: 560, y2: 420 }, grid)).toBe(
			true,
		);
		const grid2 = g();
		// as células dos lados da diagonal são (16,17) e (17,16); a (17,17) está EM CIMA dela
		markIndexes(grid2, [cellAt(grid2, 581, 608)]);
		expect(doorRevealed({ x1: 560, y1: 560, x2: 630, y2: 630 }, grid2)).toBe(
			true,
		);
	});

	it("porta na borda do mapa e porta de comprimento zero não quebram", () => {
		const grid = g();
		expect(doorRevealed({ x1: 0, y1: 0, x2: 0, y2: 70 }, grid)).toBe(false);
		expect(doorRevealed({ x1: 5, y1: 5, x2: 5, y2: 5 }, grid)).toBe(false);
		expect(doorRevealed({ x1: 1400, y1: 100, x2: 1400, y2: 170 }, grid)).toBe(
			false,
		);
	});
});
