import { describe, expect, it } from "vitest";
import { drawPing, PING_COLORS, type PingLayer } from "./ping-draw";
import { pingTtl } from "./ping-kinds";
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
	return { layer, calls, count, colors, alphas };
}

const ping = (over: Partial<ActivePing> = {}): ActivePing => ({
	id: "p",
	x: 100,
	y: 200,
	userId: "u",
	userName: "U",
	color: "#38bdf8",
	timestamp: 0,
	...over,
});
const USER = 0x38bdf8;
const ctx = (
	token: { x: number; y: number; radius: number } | null = null,
) => ({
	resolveColor: () => USER,
	resolveToken: () => token,
});

describe("ping comum", () => {
	it("anel que cresce e um ponto, na cor de quem pingou", () => {
		const r = recorder();
		drawPing(r.layer, ping(), 500, ctx());
		expect(r.count("circle")).toBe(2);
		expect([...r.colors()]).toEqual([USER]);
	});

	it("ping sem tipo e tipo desconhecido desenham igual ao comum", () => {
		const a = recorder();
		const b = recorder();
		drawPing(a.layer, ping(), 500, ctx());
		drawPing(b.layer, ping({ kind: "attention" }), 500, ctx());
		expect(b.calls).toEqual(a.calls);
		const c = recorder();
		drawPing(c.layer, ping({ kind: "nada" as never }), 500, ctx());
		expect(c.count("circle")).toBe(2);
	});

	it("depois do tempo de vida não desenha nada", () => {
		const r = recorder();
		drawPing(r.layer, ping(), pingTtl("attention"), ctx());
		expect(r.calls).toEqual([]);
	});

	it("esmaece com o tempo", () => {
		const early = recorder();
		const late = recorder();
		drawPing(early.layer, ping(), 300, ctx());
		drawPing(late.layer, ping(), 2_700, ctx());
		expect(Math.max(...late.alphas())).toBeLessThan(
			Math.max(...early.alphas()),
		);
	});
});

describe("tipos com símbolo", () => {
	it("perigo: vermelho, com triângulo e exclamação", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "danger" }), 600, ctx());
		expect([...r.colors()]).toEqual([PING_COLORS.danger]);
		expect(r.count("poly")).toBe(1);
		expect(r.count("moveTo")).toBe(1);
	});

	it("a caminho: verde, com a seta (cabeça e haste)", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "going" }), 600, ctx());
		expect([...r.colors()]).toEqual([PING_COLORS.going]);
		expect(r.count("poly")).toBe(2);
	});

	it("ajuda: âmbar, dois anéis e a cruz", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "help" }), 600, ctx());
		expect([...r.colors()]).toEqual([PING_COLORS.help]);
		expect(r.count("circle")).toBe(2);
		expect(r.count("moveTo")).toBe(2);
	});

	it("todos aqui (mestre): dourado, com três anéis grandes e o ponto central", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "focus" }), 600, ctx());
		expect([...r.colors()]).toEqual([PING_COLORS.focus]);
		expect(r.count("circle")).toBe(5);
		const radii = r.calls
			.filter((c) => c.op === "circle")
			.map((c) => c.args[2] as number);
		expect(Math.max(...radii)).toBeGreaterThan(80); // maior que o ping comum
	});

	it("os tipos de significado têm cores diferentes entre si", () => {
		const values = Object.values(PING_COLORS);
		expect(new Set(values).size).toBe(values.length);
	});

	it("o símbolo dura o tempo do próprio tipo, não o do ping comum", () => {
		const common = recorder();
		const danger = recorder();
		drawPing(common.layer, ping(), 3_200, ctx());
		drawPing(danger.layer, ping({ kind: "danger" }), 3_200, ctx());
		expect(common.calls).toEqual([]);
		expect(danger.count("poly")).toBe(1);
	});
});

describe("destaque de personagem (setas em volta)", () => {
	const token = { x: 350, y: 350, radius: 35 };

	it("quatro setas apontando para o token e um anel em volta dele, na cor de quem destacou", () => {
		const r = recorder();
		drawPing(
			r.layer,
			ping({ kind: "highlight", tokenId: "t" }),
			700,
			ctx(token),
		);
		expect(r.count("poly")).toBe(4);
		expect(r.count("circle")).toBe(1);
		expect([...r.colors()]).toEqual([USER]);
	});

	it("as setas ficam em volta do token, não do ponto do ping", () => {
		const r = recorder();
		drawPing(
			r.layer,
			ping({ kind: "highlight", tokenId: "t", x: 0, y: 0 }),
			700,
			ctx(token),
		);
		for (const call of r.calls.filter((c) => c.op === "poly")) {
			const pts = call.args[0] as number[];
			for (let i = 0; i < pts.length; i += 2) {
				const d = Math.hypot(
					(pts[i] as number) - token.x,
					(pts[i + 1] as number) - token.y,
				);
				expect(d).toBeGreaterThan(token.radius);
				expect(d).toBeLessThan(token.radius + 40);
			}
		}
	});

	it("as setas pulsam (a ponta se aproxima e se afasta)", () => {
		const tips = [200, 600, 1_000, 1_400].map((t) => {
			const r = recorder();
			drawPing(
				r.layer,
				ping({ kind: "highlight", tokenId: "t" }),
				t,
				ctx(token),
			);
			const first = r.calls.find((c) => c.op === "poly")?.args[0] as number[];
			return Math.hypot(
				(first[0] as number) - token.x,
				(first[1] as number) - token.y,
			);
		});
		expect(Math.max(...tips) - Math.min(...tips)).toBeGreaterThan(4);
	});

	it("token que você não vê (nem existe): não desenha nada, para não revelar onde ele está", () => {
		const r = recorder();
		drawPing(
			r.layer,
			ping({ kind: "highlight", tokenId: "oculto" }),
			700,
			ctx(null),
		);
		expect(r.calls).toEqual([]);
	});

	it("destaque sem alvo não desenha nada", () => {
		const r = recorder();
		drawPing(r.layer, ping({ kind: "highlight" }), 700, ctx(token));
		expect(r.calls).toEqual([]);
	});

	it("dura mais que o ping comum (4,5 s)", () => {
		const r = recorder();
		drawPing(
			r.layer,
			ping({ kind: "highlight", tokenId: "t" }),
			4_000,
			ctx(token),
		);
		expect(r.count("poly")).toBe(4);
		const gone = recorder();
		drawPing(
			gone.layer,
			ping({ kind: "highlight", tokenId: "t" }),
			4_500,
			ctx(token),
		);
		expect(gone.calls).toEqual([]);
	});
});
