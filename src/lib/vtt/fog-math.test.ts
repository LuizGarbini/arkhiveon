import { Graphics } from "pixi.js";
import { describe, expect, it } from "vitest";
import { brushOutline, drawFogGeometry } from "./fog-math";

function holeActions(path: {
	instructions: { action: string; data?: unknown[] }[];
}): string[] {
	const actions: string[] = [];
	for (const instruction of path.instructions) {
		actions.push(instruction.action);
		if (instruction.action === "addPath") {
			const nested = instruction.data?.[0] as
				| { instructions: { action: string; data?: unknown[] }[] }
				| undefined;
			if (nested) actions.push(...holeActions(nested));
		}
	}
	return actions;
}

describe("brushOutline", () => {
	it("um traço reto tem ponta redonda e largura constante", () => {
		const outline = brushOutline(
			[
				{ x: 100, y: 100 },
				{ x: 300, y: 100 },
			],
			20,
		);
		const xs = outline.map((point) => point.x);
		const ys = outline.map((point) => point.y);
		expect(Math.min(...xs)).toBeCloseTo(80, 0);
		expect(Math.max(...xs)).toBeCloseTo(320, 0);
		expect(Math.min(...ys)).toBeCloseTo(80, 0);
		expect(Math.max(...ys)).toBeCloseTo(120, 0);
		expect(outline.some((point) => point.x < 1 && point.y < 1)).toBe(false);
	});
});

describe("drawFogGeometry", () => {
	it("revelar um pincel não liga o corte ao canto do mapa", () => {
		const graphics = new Graphics();
		graphics.rect(0, 0, 4000, 3000).fill({ color: 0x0f172a, alpha: 0.45 });
		drawFogGeometry(
			graphics,
			{
				id: "brush",
				type: "brush",
				mode: "reveal",
				brushRadius: 40,
				points: [
					{ x: 1800, y: 1600 },
					{ x: 1900, y: 1700 },
				],
			},
			true,
			0x0f172a,
			0.45,
		);
		const fill = graphics.context.instructions.find(
			(instruction) => instruction.action === "fill",
		);
		if (!fill || fill.action !== "fill") {
			throw new Error("a névoa de base não foi desenhada");
		}
		const hole = fill.data.hole;
		expect(hole).toBeTruthy();
		if (!hole) return;
		const actions = holeActions(hole);
		expect(actions).not.toContain("moveTo");
		expect(actions.filter((action) => action === "poly")).toHaveLength(1);
		expect(actions.filter((action) => action === "circle")).toHaveLength(0);
	});
});
