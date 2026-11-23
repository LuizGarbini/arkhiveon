/**
 * Modo Lista/Grade da Biblioteca (F5).
 *
 * Critério de padrão, sem migração: a Grade é o padrão quando a campanha
 * já tem ao menos um PDF com `thumb_status = 'ready'` (capa pronta).
 * Antes do backfill (e em campanha só com pending/failed) abre em Lista.
 * A escolha do usuário fica em localStorage por campanha e prevalece.
 */
import type { LibraryThumbStatus } from "./library-thumb";

export type LibraryViewMode = "list" | "grid";

type LibraryViewFile = { thumbStatus?: LibraryThumbStatus };

export const LIBRARY_VIEW_STORAGE_PREFIX = "arkhiveon:library-view:";

export function libraryViewStorageKey(campaignId: string): string {
	return `${LIBRARY_VIEW_STORAGE_PREFIX}${campaignId}`;
}

export function parseLibraryViewMode(value: unknown): LibraryViewMode | null {
	return value === "list" || value === "grid" ? value : null;
}

export function campaignHasReadyThumb(
	files: readonly LibraryViewFile[],
): boolean {
	return files.some((file) => file.thumbStatus === "ready");
}

export function defaultLibraryViewMode(
	files: readonly LibraryViewFile[],
): LibraryViewMode {
	return campaignHasReadyThumb(files) ? "grid" : "list";
}

export function readStoredLibraryView(
	campaignId: string,
): LibraryViewMode | null {
	if (typeof window === "undefined") return null;
	try {
		return parseLibraryViewMode(
			window.localStorage.getItem(libraryViewStorageKey(campaignId)),
		);
	} catch {
		return null;
	}
}

export function writeStoredLibraryView(
	campaignId: string,
	view: LibraryViewMode,
): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(libraryViewStorageKey(campaignId), view);
	} catch {
		// modo privado / cota cheia: a escolha vale só nesta visita
	}
}

/**
 * Preferência salva > padrão. Enquanto os arquivos não carregaram e não
 * há escolha salva, permanece Lista (evita flash de Grade vazia).
 */
export function resolveLibraryViewMode(input: {
	stored: LibraryViewMode | null;
	filesLoaded: boolean;
	files: readonly LibraryViewFile[];
}): LibraryViewMode {
	if (input.stored) return input.stored;
	if (!input.filesLoaded) return "list";
	return defaultLibraryViewMode(input.files);
}
