import { describe, expect, it } from "vitest";
import {
	beginWallPress,
	computeWallDrag,
	gridSnapActive,
	hitTestVertex,
	loadWallSnapPref,
	movesBetween,
	nearestPoint,
	nudgeDelta,
	pickWallGrab,
	resolveWallPoint,
	roundWallCoord,
	saveWallSnapPref,
	translateCoords,
	type WallSnapContext,
	wallEndpoints,
	wallsSharingPoint,
} from "./wall-edit";
import type { VTTWall } from "./walls";

const wall = (id: string, x1: number, y1: number, x2: number, y2: number) =>
	({ id, sceneId: "s", x1, y1, x2, y2 }) satisfies VTTWall;

const ctx = (over: Partial<WallSnapContext> = {}): WallSnapContext => ({
	gridType: "square",
	gridSize: 70,
	origin: { x: 0, y: 0 },
	snapGrid: false,
	invert: false,
	magnetOff: false,
	magnetRadius: 10,
	...over,
});

describe("resolveWallPoint · grade, Shift e ímã", () => {
	it("padrão (grade desligada): fica no pixel do mapa, 2 casas decimais", () => {
		const r = resolveWallPoint({ x: 123.4567, y: 45.6789 }, ctx(), []);
		expect(r.point).toEqual({ x: 123.46, y: 45.68 });
		expect(r.magnet).toBeNull();
	});

	it("grade ligada: encaixa no canto mais próximo", () => {
		const r = resolveWallPoint({ x: 100, y: 60 }, ctx({ snapGrid: true }), []);
		expect(r.point).toEqual({ x: 70, y: 70 });
	});

	it("Shift inverte: grade ligada → livre; desligada → encaixa", () => {
		expect(
			resolveWallPoint(
				{ x: 100.5, y: 60.25 },
				ctx({ snapGrid: true, invert: true }),
				[],
			).point,
		).toEqual({ x: 100.5, y: 60.25 });
		expect(
			resolveWallPoint({ x: 100, y: 60 }, ctx({ invert: true }), []).point,
		).toEqual({ x: 70, y: 70 });
		expect(gridSnapActive(false, false)).toBe(false);
		expect(gridSnapActive(true, false)).toBe(true);
		expect(gridSnapActive(true, true)).toBe(false);
		expect(gridSnapActive(false, true)).toBe(true);
	});

	it("grade com deslocamento (origem) encaixa nos cantos deslocados", () => {
		const r = resolveWallPoint(
			{ x: 33, y: 33 },
			ctx({ snapGrid: true, origin: { x: 30, y: 30 } }),
			[],
		);
		expect(r.point).toEqual({ x: 30, y: 30 });
	});

	it("hex e sem grade ficam livres mesmo com a grade ligada", () => {
		const hex = resolveWallPoint(
			{ x: 33.3, y: 44.4 },
			ctx({ snapGrid: true, gridType: "hex-pointy" }),
			[],
		);
		expect(hex.point).toEqual({ x: 33.3, y: 44.4 });
	});

	it("ímã: dentro do alcance usa EXATAMENTE a ponta da outra parede", () => {
		const target = { x: 200.123456, y: 80.987654 };
		const r = resolveWallPoint({ x: 205, y: 84 }, ctx(), [target]);
		expect(r.point).toEqual(target);
		expect(r.magnet).toEqual(target);
	});

	it("ímã: fora do alcance não encaixa", () => {
		const r = resolveWallPoint({ x: 215, y: 80 }, ctx(), [{ x: 200, y: 80 }]);
		expect(r.magnet).toBeNull();
		expect(r.point).toEqual({ x: 215, y: 80 });
	});

	it("ímã vence a grade; Alt desliga o ímã", () => {
		const target = { x: 203, y: 81 };
		const withGrid = ctx({ snapGrid: true });
		expect(
			resolveWallPoint({ x: 205, y: 84 }, withGrid, [target]).point,
		).toEqual(target);
		const off = resolveWallPoint(
			{ x: 205, y: 84 },
			{ ...withGrid, magnetOff: true },
			[target],
		);
		expect(off.magnet).toBeNull();
		expect(off.point).toEqual({ x: 210, y: 70 });
	});

	it("o alcance do ímã vem do zoom (10 px de tela)", () => {
		// A 2x de zoom, 10 px de tela são 5 unidades do mapa.
		const c = ctx({ magnetRadius: 10 / 2 });
		expect(
			resolveWallPoint({ x: 207, y: 80 }, c, [{ x: 200, y: 80 }]).magnet,
		).toBeNull();
		expect(
			resolveWallPoint({ x: 204, y: 80 }, c, [{ x: 200, y: 80 }]).magnet,
		).not.toBeNull();
	});

	it("duas paredes unidas pelo ímã compartilham exatamente o mesmo ponto", () => {
		const a = wall("a", 10.37, 20.91, 150.5, 99.25);
		const second = resolveWallPoint(
			{ x: 153, y: 102 },
			ctx(),
			wallEndpoints([a]),
		);
		const b = wall("b", second.point.x, second.point.y, 300, 99.25);
		expect(b.x1).toBe(a.x2);
		expect(b.y1).toBe(a.y2);
	});
});

describe("nearestPoint / wallEndpoints", () => {
	it("escolhe a mais próxima e ignora o que está fora do raio", () => {
		const pts = [
			{ x: 0, y: 0 },
			{ x: 5, y: 0 },
		];
		expect(nearestPoint(pts, { x: 4, y: 0 }, 10)).toEqual({ x: 5, y: 0 });
		expect(nearestPoint(pts, { x: 50, y: 0 }, 10)).toBeNull();
	});

	it("exclui as paredes pedidas", () => {
		const ws = [wall("a", 0, 0, 1, 1), wall("b", 5, 5, 6, 6)];
		expect(wallEndpoints(ws, new Set(["a"]))).toEqual([
			{ x: 5, y: 5 },
			{ x: 6, y: 6 },
		]);
	});
});

describe("translateCoords / movesBetween", () => {
	it("desloca as duas pontas e arredonda em 2 casas", () => {
		expect(translateCoords(wall("a", 0, 0, 70, 0), 10.126, -3.004)).toEqual({
			x1: 10.13,
			y1: -3,
			x2: 80.13,
			y2: -3,
		});
		expect(roundWallCoord(1.005)).toBeCloseTo(1, 1);
	});

	it("só lista quem mudou e leva de-para", () => {
		const before = [wall("a", 0, 0, 10, 0), wall("b", 5, 5, 6, 6)];
		const after = [wall("a", 1, 0, 11, 0), wall("b", 5, 5, 6, 6)];
		expect(movesBetween(before, after, new Set(["a", "b"]))).toEqual([
			{
				id: "a",
				from: { x1: 0, y1: 0, x2: 10, y2: 0 },
				to: { x1: 1, y1: 0, x2: 11, y2: 0 },
			},
		]);
	});
});

describe("vértices", () => {
	const ws = [
		wall("a", 0, 0, 70, 0),
		wall("b", 70, 0, 70, 70),
		wall("c", 140, 0, 140, 70),
	];

	it("acha o vértice de parede selecionada, não o de outra", () => {
		expect(hitTestVertex(ws, ["a"], { x: 72, y: 3 }, 8)).toEqual({
			x: 70,
			y: 0,
		});
		expect(hitTestVertex(ws, ["c"], { x: 72, y: 3 }, 8)).toBeNull();
	});

	it("paredes que compartilham exatamente o ponto", () => {
		expect(wallsSharingPoint(ws, { x: 70, y: 0 }).map((w) => w.id)).toEqual([
			"a",
			"b",
		]);
	});
});

describe("pickWallGrab · o que o clique pegou", () => {
	const ws = [wall("a", 0, 0, 100, 0), wall("b", 100, 0, 100, 100)];

	it("vértice de selecionada vence o corpo e leva as que compartilham o ponto", () => {
		const g = pickWallGrab({
			walls: ws,
			selectedIds: ["a"],
			world: { x: 101, y: 1 },
			scale: 1,
			shift: false,
		});
		expect(g).toMatchObject({ type: "press", mode: "vertex", select: null });
		expect(g && g.type === "press" && g.ids.sort()).toEqual(["a", "b"]);
	});

	it("corpo de parede não selecionada: seleciona só ela e arrasta só ela", () => {
		const g = pickWallGrab({
			walls: ws,
			selectedIds: [],
			world: { x: 50, y: 2 },
			scale: 1,
			shift: false,
		});
		expect(g).toMatchObject({
			type: "press",
			mode: "body",
			ids: ["a"],
			select: ["a"],
		});
	});

	it("corpo de selecionada: arrasta TODAS as selecionadas, seleção intacta", () => {
		const g = pickWallGrab({
			walls: ws,
			selectedIds: ["a", "b"],
			world: { x: 50, y: 2 },
			scale: 1,
			shift: false,
		});
		expect(g).toMatchObject({
			type: "press",
			mode: "body",
			ids: ["a", "b"],
			select: null,
			wasMultiSelected: true,
		});
	});

	it("Shift+clique só alterna a seleção", () => {
		expect(
			pickWallGrab({
				walls: ws,
				selectedIds: [],
				world: { x: 50, y: 2 },
				scale: 1,
				shift: true,
			}),
		).toEqual({ type: "toggle", id: "a" });
	});

	it("o alcance é em px de tela: a 4x de zoom 8 px são 2 unidades", () => {
		const far = pickWallGrab({
			walls: ws,
			selectedIds: [],
			world: { x: 50, y: 5 },
			scale: 4,
			shift: false,
		});
		expect(far).toBeNull();
	});
});

describe("computeWallDrag · corpo", () => {
	const ws = [
		wall("a", 0, 0, 100, 0),
		wall("b", 100, 0, 100, 100),
		wall("far", 500, 500, 600, 500),
	];
	const press = (ids: string[], world = { x: 50, y: 0 }) =>
		beginWallPress({
			mode: "body",
			hitId: ids[0],
			wasMultiSelected: ids.length > 1,
			screen: { x: 0, y: 0 },
			world,
			walls: ws,
			ids,
		});

	it("move todas as selecionadas pelo mesmo deslocamento; as outras ficam", () => {
		const p = press(["a", "b"]);
		const r = computeWallDrag(p, { x: 63.3, y: 21.7 }, ctx());
		expect(r.moves.map((m) => m.id).sort()).toEqual(["a", "b"]);
		expect(r.walls.find((w) => w.id === "a")).toMatchObject({
			x1: 13.3,
			y1: 21.7,
			x2: 113.3,
			y2: 21.7,
		});
		expect(r.walls.find((w) => w.id === "far")).toEqual(ws[2]);
	});

	it("porta e janela mantêm tipo e estado", () => {
		const door: VTTWall = {
			...wall("d", 0, 0, 70, 0),
			kind: "door",
			isOpen: true,
		};
		const p = beginWallPress({
			mode: "body",
			hitId: "d",
			wasMultiSelected: false,
			screen: { x: 0, y: 0 },
			world: { x: 10, y: 0 },
			walls: [door],
			ids: ["d"],
		});
		const r = computeWallDrag(p, { x: 40, y: 10 }, ctx());
		expect(r.walls[0]).toMatchObject({
			kind: "door",
			isOpen: true,
			x1: 30,
			y1: 10,
		});
	});

	it("grade ligada: o vértice mais perto do clique cai num canto", () => {
		const p = press(["a"], { x: 5, y: 0 });
		const r = computeWallDrag(p, { x: 80, y: 3 }, ctx({ snapGrid: true }));
		// âncora (0,0) + (75,3) → (75,3) encaixa em (70,0): delta (70,0)
		expect(r.walls[0]).toMatchObject({ x1: 70, y1: 0, x2: 170, y2: 0 });
	});

	it("Shift com a grade ligada solta o encaixe", () => {
		const p = press(["a"], { x: 5, y: 0 });
		const r = computeWallDrag(
			p,
			{ x: 80.5, y: 3.25 },
			ctx({ snapGrid: true, invert: true }),
		);
		expect(r.walls[0]).toMatchObject({ x1: 75.5, y1: 3.25 });
	});

	it("ímã: uma ponta que se move gruda na ponta parada, exata", () => {
		const target = wall("t", 300.5, 40.25, 300.5, 140);
		const p = beginWallPress({
			mode: "body",
			hitId: "a",
			wasMultiSelected: false,
			screen: { x: 0, y: 0 },
			world: { x: 50, y: 0 },
			walls: [wall("a", 0, 0, 100, 0), target],
			ids: ["a"],
		});
		// a ponta (100,0) vai para perto de (300.5, 40.25)
		const r = computeWallDrag(p, { x: 50 + 197, y: 0 + 37 }, ctx());
		expect(r.magnet).toEqual({ x: 300.5, y: 40.25 });
		const moved = r.walls.find((w) => w.id === "a");
		expect(moved?.x2).toBe(300.5);
		expect(moved?.y2).toBe(40.25);
	});

	it("Alt desliga o ímã no arrasto", () => {
		const target = wall("t", 300.5, 40.25, 300.5, 140);
		const p = beginWallPress({
			mode: "body",
			hitId: "a",
			wasMultiSelected: false,
			screen: { x: 0, y: 0 },
			world: { x: 50, y: 0 },
			walls: [wall("a", 0, 0, 100, 0), target],
			ids: ["a"],
		});
		const r = computeWallDrag(p, { x: 247, y: 37 }, ctx({ magnetOff: true }));
		expect(r.magnet).toBeNull();
		expect(r.walls[0].x2).toBe(297);
	});

	it("sem mover: nenhuma mudança a gravar", () => {
		const r = computeWallDrag(press(["a"]), { x: 50, y: 0 }, ctx());
		expect(r.moves).toEqual([]);
	});
});

describe("computeWallDrag · vértice", () => {
	const ws = [
		wall("a", 0, 0, 100, 0),
		wall("b", 100, 0, 100, 100),
		wall("c", 100, 0, 200, 0),
		wall("other", 400, 400, 500, 400),
	];
	const press = (vertex = { x: 100, y: 0 }) =>
		beginWallPress({
			mode: "vertex",
			hitId: "a",
			wasMultiSelected: false,
			screen: { x: 0, y: 0 },
			world: vertex,
			walls: ws,
			ids: wallsSharingPoint(ws, vertex).map((w) => w.id),
			vertex,
		});

	it("move a ponta e as paredes que compartilham EXATAMENTE aquele ponto", () => {
		const r = computeWallDrag(press(), { x: 120.4, y: -15.2 }, ctx());
		expect(r.moves.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
		const a = r.walls.find((w) => w.id === "a");
		const b = r.walls.find((w) => w.id === "b");
		const c = r.walls.find((w) => w.id === "c");
		// as três continuam unidas no mesmo ponto
		expect([a?.x2, a?.y2]).toEqual([120.4, -15.2]);
		expect([b?.x1, b?.y1]).toEqual([120.4, -15.2]);
		expect([c?.x1, c?.y1]).toEqual([120.4, -15.2]);
		// as pontas de trás ficam onde estavam
		expect([a?.x1, a?.y1]).toEqual([0, 0]);
		expect([b?.x2, b?.y2]).toEqual([100, 100]);
		expect([c?.x2, c?.y2]).toEqual([200, 0]);
		// quem não compartilha o ponto não se mexe
		expect(r.walls.find((w) => w.id === "other")).toEqual(ws[3]);
	});

	it("o ímã encaixa o vértice na ponta de uma parede parada", () => {
		const r = computeWallDrag(press(), { x: 402, y: 396 }, ctx());
		expect(r.magnet).toEqual({ x: 400, y: 400 });
		expect(r.walls.find((w) => w.id === "a")).toMatchObject({
			x2: 400,
			y2: 400,
		});
	});

	it("não deixa a parede virar um ponto (colar na outra ponta)", () => {
		const solo = [wall("a", 0, 0, 100, 0)];
		const p = beginWallPress({
			mode: "vertex",
			hitId: "a",
			wasMultiSelected: false,
			screen: { x: 0, y: 0 },
			world: { x: 100, y: 0 },
			walls: solo,
			ids: ["a"],
			vertex: { x: 100, y: 0 },
		});
		const ok = computeWallDrag(p, { x: 50, y: 10 }, ctx());
		expect(ok.walls[0]).toMatchObject({ x2: 50, y2: 10 });
		// pisar exatamente na outra ponta é recusado: fica o último resultado válido
		const bad = computeWallDrag(p, { x: 0, y: 0 }, ctx({ magnetOff: true }));
		expect(bad.walls[0]).toMatchObject({ x2: 50, y2: 10 });
	});
});

describe("nudgeDelta · setas", () => {
	const o = { shift: false, alt: false, gridSize: 70 };
	it("1 px; Shift 10 px; Alt a casa da grade", () => {
		expect(nudgeDelta("ArrowRight", o)).toEqual({ dx: 1, dy: 0 });
		expect(nudgeDelta("ArrowUp", o)).toEqual({ dx: 0, dy: -1 });
		expect(nudgeDelta("ArrowLeft", { ...o, shift: true })).toEqual({
			dx: -10,
			dy: 0,
		});
		expect(nudgeDelta("ArrowDown", { ...o, alt: true })).toEqual({
			dx: 0,
			dy: 70,
		});
		expect(nudgeDelta("a", o)).toBeNull();
	});
});

describe("preferência da grade", () => {
	it("começa desligada e lembra o que foi escolhido", () => {
		const store = new Map<string, string>();
		const original = globalThis.localStorage;
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			value: {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => void store.set(k, v),
			},
		});
		try {
			expect(loadWallSnapPref()).toBe(false);
			saveWallSnapPref(true);
			expect(loadWallSnapPref()).toBe(true);
			saveWallSnapPref(false);
			expect(loadWallSnapPref()).toBe(false);
		} finally {
			Object.defineProperty(globalThis, "localStorage", {
				configurable: true,
				value: original,
			});
		}
	});
});
