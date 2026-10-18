/**
 * Biblioteca de PDFs (Fatia 1b) — cliente.
 * Lista pela tabela (RLS), envia via Edge Function `library-r2`:
 * request-upload → PUT direto no R2 (XHR com progresso) → confirm-upload.
 */
import {
	hasPdfMagic,
	isUuid,
	LIBRARY_FILES_TABLE,
	LIBRARY_MAX_BYTES,
	LIBRARY_PDF_MIME,
	LIBRARY_PILOT_TABLE,
	LIBRARY_TITLE_MAX,
	validateLibraryTitle,
} from "../../../supabase/functions/_shared/library-guard";
import { getSupabase } from "../supabase";
import { repairMojibake } from "./repair-mojibake";

export interface LibraryFile {
	id: string;
	title: string;
	sizeBytes: number;
	createdAt: string;
}

// As tabelas da 0040 ainda não estão em database.types.ts.
interface LooseQuery {
	select: (cols: string) => LooseQuery;
	eq: (col: string, value: string) => LooseQuery;
	order: (col: string, opts: { ascending: boolean }) => LooseQuery;
	maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
	then: Promise<{ data: unknown; error: unknown }>["then"];
}
interface LooseClient {
	from: (table: string) => LooseQuery;
	functions: {
		invoke: (
			name: string,
			opts: { body: unknown },
		) => Promise<{ data: unknown; error: unknown }>;
	};
}

function looseClient(): LooseClient | null {
	return getSupabase() as unknown as LooseClient | null;
}

const pilotCache = new Map<string, Promise<boolean>>();

/** Campanha está na allowlist da Biblioteca? Erro/offline = não. */
export function fetchLibraryPilot(campaignId: string): Promise<boolean> {
	const cached = pilotCache.get(campaignId);
	if (cached) return cached;
	const promise = (async () => {
		const client = looseClient();
		if (!client || !isUuid(campaignId)) return false;
		try {
			const { data, error } = await client
				.from(LIBRARY_PILOT_TABLE)
				.select("campaign_id")
				.eq("campaign_id", campaignId)
				.maybeSingle();
			if (error || !data) return false;
			return (data as { campaign_id?: unknown }).campaign_id === campaignId;
		} catch {
			return false;
		}
	})();
	pilotCache.set(campaignId, promise);
	// Só "liberado" fica em cache; "não" é consultado de novo na próxima vez.
	void promise.then((enabled) => {
		if (!enabled) pilotCache.delete(campaignId);
	});
	return promise;
}

export function canManageLibraryRole(role: string | null | undefined): boolean {
	return role === "owner" || role === "editor";
}

export type PdfCheck =
	| { ok: true; title: string }
	| { ok: false; error: string };

/**
 * Título a partir do nome do arquivo (sem .pdf, limitado). Conserta acento
 * quebrado vindo do disco ("PoÃ§Ãµes" → "Poções") e normaliza pra NFC.
 */
export function titleFromFileName(name: string): string {
	const base =
		repairMojibake(name)
			.replace(/\.pdf$/i, "")
			.trim() || "PDF sem nome";
	return Array.from(base).slice(0, LIBRARY_TITLE_MAX).join("").trim();
}

export type TitleDraftCheck =
	| { ok: true; title: string }
	| { ok: false; error: string };

/** Valida o nome digitado ao renomear (mesma regra da função). */
export function checkTitleDraft(draft: string): TitleDraftCheck {
	const result = validateLibraryTitle(draft);
	if (result.ok) return result;
	return {
		ok: false,
		error: draft.trim()
			? `Use até ${LIBRARY_TITLE_MAX} caracteres.`
			: "O nome não pode ficar vazio.",
	};
}

/** Valida no cliente antes de pedir link: tipo, 200 MB e %PDF-. */
export async function checkPdfFile(file: File): Promise<PdfCheck> {
	const looksPdf =
		file.type === LIBRARY_PDF_MIME ||
		(file.type === "" && /\.pdf$/i.test(file.name));
	if (!looksPdf) return { ok: false, error: "Só dá pra enviar PDF." };
	if (file.size <= 0) return { ok: false, error: "Arquivo vazio." };
	if (file.size > LIBRARY_MAX_BYTES) {
		return { ok: false, error: "O PDF passa de 200 MB." };
	}
	const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
	if (!hasPdfMagic(head)) {
		return { ok: false, error: "Esse arquivo não é um PDF de verdade." };
	}
	return { ok: true, title: titleFromFileName(file.name) };
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Mensagem leiga para cada status da função. */
export function libraryErrorMessage(status: number | undefined): string {
	switch (status) {
		case 401:
			return "Sua sessão expirou. Entre de novo.";
		case 403:
			return "Você não tem permissão pra isso nesta campanha.";
		case 409:
			return "O envio não terminou. Tente de novo.";
		case 413:
			return "O PDF passa de 200 MB.";
		case 415:
		case 422:
			return "Esse arquivo não é um PDF válido.";
		default:
			return "Não deu pra falar com a Biblioteca. Tente de novo.";
	}
}

export class LibraryError extends Error {}

async function callLibrary<T>(body: Record<string, unknown>): Promise<T> {
	const client = looseClient();
	if (!client) throw new LibraryError(libraryErrorMessage(undefined));
	const { data, error } = await client.functions.invoke("library-r2", { body });
	if (error) {
		const status = (error as { context?: { status?: number } }).context?.status;
		throw new LibraryError(libraryErrorMessage(status));
	}
	return data as T;
}

export async function listLibraryFiles(
	campaignId: string,
): Promise<LibraryFile[]> {
	const client = looseClient();
	if (!client) throw new LibraryError(libraryErrorMessage(undefined));
	const { data, error } = await client
		.from(LIBRARY_FILES_TABLE)
		.select("id, title, size_bytes, created_at")
		.eq("campaign_id", campaignId)
		.eq("status", "ready")
		.order("created_at", { ascending: false });
	if (error) throw new LibraryError(libraryErrorMessage(undefined));
	return (
		(data ?? []) as {
			id: string;
			title: string;
			size_bytes: number;
			created_at: string;
		}[]
	).map((row) => ({
		id: row.id,
		title: row.title,
		sizeBytes: Number(row.size_bytes),
		createdAt: row.created_at,
	}));
}

function putWithProgress(
	url: string,
	file: File,
	headers: Record<string, string>,
	onProgress: (fraction: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("PUT", url);
		// Content-Length é definido pelo navegador (assinado = file.size).
		for (const [key, value] of Object.entries(headers)) {
			if (key.toLowerCase() !== "content-length")
				xhr.setRequestHeader(key, value);
		}
		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) onProgress(event.loaded / event.total);
		};
		xhr.onload = () =>
			xhr.status >= 200 && xhr.status < 300
				? resolve()
				: reject(new LibraryError(libraryErrorMessage(xhr.status)));
		xhr.onerror = () =>
			reject(new LibraryError(libraryErrorMessage(undefined)));
		xhr.send(file);
	});
}

export async function uploadLibraryPdf(
	campaignId: string,
	file: File,
	title: string,
	onProgress: (fraction: number) => void,
): Promise<string> {
	const ticket = await callLibrary<{
		fileId: string;
		uploadUrl: string;
		headers: Record<string, string>;
	}>({
		action: "request-upload",
		campaignId,
		title,
		size: file.size,
		contentType: LIBRARY_PDF_MIME,
	});
	await putWithProgress(
		ticket.uploadUrl,
		file,
		ticket.headers ?? {},
		onProgress,
	);
	await callLibrary({ action: "confirm-upload", fileId: ticket.fileId });
	return ticket.fileId;
}

export async function deleteLibraryFile(fileId: string): Promise<void> {
	await callLibrary({ action: "delete", fileId });
}

/** Renomeia um PDF pronto (owner/editor; a função nega o resto com 403). */
export async function renameLibraryFile(
	fileId: string,
	title: string,
): Promise<string> {
	const result = await callLibrary<{ title?: unknown }>({
		action: "rename",
		fileId,
		title,
	});
	return typeof result?.title === "string" ? result.title : title;
}

/** Metadados de um PDF pronto (RLS decide se a pessoa vê). */
export async function getLibraryFile(
	fileId: string,
): Promise<(LibraryFile & { campaignId: string }) | null> {
	const client = looseClient();
	if (!client || !isUuid(fileId)) return null;
	const { data, error } = await client
		.from(LIBRARY_FILES_TABLE)
		.select("id, campaign_id, title, size_bytes, created_at")
		.eq("id", fileId)
		.eq("status", "ready")
		.maybeSingle();
	if (error) throw new LibraryError(libraryErrorMessage(undefined));
	if (!data) return null;
	const row = data as {
		id: string;
		campaign_id: string;
		title: string;
		size_bytes: number;
		created_at: string;
	};
	return {
		id: row.id,
		campaignId: row.campaign_id,
		title: row.title,
		sizeBytes: Number(row.size_bytes),
		createdAt: row.created_at,
	};
}

/** Baixa o PDF inteiro pelo link assinado de 5 min (`request-read`). */
export async function downloadLibraryPdf(fileId: string): Promise<ArrayBuffer> {
	const { url } = await callLibrary<{ url: string }>({
		action: "request-read",
		fileId,
	});
	const response = await fetch(url);
	if (!response.ok)
		throw new LibraryError(libraryErrorMessage(response.status));
	const buffer = await response.arrayBuffer();
	if (!hasPdfMagic(new Uint8Array(buffer.slice(0, 5)))) {
		throw new LibraryError(libraryErrorMessage(422));
	}
	return buffer;
}
