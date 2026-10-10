import { describe, expect, it } from "vitest";
import {
	dragHasFiles,
	formatMegabytes,
	MAP_FALLBACK_SIZE,
	MAP_MAX_FILE_BYTES,
	mapSceneSize,
	sceneNameFromFile,
	validateMapFile,
} from "./map-upload";

const file = (name: string, type: string, size = 1024) => ({
	name,
	type,
	size,
});

describe("validateMapFile", () => {
	it("accepts PNG, JPG and WebP", () => {
		expect(validateMapFile(file("a.png", "image/png"))).toEqual({ ok: true });
		expect(validateMapFile(file("a.jpg", "image/jpeg"))).toEqual({ ok: true });
		expect(validateMapFile(file("a.webp", "image/webp"))).toEqual({ ok: true });
	});

	it("falls back to the extension when the browser gives no type", () => {
		expect(validateMapFile(file("cripta.JPEG", ""))).toEqual({ ok: true });
		expect(validateMapFile(file("notas.txt", "")).ok).toBe(false);
	});

	it("rejects other types with a clear message", () => {
		const check = validateMapFile(file("mapa.gif", "image/gif"));
		expect(check).toEqual({
			ok: false,
			message: "“mapa.gif” não é um mapa válido. Use PNG, JPG ou WebP.",
		});
		expect(validateMapFile(file("ficha.pdf", "application/pdf")).ok).toBe(
			false,
		);
	});

	it("rejects files over the limit with the size and the limit", () => {
		const check = validateMapFile(
			file("enorme.png", "image/png", 25 * 1024 * 1024),
		);
		expect(check).toEqual({
			ok: false,
			message: "“enorme.png” tem 25 MB. O limite é 20 MB.",
		});
		expect(
			validateMapFile(file("limite.png", "image/png", MAP_MAX_FILE_BYTES)).ok,
		).toBe(true);
	});

	it("rejects empty and missing files", () => {
		expect(validateMapFile(file("vazio.png", "image/png", 0)).ok).toBe(false);
		expect(validateMapFile(null).ok).toBe(false);
	});
});

describe("formatMegabytes", () => {
	it("uses a comma and one decimal under 10 MB", () => {
		expect(formatMegabytes(2.5 * 1024 * 1024)).toBe("2,5 MB");
		expect(formatMegabytes(12.4 * 1024 * 1024)).toBe("12 MB");
	});
});

describe("mapSceneSize", () => {
	it("keeps small maps at their own size", () => {
		expect(mapSceneSize(1400, 1050)).toEqual({ width: 1400, height: 1050 });
	});

	it("scales big maps to the longest side limit keeping the ratio", () => {
		expect(mapSceneSize(8192, 4096)).toEqual({ width: 4096, height: 2048 });
		expect(mapSceneSize(3000, 6000, 4096)).toEqual({
			width: 2048,
			height: 4096,
		});
	});

	it("falls back when the size is unknown", () => {
		expect(mapSceneSize(undefined, 500)).toEqual(MAP_FALLBACK_SIZE);
		expect(mapSceneSize(0, 0)).toEqual(MAP_FALLBACK_SIZE);
	});
});

describe("sceneNameFromFile", () => {
	it("turns a file name into a readable scene name", () => {
		expect(sceneNameFromFile("cripta_do-dragao.png")).toBe("cripta do dragao");
		expect(sceneNameFromFile("Taverna  Final.webp")).toBe("Taverna Final");
	});
});

describe("dragHasFiles", () => {
	it("only accepts drags carrying files", () => {
		expect(dragHasFiles(["Files"])).toBe(true);
		expect(dragHasFiles(["text/uri-list", "text/plain"])).toBe(false);
	});
});
