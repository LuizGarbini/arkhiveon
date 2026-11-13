import type { Point } from "./grid-math";
import {
	type RulerContext,
	rulerAddPoint,
	rulerMoveLive,
	rulerPin,
	rulerUndo,
} from "./ruler-path";
import { TOKEN_TAP_SLOP_PX } from "./token-press";
import type { VTTRemoteMeasurement, VTTRulerMeasurement } from "./types";

/** Limite do clique duplo da régua (px e ms). */
export const RULER_DOUBLE_CLICK_PX = 8;
export const RULER_DOUBLE_CLICK_MS = 350;

export interface RulerPress {
	x: number;
	y: number;
	moved: boolean;
	fresh: boolean;
}

export interface RulerGestureState {
	measurement: VTTRulerMeasurement | null;
	press: RulerPress | null;
	lastClick: { x: number; y: number; t: number } | null;
}

export function rulerPointerDown(
	state: RulerGestureState,
	input: { screenX: number; screenY: number; world: Point; now: number },
	ctx: RulerContext,
): RulerGestureState {
	const current = state.measurement;
	const last = state.lastClick;
	if (
		current &&
		!current.pinned &&
		last &&
		input.now - last.t < RULER_DOUBLE_CLICK_MS &&
		Math.hypot(input.screenX - last.x, input.screenY - last.y) <
			RULER_DOUBLE_CLICK_PX
	) {
		return {
			measurement: rulerPin(current, ctx),
			press: null,
			lastClick: null,
		};
	}
	const fresh = !current || Boolean(current.pinned);
	return {
		measurement: fresh ? rulerAddPoint(null, input.world, ctx) : current,
		press: {
			x: input.screenX,
			y: input.screenY,
			moved: false,
			fresh,
		},
		lastClick: { x: input.screenX, y: input.screenY, t: input.now },
	};
}

export function rulerPointerMove(
	state: RulerGestureState,
	input: { screenX: number; screenY: number; world: Point },
	ctx: RulerContext,
): RulerGestureState {
	let press = state.press;
	if (
		press &&
		!press.moved &&
		Math.hypot(input.screenX - press.x, input.screenY - press.y) >
			TOKEN_TAP_SLOP_PX
	) {
		press = { ...press, moved: true };
	}
	const measurement = rulerMoveLive(state.measurement, input.world, ctx);
	if (press === state.press && measurement === state.measurement) return state;
	return { ...state, press, measurement };
}

export function rulerPointerUp(
	state: RulerGestureState,
	input: { world: Point },
	ctx: RulerContext,
): RulerGestureState {
	const press = state.press;
	if (!press) return state;
	const current = state.measurement;
	let measurement = current;
	// Soltar mantém a medida. O primeiro aperto deixa a ponta ao vivo;
	// o clique seguinte fixa o ponto onde o botão sobe.
	if (current && !current.pinned && !press.fresh) {
		measurement = rulerAddPoint(current, input.world, ctx);
	}
	if (measurement === current) return { ...state, press: null };
	return { ...state, press: null, measurement };
}

export function rulerOnKey(
	state: RulerGestureState,
	key: "Escape" | "Backspace" | "Enter",
	ctx: RulerContext,
): RulerGestureState {
	if (key === "Escape") {
		return { measurement: null, press: null, lastClick: null };
	}
	if (key === "Backspace") {
		return {
			measurement: rulerUndo(state.measurement, ctx),
			press: state.press,
			lastClick: null,
		};
	}
	return {
		measurement: rulerPin(state.measurement, ctx),
		press: state.press,
		lastClick: null,
	};
}

export function rulerMeasurementForTool<T>(
	measurement: T | null,
	tool: string,
): T | null {
	return tool === "ruler" ? measurement : null;
}

export type RemoteRulerEvent =
	| {
			type: "broadcast";
			userId: string;
			measurement: VTTRemoteMeasurement | null;
	  }
	| { type: "leave"; userId: string }
	| { type: "timeout"; userId: string; elapsedMs: number };

export function applyRemoteRuler(
	remote: Record<string, VTTRemoteMeasurement>,
	event: RemoteRulerEvent,
): Record<string, VTTRemoteMeasurement> {
	if (event.type === "timeout") return remote;
	if (event.type === "leave" || !event.measurement) {
		if (!(event.userId in remote)) return remote;
		const next = { ...remote };
		delete next[event.userId];
		return next;
	}
	return { ...remote, [event.userId]: event.measurement };
}
