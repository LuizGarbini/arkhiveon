import { describe, expect, it } from "vitest";
import { snapToGrid } from "./grid-math";
import {
	keyboardMovers,
	moveBlocked,
	planStep,
	type StepDirection,
	type StepGrid,
	type StepMember,
	stepDelta,
	stepDirectionOf,
} from "./token-step";

const square: StepGrid = { gridType: "square", gridSize: 70 };
const member = (
	id: string,
	x: number,
	y: number,
	sizeCells = 1,
): StepMember => ({
	id,
	x,
	y,
	sizeCells,
});

describe("stepDirectionOf", () => {
	it("só as quatro setas", () => {
		expect(stepDirectionOf("ArrowLeft")).toBe("left");
		expect(stepDirectionOf("ArrowRight")).toBe("right");
		expect(stepDirectionOf("ArrowUp")).toBe("up");
		expect(stepDirectionOf("ArrowDown")).toBe("down");
		for (const k of ["a", "w", "Enter", "Home", "arrowleft", "Delete", ""]) {
			expect(stepDirectionOf(k)).toBeNull();
		}
	});
});

describe("grade quadrada: uma casa por toque", () => {
	const from = { x: 455, y: 455 }; // centro da casa (6,6)
	it("anda 70 px na direção da seta", () => {
		expect(stepDelta(from, "left", square)).toEqual({ x: -70, y: 0 });
		expect(stepDelta(from, "right", square)).toEqual({ x: 70, y: 0 });
		expect(stepDelta(from, "up", square)).toEqual({ x: 0, y: -70 });
		expect(stepDelta(from, "down", square)).toEqual({ x: 0, y: 70 });
	});

	it("o passo acompanha o tamanho da casa da cena", () => {
		expect(
			stepDelta(from, "right", { gridType: "square", gridSize: 100 }),
		).toEqual({ x: 100, y: 0 });
	});

	it("grade inválida (0) usa 70 px", () => {
		expect(
			stepDelta(from, "down", { gridType: "square", gridSize: 0 }),
		).toEqual({ x: 0, y: 70 });
	});

	it("sem grade também anda uma casa (o tamanho configurado)", () => {
		expect(
			stepDelta(from, "right", { gridType: "none", gridSize: 70 }),
		).toEqual({ x: 70, y: 0 });
	});

	it("planStep leva o token para o centro da casa vizinha", () => {
		expect(planStep([member("a", 455, 455)], "right", square)).toEqual([
			{ id: "a", from: { x: 455, y: 455 }, to: { x: 525, y: 455 } },
		]);
		expect(planStep([member("a", 455, 455)], "up", square)[0]?.to).toEqual({
			x: 455,
			y: 385,
		});
	});

	it("token fora do centro da casa é encaixado ao andar", () => {
		// (470,480) + 70 → (540,480) → coluna 7, linha 6 → centro (525,455)
		expect(planStep([member("a", 470, 480)], "right", square)[0]?.to).toEqual({
			x: 525,
			y: 455,
		});
	});
});

describe("grupo: a formação anda inteira", () => {
	it("todos andam a mesma casa para o mesmo lado", () => {
		const moves = planStep(
			[member("a", 455, 455), member("b", 525, 455), member("c", 455, 525)],
			"down",
			square,
		);
		expect(moves.map((m) => m.to)).toEqual([
			{ x: 455, y: 525 },
			{ x: 525, y: 525 },
			{ x: 455, y: 595 },
		]);
		expect(moves.map((m) => m.id)).toEqual(["a", "b", "c"]);
	});

	it("a formação mantém as distâncias entre os tokens", () => {
		const members = [member("a", 455, 455), member("b", 665, 525)];
		const moves = planStep(members, "left", square);
		expect((moves[1]?.to.x ?? 0) - (moves[0]?.to.x ?? 0)).toBe(210);
		expect((moves[1]?.to.y ?? 0) - (moves[0]?.to.y ?? 0)).toBe(70);
	});

	it("token grande (2x2) anda de vértice a vértice, o pequeno de centro a centro", () => {
		const moves = planStep(
			[member("g", 70, 70, 2), member("p", 455, 455, 1)],
			"right",
			square,
		);
		expect(moves[0]?.to).toEqual({ x: 140, y: 70 }); // vértice
		expect(moves[1]?.to).toEqual({ x: 525, y: 455 }); // centro
	});

	it("lista vazia: nada", () => {
		expect(planStep([], "up", square)).toEqual([]);
	});
});

describe("grade hexagonal: um vizinho por toque, sem derivar", () => {
	const walk = (
		grid: StepGrid,
		start: { x: number; y: number },
		dir: StepDirection,
		steps: number,
	) => {
		const path = [start];
		let cur = member("t", start.x, start.y);
		for (let i = 0; i < steps; i++) {
			const to = planStep([cur], dir, grid)[0]?.to ?? start;
			path.push(to);
			cur = member("t", to.x, to.y);
		}
		return path;
	};
	const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
		Math.hypot(a.x - b.x, a.y - b.y);

	for (const gridType of ["hex_pointy", "hex_flat"] as const) {
		const grid: StepGrid = { gridType, gridSize: 70 };
		// ponto de partida: o centro de um hexágono (um token sempre está encaixado)
		const start = snapToGrid({ x: 300, y: 300 }, gridType, 70, 1);

		it(`${gridType}: cada toque vai para um hexágono vizinho (mesma distância)`, () => {
			for (const dir of ["left", "right", "up", "down"] as const) {
				const path = walk(grid, start, dir, 6);
				for (let i = 1; i < path.length; i++) {
					const d = dist(
						path[i - 1] as { x: number; y: number },
						path[i] as { x: number; y: number },
					);
					expect(d).toBeGreaterThan(70 * 0.8);
					expect(d).toBeLessThan(70 * 0.95);
				}
			}
		});

		it(`${gridType}: andar na direção da seta avança para aquele lado, e a deriva lateral não cresce`, () => {
			const right = walk(grid, start, "right", 8);
			const down = walk(grid, start, "down", 8);
			const last = (p: { x: number; y: number }[]) =>
				p[p.length - 1] as { x: number; y: number };
			expect(last(right).x - start.x).toBeGreaterThan(70 * 3);
			expect(Math.abs(last(right).y - start.y)).toBeLessThan(70); // não sobe nem desce de vez
			expect(last(down).y - start.y).toBeGreaterThan(70 * 3);
			expect(Math.abs(last(down).x - start.x)).toBeLessThan(70);
			const up = walk(grid, start, "up", 8);
			const left = walk(grid, start, "left", 8);
			expect(start.y - last(up).y).toBeGreaterThan(70 * 3);
			expect(start.x - last(left).x).toBeGreaterThan(70 * 3);
		});

		it(`${gridType}: setas opostas se desfazem`, () => {
			const there =
				planStep([member("t", start.x, start.y)], "right", grid)[0]?.to ??
				start;
			const back =
				planStep([member("t", there.x, there.y)], "left", grid)[0]?.to ?? start;
			expect(dist(back, start)).toBeLessThan(1);
		});
	}
});

describe("keyboardMovers: quem anda com a seta", () => {
	const tok = (
		id: string,
		over: Partial<{
			x: number;
			y: number;
			isLocked: boolean;
			canMove: boolean;
		}> = {},
	) => ({
		id,
		x: 455,
		y: 455,
		sizeCells: 1,
		isLocked: false,
		canMove: true,
		...over,
	});

	it("só os selecionados, na ordem da seleção", () => {
		const tokens = [tok("a"), tok("b"), tok("c")];
		expect(keyboardMovers(["c", "a"], tokens).map((m) => m.id)).toEqual([
			"c",
			"a",
		]);
	});

	it("sem seleção, ninguém anda", () => {
		expect(keyboardMovers([], [tok("a")])).toEqual([]);
	});

	it("exclui o travado e o que o usuário não controla", () => {
		const tokens = [
			tok("a"),
			tok("b", { isLocked: true }),
			tok("c", { canMove: false }),
		];
		expect(keyboardMovers(["a", "b", "c"], tokens).map((m) => m.id)).toEqual([
			"a",
		]);
	});

	it("ignora id selecionado que não existe mais e repetido", () => {
		expect(
			keyboardMovers(["fantasma", "a", "a"], [tok("a")]).map((m) => m.id),
		).toEqual(["a"]);
	});

	it("leva a posição e o tamanho do token", () => {
		expect(keyboardMovers(["a"], [tok("a", { x: 105, y: 35 })])).toEqual([
			{ id: "a", x: 105, y: 35, sizeCells: 1 },
		]);
	});
});

describe("moveBlocked: a mesma regra do arrasto", () => {
	const wall = [{ x1: 490, y1: 0, x2: 490, y2: 900 }];
	const from = { x: 455, y: 455 };
	const to = { x: 525, y: 455 };

	it("o jogador é barrado por uma parede no caminho", () => {
		expect(moveBlocked(from, to, wall, false)).toBe(true);
	});

	it("o mestre nunca é barrado", () => {
		expect(moveBlocked(from, to, wall, true)).toBe(false);
	});

	it("sem parede ou fora do caminho, passa", () => {
		expect(moveBlocked(from, to, [], false)).toBe(false);
		expect(moveBlocked(from, { x: 455, y: 525 }, wall, false)).toBe(false);
	});
});
