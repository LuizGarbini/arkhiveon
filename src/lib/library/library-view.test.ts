// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
	campaignHasReadyThumb,
	defaultLibraryViewMode,
	libraryViewStorageKey,
	parseLibraryViewMode,
	readStoredLibraryView,
	resolveLibraryViewMode,
	writeStoredLibraryView,
} from "./library-view";

const campaign = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
	window.localStorage.clear();
});

describe("critério de padrão Lista/Grade", () => {
	it("parseia só list e grid", () => {
		expect(parseLibraryViewMode("list")).toBe("list");
		expect(parseLibraryViewMode("grid")).toBe("grid");
		expect(parseLibraryViewMode("lista")).toBeNull();
		expect(parseLibraryViewMode(null)).toBeNull();
	});

	it("Grade só quando há ao menos uma capa pronta", () => {
		expect(campaignHasReadyThumb([])).toBe(false);
		expect(campaignHasReadyThumb([{ thumbStatus: "pending" }])).toBe(false);
		expect(campaignHasReadyThumb([{ thumbStatus: "failed" }])).toBe(false);
		expect(
			campaignHasReadyThumb([
				{ thumbStatus: "pending" },
				{ thumbStatus: "failed" },
			]),
		).toBe(false);
		expect(
			campaignHasReadyThumb([
				{ thumbStatus: "pending" },
				{ thumbStatus: "ready" },
			]),
		).toBe(true);
		expect(defaultLibraryViewMode([{ thumbStatus: "pending" }])).toBe("list");
		expect(defaultLibraryViewMode([{ thumbStatus: "ready" }])).toBe("grid");
	});

	it("preferência salva prevalece; sem ela, não assume vista até carregar", () => {
		const files = [{ thumbStatus: "ready" as const }];
		expect(
			resolveLibraryViewMode({
				stored: null,
				filesLoaded: false,
				files,
			}),
		).toBeNull();
		expect(
			resolveLibraryViewMode({
				stored: null,
				filesLoaded: true,
				files,
			}),
		).toBe("grid");
		expect(
			resolveLibraryViewMode({
				stored: "list",
				filesLoaded: true,
				files,
			}),
		).toBe("list");
		expect(
			resolveLibraryViewMode({
				stored: "grid",
				filesLoaded: true,
				files: [{ thumbStatus: "pending" }],
			}),
		).toBe("grid");
	});

	it("grava e lê por campanha", () => {
		expect(libraryViewStorageKey(campaign)).toBe(
			`arkhiveon:library-view:${campaign}`,
		);
		expect(readStoredLibraryView(campaign)).toBeNull();
		writeStoredLibraryView(campaign, "grid");
		expect(readStoredLibraryView(campaign)).toBe("grid");
		expect(readStoredLibraryView("22222222-2222-4222-8222-222222222222")).toBe(
			null,
		);
	});
});
