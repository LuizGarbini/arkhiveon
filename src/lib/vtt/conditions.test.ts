import { describe, expect, it } from "vitest";
import {
	conditionDef,
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

	it("até 3 visíveis; acima disso +N; repetidos e vazios caem", () => {
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
		expect(s.visible.map((c) => c.id)).toEqual(["envenenado", "caido", "cego"]);
		expect(s.overflow).toBe(2);
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
