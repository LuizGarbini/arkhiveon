// Assistente da mesa (piloto) — Edge Function. Só Claude (Anthropic Messages).
//
// 1. Valida o JWT com auth.getUser antes de qualquer chamada de modelo.
// 2. Campanha na allowlist `ia_mesa_pilot_campaigns`; senão 403 not_allowed.
// 3. Mestre/editor da campanha (RLS do usuário).
// 4. ANTHROPIC_API_KEY só via Deno.env; ausente → 503 unavailable.
// 5. Limite diário atômico (service role chama a função; o cliente não).
// 6. Modelo no servidor: Haiku, ou Sonnet só para edição de ficha.
// Não grava a proposta. Não loga chave, header nem corpo da Anthropic.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import {
	type CharacterRow,
	rowItemIds,
	rowName,
	summarizeCharacter,
} from "../_shared/ia-mesa-character.ts";
import {
	cleanClientContext,
	isIaMesaPilotCampaign,
} from "../_shared/ia-mesa-guard.ts";
import {
	canEditCampaignSheet,
	snapshotFromCharacterRow,
} from "../_shared/ia-mesa-sheet-batch.ts";
import {
	loadIaMesaCharacter,
	loadIaMesaContext,
	mesaDbFromClient,
} from "./context.ts";
import { handleIaMesaTurn, resolveDailyLimit } from "./logic.ts";
import {
	callClaudeModel,
	createOnce,
	invokeDailyRefund,
} from "./model-call.ts";

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
			auth: { persistSession: false, autoRefreshToken: false },
		});

		const {
			data: { user },
			error: authError,
		} = await userClient.auth.getUser();

		const body = await req.json().catch(() => null);
		const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
		const scope = {
			characters: [] as { id: string; name: string; itemIds: string[] }[],
		};
		const rowsById = new Map<string, CharacterRow>();
		let askerId: string | null = null;
		let contextRole: "gm" | "player" = "gm";
		let chargedCampaignId: string | null = null;
		const refundOnce = createOnce(async () => {
			if (!chargedCampaignId) return;
			await refundDaily(supabaseUrl, chargedCampaignId);
		});
		const campaignId =
			body && typeof body === "object" && typeof body.campaignId === "string"
				? body.campaignId
				: "";
		const db = mesaDbFromClient(userClient);

		const result = await handleIaMesaTurn(
			{
				user: authError || !user ? null : { id: user.id },
				campaignId: body?.campaignId,
				message: body?.message,
				images: body?.images,
				history: body?.history,
				clientModel: body?.model,
				now: new Date(),
				apiKey: apiKey || null,
				dailyLimit: resolveDailyLimit(Deno.env.get("IA_MESA_DAILY_LIMIT")),
				clientContext: cleanClientContext(body?.clientContext),
			},
			{
				isAllowed: (campaignId) =>
					isIaMesaPilotCampaign(userClient, campaignId),
				isStaff: async (campaignId, userId) => {
					const { data: campaign, error: campaignError } = await userClient
						.from("campaigns")
						.select("id, owner_id")
						.eq("id", campaignId)
						.maybeSingle();
					if (campaignError || !campaign) return false;
					if (campaign.owner_id === userId) return true;
					const { data: membership } = await userClient
						.from("memberships")
						.select("role")
						.eq("campaign_id", campaignId)
						.eq("user_id", userId)
						.maybeSingle();
					return membership?.role === "owner" || membership?.role === "editor";
				},
				consume: async (id, limit) => {
					const outcome = await consumeDaily(supabaseUrl, id, limit);
					if (outcome === "allowed") chargedCampaignId = id;
					return outcome;
				},
				loadContext: async () => {
					const loaded = await loadIaMesaContext(db, {
						campaignId,
						userId: user?.id ?? "",
						role: "gm",
						clientContext: cleanClientContext(body?.clientContext),
					});
					rowsById.clear();
					scope.characters = [];
					askerId = loaded.asker?.id ?? null;
					if (loaded.rosterRows && loaded.rosterRows.length > 0) {
						for (const r of loaded.rosterRows) {
							rowsById.set(r.id, r);
							scope.characters.push({
								id: r.id,
								name: rowName(r),
								itemIds: rowItemIds(r),
							});
						}
					} else if (loaded.asker) {
						rowsById.set(loaded.asker.id, loaded.asker);
						scope.characters.push({
							id: loaded.asker.id,
							name: rowName(loaded.asker),
							itemIds: rowItemIds(loaded.asker),
						});
					}
					contextRole = loaded.context.role;
					return loaded.context;
				},
				scope,
				lookupCharacter: async (id) => {
					if (contextRole === "player" && id !== askerId) {
						return { error: "Personagem não disponível." };
					}
					let row = rowsById.get(id);
					if (!row) {
						const loaded = await loadIaMesaCharacter(db, {
							campaignId,
							characterId: id,
						});
						if (loaded) {
							row = loaded;
							rowsById.set(row.id, row);
							scope.characters.push({
								id: row.id,
								name: rowName(row),
								itemIds: rowItemIds(row),
							});
						}
					}
					return row
						? { character: summarizeCharacter(row) }
						: { error: "Personagem não encontrado nesta campanha." };
				},
				canEditSheet: async (characterId) => {
					if (!user) return false;
					try {
						const { data: campaign, error: campaignError } = await userClient
							.from("campaigns")
							.select("owner_id")
							.eq("id", campaignId)
							.maybeSingle();
						if (campaignError || !campaign) return false;
						const { data: membership } = await userClient
							.from("memberships")
							.select("role")
							.eq("campaign_id", campaignId)
							.eq("user_id", user.id)
							.maybeSingle();
						const { data: character, error: characterError } = await userClient
							.from("characters")
							.select("user_id, created_by, campaign_id")
							.eq("id", characterId)
							.eq("campaign_id", campaignId)
							.maybeSingle();
						if (characterError) return false;
						return canEditCampaignSheet({
							userId: user.id,
							campaignId,
							campaignOwnerId:
								typeof campaign.owner_id === "string" ? campaign.owner_id : null,
							membershipRole:
								typeof membership?.role === "string" ? membership.role : null,
							character: character
								? {
										campaignId:
											typeof character.campaign_id === "string"
												? character.campaign_id
												: "",
										userId:
											typeof character.user_id === "string"
												? character.user_id
												: null,
										createdBy:
											typeof character.created_by === "string"
												? character.created_by
												: null,
									}
								: null,
						});
					} catch {
						return false;
					}
				},
				loadSheet: async (characterId) => {
					const row = await loadIaMesaCharacter(db, {
						campaignId,
						characterId,
					});
					return row ? snapshotFromCharacterRow(row) : null;
				},
				callModel: (request, options) =>
					callClaudeModel({
						apiKey,
						request,
						onFailure: refundOnce,
						timeoutMs: options?.timeoutMs,
					}),
			},
		);
		return json(result.body, result.status);
	} catch (error) {
		console.error(
			"ia-mesa-chat: unexpected",
			error instanceof Error ? error.name : "error",
		);
		return json({ ok: false, code: "model_error" }, 500);
	}
});

async function consumeDaily(
	supabaseUrl: string,
	campaignId: string,
	limit: number,
): Promise<"allowed" | "limited" | "error"> {
	const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
	if (!serviceKey) return "error";
	const admin = createClient(supabaseUrl, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
	const { data, error } = await admin.rpc("ia_mesa_consume_daily_request", {
		p_campaign_id: campaignId,
		p_limit: limit,
	});
	if (error) {
		console.error("ia-mesa-chat: daily usage failed");
		return "error";
	}
	return data === true ? "allowed" : "limited";
}

async function refundDaily(
	supabaseUrl: string,
	campaignId: string,
): Promise<void> {
	const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
	if (!serviceKey) {
		console.error("ia-mesa-chat: refund skipped");
		return;
	}
	try {
		const admin = createClient(supabaseUrl, serviceKey, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
		await invokeDailyRefund(admin, campaignId);
	} catch {
		console.error("ia-mesa-chat: refund failed");
	}
}

function json(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}
