import { describe, expect, it } from "vitest";
import { acceptIncomingPing } from "./ping-receive";

const focus = (over: Record<string, unknown> = {}) => ({
	x: 300,
	y: 400,
	userId: "mestre",
	userName: "Mestre",
	color: "#fff",
	timestamp: 10,
	kind: "focus",
	...over,
});

describe("ping do mestre (leva a câmera)", () => {
	it("o dono da campanha leva a câmera de todos até o ponto", () => {
		const accepted = acceptIncomingPing(focus(), { campaignOwnerId: "mestre" });
		expect(accepted?.ping.kind).toBe("focus");
		expect(accepted?.pullTo).toEqual({ x: 300, y: 400 });
	});

	it("co-mestre conhecido por membership também leva", () => {
		const accepted = acceptIncomingPing(focus({ userId: "co" }), {
			campaignOwnerId: "mestre",
			memberships: [{ userId: "co", role: "editor" }],
		});
		expect(accepted?.pullTo).toEqual({ x: 300, y: 400 });
	});

	it("co-mestre só pela presença (sem membership) também leva", () => {
		const accepted = acceptIncomingPing(focus({ userId: "co" }), {
			campaignOwnerId: "mestre",
			presence: [{ userId: "co", isCoGM: true }],
		});
		expect(accepted?.pullTo).not.toBeNull();
	});

	it("jogador que manda 'Todos aqui' à força vira ping comum e NÃO mexe na câmera", () => {
		const accepted = acceptIncomingPing(focus({ userId: "jogador" }), {
			campaignOwnerId: "mestre",
			memberships: [{ userId: "jogador", role: "viewer" }],
		});
		expect(accepted?.ping.kind).toBe("attention");
		expect(accepted?.pullTo).toBeNull();
		expect(accepted?.ping.x).toBe(300);
	});

	it("o papel que vem escrito no evento é ignorado", () => {
		const accepted = acceptIncomingPing(
			focus({
				userId: "esperto",
				isGM: true,
				role: "owner",
				isCoGM: true,
			} as Record<string, unknown>),
			{ campaignOwnerId: "mestre" },
		);
		expect(accepted?.pullTo).toBeNull();
		expect(accepted?.ping.kind).toBe("attention");
	});

	it("remetente desconhecido (sem membership nem presença) é jogador", () => {
		expect(
			acceptIncomingPing(focus({ userId: "ninguem" }), {})?.pullTo,
		).toBeNull();
	});

	it("a presença declarada como mestre por quem é membership 'viewer' NÃO vale (membership vence)", () => {
		const accepted = acceptIncomingPing(focus({ userId: "jogador" }), {
			campaignOwnerId: "mestre",
			memberships: [{ userId: "jogador", role: "viewer" }],
			presence: [{ userId: "jogador", isGM: true }],
		});
		expect(accepted?.pullTo).toBeNull();
	});
});

describe("pings comuns passam sem checar papel e nunca levam a câmera", () => {
	it("cada tipo comum chega como veio, sem puxar a câmera", () => {
		for (const kind of ["attention", "danger", "going", "help", "highlight"]) {
			const accepted = acceptIncomingPing(
				{ ...focus({ userId: "jogador", kind }), tokenId: "t" },
				{},
			);
			expect(accepted?.ping.kind).toBe(kind);
			expect(accepted?.pullTo).toBeNull();
		}
	});

	it("ping antigo, sem tipo, segue funcionando", () => {
		const accepted = acceptIncomingPing(
			{ x: 1, y: 2, userId: "u", timestamp: 5 },
			{},
		);
		expect(accepted?.ping.x).toBe(1);
		expect(accepted?.pullTo).toBeNull();
	});

	it("o mestre que manda um ping comum não puxa a câmera de ninguém", () => {
		const accepted = acceptIncomingPing(focus({ kind: "danger" }), {
			campaignOwnerId: "mestre",
		});
		expect(accepted?.pullTo).toBeNull();
	});

	it("payload inválido: nada", () => {
		expect(acceptIncomingPing(null, {})).toBeNull();
		expect(acceptIncomingPing(undefined, {})).toBeNull();
		expect(acceptIncomingPing({ x: "a" } as never, {})).toBeNull();
	});
});
