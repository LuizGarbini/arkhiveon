import { describe, expect, it } from "vitest";
import { hasLineOfSight } from "./line-of-sight";
import { isSeenByAny, pointInPolygon, visibilityPolygon } from "./vision";
import {
	blockingWalls,
	blocksMovement,
	blocksSight,
	draftToWalls,
	hitTestDoor,
	hitTestDoorIcon,
	isDoor,
	isOpenable,
	isWindow,
	mapWallRow,
	movementBlockingWalls,
	type VTTWall,
	withWallKind,
} from "./walls";

const seg = (id: string, over: Partial<VTTWall> = {}): VTTWall => ({
	id,
	sceneId: "s",
	x1: 100,
	y1: -50,
	x2: 100,
	y2: 50,
	...over,
});
const wall = seg("wall");
const door = (open: boolean) => seg("door", { kind: "door", isOpen: open });
const win = (open: boolean) => seg("win", { kind: "window", isOpen: open });

describe("tipos", () => {
	it("isWindow, isDoor e isOpenable distinguem os três", () => {
		expect(isWindow(win(false))).toBe(true);
		expect(isWindow(door(false))).toBe(false);
		expect(isWindow(wall)).toBe(false);
		expect(isDoor(win(false))).toBe(false);
		expect(isOpenable(win(false))).toBe(true);
		expect(isOpenable(door(false))).toBe(true);
		expect(isOpenable(wall)).toBe(false);
	});
});

describe("janela e a VISÃO: fechada bloqueia, aberta deixa ver", () => {
	it("janela fechada bloqueia a visão, como a porta fechada", () => {
		expect(blocksSight(win(false))).toBe(true);
		expect(blocksSight(door(false))).toBe(true);
	});

	it("janela aberta deixa ver, como a porta aberta; parede nunca", () => {
		expect(blocksSight(win(true))).toBe(false);
		expect(blocksSight(door(true))).toBe(false);
		expect(blocksSight(wall)).toBe(true);
	});

	it("blockingWalls (a visão) solta a janela aberta e mantém a fechada", () => {
		const out = blockingWalls(
			[wall, win(false), win(true)].map((w, i) => ({ ...w, id: `x${i}` })),
		);
		expect(out.map((w) => w.id)).toEqual(["x0", "x1"]);
	});

	it("de verdade: com a janela fechada não se vê o outro lado; aberta, vê", () => {
		const a = { x: 0, y: 0 };
		const b = { x: 200, y: 0 };
		expect(hasLineOfSight(a, b, blockingWalls([win(false)]))).toBe(false);
		expect(hasLineOfSight(a, b, blockingWalls([win(true)]))).toBe(true);
	});

	it("o cone de visão atravessa a janela aberta e para na fechada", () => {
		const src = { id: "t", x: 0, y: 0, range: 300, cone: 360 };
		const open = isSeenByAny(
			{ x: 200, y: 0 },
			[src],
			blockingWalls([win(true)]),
		);
		const closed = isSeenByAny(
			{ x: 200, y: 0 },
			[src],
			blockingWalls([win(false)]),
		);
		expect(open).toBe(true);
		expect(closed).toBe(false);
		// e a área vista: o ponto atrás da janela só está dentro com ela aberta
		const behind = { x: 200, y: 0 };
		const polyOpen = visibilityPolygon(
			{ x: 0, y: 0 },
			300,
			blockingWalls([win(true)]),
		);
		const polyClosed = visibilityPolygon(
			{ x: 0, y: 0 },
			300,
			blockingWalls([win(false)]),
		);
		expect(pointInPolygon(behind, polyOpen)).toBe(true);
		expect(pointInPolygon(behind, polyClosed)).toBe(false);
	});
});

describe("janela e o MOVIMENTO: ninguém passa, aberta ou fechada", () => {
	it("a janela barra o movimento aberta E fechada", () => {
		expect(blocksMovement(win(false))).toBe(true);
		expect(blocksMovement(win(true))).toBe(true);
	});

	it("a porta aberta deixa passar; a fechada e a parede, não (como antes)", () => {
		expect(blocksMovement(door(true))).toBe(false);
		expect(blocksMovement(door(false))).toBe(true);
		expect(blocksMovement(wall)).toBe(true);
	});

	it("movementBlockingWalls: janela aberta fica, porta aberta sai", () => {
		const list = [
			{ ...wall, id: "parede" },
			{ ...door(true), id: "porta-aberta" },
			{ ...door(false), id: "porta-fechada" },
			{ ...win(true), id: "janela-aberta" },
			{ ...win(false), id: "janela-fechada" },
		];
		expect(movementBlockingWalls(list).map((w) => w.id)).toEqual([
			"parede",
			"porta-fechada",
			"janela-aberta",
			"janela-fechada",
		]);
	});

	it("de verdade: o jogador não atravessa a janela aberta, mas atravessa a porta aberta", () => {
		const from = { x: 0, y: 0 };
		const to = { x: 200, y: 0 };
		expect(hasLineOfSight(from, to, movementBlockingWalls([win(true)]))).toBe(
			false,
		);
		expect(hasLineOfSight(from, to, movementBlockingWalls([door(true)]))).toBe(
			true,
		);
	});

	it("ver e passar são coisas diferentes: janela aberta é vista através, mas barra", () => {
		const w = [win(true)];
		const from = { x: 0, y: 0 };
		const to = { x: 200, y: 0 };
		expect(hasLineOfSight(from, to, blockingWalls(w))).toBe(true); // vê
		expect(hasLineOfSight(from, to, movementBlockingWalls(w))).toBe(false); // não passa
	});
});

describe("clicar no ícone da janela", () => {
	it("o ícone da janela é clicável como o da porta", () => {
		const w = win(false);
		expect(hitTestDoorIcon([w], { x: 100, y: 0 }, 19)?.id).toBe("win");
		expect(hitTestDoorIcon([w], { x: 100, y: 40 }, 19)).toBeNull(); // no vão, longe do ícone
		expect(hitTestDoor([w], { x: 100, y: 40 }, 5)?.id).toBe("win");
	});

	it("parede comum continua sem ícone", () => {
		expect(hitTestDoorIcon([wall], { x: 100, y: 0 }, 19)).toBeNull();
	});
});

describe("modelo da janela", () => {
	it("draftToWalls cria janela fechada", () => {
		const out = draftToWalls(
			[
				{ x: 0, y: 0 },
				{ x: 70, y: 0 },
			],
			"s",
			() => "id",
			"window",
		);
		expect(out).toEqual([
			{
				id: "id",
				sceneId: "s",
				x1: 0,
				y1: 0,
				x2: 70,
				y2: 0,
				kind: "window",
				isOpen: false,
			},
		]);
	});

	it("mapWallRow lê janela com o estado; parede segue sem kind", () => {
		const base = { id: "a", scene_id: "s", x1: 0, y1: 0, x2: 1, y2: 1 };
		expect(
			mapWallRow({ ...base, kind: "window", is_open: true }),
		).toMatchObject({ kind: "window", isOpen: true });
		expect(
			mapWallRow({ ...base, kind: "window", is_open: false }),
		).toMatchObject({ kind: "window", isOpen: false });
		expect("kind" in mapWallRow({ ...base, kind: "wall" })).toBe(false);
		expect("kind" in mapWallRow({ ...base, kind: "portal" })).toBe(false);
	});

	it("withWallKind: janela nasce fechada, e parede perde o estado", () => {
		expect(withWallKind(wall, "window")).toMatchObject({
			kind: "window",
			isOpen: false,
		});
		expect(withWallKind(win(true), "door")).toMatchObject({
			kind: "door",
			isOpen: false,
		});
		expect(withWallKind(door(true), "window")).toMatchObject({
			kind: "window",
			isOpen: false,
		});
		const back = withWallKind(win(true), "wall");
		expect("kind" in back || "isOpen" in back).toBe(false);
	});
});
