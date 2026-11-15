import { describe, expect, it } from "vitest";
import { pingTone } from "./audio";
import { PING_KINDS } from "./ping-kinds";

describe("pingTone: o som de cada tipo de ping", () => {
	it("o ping comum mantém o estalo de sempre (880 → 1320 Hz)", () => {
		expect(pingTone("attention")).toEqual({ from: 880, to: 1320 });
		expect(pingTone()).toEqual({ from: 880, to: 1320 });
	});

	it("o de perigo desce (alerta) e os de a caminho e destaque sobem", () => {
		const danger = pingTone("danger");
		expect(danger.to).toBeLessThan(danger.from);
		expect(pingTone("going").to).toBeGreaterThan(pingTone("going").from);
		expect(pingTone("highlight").to).toBeGreaterThan(
			pingTone("highlight").from,
		);
	});

	it("o do mestre ('Todos aqui') é o que sobe mais, para se destacar", () => {
		const focus = pingTone("focus");
		for (const kind of PING_KINDS) {
			if (kind.id === "focus") continue;
			const tone = pingTone(kind.id);
			expect(focus.to / focus.from).toBeGreaterThan(tone.to / tone.from);
		}
	});

	it("todo tipo tem um som próprio (nenhum igual ao do comum, a não ser ele mesmo)", () => {
		const common = JSON.stringify(pingTone("attention"));
		for (const kind of PING_KINDS) {
			if (kind.id === "attention") continue;
			expect(JSON.stringify(pingTone(kind.id))).not.toBe(common);
		}
	});

	it("as notas são frequências audíveis", () => {
		for (const kind of PING_KINDS) {
			const { from, to } = pingTone(kind.id);
			expect(from).toBeGreaterThan(200);
			expect(to).toBeGreaterThan(200);
			expect(from).toBeLessThan(5000);
			expect(to).toBeLessThan(5000);
		}
	});
});
