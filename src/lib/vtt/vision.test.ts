import { describe, expect, it } from "vitest";
import type { VTTToken } from "./types";
import {
	DEFAULT_VISION_CELLS,
	isVisionToken,
	visionKey,
	visionSources,
} from "./vision";

const token = (over: Partial<VTTToken> = {}): VTTToken => ({
	id: "t",
	sceneId: "s",
	name: "T",
	layer: "token",
	x: 100,
	y: 200,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	...over,
});

describe("isVisionToken", () => {
	it("token com ficha enxerga; com controle também", () => {
		expect(isVisionToken(token({ characterId: "c" }))).toBe(true);
		expect(isVisionToken(token({ controlledBy: ["u"] }))).toBe(true);
	});

	it("monstro sem ficha e sem dono não enxerga", () => {
		expect(isVisionToken(token())).toBe(false);
	});

	it("oculto ou na camada do mestre não enxerga", () => {
		expect(isVisionToken(token({ characterId: "c", isHidden: true }))).toBe(
			false,
		);
		expect(isVisionToken(token({ characterId: "c", layer: "gm" }))).toBe(false);
	});
});

describe("visionSources", () => {
	it("converte o alcance de casas para pixels", () => {
		const [s] = visionSources(
			[token({ characterId: "c", visionRange: 4 })],
			70,
		);
		expect(s).toEqual({ id: "t", x: 100, y: 200, range: 280 });
	});

	it("sem alcance usa o padrão", () => {
		const [s] = visionSources(
			[token({ characterId: "c", visionRange: 0 })],
			50,
		);
		expect(s?.range).toBe(DEFAULT_VISION_CELLS * 50);
	});

	it("grade inválida cai em 70 px", () => {
		const [s] = visionSources([token({ characterId: "c", visionRange: 2 })], 0);
		expect(s?.range).toBe(140);
	});

	it("só tokens que enxergam entram", () => {
		const list = [token({ id: "pc", characterId: "c" }), token({ id: "mob" })];
		expect(visionSources(list, 70).map((s) => s.id)).toEqual(["pc"]);
	});
});

describe("visionKey · só muda quando a visão muda", () => {
	const pc = token({ id: "pc", characterId: "c" });
	const mob = token({ id: "mob", x: 500, y: 500 });
	const key = (list: VTTToken[]) => visionKey(visionSources(list, 70));

	it("mover um monstro NÃO muda a assinatura", () => {
		const a = key([pc, mob]);
		const b = key([pc, { ...mob, x: 900, y: 40 }]);
		expect(b).toBe(a);
	});

	it("girar, mudar PV ou condição de qualquer token NÃO muda a assinatura", () => {
		const a = key([pc, mob]);
		expect(
			key([{ ...pc, rotation: 90, hpCurrent: 3, conditions: ["caido"] }, mob]),
		).toBe(a);
	});

	it("mover quem enxerga muda", () => {
		expect(key([{ ...pc, x: 400 }])).not.toBe(key([pc]));
	});

	it("mudar o alcance muda", () => {
		expect(key([{ ...pc, visionRange: 9 }])).not.toBe(key([pc]));
	});

	it("entrar ou sair quem enxerga muda", () => {
		expect(key([pc, { ...pc, id: "pc2" }])).not.toBe(key([pc]));
		expect(key([])).not.toBe(key([pc]));
	});

	it("movimento de menos de meio pixel não refaz a névoa", () => {
		expect(key([{ ...pc, x: 100.2 }])).toBe(key([pc]));
	});
});
