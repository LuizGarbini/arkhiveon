import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.540.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limites (em bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const QUOTAS = {
	free: 100 * 1024 * 1024, // 100MB
	pro: 2 * 1024 * 1024 * 1024, // 2GB
};
const RATE_LIMIT_MS = 5000; // 5 segundos

serve(async (req) => {
	// 1. Handle CORS
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		// 2. Setup Supabase Client to verify user
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
		const authHeader = req.headers.get("Authorization")!;
		
		const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
			global: { headers: { Authorization: authHeader } },
		});

		const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

		if (authError || !user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// 3. Get file data from request
		const { fileName, contentType, fileSize, campaignId, folder } = await req.json();

		if (!fileName || !contentType || !fileSize) {
			return new Response(JSON.stringify({ error: "Missing fileName, contentType, or fileSize" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Validação 1: Tamanho máximo do arquivo
		if (fileSize > MAX_FILE_SIZE) {
			return new Response(JSON.stringify({ error: "File exceeds maximum allowed size of 5MB." }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		let targetUserId = user.id;

		// Se a imagem for de uma campanha, debitamos o espaço do dono da campanha
		if (campaignId) {
			const { data: campaign, error: campaignError } = await supabaseUserClient
				.from("campaigns")
				.select("owner_id")
				.eq("id", campaignId)
				.single();

			if (campaignError || !campaign) {
				return new Response(JSON.stringify({ error: "Campaign not found or you don't have access." }), {
					status: 403,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}
			targetUserId = campaign.owner_id;
		}

		// 4. Setup Admin Client para checar banco de dados contornando RLS
		const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

		// Busca o plano do usuário alvo (dono da campanha ou o próprio usuário)
		const { data: planData, error: planError } = await supabaseAdmin
			.from("user_plans")
			.select("plan, storage_used_bytes, last_upload_time")
			.eq("user_id", targetUserId)
			.single();

		if (planError && planError.code !== 'PGRST116') { // PGRST116 = no rows returned
			throw planError;
		}

		const plan = planData?.plan || "free";
		const storageUsed = planData?.storage_used_bytes || 0;
		const lastUpload = planData?.last_upload_time ? new Date(planData.last_upload_time).getTime() : 0;
		const now = Date.now();

		// Validação 2: Rate Limiting (Apenas para o próprio usuário que faz o upload)
		// Nós checamos o rate limit do usuário que está enviando, não do dono da campanha
		const { data: myPlanData } = await supabaseAdmin
			.from("user_plans")
			.select("last_upload_time")
			.eq("user_id", user.id)
			.single();
			
		const myLastUpload = myPlanData?.last_upload_time ? new Date(myPlanData.last_upload_time).getTime() : 0;
		if (now - myLastUpload < RATE_LIMIT_MS) {
			return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait 5 seconds before uploading again." }), {
				status: 429,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Validação 3: Cota do Plano do Dono
		const limit = QUOTAS[plan as keyof typeof QUOTAS] || QUOTAS.free;
		if (storageUsed + fileSize > limit) {
			return new Response(JSON.stringify({ error: `Storage quota exceeded for the campaign owner's ${plan} plan.` }), {
				status: 403,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// 5. Setup AWS S3 Client for Cloudflare R2
		const S3 = new S3Client({
			region: "auto",
			endpoint: Deno.env.get("R2_ENDPOINT"),
			credentials: {
				accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
				secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
			},
		});

		// 6. Generate secure key
		const fileExt = fileName.split(".").pop();
		// Guardamos na pasta do dono da campanha para facilitar a gestão de espaço se necessário futuramente
		const safeFolder = typeof folder === "string"
			? folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 32)
			: "";
		const folderPrefix = safeFolder ? `${safeFolder}/` : "";
		const finalKey = `${targetUserId}/${folderPrefix}${now}-${crypto.randomUUID()}.${fileExt}`;

		// 7. Generate Presigned URL
		const command = new PutObjectCommand({
			Bucket: Deno.env.get("R2_BUCKET_NAME"),
			Key: finalKey,
			ContentType: contentType,
		});

		const url = await getSignedUrl(S3, command, { expiresIn: 300 }); // 5 minutes

		// 8. Atualiza o banco de dados (Cota do dono e Rate Limiting do usuário)
		if (targetUserId !== user.id) {
			// Atualiza a cota do dono
			await supabaseAdmin
				.from("user_plans")
				.upsert({
					user_id: targetUserId,
					plan: plan,
					storage_used_bytes: storageUsed + fileSize,
				}, { onConflict: "user_id" });
			
			// Atualiza o rate limit do usuário enviando
			await supabaseAdmin
				.from("user_plans")
				.upsert({
					user_id: user.id,
					last_upload_time: new Date().toISOString()
				}, { onConflict: "user_id" });
		} else {
			// Atualiza ambos para o mesmo usuário
			await supabaseAdmin
				.from("user_plans")
				.upsert({
					user_id: user.id,
					plan: plan,
					storage_used_bytes: storageUsed + fileSize,
					last_upload_time: new Date().toISOString()
				}, { onConflict: "user_id" });
		}

		return new Response(JSON.stringify({ url, key: finalKey }), {
			status: 200,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});

	} catch (error) {
		console.error("Error generating presigned url:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}
});
