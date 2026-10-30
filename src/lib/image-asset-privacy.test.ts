import { describe, expect, it } from "vitest";
import {
	canWriteImageLibrary,
	describeImageAssetSyncError,
	resolveImageAssetPrivacy,
} from "./image-asset-privacy";

describe("resolveImageAssetPrivacy", () => {
	it("imagem nova é pública por padrão, para mestre e jogador", () => {
		expect(resolveImageAssetPrivacy("owner", undefined)).toBe(false);
		expect(resolveImageAssetPrivacy("viewer", undefined)).toBe(false);
		expect(resolveImageAssetPrivacy("editor", undefined)).toBe(false);
	});

	it("respeita quem pediu para privar, inclusive o jogador", () => {
		expect(resolveImageAssetPrivacy("owner", true)).toBe(true);
		expect(resolveImageAssetPrivacy("viewer", true)).toBe(true);
	});
});

describe("canWriteImageLibrary", () => {
	it("todo membro da mesa pode subir imagem (0054)", () => {
		expect(canWriteImageLibrary("owner")).toBe(true);
		expect(canWriteImageLibrary("editor")).toBe(true);
		expect(canWriteImageLibrary("viewer")).toBe(true);
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
