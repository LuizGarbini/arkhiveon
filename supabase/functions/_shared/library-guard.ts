/**
 * Biblioteca de PDFs (Fatia 1a + capas F2) — regras puras compartilhadas entre
 * a Edge Function `library-r2` e os testes (vitest). Sem dependências de Deno/S3.
 */

export const LIBRARY_PILOT_TABLE = "campaign_library_pilot_campaigns";
export const LIBRARY_FILES_TABLE = "campaign_library_files";

export const LIBRARY_MAX_BYTES = 200 * 1024 * 1024; // 209715200 (CHECK da 0042)
export const LIBRARY_PDF_MIME = "application/pdf";
/** Presigned PUT: 10 min. */
export const LIBRARY_UPLOAD_TTL_SECONDS = 600;
/** Presigned GET: 5 min (o viewer baixa o arquivo inteiro ao abrir). */
export const LIBRARY_READ_TTL_SECONDS = 300;
/** Pendentes mais velhos que isso são apagados no próximo request-upload. */
export const LIBRARY_PENDING_MAX_AGE_MS = 3 * 60 * 60 * 1000;
export const LIBRARY_TITLE_MAX = 200;

/** Capa WebP: no máximo 150 KB (153600 bytes). */
export const LIBRARY_THUMB_MAX_BYTES = 150 * 1024;
export const LIBRARY_THUMB_MIME = "image/webp";
/** PUT e GET da capa: 10 min. */
export const LIBRARY_THUMB_TTL_SECONDS = 600;
/** `request-thumb-reads`: no máximo 60 ids por chamada. */
export const LIBRARY_THUMB_READ_MAX_IDS = 60;

export type CampaignRole = "owner" | "editor" | "viewer";
export type LibraryAction =
	| "request-upload"
	| "confirm-upload"
	| "request-read"
	| "delete"
	| "rename"
	| "request-thumb-upload"
	| "confirm-thumb"
	| "report-thumb-failed"
	| "request-thumb-reads";

const LIBRARY_ACTIONS: readonly LibraryAction[] = [
	"request-upload",
	"confirm-upload",
	"request-read",
	"delete",
	"rename",
	"request-thumb-upload",
	"confirm-thumb",
	"report-thumb-failed",
	"request-thumb-reads",
];

/** Leitura aberta a qualquer membro. O resto é gestão (owner/editor). */
const LIBRARY_READ_ACTIONS = new Set<LibraryAction>([
	"request-read",
	"request-thumb-reads",
]);

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
	return typeof value === "string" && UUID_RE.test(value);
}

export function isLibraryAction(value: unknown): value is LibraryAction {
	return (
		typeof value === "string" &&
		(LIBRARY_ACTIONS as readonly string[]).includes(value)
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

/**
 * Chave temporária do PUT assinado. O link de 10 min só grava aqui; o
 * confirm-upload copia para a chave final. Assim um PUT repetido com o mesmo
 * link nunca sobrescreve um PDF que já está `ready`.
 */
export function buildPendingLibraryKey(
	campaignId: string,
	fileId: string,
): string {
	return `pending/${campaignId}/${fileId}.pdf`;
}

/** Chave final da capa. Igual ao CHECK da 0080. */
export function buildThumbKey(campaignId: string, fileId: string): string {
	return `library/${campaignId}/${fileId}.thumb.webp`;
}

/** PUT assinado da capa. O confirm copia para `buildThumbKey`. */
export function buildPendingThumbKey(
	campaignId: string,
	fileId: string,
): string {
	return `pending/${campaignId}/${fileId}.thumb.webp`;
}

export type ThumbSizeValidation =
	| { ok: true; size: number }
	| { ok: false; status: 400 | 413; error: string };

/** Inteiro, maior que 0 e no máximo 150 KB. */
export function validateThumbSize(size: unknown): ThumbSizeValidation {
	if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
		return { ok: false, status: 400, error: "Tamanho inválido." };
	}
	if (size > LIBRARY_THUMB_MAX_BYTES) {
		return { ok: false, status: 413, error: "Capa acima de 150 KB." };
	}
	return { ok: true, size };
}

const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46] as const; // RIFF
const WEBP_WEBP = [0x57, 0x45, 0x42, 0x50] as const; // WEBP

/** Bytes 0–3 `RIFF` e 8–11 `WEBP`. O miolo (4–7) é o tamanho do container. */
export function hasWebpMagic(bytes: Uint8Array): boolean {
	if (bytes.length < 12) return false;
	for (let i = 0; i < 4; i++) {
		if (bytes[i] !== WEBP_RIFF[i]) return false;
		if (bytes[8 + i] !== WEBP_WEBP[i]) return false;
	}
	return true;
}

export type ThumbReadRequest =
	| { ok: true; campaignId: string; fileIds: string[] }
	| { ok: false; status: 400; error: string };

/**
 * `{ campaignId, fileIds }` — 1..60 UUIDs. Repetidos contam no teto e saem
 * uma vez só (minúsculos), na ordem do primeiro.
 */
export function parseThumbReadRequest(
	body: Record<string, unknown>,
): ThumbReadRequest {
	const campaignId = body.campaignId;
	if (!isUuid(campaignId)) {
		return { ok: false, status: 400, error: "Campanha inválida." };
	}
	const fileIds = body.fileIds;
	if (!Array.isArray(fileIds) || fileIds.length === 0) {
		return { ok: false, status: 400, error: "Lista de capas vazia." };
	}
	if (fileIds.length > LIBRARY_THUMB_READ_MAX_IDS) {
		return {
			ok: false,
			status: 400,
			error: "No máximo 60 capas por pedido.",
		};
	}
	const seen = new Set<string>();
	const unique: string[] = [];
	for (const id of fileIds) {
		if (!isUuid(id)) {
			return { ok: false, status: 400, error: "Arquivo inválido." };
		}
		const key = id.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(key);
	}
	return {
		ok: true,
		campaignId: campaignId.toLowerCase(),
		fileIds: unique,
	};
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
		return { ok: false, status: 413, error: "PDF acima de 200 MB." };
	}
	const title = typeof input.title === "string" ? input.title.trim() : "";
	if (!title || title.length > LIBRARY_TITLE_MAX) {
		return { ok: false, status: 400, error: "Título inválido." };
	}
	return { ok: true, title, size };
}

/** `request-read` e `request-thumb-reads` são de qualquer membro; o resto é owner/editor. */
export function actionNeedsManage(action: LibraryAction): boolean {
	return !LIBRARY_READ_ACTIONS.has(action);
}

/** Quem pode executar a ação, pelo papel na campanha. */
export function canRunLibraryAction(
	action: LibraryAction,
	role: CampaignRole | null,
): boolean {
	return actionNeedsManage(action)
		? canManageLibrary(role)
		: canReadLibrary(role);
}

export type TitleValidation =
	| { ok: true; title: string }
	| { ok: false; status: 400; error: string };

/**
 * Novo nome de um PDF (`rename`): texto, NFC, sem espaço nas pontas,
 * 1–200 caracteres (mesma regra do check da tabela: char_length).
 */
export function validateLibraryTitle(value: unknown): TitleValidation {
	const title = typeof value === "string" ? value.normalize("NFC").trim() : "";
	const length = Array.from(title).length;
	if (length < 1 || length > LIBRARY_TITLE_MAX) {
		return { ok: false, status: 400, error: "Título inválido." };
	}
	return { ok: true, title };
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
		return { ok: false, error: "PDF acima de 200 MB." };
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
