/**
 * Map upload rules for the tabletop (fatia 1: upload de mapa).
 *
 * Pure helpers so the dropzone, the create-scene dialog and the table
 * library share one set of limits and messages.
 */

/** Image types accepted as a scene map. */
export const MAP_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Value for the file input `accept` attribute. */
export const MAP_ACCEPT_ATTRIBUTE =
	".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

/** Largest raw file the browser optimizes before sending (bytes). */
export const MAP_MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Longest side of the optimized map, in px. */
export const MAP_MAX_DIMENSION = 4096;

/** WebP quality of the optimized map. */
export const MAP_QUALITY = 0.8;

/** Storage folder for maps inside the campaign storage. */
export const MAP_STORAGE_FOLDER = "vtt-maps";

/** Scene size used when the map size cannot be read. */
export const MAP_FALLBACK_SIZE = { width: 4000, height: 4000 };

const EXTENSION_TYPES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
};

export interface MapFileLike {
	name: string;
	type: string;
	size: number;
}

export type MapFileCheck = { ok: true } | { ok: false; message: string };

function fileType(file: MapFileLike): string {
	if (file.type) return file.type.toLowerCase();
	const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
	return EXTENSION_TYPES[extension] ?? "";
}

/** Validates a dropped or picked file before any upload starts. */
export function validateMapFile(
	file: MapFileLike | null | undefined,
): MapFileCheck {
	if (!file) {
		return { ok: false, message: "Nenhum arquivo recebido. Tente de novo." };
	}
	if (!MAP_ACCEPTED_TYPES.includes(fileType(file))) {
		return {
			ok: false,
			message: `“${file.name}” não é um mapa válido. Use PNG, JPG ou WebP.`,
		};
	}
	if (file.size > MAP_MAX_FILE_BYTES) {
		return {
			ok: false,
			message: `“${file.name}” tem ${formatMegabytes(file.size)}. O limite é ${formatMegabytes(MAP_MAX_FILE_BYTES)}.`,
		};
	}
	if (file.size === 0) {
		return { ok: false, message: `“${file.name}” está vazio.` };
	}
	return { ok: true };
}

/** Size in MB with one decimal, Brazilian format ("12,5 MB"). */
export function formatMegabytes(bytes: number): string {
	const mb = bytes / (1024 * 1024);
	const rounded = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
	return `${String(rounded).replace(".", ",")} MB`;
}

/**
 * Scene size for a map image: the size the optimizer produces (same rounding
 * as image-storage), so the map is drawn 1:1 and never stretched.
 */
export function mapSceneSize(
	width: number | undefined,
	height: number | undefined,
	maxDimension = MAP_MAX_DIMENSION,
): { width: number; height: number } {
	if (!width || !height || width <= 0 || height <= 0) {
		return { ...MAP_FALLBACK_SIZE };
	}
	const ratio = Math.min(1, maxDimension / Math.max(width, height));
	return {
		width: Math.max(1, Math.round(width * ratio)),
		height: Math.max(1, Math.round(height * ratio)),
	};
}

/** Readable scene name from a file name ("cripta_do-dragao.png" → "cripta do dragao"). */
export function sceneNameFromFile(fileName: string): string {
	return fileName
		.replace(/\.[^/.]+$/, "")
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 80);
}

/** First file of a drop or input change, if any. */
export function firstFile(
	files: FileList | File[] | null | undefined,
): File | null {
	if (!files) return null;
	return (Array.isArray(files) ? files[0] : files.item(0)) ?? null;
}

/** True when a drag carries files (not text or a link). */
export function dragHasFiles(
	types: readonly string[] | DOMStringList,
): boolean {
	return Array.from(types as ArrayLike<string>).includes("Files");
}
