import { describe, expect, it, vi } from "vitest";
import {
	buildClaudeRequest,
	buildMesaContext,
	type ClaudeRequestBody,
	describeCacheUsage,
	HAIKU_4_5_MIN_CACHE_TOKENS,
	handleIaMesaTurn,
	IA_MESA_MODEL_HAIKU,
	IA_MESA_MODEL_SONNET,
	type MesaContextInput,
	nextSaoPauloMidnightIso,
} from "../../../supabase/functions/ia-mesa-chat/logic";

function firstRequest(callModel: {
	mock: { calls: readonly (readonly unknown[])[] };
}): ClaudeRequestBody {
	const request = callModel.mock.calls[0]?.[0];
	if (!request || typeof request !== "object") {
		throw new Error("modelo não foi chamado");
	}
	return request as ClaudeRequestBody;
}

const CAMPAIGN = "11111111-2222-4333-8444-555555555555";

const scene: MesaContextInput = {
	role: "player",
	sheetText: "Ficha de Lia: PV 20.",
	sceneName: "Cripta",
	gmNotes: "portal secreto atrás do altar",
	fogEnabled: true,
	tokens: [
		{ name: "Aliado visível", layer: "token", x: 10, y: 10, hidden: false },
		{ name: "Espião do mestre", layer: "gm", x: 10, y: 10, hidden: false },
		{ name: "Goblin sob névoa", layer: "token", x: 400, y: 400, hidden: false },
		{ name: "Invisível", layer: "token", x: 12, y: 12, hidden: true },
	],
	fog: [{ type: "rect", mode: "reveal", x: 0, y: 0, width: 100, height: 100 }],
};

function deps(overrides: {
	user?: { id: string } | null;
	allowed?: boolean;
	staff?: boolean;
	apiKey?: string | null;
	consume?: "allowed" | "limited" | "error";
	now?: Date;
	callModel?: ReturnType<typeof vi.fn>;
}) {
	const callModel = overrides.callModel ?? vi.fn();
	const isAllowed = vi.fn(async () => overrides.allowed ?? true);
	const isStaff = vi.fn(async () => overrides.staff ?? true);
	const consume = vi.fn(async () => overrides.consume ?? "allowed");
	const loadContext = vi.fn(async () => scene);
	return {
		callModel,
		isAllowed,
		isStaff,
		consume,
		loadContext,
		input: {
			user: overrides.user === undefined ? { id: "user-1" } : overrides.user,
			campaignId: CAMPAIGN,
			message: "quem está na cena?",
			history: [],
			clientModel: IA_MESA_MODEL_SONNET,
			now: overrides.now ?? new Date("2026-06-15T15:30:00.000Z"),
			apiKey: overrides.apiKey === undefined ? "present" : overrides.apiKey,
			dailyLimit: 40,
		},
	};
}

describe("ia-mesa-chat: não chama o modelo", () => {
	it("JWT inválido responde 401 e não chama o modelo", async () => {
		const d = deps({ user: null });
		const result = await handleIaMesaTurn(d.input, d);
		expect(result).toEqual({
			status: 401,
			body: { ok: false, code: "unauthorized" },
		});
		expect(d.callModel).not.toHaveBeenCalled();
		expect(d.isAllowed).not.toHaveBeenCalled();
		expect(d.consume).not.toHaveBeenCalled();
		expect(d.loadContext).not.toHaveBeenCalled();
	});

	it("campanha fora da allowlist responde 403 not_allowed e não chama o modelo", async () => {
		const d = deps({ allowed: false });
		const result = await handleIaMesaTurn(d.input, d);
		expect(result).toEqual({
			status: 403,
			body: { ok: false, code: "not_allowed" },
		});
		expect(d.callModel).not.toHaveBeenCalled();
		expect(d.consume).not.toHaveBeenCalled();
		expect(d.loadContext).not.toHaveBeenCalled();
	});

	it("chave ausente responde 503 unavailable e não chama o modelo", async () => {
		const d = deps({ apiKey: null });
		const result = await handleIaMesaTurn(d.input, d);
		expect(result).toEqual({
			status: 503,
			body: { ok: false, code: "unavailable" },
		});
		expect(d.callModel).not.toHaveBeenCalled();
		expect(d.consume).not.toHaveBeenCalled();
		expect(d.loadContext).not.toHaveBeenCalled();
	});

	it("limite diário responde 429 com resets_at e não chama o modelo", async () => {
		const d = deps({
			consume: "limited",
			now: new Date("2026-06-15T15:30:00.000Z"),
		});
		const result = await handleIaMesaTurn(d.input, d);
		expect(result.status).toBe(429);
		expect(result.body).toEqual({
			ok: false,
			code: "daily_limit",
			resets_at: "2026-06-16T03:00:00.000Z",
		});
		expect(d.callModel).not.toHaveBeenCalled();
		expect(d.loadContext).not.toHaveBeenCalled();
	});
});

describe("ia-mesa-chat: modelo e cache", () => {
	it("Haiku é o padrão e o cliente não consegue forçar Sonnet", async () => {
		const callModel = vi.fn(async () => ({
			content: [{ type: "text", text: "A cena está quieta." }],
			usage: { cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
		}));
		const d = deps({ callModel });
		d.input.clientModel = "claude-sonnet-4-5";
		const result = await handleIaMesaTurn(d.input, d);
		expect(callModel).toHaveBeenCalledTimes(1);
		const request = firstRequest(callModel);
		expect(request.model).toBe("claude-haiku-4-5");
		expect(request.model).toBe(IA_MESA_MODEL_HAIKU);
		expect(request.max_tokens).toBe(1024);
		expect(result.body.reply).toBe("A cena está quieta.");
	});

	it("edição de ficha usa Sonnet", async () => {
		const callModel = vi.fn(async () => ({
			content: [{ type: "text", text: "Vou propor o patch." }],
			usage: { cache_read_input_tokens: 1, cache_creation_input_tokens: 2 },
		}));
		const d = deps({ callModel });
		d.input.message = "atualiza a ficha do Dante: PV 12";
		d.input.clientModel = "claude-haiku-4-5";
		await handleIaMesaTurn(d.input, d);
		const request = firstRequest(callModel);
		expect(request.model).toBe("claude-sonnet-4-5");
		expect(request.model).toBe(IA_MESA_MODEL_SONNET);
		expect(request.max_tokens).toBe(2048);
	});

	it("cache_control ephemeral fica no fim do prefixo fixo, não na cena nem na mensagem", () => {
		const body = buildClaudeRequest({
			model: IA_MESA_MODEL_HAIKU,
			maxTokens: 1024,
			contextText: "Ficha secreta da Lia e a cena da cripta",
			history: [],
			message: "quem está aqui?",
		});
		const system = body.system;
		expect(system.length).toBeGreaterThan(0);
		expect(system.at(-1)?.cache_control).toEqual({ type: "ephemeral" });
		expect(system.slice(0, -1).every((block) => !block.cache_control)).toBe(
			true,
		);
		expect(JSON.stringify(body.tools)).not.toContain("cache_control");
		expect(JSON.stringify(body.messages)).not.toContain("cache_control");
		const stable = system.map((block) => block.text).join("\n");
		expect(stable).not.toContain("Ficha secreta da Lia");
		expect(stable).not.toContain("quem está aqui?");
		expect(JSON.stringify(body.messages)).toContain("Ficha secreta da Lia");
		expect(body.max_tokens).toBe(1024);
		expect(HAIKU_4_5_MIN_CACHE_TOKENS).toBe(4096);
	});

	it("devolve usage de cache sem o texto da resposta", async () => {
		const callModel = vi.fn(async () => ({
			content: [{ type: "text", text: "segredo da resposta" }],
			usage: { cache_read_input_tokens: 12, cache_creation_input_tokens: 34 },
		}));
		const d = deps({ callModel });
		const result = await handleIaMesaTurn(d.input, d);
		expect(result.body.usage).toEqual({
			cache_read_input_tokens: 12,
			cache_creation_input_tokens: 34,
		});
		expect(describeCacheUsage(result.body.usage as never)).toBe(
			"cache_read_input_tokens=12 cache_creation_input_tokens=34",
		);
		expect(describeCacheUsage(result.body.usage as never)).not.toContain(
			"segredo",
		);
	});

	it("falha do modelo não ecoa chave nem headers", async () => {
		const callModel = vi.fn(async () => null);
		const d = deps({ callModel });
		const result = await handleIaMesaTurn(d.input, d);
		expect(result.status).toBe(502);
		expect(result.body).toEqual({ ok: false, code: "model_error" });
		expect(JSON.stringify(result.body)).not.toMatch(
			/sk-ant|x-api-key|ANTHROPIC/,
		);
	});
});

describe("ia-mesa-chat: resets_at em America/Sao_Paulo", () => {
	it("meio-dia em São Paulo renova na meia-noite seguinte", () => {
		expect(nextSaoPauloMidnightIso(new Date("2026-06-15T15:30:00.000Z"))).toBe(
			"2026-06-16T03:00:00.000Z",
		);
	});

	it("23:30 em São Paulo ainda renova na meia-noite que vem", () => {
		expect(nextSaoPauloMidnightIso(new Date("2026-06-16T02:30:00.000Z"))).toBe(
			"2026-06-16T03:00:00.000Z",
		);
	});

	it("exatamente meia-noite abre o dia e aponta a meia-noite seguinte", () => {
		expect(nextSaoPauloMidnightIso(new Date("2026-06-16T03:00:00.000Z"))).toBe(
			"2026-06-17T03:00:00.000Z",
		);
	});

	it("vira o ano no fuso de São Paulo", () => {
		expect(nextSaoPauloMidnightIso(new Date("2026-01-01T02:00:00.000Z"))).toBe(
			"2026-01-01T03:00:00.000Z",
		);
	});
});

describe("ia-mesa-chat: contexto do jogador", () => {
	it("não inclui camada gm, área sob névoa, ocultos nem notas do mestre", () => {
		const built = buildMesaContext(scene);
		const blob = `${built.sheet}\n${built.scene}`;
		expect(blob).toContain("Lia");
		expect(blob).toContain("Aliado visível");
		expect(blob).not.toContain("Espião do mestre");
		expect(blob).not.toContain("Goblin sob névoa");
		expect(blob).not.toContain("portal secreto");
		expect(blob).not.toContain("Invisível");
	});

	it("corta a ficha no teto e não leva o final excedente", () => {
		const built = buildMesaContext({
			...scene,
			role: "gm",
			fogEnabled: false,
			gmNotes: "",
			sheetText: `${"A".repeat(20000)}FIM_UNICO_DA_FICHA`,
			tokens: [],
		});
		expect(built.sheet.length).toBeLessThan(20000);
		expect(built.sheet).not.toContain("FIM_UNICO_DA_FICHA");
	});

	it("o mestre vê a camada gm e quem está sob a névoa", () => {
		const built = buildMesaContext({ ...scene, role: "gm" });
		const blob = `${built.sheet}\n${built.scene}`;
		expect(blob).toContain("Espião do mestre");
		expect(blob).toContain("Goblin sob névoa");
		expect(blob).toContain("portal secreto");
	});
});
