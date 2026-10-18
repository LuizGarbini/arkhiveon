import { LIBRARY_MAX_BYTES } from "../../../supabase/functions/_shared/library-guard";
import { titleFromFileName } from "./library-storage";
import { repairMojibake } from "./repair-mojibake";

/** O mínimo que a comparação precisa de um PDF que já está na Biblioteca. */
export interface ExistingLibraryEntry {
	title: string;
	sizeBytes: number;
}

/** O mínimo que a comparação precisa de um arquivo escolhido (File serve). */
export interface UploadCandidate {
	name: string;
	size: number;
}

export interface UploadReview<T extends UploadCandidate> {
	/** Não estão na Biblioteca: vão marcados. */
	fresh: T[];
	/** Mesmo título (consertado, NFC, sem maiúscula) e mesmo tamanho. */
	duplicates: T[];
	/** Acima do limite: não dá pra enviar. */
	tooLarge: T[];
}

/** Chave de comparação do título: conserta acento, NFC, trim, sem maiúscula. */
export function libraryMatchKey(title: string): string {
	return repairMojibake(title)
		.normalize("NFC")
		.trim()
		.toLocaleLowerCase("pt-BR");
}

function entryKey(title: string, size: number): string {
	return `${size}\u0000${libraryMatchKey(title)}`;
}

/**
 * Separa os arquivos escolhidos em novos, já na Biblioteca e grandes demais.
 * Grande demais ganha de duplicado. Arquivo repetido no mesmo lote conta como
 * duplicado a partir da segunda cópia.
 */
export function classifyUploads<T extends UploadCandidate>(
	files: readonly T[],
	existing: readonly ExistingLibraryEntry[],
): UploadReview<T> {
	const known = new Set(
		existing.map((entry) => entryKey(entry.title, entry.sizeBytes)),
	);
	const review: UploadReview<T> = { fresh: [], duplicates: [], tooLarge: [] };
	for (const file of files) {
		if (file.size > LIBRARY_MAX_BYTES) {
			review.tooLarge.push(file);
			continue;
		}
		const key = entryKey(titleFromFileName(file.name), file.size);
		if (known.has(key)) {
			review.duplicates.push(file);
			continue;
		}
		known.add(key);
		review.fresh.push(file);
	}
	return review;
}

/** Precisa perguntar antes de enviar? (Sem duplicado nem grande: segue direto.) */
export function needsUploadReview(review: UploadReview<UploadCandidate>) {
	return review.duplicates.length > 0 || review.tooLarge.length > 0;
}
