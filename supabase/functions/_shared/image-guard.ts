/**
 * image-guard — autorização das imagens privadas (R1 do plano R2).
 *
 * Sem dependência de Deno: roda na Edge Function `image-r2` e nos testes do
 * Vitest. Quem decide o acesso é o banco: os assets são lidos com o cliente do
 * PRÓPRIO usuário, então o RLS de `image_assets` (`can_view_image_asset`) filtra.
 * Nenhum papel vindo do cliente é usado.
 */

export const IMAGE_ASSETS_TABLE = "image_assets";
export const IMAGE_SIGN_MAX_IDS = 100;
/** Janela da assinatura: a URL vale até o fim da PRÓXIMA hora cheia (1–2 h). */
export const IMAGE_SIGN_WINDOW_SECONDS = 3600;

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Formato de key do upload: `<userId>/[<pasta>/]<timestamp>-<uuid>.<ext>`. */
const STORAGE_KEY_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/([a-z0-9_-]{1,32}\/)?[0-9]{10,16}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|png|jpe?g|gif)$/i;

export type StorageBucket = "public" | "private";

export interface SignableAssetRow {
	id: string;
	storage_bucket: string | null;
	storage_key: string | null;
}

export interface SignedImage {
	id: string;
	url: string;
	expiresAt: string;
}

export function isUuid(value: unknown): value is string {
	return typeof value === "string" && UUID_RE.test(value);
}

export function isValidStorageKey(value: unknown): value is string {
	return typeof value === "string" && STORAGE_KEY_RE.test(value);
}

export type SignRequest =
	| { ok: true; ids: string[] }
	| { ok: false; status: 400; error: string };

/** Valida o corpo `{ action: "sign", assetIds: string[] }` (1..100 UUIDs). */
export function parseSignRequest(body: unknown): SignRequest {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return { ok: false, status: 400, error: "Pedido inválido." };
	}
	const { action, assetIds } = body as Record<string, unknown>;
	if (action !== "sign") return { ok: false, status: 400, error: "Ação inválida." };
	if (!Array.isArray(assetIds) || assetIds.length === 0) {
		return { ok: false, status: 400, error: "Lista de imagens vazia." };
	}
	if (assetIds.length > IMAGE_SIGN_MAX_IDS) {
		return {
			ok: false,
			status: 400,
			error: `No máximo ${IMAGE_SIGN_MAX_IDS} imagens por pedido.`,
		};
	}
	if (!assetIds.every(isUuid)) {
		return { ok: false, status: 400, error: "Identificador inválido." };
	}
	return { ok: true, ids: [...new Set(assetIds.map((id) => id.toLowerCase()))] };
}

/**
 * Assinatura "arredondada": assina com a data no início da hora corrente e
 * validade de 2 janelas. Todo pedido dentro da mesma hora gera a MESMA URL
 * (estável e cacheável), e ela sempre vale de 1 h a 2 h a partir de agora.
 */
export function signingWindow(nowMs: number): {
	signingDate: Date;
	expiresIn: number;
	expiresAt: Date;
} {
	const windowMs = IMAGE_SIGN_WINDOW_SECONDS * 1000;
	const start = Math.floor(nowMs / windowMs) * windowMs;
	const expiresIn = IMAGE_SIGN_WINDOW_SECONDS * 2;
	return {
		signingDate: new Date(start),
		expiresIn,
		expiresAt: new Date(start + expiresIn * 1000),
	};
}

/** Só o que está no bucket privado e com key válida é assinado. */
export function selectSignable(rows: readonly SignableAssetRow[]): {
	id: string;
	key: string;
}[] {
	return rows
		.filter(
			(row) =>
				row.storage_bucket === "private" && isValidStorageKey(row.storage_key),
		)
		.map((row) => ({ id: row.id, key: row.storage_key as string }));
}

export interface SignDeps {
	/** `auth.getUser()` com o JWT do pedido; `null` = sem sessão válida. */
	getUserId: () => Promise<string | null>;
	/** SELECT em `image_assets` com o cliente do usuário (RLS aplicado). */
	loadVisibleAssets: (ids: string[]) => Promise<SignableAssetRow[]>;
	/** Assina GET no bucket privado. */
	sign: (key: string, signingDate: Date, expiresIn: number) => Promise<string>;
	now: () => number;
}

export type SignResult =
	| { status: 200; body: { images: SignedImage[] } }
	| { status: 400 | 401; body: { error: string } };

/**
 * Fluxo da action `sign`. Asset inexistente, de outra campanha, privado que o
 * usuário não vê ou que está no bucket público simplesmente não volta na
 * lista: a resposta é igual nos quatro casos (não revela existência).
 */
export async function handleSign(
	deps: SignDeps,
	body: unknown,
): Promise<SignResult> {
	const userId = await deps.getUserId();
	if (!userId) return { status: 401, body: { error: "Unauthorized" } };

	const request = parseSignRequest(body);
	if (!request.ok) return { status: 400, body: { error: request.error } };

	const rows = await deps.loadVisibleAssets(request.ids);
	const requested = new Set(request.ids);
	const signable = selectSignable(
		rows.filter((row) => requested.has(row.id.toLowerCase())),
	);
	const window = signingWindow(deps.now());
	const images: SignedImage[] = [];
	for (const item of signable) {
		images.push({
			id: item.id,
			url: await deps.sign(item.key, window.signingDate, window.expiresIn),
			expiresAt: window.expiresAt.toISOString(),
		});
	}
	return { status: 200, body: { images } };
}
