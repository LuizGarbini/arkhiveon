import { afterEach, describe, expect, it, vi } from "vitest";
import { ANTHROPIC_MESSAGES_URL } from "../../../supabase/functions/ia-mesa-chat/logic";
import {
	callClaudeModel,
	createOnce,
	invokeDailyRefund,
} from "../../../supabase/functions/ia-mesa-chat/model-call";

const CAMPAIGN = "11111111-2222-4333-8444-555555555555";
const API_KEY = "sk-ant-test-secret";

afterEach(() => {
	vi.restoreAllMocks();
});

function silenceLogs() {
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.spyOn(console, "info").mockImplementation(() => undefined);
}

describe("ia-mesa-chat: estorno quando o modelo falha", () => {
	it("status não-2xx devolve a unidade uma vez e não ecoa a chave", async () => {
		silenceLogs();
		const onFailure = vi.fn(async () => undefined);
		const fetchImpl = vi.fn(
			async () => new Response("overloaded", { status: 529 }),
		);
		const result = await callClaudeModel({
			apiKey: API_KEY,
			request: { model: "claude-haiku-4-5" },
			onFailure,
			fetchImpl,
		});
		expect(result).toBeNull();
		expect(onFailure).toHaveBeenCalledTimes(1);
		expect(fetchImpl).toHaveBeenCalledWith(
			ANTHROPIC_MESSAGES_URL,
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({ "x-api-key": API_KEY }),
			}),
		);
		const logged = vi
			.mocked(console.error)
			.mock.calls.flat()
			.map((part) => String(part))
			.join(" ");
		expect(logged).not.toContain(API_KEY);
		expect(logged).not.toContain("x-api-key");
	});

	it("erro de rede devolve a unidade", async () => {
		silenceLogs();
		const onFailure = vi.fn(async () => undefined);
		const fetchImpl = vi.fn(async () => {
			throw new Error("network down");
		});
		const result = await callClaudeModel({
			apiKey: API_KEY,
			request: {},
			onFailure,
			fetchImpl,
		});
		expect(result).toBeNull();
		expect(onFailure).toHaveBeenCalledTimes(1);
	});

	it("timeout do AbortController devolve a unidade", async () => {
		silenceLogs();
		const onFailure = vi.fn(async () => undefined);
		const fetchImpl = vi.fn((_input: unknown, init?: RequestInit) => {
			return new Promise<Response>((_resolve, reject) => {
				const signal = init?.signal;
				if (!signal) {
					reject(new Error("missing signal"));
					return;
				}
				const abort = () => {
					const error = new Error("The operation was aborted");
					error.name = "AbortError";
					reject(error);
				};
				if (signal.aborted) abort();
				else signal.addEventListener("abort", abort, { once: true });
			});
		});
		const result = await callClaudeModel({
			apiKey: API_KEY,
			request: {},
			onFailure,
			fetchImpl: fetchImpl as typeof fetch,
			timeoutMs: 15,
		});
		expect(result).toBeNull();
		expect(onFailure).toHaveBeenCalledTimes(1);
	});

	it("resposta 2xx não estorna", async () => {
		silenceLogs();
		const onFailure = vi.fn(async () => undefined);
		const fetchImpl = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						content: [{ type: "text", text: "A cena está quieta." }],
						usage: {
							cache_read_input_tokens: 3,
							cache_creation_input_tokens: 4,
						},
					}),
					{ status: 200, headers: { "content-type": "application/json" } },
				),
		);
		const result = await callClaudeModel({
			apiKey: API_KEY,
			request: { model: "claude-haiku-4-5" },
			onFailure,
			fetchImpl,
		});
		expect(onFailure).not.toHaveBeenCalled();
		expect(result?.content).toEqual([
			{ type: "text", text: "A cena está quieta." },
		]);
		expect(result?.usage).toEqual({
			cache_read_input_tokens: 3,
			cache_creation_input_tokens: 4,
		});
	});

	it("duas falhas no mesmo pedido chamam o estorno uma vez", async () => {
		silenceLogs();
		const rpc = vi.fn(async () => ({ error: null }));
		const refundOnce = createOnce(() => invokeDailyRefund({ rpc }, CAMPAIGN));
		const fetchImpl = vi.fn(async () => new Response("no", { status: 500 }));
		const first = await callClaudeModel({
			apiKey: API_KEY,
			request: {},
			onFailure: refundOnce,
			fetchImpl,
		});
		const second = await callClaudeModel({
			apiKey: API_KEY,
			request: {},
			onFailure: refundOnce,
			fetchImpl,
		});
		expect(first).toBeNull();
		expect(second).toBeNull();
		expect(rpc).toHaveBeenCalledTimes(1);
		expect(rpc).toHaveBeenCalledWith("ia_mesa_refund_daily_request", {
			p_campaign_id: CAMPAIGN,
		});
	});

	it("sucesso seguido de falha estorna só a falha", async () => {
		silenceLogs();
		const rpc = vi.fn(async () => ({ error: null }));
		const refundOnce = createOnce(() => invokeDailyRefund({ rpc }, CAMPAIGN));
		const ok = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						content: [],
						usage: {
							cache_read_input_tokens: 0,
							cache_creation_input_tokens: 0,
						},
					}),
					{ status: 200 },
				),
		);
		await callClaudeModel({
			apiKey: API_KEY,
			request: {},
			onFailure: refundOnce,
			fetchImpl: ok,
		});
		expect(rpc).not.toHaveBeenCalled();
		await callClaudeModel({
			apiKey: API_KEY,
			request: {},
			onFailure: refundOnce,
			fetchImpl: vi.fn(async () => new Response("no", { status: 502 })),
		});
		expect(rpc).toHaveBeenCalledTimes(1);
	});
});
