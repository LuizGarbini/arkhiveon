import { describe, expect, it } from "vitest";
import { parseApkManifest, shouldOfferUpdate } from "./apk-update";

const ok = {
	versionCode: 42,
	versionName: "1.0.42",
	apkUrl: "https://github.com/x/y/releases/download/apk-latest/Arkhiveon.apk",
	sha256: "A".repeat(64),
};

describe("parseApkManifest", () => {
	it("aceita objeto e string", () => {
		expect(parseApkManifest(ok)?.versionCode).toBe(42);
		expect(parseApkManifest(JSON.stringify(ok))?.sha256).toBe("a".repeat(64));
	});
	it("rejeita inválidos", () => {
		expect(parseApkManifest("nope")).toBeNull();
		expect(parseApkManifest({ ...ok, versionCode: "x" })).toBeNull();
		expect(parseApkManifest({ ...ok, versionCode: 0 })).toBeNull();
		expect(parseApkManifest({ ...ok, apkUrl: "http://a" })).toBeNull();
	});
	it("ignora sha256 malformado", () => {
		expect(parseApkManifest({ ...ok, sha256: "abc" })?.sha256).toBeUndefined();
	});
});

describe("shouldOfferUpdate", () => {
	const m = parseApkManifest(ok);
	it("oferece só quando maior", () => {
		expect(shouldOfferUpdate(41, m)).toBe(true);
		expect(shouldOfferUpdate(42, m)).toBe(false);
		expect(shouldOfferUpdate(50, m)).toBe(false);
		expect(shouldOfferUpdate(1, null)).toBe(false);
	});
	it("respeita 'Depois' pra mesma versão, volta na próxima", () => {
		expect(shouldOfferUpdate(41, m, 42)).toBe(false);
		expect(shouldOfferUpdate(41, m, 40)).toBe(true);
	});
});
