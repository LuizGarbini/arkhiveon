import { describe, expect, it } from "vitest";
import {
	applyWallOp,
	draftToWalls,
	hitTestWall,
	invertWallOp,
	isMissingWallsTable,
	snapWallPoint,
	type VTTWall,
} from "./walls";

const w = (id: string, x1: number, y1: number, x2: number, y2: number) =>
	({ id, sceneId: "s", x1, y1, x2, y2 }) as VTTWall;

describe("snapWallPoint", () => {
	it("grade quadrada: vai ao canto mais próximo", () => {
		expect(snapWallPoint({ x: 33, y: 108 }, "square", 70)).toEqual({
			x: 0,
			y: 140,
		});
		expect(snapWallPoint({ x: 36, y: 104 }, "square", 70)).toEqual({
			x: 70,
			y: 70,
		});
	});
	it("offset desloca o canto", () => {
		expect(
			snapWallPoint({ x: 20, y: 20 }, "square", 50, false, { x: 12, y: 7 }),
		).toEqual({ x: 12, y: 7 });
	});
	it("Shift solta o snap", () => {
		expect(snapWallPoint({ x: 33, y: 108 }, "square", 70, true)).toEqual({
			x: 33,
			y: 108,
		});
	});
	it("hex e sem grade desenham livre", () => {
		expect(snapWallPoint({ x: 33, y: 108 }, "hex_flat", 70)).toEqual({
			x: 33,
			y: 108,
		});
		expect(snapWallPoint({ x: 33, y: 108 }, "none", 70)).toEqual({
			x: 33,
			y: 108,
		});
	});
});

describe("hitTestWall", () => {
	const walls = [w("a", 0, 0, 100, 0), w("b", 0, 20, 100, 20)];
	it("seleciona a mais próxima dentro da tolerância", () => {
		expect(hitTestWall(walls, { x: 50, y: 4 }, 8)).toBe("a");
		expect(hitTestWall(walls, { x: 50, y: 15 }, 8)).toBe("b");
	});
	it("fora da tolerância ou além da ponta não pega", () => {
		expect(hitTestWall(walls, { x: 50, y: 10 }, 8)).toBeNull();
		expect(hitTestWall(walls, { x: 120, y: 0 }, 8)).toBeNull();
	});
});

describe("polilinha e histórico", () => {
	it("draftToWalls liga pontos consecutivos e ignora repetidos", () => {
		let n = 0;
		const out = draftToWalls(
			[
				{ x: 0, y: 0 },
				{ x: 70, y: 0 },
				{ x: 70, y: 0 },
				{ x: 70, y: 70 },
			],
			"s",
			() => `w${++n}`,
		);
		expect(out.map((x) => [x.x1, x.y1, x.x2, x.y2])).toEqual([
			[0, 0, 70, 0],
			[70, 0, 70, 70],
		]);
	});
	it("create/delete e a inversa voltam ao estado anterior", () => {
		const base = [w("a", 0, 0, 1, 1)];
		const op = { kind: "create" as const, walls: [w("b", 2, 2, 3, 3)] };
		const after = applyWallOp(base, op);
		expect(after.map((x) => x.id)).toEqual(["a", "b"]);
		expect(applyWallOp(after, invertWallOp(op))).toEqual(base);
		// Recriar não duplica.
		expect(applyWallOp(after, op).map((x) => x.id)).toEqual(["a", "b"]);
	});
});

describe("isMissingWallsTable", () => {
	it("reconhece tabela ausente (PostgREST e Postgres)", () => {
		expect(isMissingWallsTable({ code: "PGRST205" })).toBe(true);
		expect(isMissingWallsTable({ code: "42P01" })).toBe(true);
		expect(
			isMissingWallsTable({ code: "42501", message: "permission denied" }),
		).toBe(false);
		expect(isMissingWallsTable(null)).toBe(false);
	});
});

describe("op move (arrastar paredes)", () => {
	const from = { x1: 0, y1: 0, x2: 70, y2: 0 };
	const to = { x1: 5.5, y1: 3, x2: 75.5, y2: 3 };
	const base: VTTWall[] = [
		{ ...w("a", 0, 0, 70, 0) },
		{ ...w("d", 100, 0, 100, 70), kind: "door", isOpen: true },
	];

	it("aplica só as coordenadas e preserva tipo e estado", () => {
		const next = applyWallOp(base, {
			kind: "move",
			moves: [{ id: "d", from: { x1: 100, y1: 0, x2: 100, y2: 70 }, to }],
		});
		expect(next[0]).toEqual(base[0]);
		expect(next[1]).toEqual({ ...base[1], ...to });
		expect(next[1]).toMatchObject({ kind: "door", isOpen: true });
	});

	it("a inversa troca de-para e desfaz exatamente", () => {
		const op = { kind: "move" as const, moves: [{ id: "a", from, to }] };
		const moved = applyWallOp(base, op);
		expect(moved[0]).toMatchObject(to);
		expect(applyWallOp(moved, invertWallOp(op))).toEqual(base);
	});

	it("id que sumiu não faz nada (nem recria a parede)", () => {
		const next = applyWallOp(base, {
			kind: "move",
			moves: [{ id: "x", from, to }],
		});
		expect(next).toEqual(base);
	});
});
