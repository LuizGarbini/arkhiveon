import { describe, expect, it } from "vitest";
import {
	isAdditiveMarquee,
	startsPingWheel,
	WHEEL_REVEAL_MS,
	type WheelPressInput,
	wheelRevealed,
} from "./ping-gesture";
import { WHEEL_DEAD_ZONE_PX } from "./ping-wheel";

const press = (over: Partial<WheelPressInput> = {}): WheelPressInput => ({
	button: 0,
	ctrlKey: true,
	metaKey: false,
	altKey: false,
	shiftKey: false,
	tool: "select",
	spaceHeld: false,
	overControlledToken: false,
	hasScene: true,
	...over,
});

describe("startsPingWheel: quando o aperto abre a roda", () => {
	it("Ctrl + botão esquerdo no mapa vazio, ferramenta Selecionar: abre (no Windows e no Mac)", () => {
		expect(startsPingWheel(press())).toBe(true);
	});

	it("sem Ctrl não abre", () => {
		expect(startsPingWheel(press({ ctrlKey: false }))).toBe(false);
	});

	it("só o botão esquerdo (o direito move a câmera; o do meio também)", () => {
		expect(startsPingWheel(press({ button: 1 }))).toBe(false);
		expect(startsPingWheel(press({ button: 2 }))).toBe(false);
	});

	it("com Shift ou Cmd quer a caixa de seleção aditiva, não a roda", () => {
		expect(startsPingWheel(press({ shiftKey: true }))).toBe(false);
		expect(startsPingWheel(press({ metaKey: true }))).toBe(false);
	});

	it("com Alt é o ping rápido; com Espaço é mover a câmera", () => {
		expect(startsPingWheel(press({ altKey: true }))).toBe(false);
		expect(startsPingWheel(press({ spaceHeld: true }))).toBe(false);
	});

	it("em token que o jogador controla, Ctrl+clique soma à seleção (a roda só abre em mapa vazio)", () => {
		expect(startsPingWheel(press({ overControlledToken: true }))).toBe(false);
	});

	it("só com a ferramenta Selecionar (régua, parede, ping etc. têm o clique deles)", () => {
		for (const tool of [
			"ruler",
			"ping",
			"pan",
			"wall",
			"light",
			"fog",
			"template",
		]) {
			expect(startsPingWheel(press({ tool }))).toBe(false);
		}
	});

	it("sem cena não abre", () => {
		expect(startsPingWheel(press({ hasScene: false }))).toBe(false);
	});

	it("o resultado não depende de a ponteira ser de mouse, caneta ou toque (nem existe esse parâmetro)", () => {
		expect(Object.keys(press())).not.toContain("pointerType");
	});
});

describe("wheelRevealed: quando a roda aparece", () => {
	it("recém-apertado e parado: ainda não (o Ctrl+clique rápido não pisca a roda)", () => {
		expect(wheelRevealed(0, 0, WHEEL_DEAD_ZONE_PX)).toBe(false);
		expect(
			wheelRevealed(
				WHEEL_REVEAL_MS - 1,
				WHEEL_DEAD_ZONE_PX - 1,
				WHEEL_DEAD_ZONE_PX,
			),
		).toBe(false);
	});

	it("passou o tempo: aparece, mesmo parado", () => {
		expect(wheelRevealed(WHEEL_REVEAL_MS, 0, WHEEL_DEAD_ZONE_PX)).toBe(true);
	});

	it("o mouse saiu do miolo: aparece na hora, mesmo no primeiro instante (arrasto rápido)", () => {
		expect(wheelRevealed(5, WHEEL_DEAD_ZONE_PX, WHEEL_DEAD_ZONE_PX)).toBe(true);
	});

	it("a tremida do mouse (poucos px) não revela a roda", () => {
		for (const px of [1, 2, 3, 4, 6, 10]) {
			expect(wheelRevealed(30, px, WHEEL_DEAD_ZONE_PX)).toBe(false);
		}
	});
});

describe("isAdditiveMarquee: quem soma à seleção na caixa", () => {
	it("Shift e Cmd somam", () => {
		expect(isAdditiveMarquee({ shiftKey: true, metaKey: false })).toBe(true);
		expect(isAdditiveMarquee({ shiftKey: false, metaKey: true })).toBe(true);
	});

	it("sem tecla troca a seleção", () => {
		expect(isAdditiveMarquee({ shiftKey: false, metaKey: false })).toBe(false);
	});
});
