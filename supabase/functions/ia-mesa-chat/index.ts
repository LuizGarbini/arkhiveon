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
import { isIaMesaPilotCampaign } from "../_shared/ia-mesa-guard.ts";
import {
	type CharacterRow,
	rowItemIds,
	rowName,
	summarizeCharacter,
} from "../_shared/ia-mesa-character.ts";
import {
	ANTHROPIC_MESSAGES_URL,
	ANTHROPIC_VERSION,
	describeCacheUsage,
	fogShapesFromPaths,
	handleIaMesaTurn,
	type MesaContextToken,
	openModelAbort,
	pickAskerCharacter,
	readCacheUsage,
	resolveDailyLimit,
} from "./logic.ts";

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

		const result = await handleIaMesaTurn(
			{
				user: authError || !user ? null : { id: user.id },
				campaignId: body?.campaignId,
				message: body?.message,
				history: body?.history,
				clientModel: body?.model,
				now: new Date(),
				apiKey: apiKey || null,
				dailyLimit: resolveDailyLimit(Deno.env.get("IA_MESA_DAILY_LIMIT")),
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
					return (
						membership?.role === "owner" || membership?.role === "editor"
					);
				},
				consume: (campaignId, limit) =>
					consumeDaily(supabaseUrl, campaignId, limit),
				loadContext: async () => {
					const userId = user?.id ?? "";
					const { data: characterRows } = await userClient
						.from("characters")
						.select("id, name, system, data, user_id, created_by")
						.eq("campaign_id", body?.campaignId)
						.limit(40);
					const rows = Array.isArray(characterRows) ? characterRows : [];
					rowsById.clear();
					scope.characters = [];
					for (const row of rows) {
						if (!row || typeof row !== "object" || typeof row.id !== "string") {
							continue;
						}
						const character = row as CharacterRow;
						rowsById.set(character.id, character);
						scope.characters.push({
							id: character.id,
							name: rowName(character),
							itemIds: rowItemIds(character),
						});
					}
					const asker = pickAskerCharacter(rows, userId);
					askerId =
						asker && typeof asker.id === "string" ? asker.id : null;
					const sheetText = askerId
						? JSON.stringify(summarizeCharacter(rowsById.get(askerId) as CharacterRow))
						: "";

					const { data: sceneRow } = await userClient
						.from("vtt_scenes")
						.select("id, name, fog_enabled")
						.eq("campaign_id", body?.campaignId)
						.eq("is_active", true)
						.maybeSingle();
					let sceneName = "Sem cena ativa";
					let fogEnabled = false;
					let tokens: MesaContextToken[] = [];
					let fog = fogShapesFromPaths([]);
					if (sceneRow && typeof sceneRow.id === "string") {
						sceneName =
							typeof sceneRow.name === "string" && sceneRow.name.trim()
								? sceneRow.name
								: sceneName;
						fogEnabled = sceneRow.fog_enabled === true;
						const { data: tokenRows } = await userClient
							.from("vtt_tokens")
							.select("name, layer, x, y, is_hidden, character_id")
							.eq("scene_id", sceneRow.id);
						tokens = mapTokens(tokenRows);
						const { data: fogRow } = await userClient
							.from("vtt_fog_states")
							.select("revealed_paths")
							.eq("scene_id", sceneRow.id)
							.maybeSingle();
						fog = fogShapesFromPaths(fogRow?.revealed_paths);
					}
					contextRole = "gm";
					return {
						role: contextRole,
						sheetText,
						sceneName,
						gmNotes: "",
						fogEnabled,
						tokens,
						fog,
					};
				},
				scope,
				lookupCharacter: async (id) => {
					if (contextRole === "player" && id !== askerId) {
						return { error: "Personagem não disponível." };
					}
					const row = rowsById.get(id);
					return row
						? { character: summarizeCharacter(row) }
						: { error: "Personagem não encontrado nesta campanha." };
				},
				callModel: (request) => callClaude(apiKey, request),
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

function mapTokens(value: unknown): MesaContextToken[] {
	if (!Array.isArray(value)) return [];
	const tokens: MesaContextToken[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const raw = item as Record<string, unknown>;
		const layer =
			raw.layer === "gm" || raw.layer === "map" || raw.layer === "token"
				? raw.layer
				: "token";
		tokens.push({
			name: typeof raw.name === "string" ? raw.name : "Token",
			layer,
			x: typeof raw.x === "number" ? raw.x : 0,
			y: typeof raw.y === "number" ? raw.y : 0,
			hidden: raw.is_hidden === true,
			characterId: typeof raw.character_id === "string" ? raw.character_id : null,
		});
	}
	return tokens;
}

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

async function callClaude(
	apiKey: string,
	request: unknown,
): Promise<{
	content: unknown;
	usage: {
		cache_read_input_tokens: number;
		cache_creation_input_tokens: number;
	};
} | null> {
	const abort = openModelAbort();
	try {
		const response = await fetch(ANTHROPIC_MESSAGES_URL, {
			method: "POST",
			signal: abort.signal,
			headers: {
				"content-type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": ANTHROPIC_VERSION,
			},
			body: JSON.stringify(request),
		});
		if (!response.ok) {
			await response.body?.cancel().catch(() => undefined);
			console.error("ia-mesa-chat: model error", response.status);
			return null;
		}
		const payload: unknown = await response.json();
		const usage = readCacheUsage(payload);
		console.info("ia-mesa-chat: usage", describeCacheUsage(usage));
		const content =
			payload && typeof payload === "object"
				? (payload as { content?: unknown }).content
				: [];
		return { content, usage };
	} catch (error) {
		console.error(
			"ia-mesa-chat: model error",
			error instanceof Error ? error.name : "error",
		);
		return null;
	} finally {
		abort.cancel();
	}
}

function json(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}
