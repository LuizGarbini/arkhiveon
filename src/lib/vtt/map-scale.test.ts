import { describe, expect, it } from "vitest";
import {
	clampMapScaleForScene,
	MAP_SCALE_UI_MAX,
	MAP_SCALE_UI_MIN,
	mapScaleFactor,
	mapScaleHint,
	mapScaleToPercent,
	maxMapScaleForDimensions,
	percentToMapScale,
	scaleSceneEntities,
} from "./map-scale";

describe("maxMapScaleForDimensions", () => {
	it("em 4096×4096 o teto é 100%", () => {
		expect(maxMapScaleForDimensions(4096, 4096)).toBe(1);
	});
	it("em 2048×2048 permite 200%", () => {
		expect(maxMapScaleForDimensions(2048, 2048)).toBe(2);
	});
	it("em 1024×512 o lado maior manda (400%)", () => {
		expect(maxMapScaleForDimensions(1024, 512)).toBe(4);
	});
	it("nunca passa de 400% mesmo em mapa pequeno", () => {
		expect(maxMapScaleForDimensions(100, 100)).toBe(MAP_SCALE_UI_MAX);
	});
});

describe("clampMapScaleForScene", () => {
	it("prende abaixo de 25% e acima do teto da cena", () => {
		expect(clampMapScaleForScene(0.1, 2048, 2048)).toBe(MAP_SCALE_UI_MIN);
		expect(clampMapScaleForScene(8, 2048, 2048)).toBe(2);
		expect(clampMapScaleForScene(2, 4096, 4096)).toBe(1);
	});
	it("valor inválido volta para no máximo 100%", () => {
		expect(clampMapScaleForScene(Number.NaN, 2048, 2048)).toBe(1);
		expect(clampMapScaleForScene(-1, 4096, 4096)).toBe(1);
	});
	it("arredonda para 2 casas", () => {
		expect(clampMapScaleForScene(1.239, 2048, 2048)).toBe(1.24);
	});
});

describe("mapScaleFactor", () => {
	it("devolve next/current e null quando não muda", () => {
		expect(mapScaleFactor(1, 2)).toBe(2);
		expect(mapScaleFactor(2, 1)).toBe(0.5);
		expect(mapScaleFactor(1, 1)).toBeNull();
		expect(mapScaleFactor(0, 1)).toBeNull();
	});
});

describe("percent helpers e hint", () => {
	it("converte ida e volta", () => {
		expect(mapScaleToPercent(1.25)).toBe(125);
		expect(percentToMapScale(125)).toBe(1.25);
	});
	it("hint cita o teto quando a imagem limita", () => {
		expect(mapScaleHint(4096, 4096)).toMatch(/100%/);
		expect(mapScaleHint(4096, 4096)).toMatch(/4096/);
		expect(mapScaleHint(1024, 1024)).toBe("De 25% a 400%.");
		expect(mapScaleHint(1024, 1024, true)).toBe("Salvando…");
	});
});

describe("scaleSceneEntities", () => {
	it("multiplica só a cena pedida", () => {
		const tokens = [
			{ sceneId: "a", x: 10, y: 20, id: "1" },
			{ sceneId: "b", x: 10, y: 20, id: "2" },
		];
		const walls = [
			{ sceneId: "a", x1: 0, y1: 0, x2: 5, y2: 5, id: "w1" },
			{ sceneId: "b", x1: 0, y1: 0, x2: 5, y2: 5, id: "w2" },
		];
		const next = scaleSceneEntities("a", 2, tokens, walls);
		expect(next.tokens[0]).toMatchObject({ x: 20, y: 40 });
		expect(next.tokens[1]).toMatchObject({ x: 10, y: 20 });
		expect(next.walls[0]).toMatchObject({ x1: 0, y1: 0, x2: 10, y2: 10 });
		expect(next.walls[1]).toMatchObject({ x2: 5, y2: 5 });
	});
});
