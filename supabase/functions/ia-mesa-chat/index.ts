// Assistente da mesa (piloto) — Edge Function.
//
// Segurança (trava do Chefe):
// 1. Valida o JWT do usuário (verify_jwt + auth.getUser).
// 2. Valida que o campaign_id está na allowlist do piloto (tabela
//    `ia_mesa_pilot_campaigns`, lida com o cliente do usuário).
// 3. Valida que o usuário é mestre/editor da campaign_id pedida (RLS do próprio
//    usuário; nunca service role).
// 4. Só então chama o modelo, com system prompt fixo e UMA ferramenta
//    allowlisted (`propose_npc`). Sem código, SQL, segredos, env ou outras
//    campanhas.
// 5. NÃO grava nada no banco. Devolve a proposta; o cliente só salva depois de
//    Confirmar → Aplicar.
//
// Segredos esperados (Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY   (obrigatório; sem ele a função responde code=missing_key)
//   GEMINI_MODEL     (opcional; padrão gemini-2.5-flash)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import {
	buildSystemPrompt,
	cleanHistory,
	cleanUserMessage,
	IA_MESA_REFUSAL,
	IA_MESA_TOOL_DECLARATIONS,
	isBlockedRequest,
	isCampaignId,
	isIaMesaPilotCampaign,
	parseToolCall,
} from "../_shared/ia-mesa-guard.ts";

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
	if (req.method !== "POST") {
		return json({ ok: false, code: "bad_request" }, 405);
	}

	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
		const authHeader = req.headers.get("Authorization") ?? "";

		const userClient = createClient(supabaseUrl, supabaseAnonKey, {
			global: { headers: { Authorization: authHeader } },
		});

		const {
			data: { user },
			error: authError,
		} = await userClient.auth.getUser();
		if (authError || !user) {
			return json({ ok: false, code: "unauthorized" }, 401);
		}

		const body = await req.json().catch(() => null);
		const campaignId = body?.campaignId;
		const message = cleanUserMessage(body?.message);
		if (!isCampaignId(campaignId) || !message) {
			return json({ ok: false, code: "bad_request" }, 400);
		}

		// Piloto: só campanhas em `ia_mesa_pilot_campaigns`. Demais: 403.
		if (!(await isIaMesaPilotCampaign(userClient, campaignId))) {
			return json({ ok: false, code: "not_allowed" }, 403);
		}

		// Escopo: só a campanha pedida, e só se o usuário for mestre/editor dela.
		const { data: campaign, error: campaignError } = await userClient
			.from("campaigns")
			.select("id, name, system, owner_id")
			.eq("id", campaignId)
			.maybeSingle();
		if (campaignError || !campaign) {
			return json({ ok: false, code: "forbidden" }, 403);
		}
		let isStaff = campaign.owner_id === user.id;
		if (!isStaff) {
			const { data: membership } = await userClient
				.from("memberships")
				.select("role")
				.eq("campaign_id", campaignId)
				.eq("user_id", user.id)
				.maybeSingle();
			isStaff =
				membership?.role === "owner" || membership?.role === "editor";
		}
		if (!isStaff) {
			return json({ ok: false, code: "forbidden" }, 403);
		}

		if (isBlockedRequest(message)) {
			return json({ ok: true, reply: IA_MESA_REFUSAL, proposal: null });
		}

		const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
		if (!apiKey) {
			return json({ ok: false, code: "missing_key" }, 200);
		}
		const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

		const history = cleanHistory(body?.history);
		const contents = [
			...history.map((item) => ({
				role: item.role === "assistant" ? "model" : "user",
				parts: [{ text: item.text }],
			})),
			{ role: "user", parts: [{ text: message }] },
		];

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": apiKey,
				},
				body: JSON.stringify({
					systemInstruction: {
						parts: [
							{
								text: buildSystemPrompt({
									name: String(campaign.name ?? "Campanha"),
									system: String(campaign.system ?? ""),
								}),
							},
						],
					},
					contents,
					tools: [{ functionDeclarations: IA_MESA_TOOL_DECLARATIONS }],
					toolConfig: {
						functionCallingConfig: {
							mode: "AUTO",
							allowedFunctionNames: ["propose_npc"],
						},
					},
					generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
				}),
			},
		);

		if (!response.ok) {
			console.error("ia-mesa-chat: model error", response.status);
			const code =
				response.status === 401 || response.status === 403
					? "invalid_key"
					: response.status === 429
						? "rate_limited"
						: "model_error";
			return json({ ok: false, code }, 200);
		}

		const payload = await response.json();
		const parts: Array<Record<string, unknown>> =
			payload?.candidates?.[0]?.content?.parts ?? [];
		let reply = "";
		let proposal = null;
		for (const part of parts) {
			if (typeof part.text === "string") reply += part.text;
			const call = part.functionCall as
				| { name?: unknown; args?: unknown }
				| undefined;
			if (call && !proposal) proposal = parseToolCall(call.name, call.args);
		}
		reply = cleanUserMessage(reply);
		if (!reply) {
			reply = proposal
				? "Pronto, montei uma proposta. Revise e confirme para salvar."
				: "Não consegui montar uma proposta. Tente descrever o NPC que você quer criar.";
		}

		return json({ ok: true, reply, proposal });
	} catch (error) {
		console.error("ia-mesa-chat: unexpected", error);
		return json({ ok: false, code: "model_error" }, 500);
	}
});

function json(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}
