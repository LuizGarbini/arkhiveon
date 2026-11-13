import { describe, expect, it } from "vitest";
import {
	applyRemoteRuler,
	type RulerGestureState,
	rulerMeasurementForTool,
	rulerOnKey,
	rulerPointerDown,
	rulerPointerMove,
	rulerPointerUp,
} from "./ruler-gesture";
import type { RulerContext } from "./ruler-path";
import { rulerPathPoints } from "./ruler-path";
import type { VTTRemoteMeasurement } from "./types";

const G = 70;
const at = (col: number, row: number) => ({
	x: (col + 0.5) * G,
	y: (row + 0.5) * G,
});
const ctx: RulerContext = {
	gridSize: G,
	scaleDistance: 1.5,
	unit: "m",
	diagonalRule: "5105",
};

const blank = (): RulerGestureState => ({
	measurement: null,
	press: null,
	lastClick: null,
});

function down(
	state: RulerGestureState,
	point: { x: number; y: number },
	now: number,
) {
	return rulerPointerDown(
		state,
		{ screenX: point.x, screenY: point.y, world: point, now },
		ctx,
	);
}

function move(state: RulerGestureState, point: { x: number; y: number }) {
	return rulerPointerMove(
		state,
		{ screenX: point.x, screenY: point.y, world: point },
		ctx,
	);
}

function up(state: RulerGestureState, point: { x: number; y: number }) {
	return rulerPointerUp(state, { world: point }, ctx);
}

describe("fluxo L da régua", () => {
	it("clique, curva e ponta viva continuam depois do pointerup", () => {
		const start = at(2, 5);
		const curve = at(6, 5);
		const tip = at(6, 2);
		let state = blank();
		state = down(state, start, 1_000);
		state = up(state, start);
		state = move(state, curve);
		state = down(state, curve, 1_400);
		state = up(state, curve);
		state = move(state, tip);
		state = up(state, tip);

		expect(state.measurement).not.toBeNull();
		expect(state.measurement && rulerPathPoints(state.measurement)).toEqual([
			start,
			curve,
			tip,
		]);
		expect(state.measurement?.waypoints).toEqual([start, curve]);
		expect(state.measurement?.distance).toBe(10.5);
		expect(state.measurement?.segments).toEqual([6, 4.5]);
		expect(state.measurement?.pinned).toBe(false);
	});

	it("pointerup com moved e fresh não apaga a reta", () => {
		const start = at(2, 5);
		const curve = at(6, 5);
		let state = down(blank(), start, 1_000);
		state = move(state, curve);
		expect(state.press?.moved).toBe(true);
		expect(state.press?.fresh).toBe(true);
		state = up(state, curve);

		expect(state.measurement).not.toBeNull();
		expect(state.measurement?.distance).toBe(6);
		expect(state.measurement?.waypoints).toEqual([start]);
		expect(state.press).toBeNull();
	});

	it("depois de soltar o arrasto o clique seguinte continua o caminho", () => {
		const start = at(2, 5);
		const curve = at(6, 5);
		const tip = at(6, 2);
		let state = down(blank(), start, 1_000);
		state = move(state, curve);
		state = up(state, curve);
		state = down(state, curve, 2_000);
		state = up(state, curve);
		state = move(state, tip);
		state = up(state, tip);

		expect(state.measurement && rulerPathPoints(state.measurement)).toEqual([
			start,
			curve,
			tip,
		]);
		expect(state.measurement?.distance).toBe(10.5);
	});
});

describe("encerrar a régua", () => {
	it("Esc limpa a medida", () => {
		let state = down(blank(), at(0, 0), 1_000);
		state = move(state, at(3, 0));
		state = rulerOnKey(state, "Escape", ctx);
		expect(state.measurement).toBeNull();
		expect(state.press).toBeNull();
	});

	it("trocar de ferramenta limpa e continuar na régua mantém", () => {
		const state = down(blank(), at(0, 0), 1_000);
		expect(rulerMeasurementForTool(state.measurement, "select")).toBeNull();
		expect(rulerMeasurementForTool(state.measurement, "ruler")).toBe(
			state.measurement,
		);
	});

	it("duplo clique fixa o caminho e o cursor deixa de esticar", () => {
		const start = at(0, 0);
		const curve = at(4, 0);
		let state = down(blank(), start, 1_000);
		state = up(state, start);
		state = move(state, curve);
		state = down(state, curve, 1_200);
		state = up(state, curve);
		state = down(state, curve, 1_400);
		expect(state.measurement?.pinned).toBe(true);
		expect(state.measurement?.distance).toBe(6);
		expect(state.press).toBeNull();
		const followed = move(state, at(4, 4));
		expect(followed.measurement).toBe(state.measurement);
	});

	it("Enter fixa e Backspace tira o último ponto", () => {
		const start = at(0, 0);
		const curve = at(4, 0);
		let state = down(blank(), start, 1_000);
		state = up(state, start);
		state = move(state, curve);
		state = down(state, curve, 1_500);
		state = up(state, curve);
		const pinned = rulerOnKey(state, "Enter", ctx);
		expect(pinned.measurement?.pinned).toBe(true);
		expect(pinned.measurement?.distance).toBe(6);
		const undone = rulerOnKey(state, "Backspace", ctx);
		expect(undone.measurement?.waypoints).toEqual([start]);
	});
});

describe("régua remota", () => {
	const measure = (distance: number): VTTRemoteMeasurement => ({
		startX: 0,
		startY: 0,
		currentX: 70,
		currentY: 0,
		distance,
		unit: "m",
		userId: "ada",
		userName: "Ada",
		color: "#38bdf8",
	});

	it("timeout e atualização do mesmo jogador não apagam a medida", () => {
		const first = { ada: measure(6) };
		const timed = applyRemoteRuler(first, {
			type: "timeout",
			userId: "ada",
			elapsedMs: 60_000,
		});
		expect(timed).toBe(first);
		const updated = applyRemoteRuler(first, {
			type: "broadcast",
			userId: "ada",
			measurement: measure(10.5),
		});
		expect(updated.ada?.distance).toBe(10.5);
		expect(updated.bia).toBeUndefined();
	});

	it("null e saída limpam só o dono", () => {
		const both = { ada: measure(6), bia: measure(3) };
		const cleared = applyRemoteRuler(both, {
			type: "broadcast",
			userId: "ada",
			measurement: null,
		});
		expect(cleared.ada).toBeUndefined();
		expect(cleared.bia?.distance).toBe(3);
		const left = applyRemoteRuler(both, { type: "leave", userId: "bia" });
		expect(left.bia).toBeUndefined();
		expect(left.ada?.distance).toBe(6);
	});
});
