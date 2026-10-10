import { describe, expect, it } from "vitest";
import {
	canWriteImageLibrary,
	describeImageAssetSyncError,
	resolveImageAssetPrivacy,
} from "./image-asset-privacy";

describe("resolveImageAssetPrivacy", () => {
	it("keeps private as the master's default", () => {
		expect(resolveImageAssetPrivacy("owner", undefined)).toBe(true);
		expect(resolveImageAssetPrivacy("owner", true)).toBe(true);
		expect(resolveImageAssetPrivacy("owner", false)).toBe(false);
	});

	it("never asks for private when RLS would refuse it", () => {
		expect(resolveImageAssetPrivacy("editor", undefined)).toBe(false);
		expect(resolveImageAssetPrivacy("editor", true)).toBe(false);
		expect(resolveImageAssetPrivacy("viewer", true)).toBe(false);
		expect(resolveImageAssetPrivacy(undefined, true)).toBe(false);
	});
});

describe("canWriteImageLibrary", () => {
	it("blocks only players", () => {
		expect(canWriteImageLibrary("owner")).toBe(true);
		expect(canWriteImageLibrary("editor")).toBe(true);
		expect(canWriteImageLibrary(undefined)).toBe(true);
		expect(canWriteImageLibrary("viewer")).toBe(false);
	});
});

describe("describeImageAssetSyncError", () => {
	it("explains RLS refusals in Portuguese", () => {
		const rls = {
			code: "42501",
			message:
				'new row violates row-level security policy for table "image_assets"',
		};
		const result = describeImageAssetSyncError(rls, "create");
		expect(result.title).toBe("Imagem não entrou na Biblioteca");
		expect(result.description).toMatch(/permissão/);
	});

	it("passes other errors through with an action title", () => {
		const result = describeImageAssetSyncError(
			new Error("Failed to fetch"),
			"update",
		);
		expect(result.title).toBe("Alteração da imagem não foi salva");
		expect(result.description).toBe("Failed to fetch");
		expect(describeImageAssetSyncError("x", "delete").title).toBe(
			"Imagem não foi removida",
		);
	});
});
