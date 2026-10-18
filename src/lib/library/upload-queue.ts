/**
 * Fila de envio da Biblioteca (vários PDFs).
 * Só funções puras: o componente guarda a lista e chama o envio de cada item.
 */
import { LIBRARY_PDF_MIME } from "../../../supabase/functions/_shared/library-guard";

export const UPLOAD_CONCURRENCY = 2;

export type UploadStatus = "queued" | "uploading" | "done" | "error";

export interface UploadItem {
	id: string;
	name: string;
	file: File;
	status: UploadStatus;
	/** 0..1 */
	progress: number;
	error?: string;
}

/** Separa o que parece PDF (tipo ou extensão) do resto, que é ignorado. */
export function splitPdfCandidates(files: readonly File[]): {
	pdfs: File[];
	ignored: File[];
} {
	const pdfs: File[] = [];
	const ignored: File[] = [];
	for (const file of files) {
		const looksPdf =
			file.type === LIBRARY_PDF_MIME ||
			(file.type === "" && /\.pdf$/i.test(file.name));
		(looksPdf ? pdfs : ignored).push(file);
	}
	return { pdfs, ignored };
}

export function enqueueFiles(
	items: readonly UploadItem[],
	files: readonly File[],
	makeId: () => string,
): UploadItem[] {
	return [
		...items,
		...files.map((file) => ({
			id: makeId(),
			name: file.name,
			file,
			status: "queued" as const,
			progress: 0,
		})),
	];
}

/** Ids dos próximos itens a começar, respeitando o limite de envios simultâneos. */
export function nextToStart(
	items: readonly UploadItem[],
	limit = UPLOAD_CONCURRENCY,
): string[] {
	const running = items.filter((item) => item.status === "uploading").length;
	const free = Math.max(0, limit - running);
	return items
		.filter((item) => item.status === "queued")
		.slice(0, free)
		.map((item) => item.id);
}

function patch(
	items: readonly UploadItem[],
	id: string,
	update: (item: UploadItem) => UploadItem,
): UploadItem[] {
	return items.map((item) => (item.id === id ? update(item) : item));
}

export function markUploading(items: readonly UploadItem[], id: string) {
	return patch(items, id, (item) => ({
		...item,
		status: "uploading",
		progress: 0,
		error: undefined,
	}));
}

export function setProgress(
	items: readonly UploadItem[],
	id: string,
	progress: number,
) {
	return patch(items, id, (item) =>
		item.status === "uploading"
			? { ...item, progress: Math.min(1, Math.max(0, progress)) }
			: item,
	);
}

export function markDone(items: readonly UploadItem[], id: string) {
	return patch(items, id, (item) => ({ ...item, status: "done", progress: 1 }));
}

export function markError(
	items: readonly UploadItem[],
	id: string,
	error: string,
) {
	return patch(items, id, (item) => ({ ...item, status: "error", error }));
}

/** "Tentar de novo": volta pra fila. */
export function retryItem(items: readonly UploadItem[], id: string) {
	return patch(items, id, (item) =>
		item.status === "error"
			? { ...item, status: "queued", progress: 0, error: undefined }
			: item,
	);
}

export function clearFinished(items: readonly UploadItem[]): UploadItem[] {
	return items.filter((item) => item.status !== "done");
}

export function hasActiveUploads(items: readonly UploadItem[]): boolean {
	return items.some(
		(item) => item.status === "queued" || item.status === "uploading",
	);
}
