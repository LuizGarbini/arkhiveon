/**
 * image-r2 — imagens privadas da galeria (R1 do plano R2).
 *
 * Ação (POST JSON):
 * - sign { assetIds: uuid[] (1..100) }
 *     → { images: [{ id, url, expiresAt }] } só para os assets que o usuário
 *       VÊ pelo RLS (`can_view_image_asset`) e que estão no bucket privado.
 *       Assets públicos não voltam (o cliente usa a `url` pública atual).
 *       Inexistente/negado/público: ausente da lista, sem distinção.
 *       URL GET assinada com data arredondada à hora: estável na janela,
 *       válida de 1 h a 2 h.
 *
 * Variáveis (secrets da função; nunca no cliente nem no repo):
 *   SUPABASE_URL, SUPABASE_ANON_KEY (padrão Supabase)
 *   R2_ENDPOINT (reuso da conta), IMAGES_PRIVATE_R2_BUCKET (= arkhiveon-private),
 *   IMAGES_PRIVATE_R2_ACCESS_KEY_ID, IMAGES_PRIVATE_R2_SECRET_ACCESS_KEY
 *
 * Não usa service role: o banco é lido com o JWT do usuário; as credenciais do
 * R2 só assinam depois que o RLS devolveu a linha. Não loga token, e-mail nem id.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
	GetObjectCommand,
	S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.540.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.540.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import {
	handleSign,
	IMAGE_ASSETS_TABLE,
	type SignableAssetRow,
} from "../_shared/image-guard.ts";

// CORS aberto: toda resposta útil exige Authorization (JWT) válido.
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...corsHeaders,
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

function privateBucket(): { s3: S3Client; bucket: string } {
	const bucket = Deno.env.get("IMAGES_PRIVATE_R2_BUCKET") ?? "";
	const endpoint = Deno.env.get("R2_ENDPOINT") ?? "";
	const accessKeyId = Deno.env.get("IMAGES_PRIVATE_R2_ACCESS_KEY_ID") ?? "";
	const secretAccessKey =
		Deno.env.get("IMAGES_PRIVATE_R2_SECRET_ACCESS_KEY") ?? "";
	if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
		throw new Error("Imagens privadas sem configuração de armazenamento.");
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

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}
	if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

	try {
		const userClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? "",
			{
				global: {
					headers: { Authorization: req.headers.get("Authorization") ?? "" },
				},
				auth: { persistSession: false },
			},
		);
		const body = await req.json().catch(() => null);

		let storage: { s3: S3Client; bucket: string } | null = null;
		const result = await handleSign(
			{
				getUserId: async () => {
					const { data, error } = await userClient.auth.getUser();
					return error || !data.user ? null : data.user.id;
				},
				loadVisibleAssets: async (ids) => {
					const { data, error } = await userClient
						.from(IMAGE_ASSETS_TABLE)
						.select("id, storage_bucket, storage_key")
						.in("id", ids);
					if (error) throw new Error("Falha ao ler imagens.");
					return (data ?? []) as SignableAssetRow[];
				},
				sign: async (key, signingDate, expiresIn) => {
					storage ??= privateBucket();
					return getSignedUrl(
						storage.s3,
						new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
						{ expiresIn, signingDate },
					);
				},
				now: () => Date.now(),
			},
			body,
		);
		return json(result.body, result.status);
	} catch (error) {
		console.error("image-r2", error instanceof Error ? error.message : "erro");
		return json({ error: "Falha nas imagens." }, 500);
	}
});
