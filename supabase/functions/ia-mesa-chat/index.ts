// Assistente da mesa (piloto) — Edge Function.
//
// Segurança (trava do Chefe):
// 1. Valida o JWT do usuário (verify_jwt + auth.getUser).
// 2. Valida que o campaign_id está na allowlist do piloto (tabela
//    `ia_mesa_pilot_campaigns`, lida com o cliente do usuário).
// 3. Valida que o usuário é mestre/editor da campaign_id pedida (RLS do próprio
//    usuário; nunca service role).
// 4. Só então chama o modelo, com system prompt fixo e ferramentas
//    allowlisted: `propose_npc`, `read_character` (leitura das fichas DESTA
//    campanha, com o cliente do usuário/RLS) e `propose_character_patch`.
//    Sem código, SQL, segredos, env ou outras campanhas.
// 5. NÃO grava nada no banco. Devolve a proposta (NPC novo ou patch de ficha
//    existente); o cliente só salva depois de Confirmar → Aplicar.
//
// Segredos esperados (Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY   (obrigatório; sem ele a função responde code=missing_key)
//   GEMINI_MODEL     (opcional; padrão gemini-3.5-flash-lite)

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
import {
	type CharacterRow,
	READ_CHARACTER_TOOL,
	rowItemIds,
	rowName,
	summarizeCharacter,
	toRoster,
} from "../_shared/ia-mesa-character.ts";

/** Máximo de idas ao modelo (leitura de ficha → proposta). */
const MAX_MODEL_ROUNDS = 3;

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
		const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";

		// Fichas da campanha atual, lidas com o cliente do usuário (RLS). Só
		// esta campanha; nunca service role.
		const { data: characterRows } = await userClient
			.from("characters")
			.select("id, name, system, data")
			.eq("campaign_id", campaignId)
			.order("name", { ascending: true })
			.limit(40);
		const rows: CharacterRow[] = Array.isArray(characterRows)
			? (characterRows as CharacterRow[])
			: [];
		const roster = toRoster(rows);
		const scope = {
			characters: rows.map((row) => ({
				id: row.id,
				name: rowName(row),
				itemIds: rowItemIds(row),
			})),
		};

		const history = cleanHistory(body?.history);
		const contents: Array<Record<string, unknown>> = [
			...history.map((item) => ({
				role: item.role === "assistant" ? "model" : "user",
				parts: [{ text: item.text }],
			})),
			{ role: "user", parts: [{ text: message }] },
		];
		const systemText = buildSystemPrompt(
			{
				name: String(campaign.name ?? "Campanha"),
				system: String(campaign.system ?? ""),
			},
			roster,
		);

		let reply = "";
		let proposal = null;
		let proposalRejected = false;
		for (let round = 0; round < MAX_MODEL_ROUNDS; round++) {
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-goog-api-key": apiKey,
					},
					body: JSON.stringify({
						systemInstruction: { parts: [{ text: systemText }] },
						contents,
						tools: [{ functionDeclarations: IA_MESA_TOOL_DECLARATIONS }],
						// allowedFunctionNames só é aceito com mode ANY/VALIDATED (doc da
						// Gemini API). Em AUTO a API responde 400. As ferramentas
						// declaradas já são só as da allowlist.
						toolConfig: { functionCallingConfig: { mode: "AUTO" } },
						generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
					}),
				},
			);

			if (!response.ok) {
				// Loga o corpo do erro da Gemini (sem a chave) para diagnóstico.
				const errorBody = await response.text().catch(() => "");
				console.error(
					"ia-mesa-chat: model error",
					response.status,
					`model=${model}`,
					errorBody.slice(0, 2000),
				);
				const code =
					response.status === 401 || response.status === 403
						? "invalid_key"
						: response.status === 429
							? "rate_limited"
							: "model_error";
				return json({ ok: false, code }, 200);
			}

			const payload = await response.json();
			const modelContent = payload?.candidates?.[0]?.content;
			const parts: Array<Record<string, unknown>> = modelContent?.parts ?? [];
			const readResponses: Array<Record<string, unknown>> = [];
			let calledProposalTool = false;
			for (const part of parts) {
				if (typeof part.text === "string" && !part.thought)
					reply += part.text;
				const call = part.functionCall as
					| { name?: unknown; args?: unknown }
					| undefined;
				if (!call) continue;
				if (call.name === READ_CHARACTER_TOOL) {
					const id = (call.args as { characterId?: unknown } | undefined)
						?.characterId;
					const row = rows.find((r) => r.id === id);
					readResponses.push({
						functionResponse: {
							name: READ_CHARACTER_TOOL,
							response: row
								? { character: summarizeCharacter(row) }
								: { error: "Personagem não encontrado nesta campanha." },
						},
					});
					continue;
				}
				calledProposalTool = true;
				if (!proposal) {
					proposal = parseToolCall(call.name, call.args, scope);
					if (!proposal) proposalRejected = true;
				}
			}

			if (proposal || calledProposalTool || readResponses.length === 0) break;
			// Devolve a leitura ao modelo (mantém as partes originais, inclusive
			// assinaturas de raciocínio) e pede a próxima etapa.
			contents.push({ role: "model", parts });
			contents.push({ role: "user", parts: readResponses });
		}

		reply = cleanUserMessage(reply);
		if (!proposal && proposalRejected) reply = "";
		if (!reply) {
			reply = proposal
				? "Pronto, montei uma proposta. Revise e confirme para salvar."
				: proposalRejected
					? "Não consegui montar uma alteração válida para essa ficha. Nada foi alterado."
					: "Não consegui montar uma proposta. Diga qual personagem e o que mudar, ou descreva o NPC que você quer criar.";
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
