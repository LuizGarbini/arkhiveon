import { describe, expect, it, vi } from "vitest";
import {
	COMPACT_VISIBLE_CONDITIONS,
	canSeeTokenStatus,
	summarizeConditions,
	toggleCondition,
} from "./conditions";
import {
	createStatusLongPress,
	STATUS_LONG_PRESS_MS,
} from "./status-long-press";
import { initialSceneViewport, VTT_TOOLBAR_INSET_PX } from "./viewport";

describe("status compacto (celular)", () => {
	it("1 ícone + '+N'", () => {
		const s = summarizeConditions(
			["envenenado", "caido", "cego"],
			COMPACT_VISIBLE_CONDITIONS,
		);
		expect(s.visible.map((c) => c.id)).toEqual(["envenenado"]);
		expect(s.overflow).toBe(2);
	});
	it("um status só: sem '+N'", () => {
		expect(summarizeConditions(["cego"], 1).overflow).toBe(0);
	});
});

describe("toggleCondition / canSeeTokenStatus", () => {
	it("liga e desliga sem repetir", () => {
		expect(toggleCondition(["a", "a"], "b")).toEqual(["a", "b"]);
		expect(toggleCondition(["a", "b"], "a")).toEqual(["b"]);
		expect(toggleCondition(null, "a")).toEqual(["a"]);
	});
	it("jogador não vê oculto nem camada do mestre; mestre vê tudo", () => {
		expect(canSeeTokenStatus({ layer: "token", isHidden: false }, false)).toBe(
			true,
		);
		expect(canSeeTokenStatus({ layer: "token", isHidden: true }, false)).toBe(
			false,
		);
		expect(canSeeTokenStatus({ layer: "gm", isHidden: false }, false)).toBe(
			false,
		);
		expect(canSeeTokenStatus({ layer: "gm", isHidden: true }, true)).toBe(true);
	});
});

describe("toque longo", () => {
	it("dispara após 500ms parado e avisa no fim do toque", () => {
		vi.useFakeTimers();
		const fire = vi.fn();
		const lp = createStatusLongPress(fire);
		lp.start("t1", 10, 10);
		lp.move(13, 12);
		vi.advanceTimersByTime(STATUS_LONG_PRESS_MS);
		expect(fire).toHaveBeenCalledWith("t1");
		expect(lp.end()).toBe(true);
		expect(lp.end()).toBe(false);
		vi.useRealTimers();
	});
	it("arrastar ou soltar antes cancela", () => {
		vi.useFakeTimers();
		const fire = vi.fn();
		const lp = createStatusLongPress(fire);
		lp.start("t1", 10, 10);
		lp.move(40, 10);
		vi.advanceTimersByTime(1000);
		lp.start("t1", 10, 10);
		vi.advanceTimersByTime(200);
		expect(lp.end()).toBe(false);
		vi.advanceTimersByTime(1000);
		expect(fire).not.toHaveBeenCalled();
		vi.useRealTimers();
	});
});

describe("enquadramento inicial", () => {
	it("celular: mapa começa à direita da barra de ferramentas", () => {
		expect(initialSceneViewport(390, { x: 0, y: 0, scale: 1 })).toEqual({
			x: VTT_TOOLBAR_INSET_PX,
			y: 0,
			scale: 1,
		});
		expect(VTT_TOOLBAR_INSET_PX).toBeGreaterThanOrEqual(68);
	});
	it("desktop também; mesa já movida: não mexe", () => {
		expect(initialSceneViewport(1440, { x: 0, y: 0, scale: 1 })).toEqual({
			x: VTT_TOOLBAR_INSET_PX,
			y: 0,
			scale: 1,
		});
		expect(initialSceneViewport(390, { x: 5, y: 0, scale: 1 })).toBeNull();
	});
});
