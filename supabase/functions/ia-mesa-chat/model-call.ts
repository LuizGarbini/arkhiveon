/**
 * Chamada ao Claude e estorno do limite diário.
 * A Edge Function liga a chave e o service role; esta unidade é testável.
 */

import {
	ANTHROPIC_MESSAGES_URL,
	ANTHROPIC_VERSION,
	type ClaudeModelResult,
	describeCacheUsage,
	IA_MESA_MODEL_TIMEOUT_MS,
	openModelAbort,
	readCacheUsage,
} from "./logic.ts";

type ModelFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface DailyRefundClient {
	rpc: (
		fn: "ia_mesa_refund_daily_request",
		args: { p_campaign_id: string },
	) => PromiseLike<{ error: { message?: string } | null }>;
}

/** Roda `task` no máximo uma vez, mesmo se o pedido falhar em mais de uma rodada. */
export function createOnce(task: () => Promise<void>): () => Promise<void> {
	let pending: Promise<void> | null = null;
	return () => {
		if (!pending) {
			pending = Promise.resolve()
				.then(task)
				.then(() => undefined)
				.catch(() => undefined);
		}
		return pending;
	};
}

export async function invokeDailyRefund(
	admin: DailyRefundClient,
	campaignId: string,
): Promise<void> {
	const { error } = await admin.rpc("ia_mesa_refund_daily_request", {
		p_campaign_id: campaignId,
	});
	if (error) console.error("ia-mesa-chat: refund failed");
}

/**
 * POST na Messages API. Status fora de 2xx, erro de rede ou abort
 * chamam `onFailure` (o estorno) e devolvem null.
 */
export async function callClaudeModel(input: {
	apiKey: string;
	request: unknown;
	onFailure: () => Promise<void>;
	fetchImpl?: ModelFetch;
	timeoutMs?: number;
}): Promise<ClaudeModelResult | null> {
	const abort = openModelAbort(input.timeoutMs ?? IA_MESA_MODEL_TIMEOUT_MS);
	const doFetch = input.fetchImpl ?? fetch;
	let failed = false;
	try {
		const response = await doFetch(ANTHROPIC_MESSAGES_URL, {
			method: "POST",
			signal: abort.signal,
			headers: {
				"content-type": "application/json",
				"x-api-key": input.apiKey,
				"anthropic-version": ANTHROPIC_VERSION,
			},
			body: JSON.stringify(input.request),
		});
		if (!response.ok) {
			await response.body?.cancel().catch(() => undefined);
			console.error("ia-mesa-chat: model error", response.status);
			failed = true;
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
		failed = true;
		return null;
	} finally {
		abort.cancel();
		if (failed) await input.onFailure();
	}
}
