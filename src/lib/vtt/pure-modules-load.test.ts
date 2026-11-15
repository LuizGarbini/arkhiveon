import { describe, expect, it, vi } from "vitest";

// Guarda: os módulos puros da visão e da exploração têm de carregar mesmo em
// testes que mockam o store. Um deles já importou `@/lib/systems` (que lê
// RPG_SYSTEMS do store ao carregar) e derrubou a suíte session-regressions.
vi.mock("@/lib/store", () => ({}));

describe("módulos puros carregam sem o store", () => {
	it.each([
		["vision", () => import("./vision")],
		["explored", () => import("./explored")],
		["light-zones", () => import("./light-zones")],
		["explored-store", () => import("./explored-store")],
		["token-motion", () => import("./token-motion")],
		["line-of-sight", () => import("./line-of-sight")],
	])("%s", async (_name, load) => {
		await expect(load()).resolves.toBeTruthy();
	});
});
