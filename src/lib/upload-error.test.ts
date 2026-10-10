import { describe, expect, it } from "vitest";
import {
	describeUploadFailure,
	isUploadAbort,
	uploadAbortError,
} from "./upload-error";

describe("describeUploadFailure", () => {
	it("explains server size limits", () => {
		expect(
			describeUploadFailure(400, "File exceeds maximum allowed size of 5MB."),
		).toMatch(/grande demais/);
		expect(
			describeUploadFailure(413, "Payload too large. Max size is 5MB."),
		).toMatch(/grande demais/);
	});

	it("explains rate limit, quota, session and permission", () => {
		expect(describeUploadFailure(429, undefined)).toMatch(/Aguarde/);
		expect(
			describeUploadFailure(
				403,
				"Storage quota exceeded for the campaign owner's free plan.",
			),
		).toMatch(/cheio/);
		expect(describeUploadFailure(401, "Unauthorized")).toMatch(
			/Sessão expirada/,
		);
		expect(
			describeUploadFailure(
				403,
				"Campaign not found or you don't have access.",
			),
		).toMatch(/permissão/);
	});

	it("has a generic fallback", () => {
		expect(describeUploadFailure(500, "boom")).toBe(
			"Não foi possível enviar a imagem. Tente de novo.",
		);
	});
});

describe("upload abort", () => {
	it("marks a cancelled upload", () => {
		expect(isUploadAbort(uploadAbortError())).toBe(true);
		expect(isUploadAbort(new Error("x"))).toBe(false);
	});
});
