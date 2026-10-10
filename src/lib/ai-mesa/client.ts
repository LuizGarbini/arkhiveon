import { getSupabase } from "../supabase";
import {
	IA_MESA_REFUSAL,
	type IaMesaHistoryItem,
	type IaMesaResult,
	isBlockedRequest,
	isIaMesaPilotCampaign,
	normalizeResponse,
} from "./proposal";

/** Chama a Edge Function `ia-mesa-chat`. Nunca lança: devolve erro tipado. */
export async function askMesaAssistant(input: {
	campaignId: string;
	message: string;
	history: IaMesaHistoryItem[];
}): Promise<IaMesaResult> {
	if (!isIaMesaPilotCampaign(input.campaignId)) {
		return { ok: false, code: "not_allowed" };
	}
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
