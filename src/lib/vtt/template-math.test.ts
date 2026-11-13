import { describe, expect, it } from "vitest";
import {
	pointInPolygon,
	spellTemplateIdAtPoint,
	spellTemplateOwnerName,
	spellTemplateTitle,
	templateMeasureText,
	templatePolygon,
	templateReach,
	templateReachCells,
	templateReachPoint,
	type VTTSpellTemplate,
} from "./template-math";

const origin = { x: 0, y: 0 };
const cell = 70;

describe("templateReachCells", () => {
	it("rounds the drag length to whole grid cells", () => {
		expect(templateReachCells(origin, { x: cell * 4, y: 0 }, cell)).toBe(4);
		expect(templateReachCells(origin, { x: cell * 2.4, y: 0 }, cell)).toBe(2);
	});

	it("never returns less than 1 cell once the pointer has moved", () => {
		expect(templateReachCells(origin, { x: 10, y: 0 }, cell)).toBe(1);
	});
});

describe("templatePolygon", () => {
	it("builds a 15° cone that covers a cell on the aim line but not a cell 45° off", () => {
		const polygon = templatePolygon(
			"cone15",
			origin,
			{ x: cell * 6, y: 0 },
			cell,
		);
		expect(pointInPolygon({ x: cell * 4, y: 0 }, polygon)).toBe(true);
		expect(pointInPolygon({ x: cell * 4, y: cell * 4 }, polygon)).toBe(false);
	});

	it("builds a 60° cone wide enough to include a cell 30° off the aim line", () => {
		const polygon = templatePolygon(
			"cone60",
			origin,
			{ x: cell * 6, y: 0 },
			cell,
		);
		const thirtyDeg = {
			x: cell * 4 * Math.cos(Math.PI / 6),
			y: cell * 4 * Math.sin(Math.PI / 6),
		};
		expect(pointInPolygon(thirtyDeg, polygon)).toBe(true);
	});

	it("builds a sphere whose radius equals the dragged cell count", () => {
		const polygon = templatePolygon(
			"sphere",
			origin,
			{ x: cell * 3, y: 0 },
			cell,
		);
		expect(pointInPolygon({ x: cell * 2, y: 0 }, polygon)).toBe(true);
		expect(pointInPolygon({ x: cell * 4, y: 0 }, polygon)).toBe(false);
	});

	it("builds a 5-ft-wide lightning line along the drag", () => {
		const polygon = templatePolygon(
			"line",
			origin,
			{ x: cell * 8, y: 0 },
			cell,
		);
		expect(pointInPolygon({ x: cell * 4, y: 0 }, polygon)).toBe(true);
		expect(pointInPolygon({ x: cell * 4, y: cell * 2 }, polygon)).toBe(false);
	});

	it("builds an axis-aligned cube from the origin toward the drag", () => {
		const polygon = templatePolygon(
			"cube",
			origin,
			{ x: cell * 3, y: cell },
			cell,
		);
		expect(pointInPolygon({ x: cell * 1.5, y: cell * 1.5 }, polygon)).toBe(
			true,
		);
		expect(pointInPolygon({ x: -cell, y: -cell }, polygon)).toBe(false);
	});

	it("alcance fixo ignora o tamanho do arrasto e mantém a direção", () => {
		const polygon = templatePolygon(
			"cone60",
			origin,
			{ x: cell, y: 0 },
			cell,
			6,
		);
		expect(pointInPolygon({ x: cell * 5.5, y: 0 }, polygon)).toBe(true);
		expect(pointInPolygon({ x: -cell * 2, y: 0 }, polygon)).toBe(false);
	});
});

describe("medida do molde", () => {
	const base = { originX: 0, originY: 0, targetX: cell * 4, targetY: 0 };

	it("usa o alcance fixo quando houver, senão o do arrasto", () => {
		expect(templateReach(base, cell)).toBe(4);
		expect(templateReach({ ...base, sizeCells: 6 }, cell)).toBe(6);
	});

	it("escreve a medida na unidade da cena, com vírgula decimal", () => {
		expect(templateMeasureText("cone60", 6, 1.5, "m")).toBe("Cone 60° · 9 m");
		expect(templateMeasureText("cone15", 4, 5, "ft")).toBe("Cone 15° · 20 ft");
		expect(templateMeasureText("sphere", 4, 1.5, "m")).toBe("Raio 6 m");
		expect(templateMeasureText("line", 20, 1.5, "m")).toBe("Linha 30 m");
		expect(templateMeasureText("cube", 3, 1.5, "m")).toBe("Cubo 4,5 m");
	});

	it("o rótulo fica na ponta do alcance; no cubo, no centro", () => {
		const cone = templateReachPoint(
			"cone60",
			origin,
			{ x: 0, y: cell },
			cell,
			3,
		);
		expect(cone.point.x).toBeCloseTo(0);
		expect(cone.point.y).toBeCloseTo(cell * 3);
		const cube = templateReachPoint(
			"cube",
			origin,
			{ x: -cell, y: cell },
			cell,
			2,
		);
		expect(cube.point).toEqual({ x: -cell, y: cell });
	});
});

describe("spellTemplateIdAtPoint", () => {
	const sphere = (id: string, originX: number): VTTSpellTemplate => ({
		id,
		kind: "sphere",
		originX,
		originY: 0,
		targetX: originX + cell,
		targetY: 0,
		color: "white",
	});

	it("hits the topmost template and ignores a miss", () => {
		const first = sphere("first", 0);
		const second = sphere("second", 0);
		expect(spellTemplateIdAtPoint([first, second], origin, cell)).toBe(
			"second",
		);
		expect(
			spellTemplateIdAtPoint([first], { x: cell * 8, y: cell * 8 }, cell),
		).toBeNull();
	});

	it("shows the spell name and the placer's name, never the raw id", () => {
		const template: VTTSpellTemplate = {
			...sphere("id-oculto", 0),
			spellName: " Bola de Fogo ",
			userId: "id-oculto",
			userName: " Lia ",
		};
		expect(spellTemplateTitle(template)).toBe("Bola de Fogo");
		expect(spellTemplateTitle({ ...template, spellName: "  " })).toBe("Raio");
		expect(spellTemplateOwnerName(template, "outra")).toBe("Lia");
		expect(
			spellTemplateOwnerName({ ...template, userName: "" }, "id-oculto"),
		).toBe("Você");
		expect(
			spellTemplateOwnerName(
				{ ...template, userName: undefined, userId: "id-oculto" },
				"outra",
			),
		).toBe("Jogador");
	});
});
