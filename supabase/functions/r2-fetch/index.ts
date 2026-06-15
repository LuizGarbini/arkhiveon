import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GetObjectCommand, S3Client } from "https://esm.sh/@aws-sdk/client-s3@3.540.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
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

		const body = await req.json();
		const key = sanitizeKey(String(body.key ?? ""));

		if (!key) {
			return jsonResponse({ error: "Missing or invalid key" }, 400);
		}

		const ownerId = key.split("/")[0];
		if (ownerId !== user.id) {
			const { data: ownedCampaigns, error: campaignsError } =
				await supabaseUserClient
					.from("campaigns")
					.select("id")
					.eq("owner_id", ownerId);

			if (campaignsError || !ownedCampaigns?.length) {
				return jsonResponse({ error: "Forbidden" }, 403);
			}

			const campaignIds = ownedCampaigns.map((campaign) => campaign.id);
			const { data: membership, error: membershipError } =
				await supabaseUserClient
					.from("memberships")
					.select("id")
					.eq("user_id", user.id)
					.in("campaign_id", campaignIds)
					.limit(1)
					.maybeSingle();

			if (membershipError || !membership) {
				return jsonResponse({ error: "Forbidden" }, 403);
			}
		}

		const s3 = new S3Client({
			region: "auto",
			endpoint: Deno.env.get("R2_ENDPOINT"),
			credentials: {
				accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") ?? "",
				secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "",
			},
		});

		const object = await s3.send(
			new GetObjectCommand({
				Bucket: Deno.env.get("R2_BUCKET_NAME"),
				Key: key,
			}),
		);

		if (!object.Body) {
			return jsonResponse({ error: "Image not found" }, 404);
		}

		const bytes = await object.Body.transformToByteArray();
		const contentType =
			typeof object.ContentType === "string"
				? object.ContentType
				: "application/octet-stream";

		return new Response(bytes, {
			status: 200,
			headers: {
				...corsHeaders,
				"Content-Type": contentType,
				"Cache-Control": "private, max-age=300",
			},
		});
	} catch (error) {
		console.error("Error fetching from R2:", error);
		return jsonResponse(
			{ error: error instanceof Error ? error.message : String(error) },
			500,
		);
	}
});

function sanitizeKey(rawKey: string): string {
	const key = rawKey.trim().replace(/^\/+/, "");
	if (!key || key.includes("..")) return "";
	if (!/^[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|gif)$/i.test(key)) return "";
	return key;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}
