import { describe, expect, it } from "vitest";
import { hasWebpMagic } from "../../../supabase/functions/_shared/library-guard";
import {
	encodeLibraryThumbWebp,
	LIBRARY_THUMB_DESKTOP_MAX_BYTES,
	LIBRARY_THUMB_TOUCH_MAX_BYTES,
	libraryThumbSizeLimit,
	parseLibraryThumbStatus,
	scaleLibraryThumbSize,
	shouldGenerateLibraryThumb,
} from "./library-thumb";

/** Cabeçalho mínimo RIFF/WEBP (12 bytes) + padding. */
function fakeWebp(size: number): Uint8Array {
	const bytes = new Uint8Array(size);
	bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
	return bytes;
}

function blobOf(bytes: Uint8Array, type = "image/webp"): Blob {
	return new Blob([new Uint8Array(bytes)], { type });
}

describe("library-thumb", () => {
	it("usa 64 MB no desktop e 32 MB no toque ou APK", () => {
		expect(libraryThumbSizeLimit({})).toBe(LIBRARY_THUMB_DESKTOP_MAX_BYTES);
		expect(libraryThumbSizeLimit({ coarsePointer: true })).toBe(
			LIBRARY_THUMB_TOUCH_MAX_BYTES,
		);
		expect(libraryThumbSizeLimit({ native: true })).toBe(
			LIBRARY_THUMB_TOUCH_MAX_BYTES,
		);
		expect(libraryThumbSizeLimit({ native: true, coarsePointer: false })).toBe(
			LIBRARY_THUMB_TOUCH_MAX_BYTES,
		);
	});

	it("acima do teto não tenta gerar e o status cai para failed", () => {
		expect(
			shouldGenerateLibraryThumb(
				LIBRARY_THUMB_DESKTOP_MAX_BYTES,
				LIBRARY_THUMB_DESKTOP_MAX_BYTES,
			),
		).toBe(true);
		expect(
			shouldGenerateLibraryThumb(
				LIBRARY_THUMB_DESKTOP_MAX_BYTES + 1,
				LIBRARY_THUMB_DESKTOP_MAX_BYTES,
			),
		).toBe(false);
		expect(
			shouldGenerateLibraryThumb(
				LIBRARY_THUMB_TOUCH_MAX_BYTES + 1,
				LIBRARY_THUMB_TOUCH_MAX_BYTES,
			),
		).toBe(false);
		expect(parseLibraryThumbStatus("failed")).toBe("failed");
	});

	it("escala a página 1 para no máximo 400×600, mantendo a proporção", () => {
		expect(scaleLibraryThumbSize(595.28, 841.89)).toEqual({
			width: 400,
			height: 566,
		});
		// Paisagem: limita pela altura 600? 800x400 → scale 400/800 = 0.5 → 400×200
		expect(scaleLibraryThumbSize(800, 400)).toEqual({
			width: 400,
			height: 200,
		});
		// Quase quadrada alta: 400x800 → scale 600/800 = 0.75 → 300×600
		expect(scaleLibraryThumbSize(400, 800)).toEqual({
			width: 300,
			height: 600,
		});
		expect(() => scaleLibraryThumbSize(0, 100)).toThrow(/Página inválida/);
	});

	it("aceita WebP pequeno com magia RIFF e recusa o que passa de 150 KB", async () => {
		const small = fakeWebp(2048);
		expect(hasWebpMagic(small)).toBe(true);
		const ok = await encodeLibraryThumbWebp(async () => blobOf(small));
		expect(ok.ok).toBe(true);
		if (ok.ok) {
			expect(ok.bytes.byteLength).toBe(2048);
			expect(ok.quality).toBe(0.8);
		}

		const huge = fakeWebp(150 * 1024 + 1);
		const failed = await encodeLibraryThumbWebp(async () => blobOf(huge));
		expect(failed.ok).toBe(false);
	});

	it("baixa a qualidade até caber; se nenhuma servir, falha", async () => {
		const result = await encodeLibraryThumbWebp(async (quality) => {
			if (quality > 0.45) return blobOf(fakeWebp(200 * 1024));
			return blobOf(fakeWebp(12_000));
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.quality).toBe(0.45);

		const notWebp = await encodeLibraryThumbWebp(async () =>
			blobOf(fakeWebp(1000), "image/png"),
		);
		expect(notWebp.ok).toBe(false);

		const noMagic = await encodeLibraryThumbWebp(async () =>
			blobOf(new Uint8Array(1000), "image/webp"),
		);
		expect(noMagic.ok).toBe(false);
	});
});
