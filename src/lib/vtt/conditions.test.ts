import { describe, expect, it } from "vitest";
import {
	conditionDef,
	STATUS_CHIP,
	statusDiscPositions,
	summarizeConditions,
	tokenRingStyle,
	VTT_CONDITIONS,
} from "./conditions";

describe("status do token", () => {
	it("sem status: nada visível e anel padrão (sem chrome)", () => {
		expect(summarizeConditions([])).toEqual({ visible: [], overflow: 0 });
		expect(summarizeConditions(undefined).visible).toHaveLength(0);
		expect(tokenRingStyle([], false, false)).toEqual({
			color: 0xd4d4d8,
			width: 2,
		});
		expect(tokenRingStyle([], false, true)).toEqual({
			color: 0xa855f7,
			width: 2.5,
		});
	});

	it("mantém todos os status ativos visíveis ao redor do anel (sem esconder atrás de +N); repetidos e vazios caem", () => {
		const ids = [
			"envenenado",
			"caido",
			"cego",
			"atordoado",
			"chamas",
			"caido",
			"",
		];
		const s = summarizeConditions(ids);
		expect(s.visible.map((c) => c.id)).toEqual([
			"envenenado",
			"caido",
			"cego",
			"atordoado",
			"chamas",
		]);
		expect(s.overflow).toBe(0);
	});

	it("posiciona discos de efeito curvados ao redor da borda circular do token sem sobreposição", () => {
		expect(statusDiscPositions(0, 35)).toEqual([]);
		const single = statusDiscPositions(1, 35);
		expect(single).toHaveLength(1);
		expect(single[0].x).toBeCloseTo(0);
		expect(single[0].y).toBeCloseTo(35);

		const three = statusDiscPositions(3, 35, STATUS_CHIP.desktop.chip);
		expect(three).toHaveLength(3);
		// Da esquerda para a direita, curvando para cima nas laterais do anel.
		expect(three[0].x).toBeLessThan(0);
		expect(three[1].x).toBeCloseTo(0);
		expect(three[2].x).toBeGreaterThan(0);
		expect(three[0].y).toBeLessThan(three[1].y);
		expect(three[2].y).toBeCloseTo(three[0].y);
		for (const p of three) {
			expect(Math.hypot(p.x, p.y)).toBeCloseTo(35);
		}

		// Todos os 7 status ativos num token 1x1 (raio 35): nenhum disco sobrepõe o vizinho e o topo fica livre.
		const allSeven = statusDiscPositions(
			VTT_CONDITIONS.length,
			35,
			STATUS_CHIP.desktop.chip,
		);
		expect(allSeven).toHaveLength(VTT_CONDITIONS.length);
		for (let i = 1; i < allSeven.length; i++) {
			const dist = Math.hypot(
				allSeven[i].x - allSeven[i - 1].x,
				allSeven[i].y - allSeven[i - 1].y,
			);
			expect(dist).toBeGreaterThan(STATUS_CHIP.desktop.chip);
		}
	});

	it("borda de 2px na cor do 1º status; seleção tem prioridade", () => {
		expect(tokenRingStyle(["chamas", "cego"], false, false)).toEqual({
			color: conditionDef("chamas").hex,
			width: 2,
		});
		expect(tokenRingStyle(["chamas"], true, false)).toEqual({
			color: 0x38bdf8,
			width: 3.5,
		});
	});

	it("id desconhecido vira status neutro com o próprio nome", () => {
		expect(conditionDef("congelado")).toMatchObject({
			id: "congelado",
			label: "congelado",
		});
	});

	it("cores do canvas são as mesmas do chip (paleta *-400 já usada)", () => {
		const tw: Record<string, number> = {
			emerald: 0x34d399,
			amber: 0xfbbf24,
			zinc: 0xa1a1aa,
			yellow: 0xfacc15,
			sky: 0x38bdf8,
			rose: 0xfb7185,
			purple: 0xc084fc,
		};
		for (const c of VTT_CONDITIONS) {
			const name = /text-(\w+)-400/.exec(c.color)?.[1] ?? "";
			expect(c.hex).toBe(tw[name]);
		}
	});
});
