import { describe, expect, it } from "vitest";
import {
	dragGhostShowsInitials,
	tokenInitialsFontSize,
} from "./token-initials";

describe("iniciais do token", () => {
	it("a fonte acompanha o raio e duas letras cabem no disco", () => {
		expect(tokenInitialsFontSize(35)).toBeCloseTo(24.5);
		expect(tokenInitialsFontSize(0)).toBe(4);
		expect(tokenInitialsFontSize(Number.NaN)).toBe(4);
		for (const radius of [12, 35, 70, 140]) {
			// "AR" em negrito mede cerca de 1,36× a fonte no canvas.
			expect(tokenInitialsFontSize(radius) * 1.4).toBeLessThan(radius * 2);
		}
	});

	it("o fantasma do arrasto não cobre um retrato com iniciais", () => {
		expect(dragGhostShowsInitials(null)).toBe(true);
		expect(dragGhostShowsInitials(undefined)).toBe(true);
		expect(dragGhostShowsInitials("  ")).toBe(true);
		expect(dragGhostShowsInitials("/elara-portrait.png")).toBe(false);
	});
});
