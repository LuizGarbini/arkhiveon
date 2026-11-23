/**
 * Depois que o PDF já está ready, tenta gravar a capa. Qualquer falha
 * vira `thumb_status = failed` e não propaga — o upload do PDF já terminou.
 */
import {
	LIBRARY_THUMB_MAX_BYTES,
	LIBRARY_THUMB_MIME,
} from "../../../supabase/functions/_shared/library-guard";
import { isNativePlatform } from "../native-oauth";
import {
	detectCoarsePointer,
	type LibraryThumbStatus,
	libraryThumbSizeLimit,
	shouldGenerateLibraryThumb,
} from "./library-thumb";
import { renderLibraryThumbInWorker } from "./library-thumb-client";

export type LibraryThumbInvoke = (
	body: Record<string, unknown>,
) => Promise<unknown>;

export type LibraryThumbUploadDeps = {
	invoke: LibraryThumbInvoke;
	put: (
		url: string,
		body: Blob,
		headers: Record<string, string>,
	) => Promise<void>;
	render: (pdfBytes: Uint8Array) => Promise<Uint8Array>;
	sizeLimit: number;
};

export function defaultLibraryThumbSizeLimit(): number {
	return libraryThumbSizeLimit({
		native: isNativePlatform(),
		coarsePointer: detectCoarsePointer(),
	});
}

export function defaultLibraryThumbDeps(
	invoke: LibraryThumbInvoke,
	put: LibraryThumbUploadDeps["put"],
): LibraryThumbUploadDeps {
	return {
		invoke,
		put,
		render: renderLibraryThumbInWorker,
		sizeLimit: defaultLibraryThumbSizeLimit(),
	};
}

async function markFailed(
	invoke: LibraryThumbInvoke,
	fileId: string,
): Promise<"failed"> {
	try {
		await invoke({ action: "report-thumb-failed", fileId });
	} catch {
		// O PDF já está pronto; a capa fica pending se a marcação falhar.
	}
	return "failed";
}

/**
 * Gera a página 1, pede o PUT assinado e confirma. Nunca lança.
 * Acima do teto (64/32 MB) ou erro → `failed`.
 */
export async function tryUploadLibraryThumb(
	fileId: string,
	file: File,
	deps: LibraryThumbUploadDeps,
): Promise<LibraryThumbStatus> {
	try {
		if (!shouldGenerateLibraryThumb(file.size, deps.sizeLimit)) {
			return markFailed(deps.invoke, fileId);
		}
		const webp = await deps.render(new Uint8Array(await file.arrayBuffer()));
		if (webp.byteLength === 0 || webp.byteLength > LIBRARY_THUMB_MAX_BYTES) {
			return markFailed(deps.invoke, fileId);
		}
		const ticket = (await deps.invoke({
			action: "request-thumb-upload",
			fileId,
			size: webp.byteLength,
		})) as { uploadUrl: string; headers?: Record<string, string> };
		const body = new Blob([new Uint8Array(webp)], { type: LIBRARY_THUMB_MIME });
		await deps.put(ticket.uploadUrl, body, ticket.headers ?? {});
		await deps.invoke({ action: "confirm-thumb", fileId });
		return "ready";
	} catch {
		return markFailed(deps.invoke, fileId);
	}
}
