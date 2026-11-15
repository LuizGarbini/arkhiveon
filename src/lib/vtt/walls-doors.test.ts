import { describe, expect, it } from "vitest";
import { hasLineOfSight } from "./line-of-sight";
import {
	isSeenByAny,
	pointInPolygon,
	visibilityPolygon,
	visionSector,
} from "./vision";
import {
	blockingWalls,
	blocksSight,
	DOOR_REACH_CELLS,
	doorWithinReach,
	draftToWalls,
	hitTestDoor,
	isDoor,
	type VTTWall,
} from "./walls";

const wall = (id: string, over: Partial<VTTWall> = {}): VTTWall => ({
	id,
	sceneId: "s",
	x1: 100,
	y1: -50,
	x2: 100,
	y2: 50,
	...over,
});
const closedDoor = (id = "d") => wall(id, { kind: "door", isOpen: false });
const openDoor = (id = "d") => wall(id, { kind: "door", isOpen: true });

describe("o que bloqueia", () => {
	it("parede comum (com ou sem kind) sempre bloqueia", () => {
		expect(blocksSight(wall("a"))).toBe(true);
		expect(blocksSight(wall("a", { kind: "wall" }))).toBe(true);
		expect(blocksSight(wall("a", { kind: "wall", isOpen: true }))).toBe(true);
	});

	it("porta fechada bloqueia; aberta não", () => {
		expect(blocksSight(closedDoor())).toBe(true);
		expect(blocksSight(wall("d", { kind: "door" }))).toBe(true); // sem estado = fechada
		expect(blocksSight(openDoor())).toBe(false);
	});

	it("isDoor só reconhece kind 'door'", () => {
		expect(isDoor(closedDoor())).toBe(true);
		expect(isDoor(wall("a"))).toBe(false);
		expect(isDoor(wall("a", { kind: "wall" }))).toBe(false);
	});

	it("blockingWalls tira só as portas abertas", () => {
		const list = [
			wall("a"),
			closedDoor("c"),
			openDoor("o"),
			wall("b", { kind: "wall" }),
		];
		expect(blockingWalls(list).map((w) => w.id)).toEqual(["a", "c", "b"]);
	});

	it("não altera a lista original", () => {
		const list = [wall("a"), openDoor("o")];
		blockingWalls(list);
		expect(list).toHaveLength(2);
	});
});

describe("porta fechada x aberta na visão", () => {
	const O = { x: 0, y: 0 };
	// parede de 400 de altura com a porta no meio (y de -50 a 50) em x=100
	const frame = [
		wall("w1", { y1: -200, y2: -50 }),
		wall("w2", { y1: 50, y2: 200 }),
	];

	it("porta FECHADA: não se vê o que há do outro lado", () => {
		const walls = blockingWalls([...frame, closedDoor()]);
		const poly = visibilityPolygon(O, 400, walls);
		expect(pointInPolygon({ x: 250, y: 0 }, poly)).toBe(false);
		expect(pointInPolygon({ x: 60, y: 0 }, poly)).toBe(true); // este lado
	});

	it("porta ABERTA: dá para ver pela abertura", () => {
		const walls = blockingWalls([...frame, openDoor()]);
		const poly = visibilityPolygon(O, 400, walls);
		expect(pointInPolygon({ x: 250, y: 0 }, poly)).toBe(true);
		expect(pointInPolygon({ x: 250, y: 150 }, poly)).toBe(false); // atrás da parede
	});

	it("o cone também atravessa a porta aberta e para na fechada", () => {
		const closed = visionSector(
			O,
			400,
			blockingWalls([...frame, closedDoor()]),
			90,
		);
		const open = visionSector(
			O,
			400,
			blockingWalls([...frame, openDoor()]),
			90,
		);
		expect(pointInPolygon({ x: 250, y: 0 }, closed)).toBe(false);
		expect(pointInPolygon({ x: 250, y: 0 }, open)).toBe(true);
	});

	it("monstro atrás da porta só é visto quando ela abre", () => {
		const src = [
			{ id: "pc", x: 0, y: 0, range: 400, facing: 90, cone: 120, near: 70 },
		];
		const target = { x: 250, y: 0 };
		expect(
			isSeenByAny(target, src, blockingWalls([...frame, closedDoor()])),
		).toBe(false);
		expect(
			isSeenByAny(target, src, blockingWalls([...frame, openDoor()])),
		).toBe(true);
	});
});

describe("porta e movimento", () => {
	it("porta fechada impede atravessar; aberta deixa passar", () => {
		const from = { x: 0, y: 0 };
		const to = { x: 200, y: 0 };
		expect(hasLineOfSight(from, to, blockingWalls([closedDoor()]))).toBe(false);
		expect(hasLineOfSight(from, to, blockingWalls([openDoor()]))).toBe(true);
	});
});

describe("draftToWalls · tipo", () => {
	const pts = [
		{ x: 0, y: 0 },
		{ x: 70, y: 0 },
		{ x: 70, y: 70 },
	];
	let n = 0;
	const id = () => `id-${++n}`;

	it("padrão: parede comum, sem kind (igual a antes)", () => {
		const walls = draftToWalls(pts, "s", id);
		expect(walls).toHaveLength(2);
		for (const w of walls) {
			expect(w.kind).toBeUndefined();
			expect(w.isOpen).toBeUndefined();
		}
	});

	it("porta: kind 'door', nasce FECHADA", () => {
		const walls = draftToWalls(pts, "s", id, "door");
		expect(walls.map((w) => [w.kind, w.isOpen])).toEqual([
			["door", false],
			["door", false],
		]);
	});

	it("pontos repetidos continuam sendo ignorados", () => {
		expect(
			draftToWalls([pts[0], pts[0], pts[1]], "s", id, "door"),
		).toHaveLength(1);
	});
});

describe("hitTestDoor · só porta", () => {
	const walls = [
		wall("w", { x1: 0, y1: 0, x2: 100, y2: 0 }),
		closedDoor("d1"),
		openDoor("d2"),
	].map((w, i) =>
		i === 1
			? { ...w, x1: 300, x2: 300 }
			: i === 2
				? { ...w, x1: 600, x2: 600 }
				: w,
	);

	it("acha a porta perto do clique, fechada ou aberta", () => {
		expect(hitTestDoor(walls, { x: 303, y: 0 }, 10)?.id).toBe("d1");
		expect(hitTestDoor(walls, { x: 598, y: 10 }, 10)?.id).toBe("d2");
	});

	it("parede comum nunca é achada, mesmo colada no clique", () => {
		expect(hitTestDoor(walls, { x: 50, y: 0 }, 10)).toBeNull();
	});

	it("longe de tudo: null", () => {
		expect(hitTestDoor(walls, { x: 450, y: 300 }, 10)).toBeNull();
		expect(hitTestDoor([], { x: 0, y: 0 }, 10)).toBeNull();
	});
});

describe("doorWithinReach · quem está perto abre", () => {
	const door = { x1: 300, y1: -35, x2: 300, y2: 35 };

	it("a 1 casa (70 px) alcança; a 3 casas não", () => {
		expect(doorWithinReach(door, [{ x: 230, y: 0 }], 70)).toBe(true);
		expect(doorWithinReach(door, [{ x: 90, y: 0 }], 70)).toBe(false);
	});

	it("o limite é 1,5 casa, medido até o segmento (não só o centro)", () => {
		const edge = 300 - 70 * DOOR_REACH_CELLS;
		expect(doorWithinReach(door, [{ x: edge + 1, y: 0 }], 70)).toBe(true);
		expect(doorWithinReach(door, [{ x: edge - 1, y: 0 }], 70)).toBe(false);
		// ao lado da porta, na direção do segmento
		expect(doorWithinReach(door, [{ x: 300, y: 35 + 100 }], 70)).toBe(true);
		expect(doorWithinReach(door, [{ x: 300, y: 35 + 110 }], 70)).toBe(false);
	});

	it("qualquer token do jogador serve; sem tokens ninguém alcança", () => {
		expect(
			doorWithinReach(
				door,
				[
					{ x: 0, y: 0 },
					{ x: 250, y: 10 },
				],
				70,
			),
		).toBe(true);
		expect(doorWithinReach(door, [], 70)).toBe(false);
	});

	it("grade inválida usa 70 px", () => {
		expect(doorWithinReach(door, [{ x: 230, y: 0 }], 0)).toBe(true);
	});
});
