/**
 * library-r2 — Biblioteca de PDFs da campanha (Fatia 1a + capas F2).
 *
 * Emite links assinados curtos para um bucket R2 privado e separado das
 * imagens. Nunca devolve link público. Toda chamada valida JWT, piloto
 * (`campaign_library_pilot_campaigns`) e papel na campanha.
 *
 * ORDEM DE DEPLOY (mesmo padrão da 0042):
 *   1. Migração 0080 já aplicada em produção (thumb_status, thumb_path,
 *      thumb_updated_at, CHECKs e índice parcial).
 *   2. Publicar esta função (Luiz).
 *   3. Fatia F3 — a tela que envia a capa e mostra a miniatura.
 * Sem a 0080, confirm-thumb não tem coluna onde gravar. Sem esta função,
 * a F3 não tem link assinado. Esta fatia não cria migração nem mexe em
 * policy, grant ou RLS.
 *
 * Ações (POST JSON { action, ... }):
 * - request-upload  (owner/editor) { campaignId, title, size, contentType }
 *     → limpa pendentes > 3h da campanha, cria linha `pending`, devolve
 *       presigned PUT (10 min) com Content-Type e Content-Length assinados,
 *       para a chave TEMPORÁRIA `pending/<campaign>/<id>.pdf`.
 * - confirm-upload  (owner/editor) { fileId }
 *     → HEAD + Range 0-4 (%PDF-) na chave temporária; ok = copia para a
 *       chave final (`r2_key`), apaga a temporária e marca `ready`;
 *       falha = apaga objeto+linha (422).
 * - request-read    (qualquer membro, só `ready`) { fileId, ttlSeconds? }
 *     → presigned GET (5 min). `ttlSeconds` menor só com LIBRARY_TEST_MODE=1.
 * - delete          (owner/editor) { fileId }
 *     → apaga o PDF, a pending do PDF, a capa final e a pending da capa
 *       (objeto ausente não falha o delete) e a linha.
 * - rename          (owner/editor, só `ready`) { fileId, title }
 *     → troca só o `title`. Jogador recebe 403.
 * - request-thumb-upload (owner/editor) { fileId, size }
 *     → a linha existe, é da campanha e está `ready`. PUT assinado de 10 min
 *       em `pending/<campaign>/<id>.thumb.webp`, com Content-Type image/webp
 *       e Content-Length assinados. `size` é o tamanho exato (1..153600).
 * - confirm-thumb (owner/editor) { fileId }
 *     → HEAD (≤ 150 KB) + Range 0-11 (RIFF/WEBP) na pending. Ok = copia para
 *       `library/<campaign>/<id>.thumb.webp`, grava thumb_status ready,
 *       thumb_path e thumb_updated_at, e apaga a pending. Falha = apaga a
 *       pending e responde 422; a linha fica como estava.
 * - report-thumb-failed (owner/editor) { fileId }
 *     → UPDATE só onde thumb_status = 'pending'. Ready não muda.
 * - request-thumb-reads (qualquer membro) { campaignId, fileIds }
 *     → no máximo 60 ids, uma checagem de piloto/papel. Devolve GET assinado
 *       de 10 min só para PDF ready com capa ready desta campanha.
 *
 * Variáveis (secrets da função; nunca no cliente):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (padrão Supabase)
 *   R2_ENDPOINT (reuso da conta), LIBRARY_R2_BUCKET, LIBRARY_R2_ACCESS_KEY_ID,
 *   LIBRARY_R2_SECRET_ACCESS_KEY, LIBRARY_ALLOWED_ORIGINS, LIBRARY_TEST_MODE (opcional)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.540.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.540.0";
import {
	createClient,
	type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.8";
import {
	type CampaignRole,
	LIBRARY_FILES_TABLE,
	LIBRARY_PILOT_TABLE,
	normalizeRole,
	parseAllowedOrigins,
	resolveCorsOrigin,
} from "../_shared/library-guard.ts";
import {
	handleLibraryRequest,
	type LibraryFileRow,
	type LibraryHandlerDeps,
} from "./handler.ts";

const FILE_COLUMNS =
	"id, campaign_id, r2_key, size_bytes, status, created_at, thumb_status, thumb_path, thumb_updated_at";

const allowedOrigins = parseAllowedOrigins(
	Deno.env.get("LIBRARY_ALLOWED_ORIGINS"),
);
const testMode = Deno.env.get("LIBRARY_TEST_MODE") === "1";

function corsHeaders(req: Request): Record<string, string> {
	const origin = resolveCorsOrigin(req.headers.get("Origin"), allowedOrigins);
	const headers: Record<string, string> = {
		"Access-Control-Allow-Headers":
			"authorization, x-client-info, apikey, content-type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		Vary: "Origin",
	};
	if (origin) headers["Access-Control-Allow-Origin"] = origin;
	return headers;
}

function json(req: Request, body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...corsHeaders(req),
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

function r2(): { s3: S3Client; bucket: string } {
	const bucket = Deno.env.get("LIBRARY_R2_BUCKET") ?? "";
	const endpoint = Deno.env.get("R2_ENDPOINT") ?? "";
	const accessKeyId = Deno.env.get("LIBRARY_R2_ACCESS_KEY_ID") ?? "";
	const secretAccessKey = Deno.env.get("LIBRARY_R2_SECRET_ACCESS_KEY") ?? "";
	if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
		throw new Error("Biblioteca sem configuração de armazenamento.");
	}
	return {
		bucket,
		s3: new S3Client({
			region: "auto",
			endpoint,
			credentials: { accessKeyId, secretAccessKey },
		}),
	};
}

/** Piloto + papel, com o cliente do próprio usuário (RLS). */
async function campaignAccess(
	userClient: SupabaseClient,
	userId: string,
	campaignId: string,
): Promise<{ pilot: boolean; role: CampaignRole | null }> {
	const { data: pilotRow, error: pilotError } = await userClient
		.from(LIBRARY_PILOT_TABLE)
		.select("campaign_id")
		.eq("campaign_id", campaignId)
		.maybeSingle();
	const pilot = !pilotError && pilotRow?.campaign_id === campaignId;
	if (!pilot) return { pilot: false, role: null };

	const { data: roleData } = await userClient.rpc("user_campaign_role", {
		p_campaign_id: campaignId,
	});
	let role = normalizeRole(roleData);
	if (!role) {
		const { data: owned } = await userClient
			.from("campaigns")
			.select("id")
			.eq("id", campaignId)
			.eq("owner_id", userId)
			.maybeSingle();
		if (owned) role = "owner";
	}
	return { pilot, role };
}

function toLibraryFileRow(data: unknown): LibraryFileRow | null {
	if (!data || typeof data !== "object") return null;
	const row = data as Record<string, unknown>;
	if (typeof row.id !== "string" || typeof row.campaign_id !== "string") {
		return null;
	}
	const thumbStatus =
		row.thumb_status === "ready" || row.thumb_status === "failed"
			? row.thumb_status
			: "pending";
	return {
		id: row.id,
		campaign_id: row.campaign_id,
		r2_key: typeof row.r2_key === "string" ? row.r2_key : "",
		size_bytes:
			typeof row.size_bytes === "number"
				? row.size_bytes
				: Number(row.size_bytes ?? 0),
		status: row.status === "ready" ? "ready" : "pending",
		created_at: typeof row.created_at === "string" ? row.created_at : "",
		thumb_status: thumbStatus,
		thumb_path: typeof row.thumb_path === "string" ? row.thumb_path : null,
		thumb_updated_at:
			typeof row.thumb_updated_at === "string" ? row.thumb_updated_at : null,
	};
}

function rowsFrom(data: unknown): LibraryFileRow[] {
	if (!Array.isArray(data)) return [];
	const rows: LibraryFileRow[] = [];
	for (const item of data) {
		const row = toLibraryFileRow(item);
		if (row) rows.push(row);
	}
	return rows;
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders(req) });
	}
	if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
		const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
		const authHeader = req.headers.get("Authorization") ?? "";

		const userClient = createClient(supabaseUrl, anonKey, {
			global: { headers: { Authorization: authHeader } },
			auth: { persistSession: false },
		});

		let resolved: { id: string } | null | undefined;
		const getUser = async (): Promise<{ id: string } | null> => {
			if (resolved !== undefined) return resolved;
			const {
				data: { user },
				error: authError,
			} = await userClient.auth.getUser();
			resolved = authError || !user ? null : { id: user.id };
			return resolved;
		};

		// JWT antes de ler o corpo e antes de qualquer efeito no banco ou no R2.
		const user = await getUser();
		if (!user) return json(req, { error: "Unauthorized" }, 401);

		let admin: SupabaseClient | null = null;
		const adminClient = (): SupabaseClient => {
			const client =
				admin ??
				createClient(supabaseUrl, serviceKey, {
					auth: { persistSession: false },
				});
			admin = client;
			return client;
		};

		let storage: { s3: S3Client; bucket: string } | null = null;
		const bucketOf = (): { s3: S3Client; bucket: string } => {
			const current = storage ?? r2();
			storage = current;
			return current;
		};

		const deps: LibraryHandlerDeps = {
			getUser,
			campaignAccess: (userId, campaignId) =>
				campaignAccess(userClient, userId, campaignId),
			getFile: async (fileId) => {
				const { data, error } = await adminClient()
					.from(LIBRARY_FILES_TABLE)
					.select(FILE_COLUMNS)
					.eq("id", fileId)
					.maybeSingle();
				if (error) throw new Error(error.message);
				return toLibraryFileRow(data);
			},
			listFilesByIds: async (fileIds) => {
				const { data, error } = await adminClient()
					.from(LIBRARY_FILES_TABLE)
					.select(FILE_COLUMNS)
					.in("id", fileIds);
				if (error) throw new Error(error.message);
				return rowsFrom(data);
			},
			insertFile: async (row) => {
				const { error } = await adminClient().from(LIBRARY_FILES_TABLE).insert(row);
				if (error) throw new Error(error.message);
			},
			updateFile: async (id, patch, match) => {
				let query = adminClient()
					.from(LIBRARY_FILES_TABLE)
					.update(patch)
					.eq("id", id);
				for (const [column, value] of Object.entries(match)) {
					query = query.eq(column, value);
				}
				const { data, error } = await query.select("id");
				if (error) throw new Error(error.message);
				return Array.isArray(data) ? data.length : 0;
			},
			deleteFileRow: async (id) => {
				const { error } = await adminClient()
					.from(LIBRARY_FILES_TABLE)
					.delete()
					.eq("id", id);
				if (error) throw new Error(error.message);
			},
			listStalePending: async (campaignId, cutoffIso) => {
				const { data } = await adminClient()
					.from(LIBRARY_FILES_TABLE)
					.select("id, campaign_id, r2_key, created_at")
					.eq("campaign_id", campaignId)
					.eq("status", "pending")
					.lt("created_at", cutoffIso)
					.limit(50);
				return rowsFrom(data).map((row) => ({
					id: row.id,
					campaign_id: row.campaign_id,
					r2_key: row.r2_key,
					created_at: row.created_at,
				}));
			},
			headObject: async (key) => {
				const { s3, bucket } = bucketOf();
				const head = await s3.send(
					new HeadObjectCommand({ Bucket: bucket, Key: key }),
				);
				return {
					contentLength: head.ContentLength,
					contentType: head.ContentType,
				};
			},
			readObjectRange: async (key, range) => {
				const { s3, bucket } = bucketOf();
				const got = await s3.send(
					new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }),
				);
				if (!got.Body) return new Uint8Array();
				return await got.Body.transformToByteArray();
			},
			copyObject: async (sourceKey, destKey, contentType) => {
				const { s3, bucket } = bucketOf();
				await s3.send(
					new CopyObjectCommand({
						Bucket: bucket,
						Key: destKey,
						CopySource: `${bucket}/${sourceKey}`,
						ContentType: contentType,
						MetadataDirective: "REPLACE",
					}),
				);
			},
			deleteObject: async (key) => {
				const { s3, bucket } = bucketOf();
				await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
			},
			signPut: async (input) => {
				const { s3, bucket } = bucketOf();
				return await getSignedUrl(
					s3,
					new PutObjectCommand({
						Bucket: bucket,
						Key: input.key,
						ContentType: input.contentType,
						ContentLength: input.contentLength,
					}),
					{
						expiresIn: input.expiresIn,
						signableHeaders: new Set(["content-type", "content-length"]),
					},
				);
			},
			signGet: async (input) => {
				const { s3, bucket } = bucketOf();
				return await getSignedUrl(
					s3,
					new GetObjectCommand({
						Bucket: bucket,
						Key: input.key,
						ResponseContentType: input.responseContentType,
						ResponseContentDisposition: input.responseContentDisposition,
					}),
					{ expiresIn: input.expiresIn },
				);
			},
			now: () => new Date(),
			randomUUID: () => crypto.randomUUID(),
			testMode,
		};

		const body = await req.json().catch(() => null);
		const result = await handleLibraryRequest(deps, body);
		return json(req, result.body, result.status);
	} catch (error) {
		console.error("library-r2", String(error));
		return json(req, { error: "Falha na Biblioteca." }, 500);
	}
});
