import { describe, expect, it } from "vitest";
import {
	GRID_BAR_MOBILE_CLASS,
	TOOLBAR_WITH_GRID_BAR_CLASS,
	ZOOM_ABOVE_GRID_BAR_CLASS,
} from "./grid-bar-layout";

const REM = 16;
const MOBILE_H = 844;
const TOOLBAR_TOP = 8 * REM; // top-32
const BAR_MARGIN = 0.75 * REM;
const GAP = 0.5 * REM;

const rem = (cls: string, re: RegExp): number => {
	const m = cls.match(re);
	if (!m) throw new Error(`sem medida em ${cls}`);
	return Number(m[1]) * REM;
};
const barH = (k: "closed" | "open") =>
	rem(GRID_BAR_MOBILE_CLASS[k], /h-\[([\d.]+)rem\]/);
const zoomBottom = (k: "closed" | "open") =>
	rem(ZOOM_ABOVE_GRID_BAR_CLASS[k], /\+([\d.]+)rem\)/);

describe("grid-bar-layout (390×844)", () => {
	it("barra tem altura fixa fechada e aberta", () => {
		expect(barH("closed")).toBe(168);
		expect(barH("open")).toBe(448);
		expect(GRID_BAR_MOBILE_CLASS.closed.startsWith("max-sm:")).toBe(true);
		expect(GRID_BAR_MOBILE_CLASS.open.startsWith("max-sm:")).toBe(true);
	});

	it("zoom fica 0.5rem acima do topo da barra (derivado da altura)", () => {
		for (const k of ["closed", "open"] as const) {
			expect(zoomBottom(k)).toBe(BAR_MARGIN + barH(k) + GAP);
		}
	});

	it("toolbar fechada termina no mesmo recuo do zoom", () => {
		const sub = rem(TOOLBAR_WITH_GRID_BAR_CLASS.closed, /-([\d.]+)rem\)\]/);
		expect(sub).toBe(TOOLBAR_TOP + zoomBottom("closed"));
		expect(MOBILE_H - sub).toBeGreaterThan(0);
	});

	it("com 'Mais ajustes' aberto a toolbar não cabe e fica escondida", () => {
		expect(MOBILE_H - TOOLBAR_TOP - zoomBottom("open")).toBeLessThan(545);
		expect(TOOLBAR_WITH_GRID_BAR_CLASS.open).toBe("max-sm:hidden");
	});

	it("desktop não é afetado: toda classe é max-sm", () => {
		const all = [
			GRID_BAR_MOBILE_CLASS,
			ZOOM_ABOVE_GRID_BAR_CLASS,
			TOOLBAR_WITH_GRID_BAR_CLASS,
		].flatMap((o) => Object.values(o).flatMap((c) => c.split(" ")));
		for (const c of all) expect(c.startsWith("max-sm:")).toBe(true);
	});
});
