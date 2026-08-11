import { describe, expect, it } from "vitest";
import {
	getCharacterLifeStatus,
	getNpcLifeStatus,
	matchesRosterLifeFilter,
} from "./roster-status";

type CharacterStatusInput = Parameters<typeof getCharacterLifeStatus>[0];
type NpcStatusInput = Parameters<typeof getNpcLifeStatus>[0];

const character = (
	overrides: Partial<CharacterStatusInput> = {},
): CharacterStatusInput => ({
	health: 16,
	healthMax: 20,
	deathSaves: { successes: 0, failures: 0 },
	lifeStatus: undefined,
	...overrides,
});

const npc = (overrides: Partial<NpcStatusInput> = {}): NpcStatusInput => ({
	isAlive: true,
	...overrides,
});

describe("getCharacterLifeStatus", () => {
	it("honors explicit dead, down, and wounded statuses", () => {
		expect(getCharacterLifeStatus(character({ lifeStatus: "dead" }))).toBe(
			"dead",
		);
		expect(getCharacterLifeStatus(character({ lifeStatus: "down" }))).toBe(
			"down",
		);
		expect(getCharacterLifeStatus(character({ lifeStatus: "wounded" }))).toBe(
			"wounded",
		);
	});

	it("derives down and dead from hp and death save failures", () => {
		expect(getCharacterLifeStatus(character({ health: 0 }))).toBe("down");
		expect(
			getCharacterLifeStatus(
				character({ health: 0, deathSaves: { successes: 0, failures: 3 } }),
			),
		).toBe("dead");
	});

	it("derives wounded from low hp and alive from stable hp", () => {
		expect(getCharacterLifeStatus(character({ health: 8 }))).toBe("wounded");
		expect(getCharacterLifeStatus(character({ health: 9 }))).toBe("alive");
	});
});

describe("getNpcLifeStatus", () => {
	it("marks an npc dead when it is not alive", () => {
		expect(getNpcLifeStatus(npc({ isAlive: false }))).toBe("dead");
	});

	it("reflects dead or down status from linked character sheets", () => {
		expect(getNpcLifeStatus(npc(), character({ lifeStatus: "down" }))).toBe(
			"down",
		);
		expect(getNpcLifeStatus(npc(), character({ lifeStatus: "dead" }))).toBe(
			"dead",
		);
	});

	it("reflects wounded status from linked character sheets", () => {
		expect(getNpcLifeStatus(npc(), character({ lifeStatus: "wounded" }))).toBe(
			"wounded",
		);
	});
});

describe("matchesRosterLifeFilter", () => {
	it("matches every status for the all filter", () => {
		expect(matchesRosterLifeFilter("dead", "all")).toBe(true);
	});

	it("matches only equal concrete statuses", () => {
		expect(matchesRosterLifeFilter("dead", "dead")).toBe(true);
		expect(matchesRosterLifeFilter("dead", "alive")).toBe(false);
	});
});
