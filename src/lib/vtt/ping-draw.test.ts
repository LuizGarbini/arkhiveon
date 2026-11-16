import { describe, expect, it } from "vitest";
import { drawPing, type PingLayer, type PingPaintContext } from "./ping-draw";
import { pingTtl } from "./ping-kinds";
import { PING_RIM, PING_SHADOW, pingPalette } from "./ping-motion";
import type { ActivePing } from "./ping-queue";

function recorder() {
	const calls: { op: string; args: unknown[] }[] = [];
	const layer = new Proxy(
		{},
		{
			get:
				(_t, op: string) =>
				(...args: unknown[]) => {
					calls.push({ op, args });
					return layer;
				},
		},
	) as unknown as PingLayer;
	const count = (op: string) => calls.filter((c) => c.op === op).length;
	const colors = () =>
		new Set(
			calls
				.filter((c) => c.op === "stroke" || c.op === "fill")
				.map((c) => (c.args[0] as { color: number }).color),
		);
	const alphas = () =>
		calls
			.filter((c) => c.op === "stroke" || c.op === "fill")
			.map((c) => (c.args[0] as { alpha: number }).alpha);
	const radii = () =>
		calls.filter((c) => c.op === "circle").map((c) => c.args[2] as number);
	return { layer, calls, count, colors, alphas, radii };
}

const ping = (over: Partial<ActivePing> = {}): ActivePing => ({
	id: "p",
	x: 100,
	y: 200,
	userId: "u",
	userName: "Ada",
	color: "#38bdf8",
	timestamp: 0,
	...over,
});

const USER = 0x38bdf8;
const ctx = (
	over: Partial<PingPaintContext> = {},
	token: { x: number; y: number; radius: number } | null = null,
): PingPaintContext => ({
	resolveColor: () => USER,
	resolveToken: () => token,
	...over,
});

describe("ping comum (atenção)", () => {
	it("ondas, brilho no chão, sombra e o nome, na cor de quem pingou", () => {
		const r = recorder();
		const label = drawPing(r.layer, ping(), 500, ctx());
		expect(r.count("ellipse")).toBe(2);
		expect(r.count("circle")).toBeGreaterThanOrEqual(3);
		expect(r.colors().has(USER)).toBe(true);
		expect(r.colors().has(PING_SHADOW)).toBe(true);
		expect(r.colors().has(PING_RIM)).toBe(true);
		expect(label).toEqual({ id: "p", text: "Ada", x: 100, y: 228 });
		expect(r.count("roundRect")).toBeGreaterThanOrEqual(2);
	});

	it("tipo desconhecido desenha como atenção", () => {
		const known = recorder();
		const unknown = recorder();
		drawPing(known.layer, ping({ kind: "attention" }), 500, ctx());
		drawPing(unknown.layer, ping({ kind: "nada" as never }), 500, ctx());
		expect(unknown.radii()).toEqual(known.radii());
	});

	it("depois do tempo de vida não desenha nada", () => {
		const r = recorder();
		expect(drawPing(r.layer, ping(), pingTtl("attention"), ctx())).toBeNull();
		expect(r.calls).toEqual([]);
	});

	it("some aos poucos", () => {
		const early = recorder();
		const late = recorder();
		drawPing(early.layer, ping(), 400, ctx());
		drawPing(late.layer, ping(), 2_800, ctx());
		expect(Math.max(...late.alphas())).toBeLessThan(
			Math.max(...early.alphas()),
		);
	});

	it("com menos movimento o anel não anda, só o fade", () => {
		const early = recorder();
		const late = recorder();
		const reduced = ctx({ reducedMotion: true });
		drawPing(early.layer, ping(), 400, reduced);
		drawPing(late.layer, ping(), 2_200, reduced);
		expect(late.radii()).toEqual(early.radii());
		expect(Math.max(...late.alphas())).toBeLessThan(
			Math.max(...early.alphas()),
		);
	});

	it("zoom maior não muda o raio no mapa", () => {
		const near = recorder();
		const far = recorder();
		drawPing(near.layer, ping(), 500, ctx({ zoom: 1 }));
		drawPing(far.layer, ping(), 500, ctx({ zoom: 2 }));
		expect(far.radii()).toEqual(near.radii());
	});
});

describe("tipos com símbolo", () => {
	it("perigo: pulso na cor misturada, com triângulo e sombra", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "danger" }), 600, ctx());
		const palette = pingPalette("danger", USER);
		expect(r.colors().has(palette.halo)).toBe(true);
		expect(r.colors().has(palette.icon)).toBe(true);
		expect(r.colors().has(PING_SHADOW)).toBe(true);
		expect(r.count("poly")).toBeGreaterThanOrEqual(2);
		expect(r.count("moveTo")).toBeGreaterThanOrEqual(2);
	});

	it("a caminho: chevrons, não uma bandeira", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "going" }), 600, ctx());
		expect(r.colors().has(pingPalette("going", USER).icon)).toBe(true);
		expect(r.count("moveTo")).toBeGreaterThanOrEqual(6);
		expect(r.count("poly")).toBe(0);
	});

	it("ajuda: dois anéis e a cruz", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "help" }), 600, ctx());
		expect(r.colors().has(pingPalette("help", USER).halo)).toBe(true);
		expect(r.count("circle")).toBeGreaterThanOrEqual(4);
		expect(r.count("moveTo")).toBeGreaterThanOrEqual(4);
	});

	it("todos aqui: três anéis grandes e a marca do mestre", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "focus" }), 600, ctx());
		expect(r.colors().has(pingPalette("focus", USER).halo)).toBe(true);
		expect(r.count("poly")).toBe(2);
		const radii = r.radii();
		expect(Math.max(...radii)).toBeGreaterThan(50);
	});

	it("o símbolo dura o tempo do próprio tipo", () => {
		const common = recorder();
		const danger = recorder();
		drawPing(common.layer, ping(), 3_200, ctx());
		drawPing(danger.layer, ping({ kind: "danger" }), 3_200, ctx());
		expect(common.calls).toEqual([]);
		expect(danger.count("poly")).toBeGreaterThanOrEqual(2);
	});
});

describe("destaque de personagem (setas em volta)", () => {
	const token = { x: 350, y: 350, radius: 35 };

	it("quatro setas com sombra, anel e o nome, na cor de quem destacou", () => {
		const r = recorder();
		const label = drawPing(
			r.layer,
			ping({ kind: "highlight", tokenId: "t" }),
			700,
			ctx({}, token),
		);
		expect(r.count("poly")).toBe(8);
		expect(r.colors().has(USER)).toBe(true);
		expect(r.colors().has(PING_SHADOW)).toBe(true);
		expect(label?.text).toBe("Ada");
		expect(label?.x).toBe(token.x);
	});

	it("as setas ficam em volta do token, não do ponto do ping", () => {
		const r = recorder();
		drawPing(
			r.layer,
			ping({ kind: "highlight", tokenId: "t", x: 0, y: 0 }),
			700,
			ctx({}, token),
		);
		for (const call of r.calls.filter((c) => c.op === "poly")) {
			const pts = call.args[0] as number[];
			for (let i = 0; i < pts.length; i += 2) {
				const d = Math.hypot(
					(pts[i] as number) - token.x,
					(pts[i + 1] as number) - token.y,
				);
				expect(d).toBeGreaterThan(token.radius);
				expect(d).toBeLessThan(token.radius + 48);
			}
		}
	});

	it("as setas pulsam, e com menos movimento ficam no mesmo lugar", () => {
		const tip = (now: number, reduced = false) => {
			const r = recorder();
			drawPing(
				r.layer,
				ping({ kind: "highlight", tokenId: "t" }),
				now,
				ctx({ reducedMotion: reduced }, token),
			);
			const first = r.calls.find((c) => c.op === "poly")?.args[0] as number[];
			return Math.hypot(
				(first[0] as number) - token.x,
				(first[1] as number) - token.y,
			);
		};
		const moving = [200, 600, 1_000, 1_400].map((t) => tip(t));
		expect(Math.max(...moving) - Math.min(...moving)).toBeGreaterThan(4);
		expect(tip(200, true)).toBeCloseTo(tip(1_000, true), 4);
	});

	it("token que você não vê não desenha nada", () => {
		const r = recorder();
		expect(
			drawPing(
				r.layer,
				ping({ kind: "highlight", tokenId: "oculto" }),
				700,
				ctx({}, null),
			),
		).toBeNull();
		expect(r.calls).toEqual([]);
	});

	it("destaque sem alvo não desenha nada", () => {
		const r = recorder();
		expect(
			drawPing(r.layer, ping({ kind: "highlight" }), 700, ctx({}, token)),
		).toBeNull();
		expect(r.calls).toEqual([]);
	});

	it("dura mais que o ping comum (4,5 s)", () => {
		const r = recorder();
		drawPing(
			r.layer,
			ping({ kind: "highlight", tokenId: "t" }),
			4_000,
			ctx({}, token),
		);
		expect(r.count("poly")).toBe(8);
		const gone = recorder();
		expect(
			drawPing(
				gone.layer,
				ping({ kind: "highlight", tokenId: "t" }),
				4_500,
				ctx({}, token),
			),
		).toBeNull();
		expect(gone.calls).toEqual([]);
	});
});
