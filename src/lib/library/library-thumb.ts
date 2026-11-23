/**
 * Regras puras da capa da Biblioteca (F3).
 * Sem DOM, sem Worker e sem a edge function: dá para testar o teto, a
 * escala e o encode sem carregar o pdfium.wasm.
 */
import {
	hasWebpMagic,
	LIBRARY_THUMB_MAX_BYTES,
} from "../../../supabase/functions/_shared/library-guard";

/** Desktop: gerar a capa só até 64 MB. */
export const LIBRARY_THUMB_DESKTOP_MAX_BYTES = 64 * 1024 * 1024;
/** Toque ou APK: 32 MB. */
export const LIBRARY_THUMB_TOUCH_MAX_BYTES = 32 * 1024 * 1024;

export const LIBRARY_THUMB_TARGET_WIDTH = 400;
export const LIBRARY_THUMB_MAX_HEIGHT = 600;
export const LIBRARY_THUMB_QUALITY_STEPS = [0.8, 0.6, 0.45, 0.3] as const;

export type LibraryThumbStatus = "pending" | "ready" | "failed";

export function parseLibraryThumbStatus(value: unknown): LibraryThumbStatus {
	return value === "ready" || value === "failed" || value === "pending"
		? value
		: "pending";
}

/** 32 MB no APK ou com ponteiro grosso; 64 MB no desktop. */
export function libraryThumbSizeLimit(input: {
	native?: boolean;
	coarsePointer?: boolean;
}): number {
	if (input.native || input.coarsePointer) {
		return LIBRARY_THUMB_TOUCH_MAX_BYTES;
	}
	return LIBRARY_THUMB_DESKTOP_MAX_BYTES;
}

export function detectCoarsePointer(): boolean {
	if (
		typeof window === "undefined" ||
		typeof window.matchMedia !== "function"
	) {
		return false;
	}
	return window.matchMedia("(pointer: coarse)").matches;
}

export function scaleLibraryThumbSize(
	pageWidth: number,
	pageHeight: number,
): { width: number; height: number } {
	if (
		!Number.isFinite(pageWidth) ||
		!Number.isFinite(pageHeight) ||
		pageWidth <= 0 ||
		pageHeight <= 0
	) {
		throw new Error("Página inválida.");
	}
	const scale = Math.min(
		LIBRARY_THUMB_TARGET_WIDTH / pageWidth,
		LIBRARY_THUMB_MAX_HEIGHT / pageHeight,
	);
	return {
		width: Math.max(1, Math.round(pageWidth * scale)),
		height: Math.max(1, Math.round(pageHeight * scale)),
	};
}

export function shouldGenerateLibraryThumb(
	fileBytes: number,
	sizeLimit: number,
): boolean {
	return Number.isFinite(fileBytes) && fileBytes > 0 && fileBytes <= sizeLimit;
}

export type EncodeThumbResult =
	| { ok: true; bytes: Uint8Array; quality: number }
	| { ok: false };

/**
 * Tenta WebP nas qualidades 0,8 → 0,3 até caber em 150 KB e passar na
 * magia RIFF/WEBP. Se nenhuma qualidade servir, a capa falha.
 */
export async function encodeLibraryThumbWebp(
	convert: (quality: number) => Promise<Blob>,
	maxBytes: number = LIBRARY_THUMB_MAX_BYTES,
): Promise<EncodeThumbResult> {
	for (const quality of LIBRARY_THUMB_QUALITY_STEPS) {
		const blob = await convert(quality);
		if (blob.type !== "image/webp") continue;
		const buffer = new Uint8Array(await blob.arrayBuffer());
		if (buffer.byteLength > maxBytes) continue;
		if (!hasWebpMagic(buffer)) continue;
		return { ok: true, bytes: buffer, quality };
	}
	return { ok: false };
}
