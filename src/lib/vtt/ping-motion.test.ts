import { describe, expect, it } from "vitest";
import {
	arrowTipDistance,
	easeOutCubic,
	glowAlpha,
	goingChevrons,
	mixColor,
	PING_GLOW_ALPHA,
	pingLabelText,
	pingLife,
	pingPalette,
	waveRings,
	worldRadius,
} from "./ping-motion";

const life = pingLife(0.3, false);

describe("entrada e saída", () => {
	it("a entrada é ease-out: no começo anda mais que o linear", () => {
		const at = 0.04;
		const enter = pingLife(at, false).enter;
		const linear = at / 0.16;
		expect(enter).toBeCloseTo(easeOutCubic(linear), 5);
		expect(enter).toBeGreaterThan(linear + 0.2);
	});

	it("a saída some aos poucos, sem corte", () => {
		const mid = pingLife(0.5, false).alpha;
		const late = pingLife(0.85, false).alpha;
		const end = pingLife(0.98, false).alpha;
		expect(late).toBeLessThan(mid);
		expect(end).toBeLessThan(late);
		expect(end).toBeGreaterThan(0);
	});

	it("com menos movimento só o fade muda; a escala fica parada", () => {
		expect(pingLife(0.05, true).enter).toBe(1);
		expect(pingLife(0.5, true).enter).toBe(1);
		expect(pingLife(0.05, true).alpha).toBeLessThan(pingLife(0.2, true).alpha);
		expect(pingLife(0.9, true).alpha).toBeLessThan(pingLife(0.5, true).alpha);
	});
});

describe("ondas", () => {
	it("perigo pulsa bem mais rápido que a atenção", () => {
		const calm = Math.abs(
			(waveRings("attention", 200, life, false)[0]?.radius ?? 0) -
				(waveRings("attention", 0, life, false)[0]?.radius ?? 0),
		);
		const fast = Math.abs(
			(waveRings("danger", 200, life, false)[0]?.radius ?? 0) -
				(waveRings("danger", 0, life, false)[0]?.radius ?? 0),
		);
		expect(fast).toBeGreaterThan(calm * 2);
		expect(waveRings("attention", 0, life, false)).toHaveLength(3);
		expect(waveRings("danger", 0, life, false)).toHaveLength(2);
	});

	it("ajuda é um pulso duplo: as duas ondas não nascem juntas", () => {
		const rings = waveRings("help", 0, life, false);
		expect(rings).toHaveLength(2);
		expect(
			Math.abs((rings[0]?.radius ?? 0) - (rings[1]?.radius ?? 0)),
		).toBeGreaterThan(15);
	});

	it("com menos movimento o raio não anda", () => {
		const early = waveRings("attention", 100, life, true).map(
			(ring) => ring.radius,
		);
		const late = waveRings("attention", 900, life, true).map(
			(ring) => ring.radius,
		);
		expect(late).toEqual(early);
		expect(waveRings("danger", 100, life, true)[0]?.radius).toBe(
			waveRings("danger", 800, life, true)[0]?.radius,
		);
	});

	it("o brilho fica na intensidade média", () => {
		expect(PING_GLOW_ALPHA).toBeGreaterThan(0.1);
		expect(PING_GLOW_ALPHA).toBeLessThan(0.35);
		expect(glowAlpha(life)).toBeCloseTo(PING_GLOW_ALPHA * life.alpha, 5);
	});
});

describe("a caminho e destaque", () => {
	it("a caminho desenha três chevrons que andam, e param se o movimento some", () => {
		const early = goingChevrons(0, false);
		const late = goingChevrons(350, false);
		expect(early).toHaveLength(3);
		expect(early[0]?.points[1]).not.toBe(late[0]?.points[1]);
		expect(goingChevrons(0, true)[0]?.points).toEqual(
			goingChevrons(350, true)[0]?.points,
		);
	});

	it("as setas pulsam em volta do token e ficam quietas com menos movimento", () => {
		const a = arrowTipDistance(0, 35, false);
		const b = arrowTipDistance(200, 35, false);
		expect(Math.abs(a - b)).toBeGreaterThan(2);
		expect(arrowTipDistance(0, 35, true)).toBe(arrowTipDistance(400, 35, true));
		expect(arrowTipDistance(0, 35, true)).toBeGreaterThan(35);
	});
});

describe("cor da pessoa e zoom", () => {
	it("perigo mistura a pessoa com o vermelho, sem ficar só um dos dois", () => {
		const user = 0x38bdf8;
		const { halo, icon } = pingPalette("danger", user);
		expect(halo).toBe(mixColor(user, 0xef4444, 0.38));
		expect(icon).toBe(mixColor(user, 0xef4444, 0.7));
		expect(halo).not.toBe(user);
		expect(halo).not.toBe(0xef4444);
		expect(icon).not.toBe(halo);
	});

	it("atenção e destaque usam a cor da pessoa pura", () => {
		expect(pingPalette("attention", 0x112233)).toEqual({
			halo: 0x112233,
			icon: 0x112233,
		});
		expect(pingPalette("highlight", 0x112233).icon).toBe(0x112233);
	});

	it("o raio é do mapa: zoom maior não encolhe o ping", () => {
		expect(worldRadius(40, 2)).toBe(40);
		expect(worldRadius(40, 0.25)).toBe(40);
	});

	it("o nome longo é cortado", () => {
		expect(pingLabelText("Ada")).toBe("Ada");
		expect(pingLabelText("  ")).toBe("");
		expect(pingLabelText("A".repeat(30)).endsWith("…")).toBe(true);
		expect(pingLabelText("A".repeat(30)).length).toBe(22);
	});
});
