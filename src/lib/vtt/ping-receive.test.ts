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

const screen = { width: 1000, height: 800 };
const offScreen = {
	viewport: { x: -2000, y: 0, scale: 1 },
	screen,
	selfUserId: "jogador",
};
const onScreen = {
	viewport: { x: 0, y: 0, scale: 1 },
	screen,
	selfUserId: "jogador",
};
const gm = { campaignOwnerId: "mestre" };

describe("Atenção do mestre leva a câmera só fora da tela", () => {
	it("ponto fora da tela: a câmera vai até o ponto", () => {
		const accepted = acceptIncomingPing(
			focus({ kind: "attention" }),
			gm,
			offScreen,
		);
		expect(accepted?.ping.kind).toBe("attention");
		expect(accepted?.pullTo).toEqual({ x: 300, y: 400 });
	});

	it("ponto dentro da tela: a câmera não muda", () => {
		const accepted = acceptIncomingPing(
			focus({ kind: "attention" }),
			gm,
			onScreen,
		);
		expect(accepted?.pullTo).toBeNull();
		expect(accepted?.ping.kind).toBe("attention");
	});

	it("a borda do canvas ainda é dentro da tela", () => {
		const accepted = acceptIncomingPing(
			focus({ kind: "attention", x: 1000, y: 800 }),
			gm,
			onScreen,
		);
		expect(accepted?.pullTo).toBeNull();
	});

	it("um passo além da borda está fora e leva a câmera", () => {
		const accepted = acceptIncomingPing(
			focus({ kind: "attention", x: 1000.1, y: 0 }),
			gm,
			onScreen,
		);
		expect(accepted?.pullTo).toEqual({ x: 1000.1, y: 0 });
	});

	it("com zoom, o que cabe no canvas não leva e o que passa leva", () => {
		const zoom = {
			viewport: { x: 0, y: 0, scale: 2 },
			screen,
			selfUserId: "jogador",
		};
		expect(
			acceptIncomingPing(focus({ kind: "attention", x: 400, y: 100 }), gm, zoom)
				?.pullTo,
		).toBeNull();
		expect(
			acceptIncomingPing(focus({ kind: "attention", x: 600, y: 100 }), gm, zoom)
				?.pullTo,
		).toEqual({ x: 600, y: 100 });
	});

	it("sem o tamanho do canvas, não leva", () => {
		const accepted = acceptIncomingPing(focus({ kind: "attention" }), gm, {
			viewport: offScreen.viewport,
			screen: { width: 0, height: 0 },
			selfUserId: "jogador",
		});
		expect(accepted?.pullTo).toBeNull();
	});

	it("sem a visão de quem recebe, Atenção não leva", () => {
		expect(
			acceptIncomingPing(focus({ kind: "attention" }), gm)?.pullTo,
		).toBeNull();
	});

	it("o mestre que envia não move a própria câmera", () => {
		const accepted = acceptIncomingPing(focus({ kind: "attention" }), gm, {
			...offScreen,
			selfUserId: "mestre",
		});
		expect(accepted?.pullTo).toBeNull();
		expect(accepted?.ping.kind).toBe("attention");
	});

	it("ping de jogador fora da tela não move a câmera", () => {
		const accepted = acceptIncomingPing(
			focus({ kind: "attention", userId: "jogador" }),
			{
				campaignOwnerId: "mestre",
				memberships: [{ userId: "jogador", role: "viewer" }],
			},
			offScreen,
		);
		expect(accepted?.pullTo).toBeNull();
		expect(accepted?.ping.kind).toBe("attention");
	});

	it("jogador que finge mestre na presença não leva, se a membership diz viewer", () => {
		const accepted = acceptIncomingPing(
			focus({ kind: "attention", userId: "jogador" }),
			{
				campaignOwnerId: "mestre",
				memberships: [{ userId: "jogador", role: "viewer" }],
				presence: [{ userId: "jogador", isGM: true }],
			},
			offScreen,
		);
		expect(accepted?.pullTo).toBeNull();
	});

	it("co-mestre por membership leva quando o ponto está fora", () => {
		const accepted = acceptIncomingPing(
			focus({ kind: "attention", userId: "co" }),
			{
				campaignOwnerId: "mestre",
				memberships: [{ userId: "co", role: "editor" }],
			},
			offScreen,
		);
		expect(accepted?.pullTo).toEqual({ x: 300, y: 400 });
	});

	it("co-mestre só pela presença leva fora da tela e não leva dentro", () => {
		const source = {
			campaignOwnerId: "mestre",
			presence: [{ userId: "co", isCoGM: true }],
		};
		expect(
			acceptIncomingPing(
				focus({ kind: "attention", userId: "co" }),
				source,
				offScreen,
			)?.pullTo,
		).toEqual({ x: 300, y: 400 });
		expect(
			acceptIncomingPing(
				focus({ kind: "attention", userId: "co" }),
				source,
				onScreen,
			)?.pullTo,
		).toBeNull();
	});

	it("perigo, a caminho, ajuda e destacar do mestre não levam, mesmo fora da tela", () => {
		for (const kind of ["danger", "going", "help", "highlight"]) {
			expect(
				acceptIncomingPing(focus({ kind }), gm, offScreen)?.pullTo,
			).toBeNull();
		}
	});
});

describe("Todos aqui continua levando a câmera sempre", () => {
	it("leva mesmo com o ponto já na tela", () => {
		const accepted = acceptIncomingPing(focus(), gm, onScreen);
		expect(accepted?.ping.kind).toBe("focus");
		expect(accepted?.pullTo).toEqual({ x: 300, y: 400 });
	});

	it("leva quando o ponto está fora da tela", () => {
		expect(acceptIncomingPing(focus(), gm, offScreen)?.pullTo).toEqual({
			x: 300,
			y: 400,
		});
	});

	it("o mestre que envia Todos aqui não move a própria câmera", () => {
		const accepted = acceptIncomingPing(focus(), gm, {
			...offScreen,
			selfUserId: "mestre",
		});
		expect(accepted?.pullTo).toBeNull();
		expect(accepted?.ping.kind).toBe("focus");
	});

	it("jogador que manda Todos aqui à força continua sem levar", () => {
		const accepted = acceptIncomingPing(
			focus({ userId: "jogador" }),
			gm,
			offScreen,
		);
		expect(accepted?.ping.kind).toBe("attention");
		expect(accepted?.pullTo).toBeNull();
	});
});
