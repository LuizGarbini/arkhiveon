import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	BAR_CLOSED_REM,
	BAR_OPEN_REM,
	BOTTOM_MARGIN_REM,
	GAP_REM,
	GRID_BAR_MOBILE_CLASS,
	ROOT_FONT_PX,
	TOOLBAR_TOP_REM,
	TOOLBAR_WITH_GRID_BAR_CLASS,
	ZOOM_ABOVE_GRID_BAR_CLASS,
	zoomOffsetRem,
} from "./grid-bar-layout";

const REM = ROOT_FONT_PX;
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
	it("zoom = barra + margem + gap → 11.75 e 29.25 rem", () => {
		expect(zoomOffsetRem(false)).toBe(11.75);
		expect(zoomOffsetRem(true)).toBe(29.25);
		expect(zoomOffsetRem(false)).toBe(
			BAR_CLOSED_REM + BOTTOM_MARGIN_REM + GAP_REM,
		);
		expect(zoomOffsetRem(true)).toBe(
			BAR_OPEN_REM + BOTTOM_MARGIN_REM + GAP_REM,
		);
	});

	it("classes literais batem com as constantes", () => {
		expect(barH("closed")).toBe(BAR_CLOSED_REM * REM);
		expect(barH("open")).toBe(BAR_OPEN_REM * REM);
		expect(zoomBottom("closed")).toBe(zoomOffsetRem(false) * REM);
		expect(zoomBottom("open")).toBe(zoomOffsetRem(true) * REM);
		const sub = rem(TOOLBAR_WITH_GRID_BAR_CLASS.closed, /-([\d.]+)rem\)\]/);
		expect(sub).toBe((TOOLBAR_TOP_REM + zoomOffsetRem(false)) * REM);
	});

	it("barra tem altura fixa fechada e aberta", () => {
		// Medido no Playwright 390×844: 152 (681–833) e 406 (427–833).
		expect(barH("closed")).toBe(152.25);
		expect(barH("open")).toBe(406);
		expect(GRID_BAR_MOBILE_CLASS.closed.startsWith("max-sm:")).toBe(true);
		expect(GRID_BAR_MOBILE_CLASS.open.startsWith("max-sm:")).toBe(true);
	});

	it("ROOT_FONT_PX bate com o font-size do html em styles.css", () => {
		const css = readFileSync("src/styles.css", "utf8");
		const m = css.match(/html\s*\{[^}]*font-size:\s*([\d.]+)px/);
		expect(Number(m?.[1])).toBe(ROOT_FONT_PX);
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
