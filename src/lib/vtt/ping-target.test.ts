import { describe, expect, it } from "vitest";
import { highlightTarget } from "./ping-target";

const tok = (id: string, x: number, y: number, sizeCells = 1) => ({
	id,
	x,
	y,
	sizeCells,
});

describe("highlightTarget", () => {
	const tokens = [
		tok("a", 105, 105),
		tok("b", 245, 105),
		tok("grande", 455, 455, 3),
	];

	it("o token sob o ponto é o alvo", () => {
		expect(highlightTarget({ x: 110, y: 100 }, tokens, 70, [])).toBe("a");
		expect(highlightTarget({ x: 245, y: 105 }, tokens, 70, [])).toBe("b");
	});

	it("tem folga: um pouco fora da borda ainda acerta", () => {
		expect(highlightTarget({ x: 105 + 38, y: 105 }, tokens, 70, [])).toBe("a"); // raio 35 × 1,15 ≈ 40
		expect(highlightTarget({ x: 105 + 45, y: 105 }, tokens, 70, [])).toBeNull();
	});

	it("token grande tem alvo maior", () => {
		expect(highlightTarget({ x: 455 + 100, y: 455 }, tokens, 70, [])).toBe(
			"grande",
		);
	});

	it("com dois tokens no mesmo ponto vale o de cima (o último da lista)", () => {
		const stacked = [tok("baixo", 105, 105), tok("cima", 110, 105)];
		expect(highlightTarget({ x: 108, y: 105 }, stacked, 70, [])).toBe("cima");
	});

	it("sem token sob o ponto, usa o selecionado", () => {
		expect(highlightTarget({ x: 900, y: 900 }, tokens, 70, ["b"])).toBe("b");
	});

	it("com vários selecionados, o primeiro que ainda existe", () => {
		expect(
			highlightTarget({ x: 900, y: 900 }, tokens, 70, ["fantasma", "b", "a"]),
		).toBe("b");
	});

	it("o token sob o ponto vence o selecionado", () => {
		expect(highlightTarget({ x: 105, y: 105 }, tokens, 70, ["b"])).toBe("a");
	});

	it("sem token sob o ponto e sem seleção válida: nada", () => {
		expect(highlightTarget({ x: 900, y: 900 }, tokens, 70, [])).toBeNull();
		expect(
			highlightTarget({ x: 900, y: 900 }, tokens, 70, ["fantasma"]),
		).toBeNull();
		expect(highlightTarget({ x: 1, y: 1 }, [], 70, ["a"])).toBeNull();
	});

	it("grade inválida (0) usa 70 px; tamanho 0 conta como 1", () => {
		expect(
			highlightTarget({ x: 105, y: 105 }, [tok("a", 105, 105, 0)], 0, []),
		).toBe("a");
	});
});
