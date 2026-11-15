import { beforeEach, describe, expect, it, vi } from "vitest";
import { exploredMeta, isExplored, markIndexes } from "./explored";
import { uncoverExploredUnder } from "./explored-fog";
import { useExploredStore } from "./explored-store";

const scene = { id: "s1", width: 1400, height: 900, gridSize: 70, mapScale: 1 };
const meta = exploredMeta(1400, 900, 70); // célula de 35 px, 40 colunas

const indexAt = (x: number, y: number) =>
	Math.floor(y / 35) * meta.cols + Math.floor(x / 35);
const circle = {
	type: "circle" as const,
	mode: "hide" as const,
	x: 490,
	y: 455,
	radius: 70,
};

function explore(cells: number[]) {
	useExploredStore.setState({ sceneId: null, grid: null, version: 0 });
	useExploredStore.getState().ensure("s1", meta);
	const grid = useExploredStore.getState().grid;
	if (grid) markIndexes(grid, cells);
}
const grid = () => useExploredStore.getState().grid;
const fakeSync = () => ({
	unexplore: vi.fn(async () => ({ ok: true as const })),
});

beforeEach(() => {
	useExploredStore.setState({ sceneId: null, grid: null, version: 0 });
});

describe("uncoverExploredUnder · o mestre cobre uma área explorada", () => {
	it("apaga da memória só as células exploradas debaixo da forma", () => {
		const inside = indexAt(490, 455);
		const outside = indexAt(900, 455);
		explore([inside, indexAt(540, 455), outside]);
		const sync = fakeSync();
		const cleared = uncoverExploredUnder(circle, scene, sync);
		expect(cleared).toBe(2);
		const g = grid();
		expect(g && isExplored(g, inside)).toBe(false);
		expect(g && isExplored(g, outside)).toBe(true); // fora da forma: continua explorado
	});

	it("manda o banco apagar exatamente essas células (com o tamanho da grade)", () => {
		const a = indexAt(490, 455);
		explore([a]);
		const sync = fakeSync();
		uncoverExploredUnder(circle, scene, sync);
		expect(sync.unexplore).toHaveBeenCalledTimes(1);
		expect(sync.unexplore).toHaveBeenCalledWith("s1", meta, [a]);
	});

	it("revelar (mode reveal) não apaga nada", () => {
		explore([indexAt(490, 455)]);
		const sync = fakeSync();
		expect(
			uncoverExploredUnder({ ...circle, mode: "reveal" }, scene, sync),
		).toBe(0);
		expect(sync.unexplore).not.toHaveBeenCalled();
		const g = grid();
		expect(g && isExplored(g, indexAt(490, 455))).toBe(true);
	});

	it("cobrir onde nada foi explorado: não chama o banco", () => {
		explore([indexAt(900, 455)]);
		const sync = fakeSync();
		expect(uncoverExploredUnder(circle, scene, sync)).toBe(0);
		expect(sync.unexplore).not.toHaveBeenCalled();
	});

	it("sem memória carregada ou de outra cena: nada", () => {
		const sync = fakeSync();
		expect(uncoverExploredUnder(circle, scene, sync)).toBe(0);
		explore([indexAt(490, 455)]);
		expect(uncoverExploredUnder(circle, { ...scene, id: "outra" }, sync)).toBe(
			0,
		);
		expect(sync.unexplore).not.toHaveBeenCalled();
	});

	it("o mapa mudou de tamanho desde que a grade foi criada: não arrisca apagar célula errada", () => {
		explore([indexAt(490, 455)]);
		const sync = fakeSync();
		expect(
			uncoverExploredUnder(circle, { ...scene, gridSize: 100 }, sync),
		).toBe(0);
		expect(sync.unexplore).not.toHaveBeenCalled();
	});

	it("considera a escala do mapa (mapScale) como o canvas", () => {
		useExploredStore.setState({ sceneId: null, grid: null, version: 0 });
		const scaled = exploredMeta(2800, 1800, 70);
		useExploredStore.getState().ensure("s1", scaled);
		const g = grid();
		const i = Math.floor(455 / 35) * scaled.cols + Math.floor(490 / 35);
		if (g) markIndexes(g, [i]);
		const sync = fakeSync();
		expect(uncoverExploredUnder(circle, { ...scene, mapScale: 2 }, sync)).toBe(
			1,
		);
	});

	it("pincel e retângulo também cobrem", () => {
		const a = indexAt(105, 105);
		const b = indexAt(700, 700);
		explore([a, b]);
		const sync = fakeSync();
		expect(
			uncoverExploredUnder(
				{
					type: "brush",
					mode: "hide",
					brushRadius: 30,
					points: [
						{ x: 105, y: 105 },
						{ x: 140, y: 105 },
					],
				},
				scene,
				sync,
			),
		).toBe(1);
		expect(
			uncoverExploredUnder(
				{ type: "rect", mode: "hide", x: 680, y: 680, width: 60, height: 60 },
				scene,
				sync,
			),
		).toBe(1);
		expect(sync.unexplore).toHaveBeenCalledTimes(2);
	});
});
