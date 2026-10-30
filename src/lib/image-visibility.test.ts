import { describe, expect, it } from "vitest";
import {
	audienceFromRow,
	DEFAULT_PRIVATE_AUDIENCE,
	imageVisibilityLabel,
} from "./image-visibility";

describe("audienceFromRow", () => {
	it("usa as colunas quando existem, em qualquer combinação", () => {
		expect(audienceFromRow(false, true)).toEqual({
			coGms: false,
			players: true,
		});
		expect(audienceFromRow(false, false)).toEqual({
			coGms: false,
			players: false,
		});
		expect(audienceFromRow(true, true)).toEqual({ coGms: true, players: true });
	});

	it("banco sem a 0054 mantém a regra antiga (co-mestres sim, jogadores não)", () => {
		expect(audienceFromRow(undefined, undefined)).toEqual(
			DEFAULT_PRIVATE_AUDIENCE,
		);
		expect(DEFAULT_PRIVATE_AUDIENCE).toEqual({ coGms: true, players: false });
	});
});

describe("imageVisibilityLabel", () => {
	it("descreve as 5 situações", () => {
		expect(imageVisibilityLabel(false, { coGms: true, players: true })).toBe(
			"Pública",
		);
		expect(imageVisibilityLabel(true, { coGms: true, players: true })).toBe(
			"Co-mestres e jogadores",
		);
		expect(imageVisibilityLabel(true, { coGms: true, players: false })).toBe(
			"Só co-mestres",
		);
		expect(imageVisibilityLabel(true, { coGms: false, players: true })).toBe(
			"Só jogadores",
		);
		expect(imageVisibilityLabel(true, { coGms: false, players: false })).toBe(
			"Só o mestre",
		);
	});
});
