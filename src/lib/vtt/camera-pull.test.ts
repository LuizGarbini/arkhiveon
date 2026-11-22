import { describe, expect, it } from "vitest";
import {
	CAMERA_PULL_MS,
	cameraAt,
	cameraCenteredOn,
	easeOutCubic,
	resolveCameraPull,
	worldPointOnScreen,
} from "./camera-pull";

describe("cameraCenteredOn", () => {
	it("põe o ponto do mapa no centro da tela", () => {
		const cam = cameraCenteredOn({ x: 500, y: 300 }, 1, {
			width: 1280,
			height: 800,
		});
		expect(cam).toEqual({ x: 140, y: 100, scale: 1 });
		// a conta de volta: ponto na tela = câmera + mapa × zoom
		expect(cam.x + 500 * cam.scale).toBe(640);
		expect(cam.y + 300 * cam.scale).toBe(400);
	});

	it("respeita o zoom de quem recebe (não muda o zoom)", () => {
		const cam = cameraCenteredOn({ x: 500, y: 300 }, 2, {
			width: 1000,
			height: 600,
		});
		expect(cam.scale).toBe(2);
		expect(cam.x + 500 * 2).toBe(500);
		expect(cam.y + 300 * 2).toBe(300);
	});

	it("ponto na origem: a câmera é o centro da tela", () => {
		expect(
			cameraCenteredOn({ x: 0, y: 0 }, 1.5, { width: 800, height: 600 }),
		).toEqual({ x: 400, y: 300, scale: 1.5 });
	});
});

describe("easeOutCubic", () => {
	it("vai de 0 a 1, rápido no começo e devagar no fim", () => {
		expect(easeOutCubic(0)).toBe(0);
		expect(easeOutCubic(1)).toBe(1);
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
		expect(easeOutCubic(0.1) - easeOutCubic(0)).toBeGreaterThan(
			easeOutCubic(1) - easeOutCubic(0.9),
		);
	});

	it("nunca passa de 0 a 1, mesmo com tempo fora do intervalo", () => {
		expect(easeOutCubic(-1)).toBe(0);
		expect(easeOutCubic(7)).toBe(1);
	});
});

describe("cameraAt", () => {
	const from = { x: 0, y: 0, scale: 1 };
	const to = { x: -400, y: -200, scale: 1 };

	it("começa onde estava e termina no destino", () => {
		expect(cameraAt(from, to, 0)).toEqual(from);
		expect(cameraAt(from, to, 1)).toEqual(to);
	});

	it("no meio do tempo já passou da metade do caminho (começa rápido)", () => {
		const mid = cameraAt(from, to, 0.5);
		expect(mid.x).toBeLessThan(-200);
		expect(mid.x).toBeGreaterThan(-400);
	});

	it("o zoom não muda quando origem e destino têm o mesmo zoom", () => {
		for (const t of [0, 0.25, 0.5, 0.9, 1])
			expect(cameraAt(from, to, t).scale).toBe(1);
	});
});

describe("worldPointOnScreen", () => {
	const screen = { width: 1000, height: 800 };

	it("o miolo e as bordas estão na tela", () => {
		const viewport = { x: 0, y: 0, scale: 1 };
		expect(worldPointOnScreen({ x: 10, y: 10 }, viewport, screen)).toBe(true);
		expect(worldPointOnScreen({ x: 0, y: 0 }, viewport, screen)).toBe(true);
		expect(worldPointOnScreen({ x: 1000, y: 800 }, viewport, screen)).toBe(
			true,
		);
	});

	it("fora do retângulo, ou sem tamanho, não está na tela", () => {
		expect(
			worldPointOnScreen({ x: 1000.1, y: 0 }, { x: 0, y: 0, scale: 1 }, screen),
		).toBe(false);
		expect(
			worldPointOnScreen({ x: 10, y: 10 }, { x: -50, y: 0, scale: 1 }, screen),
		).toBe(false);
		expect(
			worldPointOnScreen(
				{ x: 10, y: 10 },
				{ x: 0, y: 0, scale: 1 },
				{
					width: 0,
					height: 800,
				},
			),
		).toBe(false);
	});
});

describe("resolveCameraPull", () => {
	const from = { x: 0, y: 0, scale: 2 };
	const world = { x: 100, y: 40 };
	const screen = { width: 800, height: 600 };
	const destination = { x: 200, y: 220, scale: 2 };

	it("com menos movimento, a câmera já está no destino", () => {
		expect(
			resolveCameraPull({
				from,
				world,
				screen,
				elapsedMs: 0,
				reducedMotion: true,
			}),
		).toEqual(destination);
	});

	it("sem menos movimento, começa onde estava e chega no fim do tempo", () => {
		expect(
			resolveCameraPull({
				from,
				world,
				screen,
				elapsedMs: 0,
				reducedMotion: false,
			}),
		).toEqual(from);
		expect(
			resolveCameraPull({
				from,
				world,
				screen,
				elapsedMs: CAMERA_PULL_MS,
				reducedMotion: false,
			}),
		).toEqual(destination);
	});
});
