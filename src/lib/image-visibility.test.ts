import { describe, expect, it } from "vitest";
import { isPrivateVisibility, visibilityFromRow } from "./image-visibility";

describe("visibilityFromRow", () => {
	it("usa a coluna visibility quando existe", () => {
		expect(visibilityFromRow("co_gm", true)).toBe("co_gm");
		expect(visibilityFromRow("players", true)).toBe("players");
	});

	it("banco sem a 0054 cai no is_private antigo", () => {
		expect(visibilityFromRow(undefined, true)).toBe("gm_only");
		expect(visibilityFromRow(undefined, false)).toBe("public");
		expect(visibilityFromRow("qualquer", false)).toBe("public");
	});
});

describe("isPrivateVisibility", () => {
	it("só public conta como pública", () => {
		expect(isPrivateVisibility("public")).toBe(false);
		expect(isPrivateVisibility("players")).toBe(true);
		expect(isPrivateVisibility("gm_only")).toBe(true);
	});
});
