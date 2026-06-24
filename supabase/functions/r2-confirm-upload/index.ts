import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
	HeadObjectCommand,
	S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.540.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * r2-confirm-upload
 *
 * Chamada pelo cliente após um upload via signed URL ser concluído com sucesso.
 * Verifica se o objeto realmente existe no R2 (HeadObject), obtém o tamanho
 * real do arquivo e só então incrementa a cota de armazenamento do usuário.
 *
 * Body esperado: { key: string }
 */
serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
		const authHeader = req.headers.get("Authorization") ?? "";

		// Autenticar o usuário
		const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
			global: { headers: { Authorization: authHeader } },
		});

		const {
			data: { user },
			error: authError,
		} = await supabaseUserClient.auth.getUser();

		if (authError || !user) {
			return jsonResponse({ error: "Unauthorized" }, 401);
		}

		const body = await req.json();
		const key = typeof body.key === "string" ? body.key.trim() : "";

		if (!key) {
			return jsonResponse({ error: "Missing 'key' in request body." }, 400);
		}

		// Verificar se a key pertence ao usuário (o prefixo da key é o userId)
		// A key é gerada no formato: {userId}/{folder?}/{timestamp}-{uuid}.{ext}
		const keyOwnerUserId = key.split("/")[0];
		if (!keyOwnerUserId) {
			return jsonResponse({ error: "Invalid key format." }, 400);
		}

		// Determinar o targetUserId (dono da campanha, que paga a cota)
		// Se a key começa com o ID do próprio usuário, ele é o dono.
		// Caso contrário, verificar se o usuário tem acesso à campanha do dono.
		let targetUserId = keyOwnerUserId;

		if (keyOwnerUserId !== user.id) {
			// Verificar se o usuário é membro de uma campanha cujo dono é keyOwnerUserId
			const { data: membership, error: memberError } = await supabaseUserClient
				.from("campaign_memberships")
				.select("campaign_id, campaigns!inner(owner_id)")
				.eq("user_id", user.id)
				.limit(1);

			if (memberError || !membership || membership.length === 0) {
				return jsonResponse(
					{ error: "You don't have permission to confirm this upload." },
					403,
				);
			}

			// targetUserId já é o keyOwnerUserId (dono da campanha)
			targetUserId = keyOwnerUserId;
		}

		// Verificar se o objeto realmente existe no R2
		const s3 = new S3Client({
			region: "auto",
			endpoint: Deno.env.get("R2_ENDPOINT"),
			credentials: {
				accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
				secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
			},
		});

		const bucketName = Deno.env.get("R2_BUCKET_NAME");

		let contentLength: number;
		try {
			const headResult = await s3.send(
				new HeadObjectCommand({
					Bucket: bucketName,
					Key: key,
				}),
			);
			contentLength = headResult.ContentLength ?? 0;
		} catch {
			return jsonResponse(
				{
					error:
						"Upload not found in storage. The file may not have been uploaded successfully.",
				},
				404,
			);
		}

		if (contentLength === 0) {
			return jsonResponse(
				{ error: "Uploaded file has zero bytes." },
				400,
			);
		}

		// Buscar plano e uso atual do dono da cota
		const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

		const { data: planData, error: planError } = await supabaseAdmin
			.from("user_plans")
			.select("plan, storage_used_bytes")
			.eq("user_id", targetUserId)
			.single();

		if (planError && planError.code !== "PGRST116") {
			throw planError;
		}

		const plan = planData?.plan || "free";
		const storageUsed = planData?.storage_used_bytes || 0;

		// Incrementar a cota com o tamanho real do objeto
		if (targetUserId !== user.id) {
			await supabaseAdmin.from("user_plans").upsert(
				{
					user_id: targetUserId,
					plan,
					storage_used_bytes: storageUsed + contentLength,
				},
				{ onConflict: "user_id" },
			);

			await supabaseAdmin.from("user_plans").upsert(
				{
					user_id: user.id,
					last_upload_time: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);
		} else {
			await supabaseAdmin.from("user_plans").upsert(
				{
					user_id: user.id,
					plan,
					storage_used_bytes: storageUsed + contentLength,
					last_upload_time: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);
		}

		return jsonResponse({ success: true, sizeBytes: contentLength });
	} catch (error) {
		console.error("Error confirming upload:", error);
		return jsonResponse(
			{ error: error instanceof Error ? error.message : String(error) },
			500,
		);
	}
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}
