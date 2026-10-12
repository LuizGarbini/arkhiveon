/**
 * Biblioteca de PDFs (Fatia 1a) — regras puras compartilhadas entre a Edge
 * Function `library-r2` e os testes (vitest). Sem dependências de Deno/S3.
 */

export const LIBRARY_PILOT_TABLE = "campaign_library_pilot_campaigns";
export const LIBRARY_FILES_TABLE = "campaign_library_files";

export const LIBRARY_MAX_BYTES = 50 * 1024 * 1024; // 52428800
export const LIBRARY_PDF_MIME = "application/pdf";
/** Presigned PUT: 10 min. */
export const LIBRARY_UPLOAD_TTL_SECONDS = 600;
/** Presigned GET: 5 min (o viewer baixa o arquivo inteiro ao abrir). */
export const LIBRARY_READ_TTL_SECONDS = 300;
/** Pendentes mais velhos que isso são apagados no próximo request-upload. */
export const LIBRARY_PENDING_MAX_AGE_MS = 60 * 60 * 1000;
export const LIBRARY_TITLE_MAX = 200;

export type CampaignRole = "owner" | "editor" | "viewer";
export type LibraryAction =
	| "request-upload"
	| "confirm-upload"
	| "request-read"
	| "delete";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
	return typeof value === "string" && UUID_RE.test(value);
}

export function isLibraryAction(value: unknown): value is LibraryAction {
	return (
		value === "request-upload" ||
		value === "confirm-upload" ||
		value === "request-read" ||
		value === "delete"
	);
}

/** Mestre (owner) e editor enviam e apagam. */
export function canManageLibrary(role: CampaignRole | null): boolean {
	return role === "owner" || role === "editor";
}

/** Qualquer membro lê. */
export function canReadLibrary(role: CampaignRole | null): boolean {
	return role === "owner" || role === "editor" || role === "viewer";
}

export function normalizeRole(value: unknown): CampaignRole | null {
	return value === "owner" || value === "editor" || value === "viewer"
		? value
		: null;
}

export function buildLibraryKey(campaignId: string, fileId: string): string {
	return `library/${campaignId}/${fileId}.pdf`;
}

export type UploadValidation =
	| { ok: true; title: string; size: number }
	| { ok: false; status: 400 | 413 | 415; error: string };

/** Valida o pedido de upload antes de gerar qualquer link. */
export function validateUploadRequest(input: {
	title?: unknown;
	size?: unknown;
	contentType?: unknown;
}): UploadValidation {
	if (input.contentType !== LIBRARY_PDF_MIME) {
		return { ok: false, status: 415, error: "Só PDF (application/pdf)." };
	}
	const size = input.size;
	if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
		return { ok: false, status: 400, error: "Tamanho inválido." };
	}
	if (size > LIBRARY_MAX_BYTES) {
		return { ok: false, status: 413, error: "PDF acima de 50 MB." };
	}
	const title = typeof input.title === "string" ? input.title.trim() : "";
	if (!title || title.length > LIBRARY_TITLE_MAX) {
		return { ok: false, status: 400, error: "Título inválido." };
	}
	return { ok: true, title, size };
}

/** Primeiros bytes de um PDF: "%PDF-". */
export function hasPdfMagic(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 5 &&
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46 &&
		bytes[4] === 0x2d
	);
}

/** Confere o objeto que chegou no R2 contra o que foi aprovado. */
export function checkUploadedObject(
	expectedSize: number,
	head: { contentLength?: number; contentType?: string },
	firstBytes: Uint8Array,
): { ok: true } | { ok: false; error: string } {
	if (head.contentLength !== expectedSize) {
		return { ok: false, error: "Tamanho diferente do aprovado." };
	}
	if (head.contentLength > LIBRARY_MAX_BYTES) {
		return { ok: false, error: "PDF acima de 50 MB." };
	}
	const type = (head.contentType ?? "").split(";")[0].trim().toLowerCase();
	if (type !== LIBRARY_PDF_MIME) {
		return { ok: false, error: "Tipo diferente de application/pdf." };
	}
	if (!hasPdfMagic(firstBytes)) {
		return { ok: false, error: "Arquivo não é PDF." };
	}
	return { ok: true };
}

export function isStalePending(
	createdAtIso: string,
	nowMs: number,
	maxAgeMs = LIBRARY_PENDING_MAX_AGE_MS,
): boolean {
	const created = Date.parse(createdAtIso);
	return Number.isFinite(created) && nowMs - created > maxAgeMs;
}

/** Lista de origens permitidas (separadas por vírgula). */
export function parseAllowedOrigins(raw: string | undefined | null): string[] {
	return (raw ?? "")
		.split(",")
		.map((origin) => origin.trim().replace(/\/+$/, ""))
		.filter(Boolean);
}

export function resolveCorsOrigin(
	requestOrigin: string | null,
	allowed: string[],
): string | null {
	if (!requestOrigin) return null;
	return allowed.includes(requestOrigin) ? requestOrigin : null;
}

/**
 * TTL do GET. Só aceita um TTL menor que o padrão quando o modo de teste está
 * ligado por variável da função (usado no script de prova "link vencido").
 */
export function resolveReadTtl(
	requestedTtl: unknown,
	testModeEnabled: boolean,
): number {
	if (
		testModeEnabled &&
		typeof requestedTtl === "number" &&
		Number.isInteger(requestedTtl) &&
		requestedTtl >= 1 &&
		requestedTtl < LIBRARY_READ_TTL_SECONDS
	) {
		return requestedTtl;
	}
	return LIBRARY_READ_TTL_SECONDS;
}
