import { describe, expect, it } from "vitest";
import {
	audienceFromRow,
	canViewImageAsset,
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
		expect(
			imageVisibilityLabel(true, {
				coGms: false,
				players: false,
				userIds: ["p1"],
			}),
		).toBe("1 pessoa");
	});
});

describe("canViewImageAsset", () => {
	const secret = {
		isPrivate: true,
		createdBy: "gm",
		audience: { coGms: false, players: false, userIds: ["p1"] },
	};

	it("mestre, autor e pessoa marcada veem", () => {
		expect(canViewImageAsset(secret, { role: "owner", userId: "gm" })).toBe(
			true,
		);
		expect(canViewImageAsset(secret, { role: "viewer", userId: "gm" })).toBe(
			true,
		);
		expect(canViewImageAsset(secret, { role: "viewer", userId: "p1" })).toBe(
			true,
		);
		expect(canViewImageAsset(secret, { role: "viewer", userId: "p2" })).toBe(
			false,
		);
	});

	it("co-mestre segue o grupo de co-mestres, jogador o de jogadores", () => {
		expect(
			canViewImageAsset(
				{
					isPrivate: true,
					createdBy: "gm",
					audience: { coGms: true, players: false },
				},
				{ role: "editor", userId: "co" },
			),
		).toBe(true);
		expect(
			canViewImageAsset(
				{
					isPrivate: true,
					createdBy: "gm",
					audience: { coGms: false, players: true },
				},
				{ role: "editor", userId: "co" },
			),
		).toBe(false);
		expect(
			canViewImageAsset(
				{
					isPrivate: true,
					createdBy: "gm",
					audience: { coGms: false, players: true },
				},
				{ role: "viewer", userId: "p" },
			),
		).toBe(true);
	});
});
