import { describe, expect, it } from "vitest";
import { canViewCharacter } from "./content-audience";

const sheet = {
	createdBy: "player-1",
	share: "chosen" as const,
	sharedWith: ["player-2"],
};

describe("canViewCharacter", () => {
	it("sem share, a mesa inteira vê", () => {
		expect(canViewCharacter({}, { role: "viewer", userId: "p" })).toBe(true);
		expect(canViewCharacter({}, { role: "editor", userId: "c" })).toBe(true);
	});

	it("o mestre e quem criou sempre veem", () => {
		expect(canViewCharacter(sheet, { role: "owner", userId: "gm" })).toBe(true);
		expect(
			canViewCharacter(sheet, { role: "viewer", userId: "player-1" }),
		).toBe(true);
	});

	it("só co-mestres esconde o jogador", () => {
		const secret = { share: "staff" as const, createdBy: "gm" };
		expect(canViewCharacter(secret, { role: "editor", userId: "co" })).toBe(
			true,
		);
		expect(canViewCharacter(secret, { role: "viewer", userId: "p" })).toBe(
			false,
		);
	});

	it("só jogadores esconde o co-mestre", () => {
		const handout = { share: "players" as const, createdBy: "gm" };
		expect(canViewCharacter(handout, { role: "viewer", userId: "p" })).toBe(
			true,
		);
		expect(canViewCharacter(handout, { role: "editor", userId: "co" })).toBe(
			false,
		);
	});

	it("pessoa marcada vê; as outras não", () => {
		expect(
			canViewCharacter(sheet, { role: "viewer", userId: "player-2" }),
		).toBe(true);
		expect(
			canViewCharacter(sheet, { role: "viewer", userId: "player-3" }),
		).toBe(false);
		expect(canViewCharacter(sheet, { role: "editor", userId: "co" })).toBe(
			false,
		);
	});
});
