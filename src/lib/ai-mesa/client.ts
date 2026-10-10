import {
	type IaMesaPilotLookupClient,
	isIaMesaPilotCampaign,
} from "../../../supabase/functions/_shared/ia-mesa-guard";
import { getSupabase } from "../supabase";
import {
	IA_MESA_REFUSAL,
	type IaMesaHistoryItem,
	type IaMesaResult,
	isBlockedRequest,
	normalizeResponse,
} from "./proposal";

/**
 * A campanha está na allowlist do piloto (`ia_mesa_pilot_campaigns`)?
 * Sem Supabase ou com erro = não liberado (o botão não aparece).
 */
export async function fetchMesaPilotEnabled(
	campaignId: string,
): Promise<boolean> {
	const client = getSupabase();
	if (!client) return false;
	return isIaMesaPilotCampaign(
		client as unknown as IaMesaPilotLookupClient,
		campaignId,
	);
}

/** Chama a Edge Function `ia-mesa-chat`. Nunca lança: devolve erro tipado. */
export async function askMesaAssistant(input: {
	campaignId: string;
	message: string;
	history: IaMesaHistoryItem[];
}): Promise<IaMesaResult> {
	if (isBlockedRequest(input.message)) {
		return { ok: true, reply: IA_MESA_REFUSAL, proposal: null };
	}
	const client = getSupabase();
	if (!client) return { ok: false, code: "offline" };
	try {
		const { data, error } = await client.functions.invoke("ia-mesa-chat", {
			body: input,
		});
		if (error) {
			const status = (error as { context?: { status?: number } }).context
				?.status;
			if (status === 401) return { ok: false, code: "unauthorized" };
			if (status === 403) {
				const code =
					data &&
					typeof data === "object" &&
					(data as { code?: unknown }).code === "not_allowed"
						? "not_allowed"
						: "forbidden";
				return { ok: false, code };
			}
			if (status === 404) return { ok: false, code: "not_deployed" };
			return { ok: false, code: "model_error" };
		}
		return normalizeResponse(data);
	} catch {
		return { ok: false, code: "offline" };
	}
}
