import { describe, expect, it } from "vitest";
import {
	CHAT_MESSAGE_MAX,
	canSendChat,
	feedLineView,
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
