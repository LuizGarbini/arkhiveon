/**
 * Foto que os outros veem no canto da mesa.
 *
 * A escolha fica no metadata do Auth (`table_photo` / `table_photo_url`), então
 * vale em qualquer aparelho. O que chega pela presença de outro cliente não é
 * confiável: só https do storage deste projeto ou dos domínios de foto do Google.
 */

export const TABLE_PHOTO_MAX_DIMENSION = 256;
export const TABLE_PHOTO_FOLDER = "table-photo";

export const TABLE_PHOTO_NEEDS_SUPABASE =
	"Não dá para salvar a foto sem o Supabase.";
export const TABLE_PHOTO_REJECTED_URL =
	"Esse endereço de imagem não pode aparecer na mesa.";

const MAX_AVATAR_URL = 2048;

/** CDNs que o Google usa na foto da conta (lh3–lh6). */
export const GOOGLE_PHOTO_HOSTS: ReadonlySet<string> = new Set([
	"lh3.googleusercontent.com",
	"lh4.googleusercontent.com",
	"lh5.googleusercontent.com",
	"lh6.googleusercontent.com",
]);

export type TablePhotoMode = "google" | "custom" | "initials";

export interface TablePhotoConfig {
	supabaseUrl?: string | null;
	r2PublicUrl?: string | null;
}

export interface TablePhoto {
	mode: TablePhotoMode;
	/** Endereço anunciado na presença. `null` = iniciais. */
	url: string | null;
	googleUrl: string | null;
	customUrl: string | null;
}

export interface TablePhotoUploader {
	upload(
		file: File,
		options?: { folder?: string; maxDimension?: number; quality?: number },
	): Promise<string>;
}

export interface TablePhotoAuth {
	auth: {
		updateUser(credentials: {
			data: Record<string, string>;
		}): Promise<{ error: { message: string } | null }>;
	};
}

export function defaultTablePhotoConfig(): TablePhotoConfig {
	return {
		supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
		r2PublicUrl: import.meta.env.VITE_R2_PUBLIC_URL,
	};
}

function httpsOrigin(raw: string | null | undefined): URL | null {
	if (typeof raw !== "string" || !raw.trim()) return null;
	try {
		const url = new URL(raw.trim());
		if (url.protocol !== "https:") return null;
		if (url.username || url.password) return null;
		return url;
	} catch {
		return null;
	}
}

function sameSite(url: URL, origin: URL): boolean {
	return url.hostname === origin.hostname && url.port === origin.port;
}

/** https do Storage do Supabase deste projeto, ou do R2 público configurado. */
export function isProjectStorageUrl(
	url: URL,
	config: TablePhotoConfig,
): boolean {
	const supabase = httpsOrigin(config.supabaseUrl);
	if (supabase && sameSite(url, supabase)) {
		const marker = "/storage/v1/object/";
		if (!url.pathname.startsWith(marker)) return false;
		return url.pathname.slice(marker.length).length > 0;
	}
	const r2 = httpsOrigin(config.r2PublicUrl);
	if (r2 && sameSite(url, r2)) {
		const prefix = r2.pathname.replace(/\/$/, "");
		if (
			prefix &&
			url.pathname !== prefix &&
			!url.pathname.startsWith(`${prefix}/`)
		) {
			return false;
		}
		return url.pathname !== "/" && url.pathname !== "";
	}
	return false;
}

/**
 * URL que pode virar `src` da foto de outra pessoa.
 * Recusa `javascript:`, `data:` e qualquer host fora da lista.
 */
export function readRemoteAvatarUrl(
	value: unknown,
	config: TablePhotoConfig = defaultTablePhotoConfig(),
): string | null {
	if (typeof value !== "string") return null;
	const text = value.trim();
	if (!text || text.length > MAX_AVATAR_URL) return null;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: barra e controle não podem ir para o src
	if (/[\u0000-\u001f\u007f\\]/.test(text) || /\s/.test(text)) return null;
	let url: URL;
	try {
		url = new URL(text);
	} catch {
		return null;
	}
	if (url.username || url.password) return null;
	if (url.port) return null;
	if (url.protocol !== "https:") return null;
	const googleHost = GOOGLE_PHOTO_HOSTS.has(url.hostname);
	const projectStorage = isProjectStorageUrl(url, config);
	if (googleHost || projectStorage) return url.href;
	return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function googlePhotoFrom(
	record: Record<string, unknown> | null,
	config: TablePhotoConfig,
): string | null {
	if (!record) return null;
	for (const key of ["avatar_url", "picture"]) {
		const allowed = readRemoteAvatarUrl(record[key], config);
		if (!allowed) continue;
		try {
			if (GOOGLE_PHOTO_HOSTS.has(new URL(allowed).hostname)) return allowed;
		} catch {
			// href que não reabre: ignora.
		}
	}
	return null;
}

function choice(
	mode: TablePhotoMode,
	url: string | null,
	googleUrl: string | null,
	customUrl: string | null,
): TablePhoto {
	return { mode, url, googleUrl, customUrl };
}

/** O que esta conta mostra na mesa, a partir do metadata do Auth. */
export function resolveTablePhoto(
	metadata: unknown,
	config: TablePhotoConfig = defaultTablePhotoConfig(),
): TablePhoto {
	const record = asRecord(metadata);
	const googleUrl = googlePhotoFrom(record, config);
	const customUrl = record
		? readRemoteAvatarUrl(record.table_photo_url, config)
		: null;
	const saved = record?.table_photo;
	if (saved === "initials") {
		return choice("initials", null, googleUrl, customUrl);
	}
	if (saved === "custom") {
		return choice(
			customUrl ? "custom" : "initials",
			customUrl,
			googleUrl,
			customUrl,
		);
	}
	if (googleUrl) {
		return choice("google", googleUrl, googleUrl, customUrl);
	}
	return choice("initials", null, googleUrl, customUrl);
}

/** Nome anunciado na presença: o mesmo que a barra usa nas iniciais. */
export function tablePresenceName(
	user: { email?: string | null; user_metadata?: unknown } | null,
): string {
	const record = asRecord(user?.user_metadata);
	const full = record?.full_name;
	if (typeof full === "string" && full.trim()) return full.trim();
	const local = user?.email?.split("@")[0]?.trim();
	return local || "Aventureiro";
}

/** Duas primeiras letras, como o círculo da barra quando não há foto. */
export function tablePhotoInitials(name: string): string {
	const trimmed = name.trim();
	return (trimmed || "?").slice(0, 2).toUpperCase();
}

export function tablePhotoUploadOptions(): {
	folder: string;
	maxDimension: number;
	quality: number;
} {
	return {
		folder: TABLE_PHOTO_FOLDER,
		maxDimension: TABLE_PHOTO_MAX_DIMENSION,
		quality: 0.8,
	};
}

/** Envia pelo mesmo caminho das outras imagens (redimensiona no cliente) e só aceita URL da lista. */
export async function uploadTablePhoto(
	file: File,
	storage: TablePhotoUploader,
	config: TablePhotoConfig = defaultTablePhotoConfig(),
): Promise<string> {
	const url = await storage.upload(file, tablePhotoUploadOptions());
	const allowed = readRemoteAvatarUrl(url, config);
	if (!allowed) throw new Error(TABLE_PHOTO_REJECTED_URL);
	return allowed;
}

/** Grava a escolha no metadata do Auth. `null` = gravou. */
export async function persistTablePhoto(
	client: TablePhotoAuth | null,
	mode: TablePhotoMode,
	customUrl?: string | null,
	config: TablePhotoConfig = defaultTablePhotoConfig(),
): Promise<string | null> {
	if (!client) return TABLE_PHOTO_NEEDS_SUPABASE;
	let data: Record<string, string>;
	if (mode === "custom") {
		const allowed = readRemoteAvatarUrl(customUrl, config);
		if (!allowed) return TABLE_PHOTO_REJECTED_URL;
		data = { table_photo: "custom", table_photo_url: allowed };
	} else {
		data = { table_photo: mode };
	}
	const { error } = await client.auth.updateUser({ data });
	return error?.message ?? null;
}
