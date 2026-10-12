/**
 * library-r2 — Biblioteca de PDFs da campanha (Fatia 1a).
 *
 * Emite links assinados curtos para um bucket R2 privado e separado das
 * imagens. Nunca devolve link público. Toda chamada valida JWT, piloto
 * (`campaign_library_pilot_campaigns`) e papel na campanha.
 *
 * Ações (POST JSON { action, ... }):
 * - request-upload  (owner/editor) { campaignId, title, size, contentType }
 *     → limpa pendentes > 1h da campanha, cria linha `pending`, devolve
 *       presigned PUT (10 min) com Content-Type e Content-Length assinados.
 * - confirm-upload  (owner/editor) { fileId }
 *     → HEAD + Range 0-4 (%PDF-) no R2; ok = `ready`; falha = apaga objeto+linha (422).
 * - request-read    (qualquer membro, só `ready`) { fileId, ttlSeconds? }
 *     → presigned GET (5 min). `ttlSeconds` menor só com LIBRARY_TEST_MODE=1.
 * - delete          (owner/editor) { fileId } → apaga objeto + linha.
 *
 * Variáveis (secrets da função; nunca no cliente):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (padrão Supabase)
 *   R2_ENDPOINT (reuso da conta), LIBRARY_R2_BUCKET, LIBRARY_R2_ACCESS_KEY_ID,
 *   LIBRARY_R2_SECRET_ACCESS_KEY, LIBRARY_ALLOWED_ORIGINS, LIBRARY_TEST_MODE (opcional)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
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
	buildLibraryKey,
	type CampaignRole,
	canManageLibrary,
	canReadLibrary,
	checkUploadedObject,
	isLibraryAction,
	isStalePending,
	isUuid,
	LIBRARY_FILES_TABLE,
	LIBRARY_PDF_MIME,
	LIBRARY_PENDING_MAX_AGE_MS,
	LIBRARY_PILOT_TABLE,
	LIBRARY_UPLOAD_TTL_SECONDS,
	normalizeRole,
	parseAllowedOrigins,
	resolveCorsOrigin,
	resolveReadTtl,
	validateUploadRequest,
} from "../_shared/library-guard.ts";

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

interface FileRow {
	id: string;
	campaign_id: string;
	r2_key: string;
	size_bytes: number;
	status: "pending" | "ready";
	created_at: string;
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

async function deleteFile(
	admin: SupabaseClient,
	s3: S3Client,
	bucket: string,
	row: Pick<FileRow, "id" | "r2_key">,
): Promise<void> {
	await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.r2_key }));
	await admin.from(LIBRARY_FILES_TABLE).delete().eq("id", row.id);
}

async function cleanupStalePending(
	admin: SupabaseClient,
	s3: S3Client,
	bucket: string,
	campaignId: string,
): Promise<number> {
	const cutoff = new Date(Date.now() - LIBRARY_PENDING_MAX_AGE_MS).toISOString();
	const { data } = await admin
		.from(LIBRARY_FILES_TABLE)
		.select("id, r2_key, created_at")
		.eq("campaign_id", campaignId)
		.eq("status", "pending")
		.lt("created_at", cutoff)
		.limit(50);
	let removed = 0;
	for (const row of (data ?? []) as Pick<FileRow, "id" | "r2_key" | "created_at">[]) {
		if (!isStalePending(row.created_at, Date.now())) continue;
		try {
			await deleteFile(admin, s3, bucket, row);
			removed++;
		} catch (error) {
			console.error("library-r2 cleanup", row.id, String(error));
		}
	}
	return removed;
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
		const {
			data: { user },
			error: authError,
		} = await userClient.auth.getUser();
		if (authError || !user) return json(req, { error: "Unauthorized" }, 401);

		const body = (await req.json().catch(() => null)) as Record<
			string,
			unknown
		> | null;
		if (!body || !isLibraryAction(body.action)) {
			return json(req, { error: "Ação inválida." }, 400);
		}

		const admin = createClient(supabaseUrl, serviceKey, {
			auth: { persistSession: false },
		});

		// Descobre a campanha: direto (upload) ou pela linha do arquivo.
		let campaignId: string;
		let row: FileRow | null = null;
		if (body.action === "request-upload") {
			if (!isUuid(body.campaignId)) return json(req, { error: "Campanha inválida." }, 400);
			campaignId = body.campaignId;
		} else {
			if (!isUuid(body.fileId)) return json(req, { error: "Arquivo inválido." }, 400);
			const { data } = await admin
				.from(LIBRARY_FILES_TABLE)
				.select("id, campaign_id, r2_key, size_bytes, status, created_at")
				.eq("id", body.fileId)
				.maybeSingle();
			// 403 (não 404) para não revelar existência a quem não é membro.
			if (!data) return json(req, { error: "Forbidden" }, 403);
			row = data as FileRow;
			campaignId = row.campaign_id;
		}

		const { pilot, role } = await campaignAccess(userClient, user.id, campaignId);
		if (!pilot) return json(req, { error: "Forbidden" }, 403);

		const needsManage = body.action !== "request-read";
		if (needsManage ? !canManageLibrary(role) : !canReadLibrary(role)) {
			return json(req, { error: "Forbidden" }, 403);
		}

		const { s3, bucket } = r2();

		switch (body.action) {
			case "request-upload": {
				const valid = validateUploadRequest({
					title: body.title,
					size: body.size,
					contentType: body.contentType,
				});
				if (!valid.ok) return json(req, { error: valid.error }, valid.status);

				await cleanupStalePending(admin, s3, bucket, campaignId);

				const fileId = crypto.randomUUID();
				const key = buildLibraryKey(campaignId, fileId);
				const { error: insertError } = await admin.from(LIBRARY_FILES_TABLE).insert({
					id: fileId,
					campaign_id: campaignId,
					r2_key: key,
					title: valid.title,
					size_bytes: valid.size,
					content_type: LIBRARY_PDF_MIME,
					status: "pending",
					uploaded_by: user.id,
				});
				if (insertError) throw new Error(insertError.message);

				const uploadUrl = await getSignedUrl(
					s3,
					new PutObjectCommand({
						Bucket: bucket,
						Key: key,
						ContentType: LIBRARY_PDF_MIME,
						ContentLength: valid.size,
					}),
					{
						expiresIn: LIBRARY_UPLOAD_TTL_SECONDS,
						signableHeaders: new Set(["content-type", "content-length"]),
					},
				);
				return json(req, {
					fileId,
					uploadUrl,
					expiresIn: LIBRARY_UPLOAD_TTL_SECONDS,
					headers: {
						"Content-Type": LIBRARY_PDF_MIME,
						"Content-Length": String(valid.size),
					},
				});
			}

			case "confirm-upload": {
				const file = row as FileRow;
				if (file.status === "ready") return json(req, { fileId: file.id, status: "ready" });
				let head: { contentLength?: number; contentType?: string };
				let first: Uint8Array = new Uint8Array();
				try {
					const headRes = await s3.send(
						new HeadObjectCommand({ Bucket: bucket, Key: file.r2_key }),
					);
					head = { contentLength: headRes.ContentLength, contentType: headRes.ContentType };
					const getRes = await s3.send(
						new GetObjectCommand({ Bucket: bucket, Key: file.r2_key, Range: "bytes=0-4" }),
					);
					if (getRes.Body) first = await getRes.Body.transformToByteArray();
				} catch {
					return json(req, { error: "Arquivo ainda não chegou no armazenamento." }, 409);
				}
				const check = checkUploadedObject(Number(file.size_bytes), head, first);
				if (!check.ok) {
					await deleteFile(admin, s3, bucket, file);
					return json(req, { error: check.error }, 422);
				}
				await admin
					.from(LIBRARY_FILES_TABLE)
					.update({ status: "ready", ready_at: new Date().toISOString() })
					.eq("id", file.id);
				return json(req, { fileId: file.id, status: "ready" });
			}

			case "request-read": {
				const file = row as FileRow;
				if (file.status !== "ready") return json(req, { error: "Forbidden" }, 403);
				const ttl = resolveReadTtl(body.ttlSeconds, testMode);
				const url = await getSignedUrl(
					s3,
					new GetObjectCommand({
						Bucket: bucket,
						Key: file.r2_key,
						ResponseContentType: LIBRARY_PDF_MIME,
						ResponseContentDisposition: "inline",
					}),
					{ expiresIn: ttl },
				);
				return json(req, { fileId: file.id, url, expiresIn: ttl });
			}

			case "delete": {
				await deleteFile(admin, s3, bucket, row as FileRow);
				return json(req, { fileId: (row as FileRow).id, deleted: true });
			}
		}
		return json(req, { error: "Ação inválida." }, 400);
	} catch (error) {
		console.error("library-r2", String(error));
		return json(req, { error: "Falha na Biblioteca." }, 500);
	}
});
