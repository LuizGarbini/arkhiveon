import { describe, expect, it } from "vitest";
import {
	CHAT_MESSAGE_MAX,
	canSendChat,
	continuesPrevious,
	feedLineView,
	parseChatCommand,
	rolledDice,
	rollHighlight,
	SECRET_ROLL_TEXT,
	trackSessionOrdinal,
} from "./feed-line";
import type { TableRollResult } from "./roll-store";

const secretResult: TableRollResult = {
	rollId: "secret",
	total: 18,
	details: {
		formula: "1d20+3",
		count: 1,
		faces: 20,
		modifier: 3,
		rolls: [15],
	},
};

describe("feedLineView", () => {
	it("mostra fórmula e total da rolagem pública", () => {
		const view = feedLineView(
			{
				kind: "roll",
				isSecret: false,
				formula: "2d6+1",
				message: null,
			},
			{
				rollId: "pub",
				total: 9,
				details: {
					formula: "2d6+1",
					count: 2,
					faces: 6,
					modifier: 1,
					rolls: [4, 4],
				},
			},
			false,
		);
		expect(view).toMatchObject({
			kind: "roll",
			secret: false,
			formula: "2d6+1",
			total: 9,
			rolls: [4, 4],
		});
	});

	it("esconde fórmula, dados e total da rolagem secreta para o jogador", () => {
		const view = feedLineView(
			{ kind: "roll", isSecret: true, formula: null, message: null },
			secretResult,
			false,
		);
		expect(view).toEqual({ kind: "secret", text: SECRET_ROLL_TEXT });
		expect(JSON.stringify(view)).not.toContain("18");
		expect(JSON.stringify(view)).not.toContain("1d20");
		expect(JSON.stringify(view)).not.toContain("15");
	});

	it("mostra o valor da rolagem secreta para o mestre", () => {
		const view = feedLineView(
			{ kind: "roll", isSecret: true, formula: null, message: null },
			secretResult,
			true,
		);
		expect(view).toMatchObject({
			kind: "roll",
			secret: true,
			formula: "1d20+3",
			total: 18,
			rolls: [15],
		});
	});

	it("não inventa total quando o mestre ainda não tem o resultado", () => {
		const view = feedLineView(
			{ kind: "roll", isSecret: true, formula: null, message: null },
			undefined,
			true,
		);
		expect(view).toMatchObject({
			kind: "roll",
			secret: true,
			formula: null,
			total: null,
		});
	});

	it("mostra a mensagem do chat", () => {
		expect(
			feedLineView(
				{
					kind: "chat",
					isSecret: false,
					formula: null,
					message: "A porta cedeu.",
				},
				undefined,
				false,
			),
		).toEqual({ kind: "chat", message: "A porta cedeu." });
	});
});

describe("canSendChat", () => {
	it("recusa vazio, espaços e texto acima do limite", () => {
		expect(canSendChat("")).toBe(false);
		expect(canSendChat("   ")).toBe(false);
		expect(canSendChat("oi")).toBe(true);
		expect(canSendChat("a".repeat(CHAT_MESSAGE_MAX))).toBe(true);
		expect(canSendChat("a".repeat(CHAT_MESSAGE_MAX + 1))).toBe(false);
	});
});

describe("trackSessionOrdinal", () => {
	it("usa a ordem do servidor quando o histórico está visível", () => {
		expect(
			trackSessionOrdinal(
				[],
				[
					{ id: "s2", startedAt: "2026-10-29T19:00:00.000Z" },
					{ id: "s1", startedAt: "2026-10-29T18:00:00.000Z" },
				],
				"s2",
			),
		).toEqual({ ids: ["s1", "s2"], number: 2 });
	});

	it("o jogador soma a sessão nova à lista que já tinha", () => {
		expect(
			trackSessionOrdinal(
				["s1"],
				[{ id: "s2", startedAt: "2026-10-29T19:00:00.000Z" }],
				"s2",
			),
		).toEqual({ ids: ["s1", "s2"], number: 2 });
	});

	it("mantém o número depois de recarregar", () => {
		expect(
			trackSessionOrdinal(
				["s1", "s2"],
				[{ id: "s2", startedAt: "2026-10-29T19:00:00.000Z" }],
				"s2",
			).number,
		).toBe(2);
	});
});

describe("cartão de rolagem", () => {
	it("cada dado leva as faces do grupo dele e marca máximo e 1", () => {
		expect(
			rolledDice({ formula: "1d12+2d6+3", faces: 12, rolls: [12, 1, 4] }),
		).toEqual([
			{ value: 12, faces: 12, tone: "max" },
			{ value: 1, faces: 6, tone: "min" },
			{ value: 4, faces: 6, tone: "plain" },
		]);
	});

	it("sem os dados ainda (só o total), não inventa dado", () => {
		expect(rolledDice({ formula: "1d20+2", faces: 20, rolls: [] })).toEqual([]);
	});

	it("crítico e falha crítica só num d20 sozinho", () => {
		expect(rollHighlight({ formula: "1d20+5", faces: 20, rolls: [20] })).toBe(
			"critical",
		);
		expect(rollHighlight({ formula: "1d20+6", faces: 20, rolls: [1] })).toBe(
			"fumble",
		);
		expect(rollHighlight({ formula: "1d20", faces: 20, rolls: [11] })).toBe(
			null,
		);
		expect(
			rollHighlight({ formula: "2d20", faces: 20, rolls: [20, 3] }),
		).toBeNull();
		expect(rollHighlight({ formula: "1d6", faces: 6, rolls: [1] })).toBeNull();
	});
});

describe("agrupamento do chat", () => {
	const msg = (
		authorId: string,
		createdAt: string,
		kind: "chat" | "roll" = "chat",
	) => ({ authorId, createdAt, kind });

	it("mesmo autor em até 5 minutos continua o bloco", () => {
		expect(
			continuesPrevious(
				msg("a", "2026-11-09T22:00:00.000Z"),
				msg("a", "2026-11-09T22:04:59.000Z"),
			),
		).toBe(true);
	});

	it("outro autor, intervalo longo ou rolagem no meio quebram o bloco", () => {
		const first = msg("a", "2026-11-09T22:00:00.000Z");
		expect(continuesPrevious(first, msg("b", "2026-11-09T22:01:00.000Z"))).toBe(
			false,
		);
		expect(continuesPrevious(first, msg("a", "2026-11-09T22:06:00.000Z"))).toBe(
			false,
		);
		expect(
			continuesPrevious(
				{ ...first, kind: "roll" },
				msg("a", "2026-11-09T22:01:00.000Z"),
			),
		).toBe(false);
		expect(continuesPrevious(undefined, first)).toBe(false);
	});
});

describe("/r na caixa de mensagem", () => {
	it("/r e /roll rolam a fórmula canônica", () => {
		expect(parseChatCommand("/r 2d6 + 3")).toEqual({
			kind: "roll",
			formula: "2d6+3",
		});
		expect(parseChatCommand("/ROLL d20")).toEqual({
			kind: "roll",
			formula: "1d20",
		});
	});

	it("fórmula inválida avisa; texto comum é mensagem", () => {
		expect(parseChatCommand("/r banana")).toEqual({ kind: "invalid-roll" });
		expect(parseChatCommand("/r")).toEqual({ kind: "invalid-roll" });
		expect(parseChatCommand("rolei 2d6")).toEqual({
			kind: "chat",
			text: "rolei 2d6",
		});
		expect(parseChatCommand("/rindo")).toEqual({
			kind: "chat",
			text: "/rindo",
		});
	});
});
