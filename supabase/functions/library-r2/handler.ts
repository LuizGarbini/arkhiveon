/**
 * library-r2 — decisão das ações, sem Deno e sem cliente real.
 * A Edge Function só liga JWT, service role e o R2. Os testes passam mocks.
 *
 * A capa (F2) exige `size` em `request-thumb-upload`: o PUT assina o
 * Content-Length exato, e o navegador manda esse tamanho no corpo. O teto
 * é 150 KB. O confirm confere de novo (HEAD + magic) antes de promover.
 */
import {
	buildLibraryKey,
	buildPendingLibraryKey,
	buildPendingThumbKey,
	buildThumbKey,
	canRunLibraryAction,
	checkUploadedObject,
	hasWebpMagic,
	isLibraryAction,
	isStalePending,
	isUuid,
	LIBRARY_PDF_MIME,
	LIBRARY_PENDING_MAX_AGE_MS,
	LIBRARY_THUMB_MIME,
	LIBRARY_THUMB_TTL_SECONDS,
	LIBRARY_UPLOAD_TTL_SECONDS,
	parseThumbReadRequest,
	resolveReadTtl,
	validateLibraryTitle,
	validateThumbSize,
	validateUploadRequest,
	type CampaignRole,
	type LibraryAction,
} from "../_shared/library-guard.ts";

export interface LibraryFileRow {
	id: string;
	campaign_id: string;
	r2_key: string;
	size_bytes: number;
	status: "pending" | "ready";
	created_at: string;
	thumb_status: "pending" | "ready" | "failed";
	thumb_path: string | null;
	thumb_updated_at: string | null;
}

export interface StoredHead {
	contentLength?: number;
	contentType?: string;
}

export interface SignPutInput {
	key: string;
	contentType: string;
	contentLength: number;
	expiresIn: number;
}

export interface SignGetInput {
	key: string;
	expiresIn: number;
	responseContentType: string;
	responseContentDisposition: string;
}

export interface LibraryHandlerDeps {
	/** `auth.getUser()` com o cliente anon e o JWT. `null` = sem sessão. */
	getUser: () => Promise<{ id: string } | null>;
	/** Piloto + papel, com o cliente do próprio usuário (RLS). */
	campaignAccess: (
		userId: string,
		campaignId: string,
	) => Promise<{ pilot: boolean; role: CampaignRole | null }>;
	getFile: (fileId: string) => Promise<LibraryFileRow | null>;
	/** Uma leitura por chamada. Quem filtra campanha e status é o handler. */
	listFilesByIds: (fileIds: string[]) => Promise<LibraryFileRow[]>;
	insertFile: (row: {
		id: string;
		campaign_id: string;
		r2_key: string;
		title: string;
		size_bytes: number;
		content_type: string;
		status: "pending";
		uploaded_by: string;
	}) => Promise<void>;
	/**
	 * UPDATE da linha. `match` vira um `.eq` extra (além do id).
	 * Devolve quantas linhas mudaram.
	 */
	updateFile: (
		id: string,
		patch: Record<string, string>,
		match: Record<string, string>,
	) => Promise<number>;
	deleteFileRow: (id: string) => Promise<void>;
	listStalePending: (
		campaignId: string,
		cutoffIso: string,
	) => Promise<
		Array<Pick<LibraryFileRow, "id" | "campaign_id" | "r2_key" | "created_at">>
	>;
	headObject: (key: string) => Promise<StoredHead>;
	readObjectRange: (key: string, range: string) => Promise<Uint8Array>;
	copyObject: (
		sourceKey: string,
		destKey: string,
		contentType: string,
	) => Promise<void>;
	deleteObject: (key: string) => Promise<void>;
	signPut: (input: SignPutInput) => Promise<string>;
	signGet: (input: SignGetInput) => Promise<string>;
	now: () => Date;
	randomUUID: () => string;
	testMode: boolean;
}

export interface LibraryResponseBody {
	error?: string;
	fileId?: string;
	uploadUrl?: string;
	url?: string;
	expiresIn?: number;
	status?: string;
	title?: string;
	deleted?: boolean;
	thumbStatus?: string;
	headers?: Record<string, string>;
	urls?: Record<string, string>;
}

export interface LibraryResponse {
	status: number;
	body: LibraryResponseBody;
}

/** Apagar objeto que não existe no R2 não pode derrubar o delete do PDF. */
export function isMissingStoredObject(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const record = error as {
		name?: unknown;
		Code?: unknown;
		$metadata?: { httpStatusCode?: unknown };
	};
	const name = typeof record.name === "string" ? record.name : "";
	const code = typeof record.Code === "string" ? record.Code : "";
	const httpStatus = record.$metadata?.httpStatusCode;
	return (
		name === "NotFound" ||
		name === "NoSuchKey" ||
		code === "NoSuchKey" ||
		code === "NotFound" ||
		httpStatus === 404
	);
}

function asRecord(body: unknown): Record<string, unknown> | null {
	if (!body || typeof body !== "object" || Array.isArray(body)) return null;
	return body as Record<string, unknown>;
}

function forbidden(): LibraryResponse {
	return { status: 403, body: { error: "Forbidden" } };
}

async function gate(
	deps: LibraryHandlerDeps,
	userId: string,
	campaignId: string,
	action: LibraryAction,
): Promise<LibraryResponse | null> {
	const access = await deps.campaignAccess(userId, campaignId);
	if (!access.pilot || !canRunLibraryAction(action, access.role)) {
		return forbidden();
	}
	return null;
}

async function deleteObjectIfExists(
	deps: LibraryHandlerDeps,
	key: string,
): Promise<void> {
	try {
		await deps.deleteObject(key);
	} catch (error) {
		if (!isMissingStoredObject(error)) throw error;
	}
}

async function deleteStoredFile(
	deps: LibraryHandlerDeps,
	row: Pick<LibraryFileRow, "id" | "campaign_id" | "r2_key">,
): Promise<void> {
	const keys = [
		row.r2_key,
		buildPendingLibraryKey(row.campaign_id, row.id),
		buildThumbKey(row.campaign_id, row.id),
		buildPendingThumbKey(row.campaign_id, row.id),
	];
	for (const key of keys) {
		await deleteObjectIfExists(deps, key);
	}
	await deps.deleteFileRow(row.id);
}

async function cleanupStalePending(
	deps: LibraryHandlerDeps,
	campaignId: string,
): Promise<void> {
	const now = deps.now().getTime();
	const cutoff = new Date(now - LIBRARY_PENDING_MAX_AGE_MS).toISOString();
	const rows = await deps.listStalePending(campaignId, cutoff);
	for (const row of rows) {
		if (!isStalePending(row.created_at, now)) continue;
		try {
			await deleteStoredFile(deps, row);
		} catch (error) {
			console.error("library-r2 cleanup", row.id, String(error));
		}
	}
}

/**
 * PDF `ready` da campanha pedida, com capa `ready` no caminho da 0080.
 * É o mesmo recorte de `request-read`: pendente não baixa, nem para o mestre.
 * Id de outra campanha não entra no mapa.
 */
function canSignThumbRead(row: LibraryFileRow, campaignId: string): boolean {
	if (row.campaign_id.toLowerCase() !== campaignId.toLowerCase()) return false;
	if (row.status !== "ready" || row.thumb_status !== "ready") return false;
	return row.thumb_path === buildThumbKey(row.campaign_id, row.id);
}

async function readThumbs(
	deps: LibraryHandlerDeps,
	userId: string,
	payload: Record<string, unknown>,
): Promise<LibraryResponse> {
	const parsed = parseThumbReadRequest(payload);
	if (!parsed.ok) return { status: parsed.status, body: { error: parsed.error } };
	const denied = await gate(
		deps,
		userId,
		parsed.campaignId,
		"request-thumb-reads",
	);
	if (denied) return denied;

	const rows = await deps.listFilesByIds(parsed.fileIds);
	const byId = new Map(rows.map((row) => [row.id.toLowerCase(), row]));
	const urls: Record<string, string> = {};
	for (const id of parsed.fileIds) {
		const row = byId.get(id);
		if (!row || !canSignThumbRead(row, parsed.campaignId)) continue;
		urls[row.id] = await deps.signGet({
			key: buildThumbKey(row.campaign_id, row.id),
			expiresIn: LIBRARY_THUMB_TTL_SECONDS,
			responseContentType: LIBRARY_THUMB_MIME,
			responseContentDisposition: "inline",
		});
	}
	return {
		status: 200,
		body: { urls, expiresIn: LIBRARY_THUMB_TTL_SECONDS },
	};
}

async function requestUpload(
	deps: LibraryHandlerDeps,
	userId: string,
	payload: Record<string, unknown>,
): Promise<LibraryResponse> {
	if (!isUuid(payload.campaignId)) {
		return { status: 400, body: { error: "Campanha inválida." } };
	}
	const denied = await gate(deps, userId, payload.campaignId, "request-upload");
	if (denied) return denied;

	const valid = validateUploadRequest({
		title: payload.title,
		size: payload.size,
		contentType: payload.contentType,
	});
	if (!valid.ok) return { status: valid.status, body: { error: valid.error } };

	await cleanupStalePending(deps, payload.campaignId);
	const fileId = deps.randomUUID();
	await deps.insertFile({
		id: fileId,
		campaign_id: payload.campaignId,
		r2_key: buildLibraryKey(payload.campaignId, fileId),
		title: valid.title,
		size_bytes: valid.size,
		content_type: LIBRARY_PDF_MIME,
		status: "pending",
		uploaded_by: userId,
	});
	const uploadUrl = await deps.signPut({
		key: buildPendingLibraryKey(payload.campaignId, fileId),
		contentType: LIBRARY_PDF_MIME,
		contentLength: valid.size,
		expiresIn: LIBRARY_UPLOAD_TTL_SECONDS,
	});
	return {
		status: 200,
		body: {
			fileId,
			uploadUrl,
			expiresIn: LIBRARY_UPLOAD_TTL_SECONDS,
			headers: {
				"Content-Type": LIBRARY_PDF_MIME,
				"Content-Length": String(valid.size),
			},
		},
	};
}

async function confirmUpload(
	deps: LibraryHandlerDeps,
	file: LibraryFileRow,
): Promise<LibraryResponse> {
	if (file.status === "ready") {
		return { status: 200, body: { fileId: file.id, status: "ready" } };
	}
	const pendingKey = buildPendingLibraryKey(file.campaign_id, file.id);
	let head: StoredHead;
	let first: Uint8Array;
	try {
		head = await deps.headObject(pendingKey);
		first = await deps.readObjectRange(pendingKey, "bytes=0-4");
	} catch {
		return {
			status: 409,
			body: { error: "Arquivo ainda não chegou no armazenamento." },
		};
	}
	const check = checkUploadedObject(Number(file.size_bytes), head, first);
	if (!check.ok) {
		await deleteStoredFile(deps, file);
		return { status: 422, body: { error: check.error } };
	}
	await deps.copyObject(pendingKey, file.r2_key, LIBRARY_PDF_MIME);
	await deleteObjectIfExists(deps, pendingKey);
	await deps.updateFile(
		file.id,
		{ status: "ready", ready_at: deps.now().toISOString() },
		{},
	);
	return { status: 200, body: { fileId: file.id, status: "ready" } };
}

async function requestRead(
	deps: LibraryHandlerDeps,
	file: LibraryFileRow,
	payload: Record<string, unknown>,
): Promise<LibraryResponse> {
	if (file.status !== "ready") return forbidden();
	const ttl = resolveReadTtl(payload.ttlSeconds, deps.testMode);
	const url = await deps.signGet({
		key: file.r2_key,
		expiresIn: ttl,
		responseContentType: LIBRARY_PDF_MIME,
		responseContentDisposition: "inline",
	});
	return { status: 200, body: { fileId: file.id, url, expiresIn: ttl } };
}

async function renameFile(
	deps: LibraryHandlerDeps,
	file: LibraryFileRow,
	payload: Record<string, unknown>,
): Promise<LibraryResponse> {
	if (file.status !== "ready") return forbidden();
	const valid = validateLibraryTitle(payload.title);
	if (!valid.ok) return { status: valid.status, body: { error: valid.error } };
	await deps.updateFile(
		file.id,
		{ title: valid.title },
		{ campaign_id: file.campaign_id },
	);
	return { status: 200, body: { fileId: file.id, title: valid.title } };
}

async function requestThumbUpload(
	deps: LibraryHandlerDeps,
	file: LibraryFileRow,
	payload: Record<string, unknown>,
): Promise<LibraryResponse> {
	if (file.status !== "ready") return forbidden();
	const size = validateThumbSize(payload.size);
	if (!size.ok) return { status: size.status, body: { error: size.error } };
	const uploadUrl = await deps.signPut({
		key: buildPendingThumbKey(file.campaign_id, file.id),
		contentType: LIBRARY_THUMB_MIME,
		contentLength: size.size,
		expiresIn: LIBRARY_THUMB_TTL_SECONDS,
	});
	return {
		status: 200,
		body: {
			fileId: file.id,
			uploadUrl,
			expiresIn: LIBRARY_THUMB_TTL_SECONDS,
			headers: {
				"Content-Type": LIBRARY_THUMB_MIME,
				"Content-Length": String(size.size),
			},
		},
	};
}

async function confirmThumb(
	deps: LibraryHandlerDeps,
	file: LibraryFileRow,
): Promise<LibraryResponse> {
	if (file.status !== "ready") return forbidden();
	const pendingKey = buildPendingThumbKey(file.campaign_id, file.id);
	const finalKey = buildThumbKey(file.campaign_id, file.id);
	let head: StoredHead;
	let bytes: Uint8Array;
	try {
		head = await deps.headObject(pendingKey);
		bytes = await deps.readObjectRange(pendingKey, "bytes=0-11");
	} catch {
		await deleteObjectIfExists(deps, pendingKey);
		return { status: 422, body: { error: "Capa inválida." } };
	}
	if (!validateThumbSize(head.contentLength).ok || !hasWebpMagic(bytes)) {
		await deleteObjectIfExists(deps, pendingKey);
		return { status: 422, body: { error: "Capa inválida." } };
	}
	// Copia, grava a linha e só então apaga a pending. Se o banco falhar,
	// o confirm pode repetir: a pending ainda está lá.
	await deps.copyObject(pendingKey, finalKey, LIBRARY_THUMB_MIME);
	const updated = await deps.updateFile(
		file.id,
		{
			thumb_status: "ready",
			thumb_path: finalKey,
			thumb_updated_at: deps.now().toISOString(),
		},
		{},
	);
	if (updated < 1) throw new Error("Não foi possível gravar a capa.");
	await deleteObjectIfExists(deps, pendingKey);
	return { status: 200, body: { fileId: file.id, thumbStatus: "ready" } };
}

async function reportThumbFailed(
	deps: LibraryHandlerDeps,
	file: LibraryFileRow,
): Promise<LibraryResponse> {
	const updated = await deps.updateFile(
		file.id,
		{ thumb_status: "failed" },
		{ thumb_status: "pending" },
	);
	return {
		status: 200,
		body: {
			fileId: file.id,
			thumbStatus: updated > 0 ? "failed" : file.thumb_status,
		},
	};
}

async function loadAuthorizedFile(
	deps: LibraryHandlerDeps,
	userId: string,
	payload: Record<string, unknown>,
	action: LibraryAction,
): Promise<{ ok: true; file: LibraryFileRow } | { ok: false; response: LibraryResponse }> {
	if (!isUuid(payload.fileId)) {
		return {
			ok: false,
			response: { status: 400, body: { error: "Arquivo inválido." } },
		};
	}
	const file = await deps.getFile(payload.fileId);
	if (!file) return { ok: false, response: forbidden() };
	const denied = await gate(deps, userId, file.campaign_id, action);
	if (denied) return { ok: false, response: denied };
	return { ok: true, file };
}

export async function handleLibraryRequest(
	deps: LibraryHandlerDeps,
	body: unknown,
): Promise<LibraryResponse> {
	const user = await deps.getUser();
	if (!user) return { status: 401, body: { error: "Unauthorized" } };

	const payload = asRecord(body);
	if (!payload || !isLibraryAction(payload.action)) {
		return { status: 400, body: { error: "Ação inválida." } };
	}
	const action = payload.action;

	if (action === "request-thumb-reads") {
		return readThumbs(deps, user.id, payload);
	}
	if (action === "request-upload") {
		return requestUpload(deps, user.id, payload);
	}

	const loaded = await loadAuthorizedFile(deps, user.id, payload, action);
	if (!loaded.ok) return loaded.response;
	const file = loaded.file;

	switch (action) {
		case "confirm-upload":
			return confirmUpload(deps, file);
		case "request-read":
			return requestRead(deps, file, payload);
		case "delete":
			await deleteStoredFile(deps, file);
			return { status: 200, body: { fileId: file.id, deleted: true } };
		case "rename":
			return renameFile(deps, file, payload);
		case "request-thumb-upload":
			return requestThumbUpload(deps, file, payload);
		case "confirm-thumb":
			return confirmThumb(deps, file);
		case "report-thumb-failed":
			return reportThumbFailed(deps, file);
	}
}
