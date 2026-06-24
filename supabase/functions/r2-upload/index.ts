import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
	PutObjectCommand,
	S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.540.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.540.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const QUOTAS = {
	free: 100 * 1024 * 1024,
	pro: 2 * 1024 * 1024 * 1024,
};
const RATE_LIMIT_MS = 5000;

interface UploadPayload {
	fileName: string;
	contentType: string;
	fileSize: number;
	campaignId?: string;
	folder?: string;
	fileBody?: Uint8Array;
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
		const authHeader = req.headers.get("Authorization") ?? "";

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

		const payload = await readUploadPayload(req);

		if (!payload.fileName || !payload.contentType || !payload.fileSize) {
			return jsonResponse(
				{ error: "Missing fileName, contentType, or fileSize" },
				400,
			);
		}

		if (payload.fileSize > MAX_FILE_SIZE) {
			return jsonResponse(
				{ error: "File exceeds maximum allowed size of 5MB." },
				400,
			);
		}

		let targetUserId = user.id;

		if (payload.campaignId) {
			const { data: campaign, error: campaignError } =
				await supabaseUserClient
					.from("campaigns")
					.select("owner_id")
					.eq("id", payload.campaignId)
					.single();

			if (campaignError || !campaign) {
				return jsonResponse(
					{ error: "Campaign not found or you don't have access." },
					403,
				);
			}
			targetUserId = campaign.owner_id;
		}

		const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

		const { data: planData, error: planError } = await supabaseAdmin
			.from("user_plans")
			.select("plan, storage_used_bytes, last_upload_time")
			.eq("user_id", targetUserId)
			.single();

		if (planError && planError.code !== "PGRST116") {
			throw planError;
		}

		const plan = planData?.plan || "free";
		const storageUsed = planData?.storage_used_bytes || 0;
		const now = Date.now();

		const { data: myPlanData } = await supabaseAdmin
			.from("user_plans")
			.select("last_upload_time")
			.eq("user_id", user.id)
			.single();

		const myLastUpload = myPlanData?.last_upload_time
			? new Date(myPlanData.last_upload_time).getTime()
			: 0;
		if (now - myLastUpload < RATE_LIMIT_MS) {
			return jsonResponse(
				{
					error:
						"Rate limit exceeded. Please wait 5 seconds before uploading again.",
				},
				429,
			);
		}

		const limit = QUOTAS[plan as keyof typeof QUOTAS] || QUOTAS.free;
		if (storageUsed + payload.fileSize > limit) {
			return jsonResponse(
				{
					error: `Storage quota exceeded for the campaign owner's ${plan} plan.`,
				},
				403,
			);
		}

		const s3 = new S3Client({
			region: "auto",
			endpoint: Deno.env.get("R2_ENDPOINT"),
			credentials: {
				accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
				secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
			},
		});

		const fileExt = extensionFromFileName(payload.fileName);
		const safeFolder = payload.folder
			? payload.folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 32)
			: "";
		const folderPrefix = safeFolder ? `${safeFolder}/` : "";
		const finalKey = `${targetUserId}/${folderPrefix}${now}-${crypto.randomUUID()}.${fileExt}`;

		if (payload.fileBody) {
			await s3.send(
				new PutObjectCommand({
					Bucket: Deno.env.get("R2_BUCKET_NAME"),
					Key: finalKey,
					ContentType: payload.contentType,
					Body: payload.fileBody,
				}),
			);

			await updateUsage({
				supabaseAdmin,
				targetUserId,
				userId: user.id,
				plan,
				storageUsed,
				fileSize: payload.fileSize,
			});

			return jsonResponse({ key: finalKey });
		}

		const command = new PutObjectCommand({
			Bucket: Deno.env.get("R2_BUCKET_NAME"),
			Key: finalKey,
			ContentType: payload.contentType,
		});
		const url = await getSignedUrl(s3, command, { expiresIn: 300 });

		// A cota será incrementada somente após o cliente confirmar o upload
		// bem-sucedido via a Edge Function r2-confirm-upload.
		return jsonResponse({ url, key: finalKey, fileSize: payload.fileSize });
	} catch (error) {
		console.error("Error uploading to R2:", error);
		return jsonResponse(
			{ error: error instanceof Error ? error.message : String(error) },
			500,
		);
	}
});

async function readUploadPayload(req: Request): Promise<UploadPayload> {
	const contentType = req.headers.get("Content-Type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		const formData = await req.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) {
			return { fileName: "", contentType: "", fileSize: 0 };
		}

		return {
			fileName: file.name,
			contentType: file.type || "application/octet-stream",
			fileSize: file.size,
			campaignId: optionalString(formData.get("campaignId")),
			folder: optionalString(formData.get("folder")),
			fileBody: new Uint8Array(await file.arrayBuffer()),
		};
	}

	const body = await req.json();
	return {
		fileName: String(body.fileName ?? ""),
		contentType: String(body.contentType ?? ""),
		fileSize: Number(body.fileSize ?? 0),
		campaignId: optionalString(body.campaignId),
		folder: optionalString(body.folder),
	};
}

async function updateUsage({
	supabaseAdmin,
	targetUserId,
	userId,
	plan,
	storageUsed,
	fileSize,
}: {
	supabaseAdmin: ReturnType<typeof createClient>;
	targetUserId: string;
	userId: string;
	plan: string;
	storageUsed: number;
	fileSize: number;
}) {
	if (targetUserId !== userId) {
		await supabaseAdmin.from("user_plans").upsert(
			{
				user_id: targetUserId,
				plan,
				storage_used_bytes: storageUsed + fileSize,
			},
			{ onConflict: "user_id" },
		);

		await supabaseAdmin.from("user_plans").upsert(
			{
				user_id: userId,
				last_upload_time: new Date().toISOString(),
			},
			{ onConflict: "user_id" },
		);
		return;
	}

	await supabaseAdmin.from("user_plans").upsert(
		{
			user_id: userId,
			plan,
			storage_used_bytes: storageUsed + fileSize,
			last_upload_time: new Date().toISOString(),
		},
		{ onConflict: "user_id" },
	);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

function optionalString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function extensionFromFileName(fileName: string): string {
	const rawExt = fileName.split(".").pop() || "webp";
	const safeExt = rawExt.replace(/[^a-z0-9]/gi, "").toLowerCase();
	return safeExt || "webp";
}
