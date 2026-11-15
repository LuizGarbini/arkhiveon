import { describe, expect, it } from "vitest";
import {
	PICKER_GAP_PX,
	PICKER_ITEM_PX,
	PICKER_OFFSET_PX,
	PICKER_WIDTH_PX,
	pickerBox,
	pickerIndexAt,
} from "./ping-picker";

const view = { width: 390, height: 844 };
const button = { right: 56, top: 400, bottom: 444 };
const STEP = PICKER_ITEM_PX + PICKER_GAP_PX;

describe("pickerBox: onde a lista aparece", () => {
	it("à direita do botão, com a lista centrada na altura dele", () => {
		const box = pickerBox(button, 5, view);
		expect(box.left).toBe(button.right + PICKER_OFFSET_PX);
		const height = 5 * PICKER_ITEM_PX + 4 * PICKER_GAP_PX;
		expect(box.top).toBeCloseTo(422 - height / 2, 6);
	});

	it("com o botão perto do topo, a lista não sai da tela", () => {
		const box = pickerBox({ right: 56, top: 100, bottom: 144 }, 6, view);
		expect(box.top).toBeGreaterThanOrEqual(8);
	});

	it("com o botão perto do fim, a lista sobe para caber", () => {
		const box = pickerBox({ right: 56, top: 800, bottom: 844 }, 6, view);
		const height = 6 * PICKER_ITEM_PX + 5 * PICKER_GAP_PX;
		expect(box.top + height).toBeLessThanOrEqual(view.height - 8);
	});

	it("numa tela estreita, a lista não passa da borda direita", () => {
		const box = pickerBox({ right: 300, top: 400, bottom: 444 }, 5, {
			width: 360,
			height: 800,
		});
		expect(box.left + PICKER_WIDTH_PX).toBeLessThanOrEqual(360 - 8);
	});
});

describe("pickerIndexAt: a opção sob o dedo", () => {
	const box = { left: 70, top: 100 };

	it("o centro de cada opção escolhe a própria opção", () => {
		for (let i = 0; i < 5; i++) {
			const y = box.top + i * STEP + PICKER_ITEM_PX / 2;
			expect(pickerIndexAt({ x: box.left + 80, y }, box, 5)).toBe(i);
		}
	});

	it("fora da faixa horizontal (com a folga) não escolhe nada", () => {
		const y = box.top + 20;
		expect(pickerIndexAt({ x: box.left - 60, y }, box, 5)).toBe(-1);
		expect(
			pickerIndexAt({ x: box.left + PICKER_WIDTH_PX + 60, y }, box, 5),
		).toBe(-1);
	});

	it("a folga horizontal deixa o dedo desviar um pouco", () => {
		const y = box.top + 20;
		expect(pickerIndexAt({ x: box.left - 10, y }, box, 5)).toBe(0);
		expect(
			pickerIndexAt({ x: box.left + PICKER_WIDTH_PX + 10, y }, box, 5),
		).toBe(0);
	});

	it("bem acima da lista não escolhe; logo acima ainda é a primeira", () => {
		expect(pickerIndexAt({ x: box.left + 80, y: box.top - 60 }, box, 5)).toBe(
			-1,
		);
		expect(pickerIndexAt({ x: box.left + 80, y: box.top - 10 }, box, 5)).toBe(
			0,
		);
	});

	it("logo abaixo da lista ainda é a última; bem abaixo não escolhe", () => {
		const bottom = box.top + 5 * STEP;
		expect(pickerIndexAt({ x: box.left + 80, y: bottom + 10 }, box, 5)).toBe(4);
		expect(pickerIndexAt({ x: box.left + 80, y: bottom + 80 }, box, 5)).toBe(
			-1,
		);
	});

	it("o vão entre duas opções vai para a de baixo (sem zona morta)", () => {
		const gapY = box.top + PICKER_ITEM_PX + PICKER_GAP_PX - 1;
		const index = pickerIndexAt({ x: box.left + 80, y: gapY }, box, 5);
		expect([0, 1]).toContain(index);
	});

	it("nenhum ponto da faixa fica sem opção entre a primeira e a última", () => {
		for (let y = box.top; y < box.top + 5 * STEP; y += 3) {
			expect(
				pickerIndexAt({ x: box.left + 80, y }, box, 5),
			).toBeGreaterThanOrEqual(0);
		}
	});

	it("lista de um item e lista vazia", () => {
		expect(pickerIndexAt({ x: box.left + 80, y: box.top + 10 }, box, 1)).toBe(
			0,
		);
		expect(pickerIndexAt({ x: box.left + 80, y: box.top + 10 }, box, 0)).toBe(
			-1,
		);
	});
});
