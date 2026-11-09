import { describe, expect, it } from "vitest";
import {
	firstBlockingWallId,
	hasLineOfSight,
	segmentsIntersect,
	wallBlocksRay,
} from "./line-of-sight";
import type { VTTWall } from "./walls";

const wall = (
	id: string,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): VTTWall => ({ id, sceneId: "s", x1, y1, x2, y2 });

describe("segmentsIntersect", () => {
	it("cruza no meio", () => {
		expect(
			segmentsIntersect(
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
				{ x: 0, y: 10 },
				{ x: 10, y: 0 },
			),
		).toBe(true);
	});

	it("paralelos e colineares não contam", () => {
		expect(
			segmentsIntersect(
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 0, y: 1 },
				{ x: 10, y: 1 },
			),
		).toBe(false);
		expect(
			segmentsIntersect(
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 2, y: 0 },
				{ x: 8, y: 0 },
			),
		).toBe(false);
	});

	it("só tocar a ponta não conta", () => {
		expect(
			segmentsIntersect(
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 10 },
			),
		).toBe(false);
	});
});

describe("wallBlocksRay / hasLineOfSight", () => {
	const door = wall("door", 50, 0, 50, 100);

	it("sem paredes: sempre vê", () => {
		expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, [])).toBe(true);
	});

	it("mesmo ponto: sempre vê", () => {
		expect(hasLineOfSight({ x: 1, y: 1 }, { x: 1, y: 1 }, [door])).toBe(true);
	});

	it("parede no caminho bloqueia", () => {
		expect(wallBlocksRay({ x: 0, y: 50 }, { x: 100, y: 50 }, door)).toBe(true);
		expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, [door])).toBe(
			false,
		);
	});

	it("parede fora do caminho não bloqueia", () => {
		expect(hasLineOfSight({ x: 0, y: 150 }, { x: 100, y: 150 }, [door])).toBe(
			true,
		);
	});

	it("parede de comprimento zero não bloqueia", () => {
		const z = wall("z", 50, 50, 50, 50);
		expect(hasLineOfSight({ x: 0, y: 50 }, { x: 100, y: 50 }, [z])).toBe(true);
	});

	it("passar pela ponta da parede (canto) não bloqueia", () => {
		// Raio passa exatamente pela ponta (50,0) da parede vertical.
		expect(hasLineOfSight({ x: 0, y: 0 }, { x: 100, y: 0 }, [door])).toBe(true);
	});

	it("várias paredes: a primeira da lista que bloqueia", () => {
		const a = wall("a", 30, 0, 30, 100);
		const b = wall("b", 70, 0, 70, 100);
		expect(
			firstBlockingWallId({ x: 0, y: 50 }, { x: 100, y: 50 }, [a, b]),
		).toBe("a");
		expect(
			firstBlockingWallId({ x: 0, y: 50 }, { x: 100, y: 50 }, [b, a]),
		).toBe("b");
		expect(
			firstBlockingWallId({ x: 0, y: 150 }, { x: 100, y: 150 }, [a, b]),
		).toBeNull();
	});

	it("raio paralelo à parede não bloqueia", () => {
		const horizontal = wall("h", 0, 50, 100, 50);
		expect(hasLineOfSight({ x: 0, y: 0 }, { x: 100, y: 0 }, [horizontal])).toBe(
			true,
		);
	});

	it("bloqueia movimento de token que tenta atravessar uma parede", () => {
		const dividingWall = wall("wall-1", 70, 0, 70, 200);
		// Tentativa de mover do lado esquerdo (x=35) para o direito (x=105)
		const startPos = { x: 35, y: 70 };
		const destPos = { x: 105, y: 70 };
		expect(hasLineOfSight(startPos, destPos, [dividingWall])).toBe(false);

		// Movimento no mesmo lado da parede (não atravessa)
		const validPos = { x: 35, y: 140 };
		expect(hasLineOfSight(startPos, validPos, [dividingWall])).toBe(true);
	});
});
