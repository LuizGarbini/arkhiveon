import { getSupabase } from "../supabase";
import {
	IA_MESA_REFUSAL,
	type IaMesaHistoryItem,
	type IaMesaResult,
	isBlockedRequest,
	normalizeResponse,
} from "./proposal";

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
			if (status === 403) return { ok: false, code: "forbidden" };
			if (status === 404) return { ok: false, code: "not_deployed" };
			return { ok: false, code: "model_error" };
		}
		return normalizeResponse(data);
	} catch {
		return { ok: false, code: "offline" };
	}
}
