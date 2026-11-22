import { describe, expect, it } from "vitest";
import {
	BARE_NUMBER_ACTION,
	bareNumberHint,
	canUndoHp,
	HP_UNDO_MS,
	hpEnterAction,
	hpTargetLabel,
	parseHpInput,
	planHpAction,
} from "./hp-quick";

describe("parseHpInput", () => {
	it.each([
		["-15", "damage", 15],
		["−15", "damage", 15],
		["– 15", "damage", 15],
		["+8", "heal", 8],
		["15", "bare", 15],
		["=15", "set", 15],
		[" = 20 ", "set", 20],
		["=0", "set", 0],
		["9999", "bare", 9999],
	] as const)("%s → %s %d", (raw, kind, amount) => {
		expect(parseHpInput(raw)).toEqual({ kind, amount });
	});

	it("0, +0 e -0 não fazem nada", () => {
		for (const raw of ["0", "+0", "-0", "000"]) {
			expect(parseHpInput(raw).kind).toBe("zero");
		}
	});

	it("vazio não é erro", () => {
		expect(parseHpInput("").kind).toBe("empty");
		expect(parseHpInput("   ").kind).toBe("empty");
	});

	it("texto, dado, sinal duplo e mais de 4 dígitos são inválidos", () => {
		for (const raw of [
			"abc",
			"1d6",
			"--5",
			"5-",
			"+-3",
			"12345",
			"1.5",
			"=+3",
		]) {
			expect(parseHpInput(raw).kind).toBe("invalid");
		}
	});
});

const elara = { current: 27, max: 32, temp: 5, canTemp: true };

describe("planHpAction", () => {
	it("dano come a temporária e depois o PV (mestre)", () => {
		const plan = planHpAction("damage", 15, elara);
		expect(plan.after).toEqual({ current: 17, temp: 0 });
		expect(plan.noop).toBeNull();
	});

	it("jogador: o dano vai direto no PV e a temporária fica", () => {
		const plan = planHpAction("damage", 15, { ...elara, canTemp: false });
		expect(plan.after).toEqual({ current: 12, temp: 5 });
	});

	it("dano além de 0 PV mostra o que sobrou", () => {
		const plan = planHpAction("damage", 40, elara);
		expect(plan.after).toEqual({ current: 0, temp: 0 });
		expect(plan.overflow).toBe(8);
	});

	it("cura vai até o máximo e não mexe na temporária", () => {
		expect(planHpAction("heal", 8, elara).after).toEqual({
			current: 32,
			temp: 5,
		});
	});

	it("definir fica entre 0 e o máximo", () => {
		expect(planHpAction("set", 15, elara).after).toEqual({
			current: 15,
			temp: 5,
		});
		expect(planHpAction("set", 99, elara).after.current).toBe(32);
		expect(planHpAction("set", 0, elara).after.current).toBe(0);
	});

	it("sem efeito: cura no máximo, dano em 0 PV sem temp, valor igual", () => {
		expect(planHpAction("heal", 5, { ...elara, current: 32 }).noop).toBe("max");
		expect(
			planHpAction("damage", 5, { ...elara, current: 0, temp: 0 }).noop,
		).toBe("zero");
		expect(
			planHpAction("damage", 5, { ...elara, current: 0, canTemp: false }).noop,
		).toBe("zero");
		expect(planHpAction("set", 27, elara).noop).toBe("same");
	});
});

describe("canUndoHp", () => {
	const applied = { after: { current: 17, temp: 0 } };

	it("desfaz dentro de 10 s com o PV ainda igual", () => {
		expect(canUndoHp(applied, { current: 17, temp: 0 }, 0)).toBe(true);
		expect(canUndoHp(applied, { current: 17, temp: 0 }, HP_UNDO_MS)).toBe(true);
	});

	it("depois de 10 s não desfaz", () => {
		expect(canUndoHp(applied, { current: 17, temp: 0 }, HP_UNDO_MS + 1)).toBe(
			false,
		);
	});

	it("se o PV ou a temporária mudaram depois, não desfaz", () => {
		expect(canUndoHp(applied, { current: 12, temp: 0 }, 1000)).toBe(false);
		expect(canUndoHp(applied, { current: 17, temp: 3 }, 1000)).toBe(false);
	});
});

describe("hpEnterAction (regra do número sem sinal)", () => {
	it("hoje “15” + Enter define o PV (plano aprovado)", () => {
		expect(BARE_NUMBER_ACTION).toBe("set");
		expect(hpEnterAction(parseHpInput("15"))).toBe("set");
		expect(bareNumberHint()).toBe("“15” define");
	});

	it("sinal explícito manda: −15 dano, +8 cura, =15 define", () => {
		expect(hpEnterAction(parseHpInput("-15"))).toBe("damage");
		expect(hpEnterAction(parseHpInput("+8"))).toBe("heal");
		expect(hpEnterAction(parseHpInput("=15"))).toBe("set");
	});

	it("Shift+Enter cura só o número sem sinal; com sinal, o sinal manda", () => {
		expect(hpEnterAction(parseHpInput("15"), true)).toBe("heal");
		expect(hpEnterAction(parseHpInput("-15"), true)).toBe("damage");
		expect(hpEnterAction(parseHpInput("=15"), true)).toBe("set");
		expect(hpEnterAction(parseHpInput("+8"), true)).toBe("heal");
	});

	it("vazio, zero e inválido não aplicam nada", () => {
		for (const raw of ["", "0", "abc"]) {
			expect(hpEnterAction(parseHpInput(raw))).toBeNull();
			expect(hpEnterAction(parseHpInput(raw), true)).toBeNull();
		}
	});
});

describe("hpTargetLabel", () => {
	it("quem vê o máximo lê o número", () => {
		expect(hpTargetLabel(32, 32, true)).toBe("32");
		expect(hpTargetLabel(20, 32, true)).toBe("20");
	});

	it("quem não vê o máximo lê “máx” só quando o ajuste chega nele", () => {
		expect(hpTargetLabel(32, 32, false)).toBe("máx");
		expect(hpTargetLabel(20, 32, false)).toBe("20");
		expect(hpTargetLabel(0, 0, false)).toBe("0");
	});
});
