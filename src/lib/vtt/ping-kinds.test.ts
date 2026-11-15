import { describe, expect, it } from "vitest";
import {
	allowedPingKind,
	DEFAULT_PING_KIND,
	isPingKind,
	normalizePingKind,
	PING_KINDS,
	pingKindInfo,
	pingKindsFor,
	pingTtl,
} from "./ping-kinds";

describe("tipos de ping", () => {
	it("o padrão é o ping comum (atenção)", () => {
		expect(DEFAULT_PING_KIND).toBe("attention");
		expect(PING_KINDS[0]?.id).toBe("attention");
	});

	it("cada tipo tem nome em português, dica e tempo positivo", () => {
		for (const kind of PING_KINDS) {
			expect(kind.label.length).toBeGreaterThan(2);
			expect(kind.hint.length).toBeGreaterThan(5);
			expect(kind.ttlMs).toBeGreaterThanOrEqual(3000);
		}
		expect(PING_KINDS.map((k) => k.id)).toEqual([
			"attention",
			"danger",
			"going",
			"help",
			"highlight",
			"focus",
		]);
	});

	it("não há tipo repetido", () => {
		expect(new Set(PING_KINDS.map((k) => k.id)).size).toBe(PING_KINDS.length);
	});
});

describe("normalizePingKind / isPingKind", () => {
	it("aceita os tipos conhecidos", () => {
		for (const kind of PING_KINDS) {
			expect(isPingKind(kind.id)).toBe(true);
			expect(normalizePingKind(kind.id)).toBe(kind.id);
		}
	});

	it("o que é desconhecido, vazio ou de outro tipo vira ping comum", () => {
		for (const bad of [
			"",
			"danger ",
			"DANGER",
			"nuke",
			null,
			undefined,
			7,
			{},
			[],
		]) {
			expect(isPingKind(bad)).toBe(false);
			expect(normalizePingKind(bad)).toBe("attention");
		}
	});
});

describe("pingKindsFor: o que cada um pode escolher", () => {
	it("o jogador não vê 'Todos aqui' (é do mestre)", () => {
		const ids = pingKindsFor(false).map((k) => k.id);
		expect(ids).not.toContain("focus");
		expect(ids).toEqual(["attention", "danger", "going", "help", "highlight"]);
	});

	it("o mestre e o co-mestre veem todos, 'Todos aqui' por último", () => {
		const ids = pingKindsFor(true).map((k) => k.id);
		expect(ids).toEqual([
			"attention",
			"danger",
			"going",
			"help",
			"highlight",
			"focus",
		]);
	});
});

describe("pingTtl", () => {
	it("o destaque e o ping do mestre ficam mais tempo que o comum", () => {
		expect(pingTtl("attention")).toBe(3000);
		expect(pingTtl("highlight")).toBeGreaterThan(pingTtl("attention"));
		expect(pingTtl("focus")).toBeGreaterThan(pingTtl("attention"));
	});

	it("ping antigo, sem tipo, dura o tempo do comum", () => {
		expect(pingTtl()).toBe(3000);
		expect(pingTtl(null)).toBe(3000);
		expect(pingTtl(undefined)).toBe(pingTtl("attention"));
	});
});

describe("allowedPingKind: a trava por baixo da interface", () => {
	it("jogador que tenta 'Todos aqui' manda ping comum", () => {
		expect(allowedPingKind("focus", false)).toBe("attention");
	});

	it("o mestre manda 'Todos aqui' mesmo", () => {
		expect(allowedPingKind("focus", true)).toBe("focus");
	});

	it("os demais tipos passam para todos", () => {
		for (const id of [
			"attention",
			"danger",
			"going",
			"help",
			"highlight",
		] as const) {
			expect(allowedPingKind(id, false)).toBe(id);
			expect(allowedPingKind(id, true)).toBe(id);
		}
	});

	it("pingKindInfo devolve o tipo certo", () => {
		expect(pingKindInfo("danger").label).toBe("Perigo");
		expect(pingKindInfo("focus").gmOnly).toBe(true);
	});
});
