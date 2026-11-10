/**
 * r2-delete — apaga uma imagem do R2 e devolve o espaço à cota do dono.
 *
 * POST JSON { key } com a chave que o r2-upload devolveu.
 * - Quem pode: o dono da pasta, ou mestre/co-mestre de uma campanha dele
 *   (RLS do usuário; nenhum papel vem do cliente).
 * - O tamanho vem do próprio R2 (HeadObject), nunca do cliente.
 * - Repetir é seguro: arquivo que já não existe não mexe na cota.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
	DeleteObjectCommand,
	HeadObjectCommand,
	S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.540.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import {
	canDeleteImage,
	parseDeleteRequest,
	storageUsedAfterDelete,
} from "../_shared/image-upload.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

function isNotFound(error: unknown): boolean {
	const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
	return (
		e?.name === "NotFound" ||
		e?.name === "NoSuchKey" ||
		e?.$metadata?.httpStatusCode === 404
	);
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}
	if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const userClient = createClient(
			supabaseUrl,
			Deno.env.get("SUPABASE_ANON_KEY") ?? "",
			{
				global: {
					headers: { Authorization: req.headers.get("Authorization") ?? "" },
				},
				auth: { persistSession: false },
			},
		);
		const {
			data: { user },
			error: authError,
		} = await userClient.auth.getUser();
		if (authError || !user) return json({ error: "Unauthorized" }, 401);

		const request = parseDeleteRequest(await req.json().catch(() => null));
		if (!request) return json({ error: "Missing or invalid key" }, 400);

		let isStaffOfOwner = false;
		if (request.ownerId !== user.id.toLowerCase()) {
			const { data: campaigns } = await userClient
				.from("campaigns")
				.select("id")
				.eq("owner_id", request.ownerId);
			const ids = (campaigns ?? []).map((campaign) => campaign.id);
			if (ids.length > 0) {
				const { data: membership } = await userClient
					.from("memberships")
					.select("id")
					.eq("user_id", user.id)
					.in("campaign_id", ids)
					.in("role", ["owner", "editor"])
					.limit(1)
					.maybeSingle();
				isStaffOfOwner = Boolean(membership);
			}
		}
		if (
			!canDeleteImage({
				userId: user.id,
				ownerId: request.ownerId,
				isStaffOfOwner,
			})
		) {
			return json({ error: "Forbidden" }, 403);
		}

		const s3 = new S3Client({
			region: "auto",
			endpoint: Deno.env.get("R2_ENDPOINT"),
			credentials: {
				accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
				secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
			},
		});
		const Bucket = Deno.env.get("R2_BUCKET_NAME");

		let size = 0;
		try {
			const head = await s3.send(
				new HeadObjectCommand({ Bucket, Key: request.key }),
			);
			size = Number(head.ContentLength ?? 0);
		} catch (error) {
			// Já foi apagado antes: nada a fazer, a cota já foi acertada.
			if (isNotFound(error)) return json({ ok: true, deleted: false });
			throw error;
		}

		await s3.send(new DeleteObjectCommand({ Bucket, Key: request.key }));

		const admin = createClient(
			supabaseUrl,
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
		);
		const { data: plan } = await admin
			.from("user_plans")
			.select("storage_used_bytes")
			.eq("user_id", request.ownerId)
			.maybeSingle();
		if (plan) {
			await admin
				.from("user_plans")
				.update({
					storage_used_bytes: storageUsedAfterDelete(
						Number(plan.storage_used_bytes ?? 0),
						size,
					),
				})
				.eq("user_id", request.ownerId);
		}

		return json({ ok: true, deleted: true, freedBytes: size });
	} catch (error) {
		console.error(
			"r2-delete",
			error instanceof Error ? error.message : "erro",
		);
		return json({ error: "Falha ao apagar a imagem." }, 500);
	}
});
