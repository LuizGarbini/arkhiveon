// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { selectDashboardDataStatus } from "@/components/dashboard/dashboard-count-status";
import type { Campaign } from "./store";
import { useRPGStore } from "./store";
import { BASE_LOAD_ERROR_MESSAGE } from "./store/helpers";
import { BASE_LOAD_TIMEOUT_MS } from "./store/sync-slice";

/**
 * Consultas base do painel (antes de loadRemoteData): campanhas, vínculos,
 * plano do mestre e convites. Qualquer uma falhando leva ao estado de erro
 * global, sem skeleton infinito e sem mensagem técnica crua.
 */

type Table = "rpc" | "memberships" | "invites" | "campaigns" | "user_plans";

const net = vi.hoisted(() => ({
	failing: new Set<string>(),
	hang: false,
	rawMessage: "TypeError: Failed to fetch",
}));

const remote = vi.hoisted(() => ({
	loadRemoteState: vi.fn(),
	fetchGlobalTotalCount: vi.fn(),
}));

vi.mock("./remote-store", async (importOriginal) => ({
	...(await importOriginal<typeof import("./remote-store")>()),
	loadRemoteState: remote.loadRemoteState,
	fetchGlobalTotalCount: remote.fetchGlobalTotalCount,
}));

vi.mock("./worldbuilding/world-service", async (importOriginal) => ({
	...(await importOriginal<typeof import("./worldbuilding/world-service")>()),
	loadAccessibleWorlds: vi.fn().mockResolvedValue([]),
}));

const CAMPAIGN_ROW = {
	id: "camp-qa",
	name: "QA Designer (teste)",
	description: "",
	owner_id: "owner-1",
	world_id: "world-1",
	system: "dnd5e",
	member_limit: 20,
	created_at: "2026-10-01T00:00:00Z",
	updated_at: "2026-10-01T00:00:00Z",
	my_role: "editor",
};

function response(table: string, okData: unknown) {
	if (net.hang) return new Promise(() => {});
	return Promise.resolve(
		net.failing.has(table)
			? { data: null, error: { message: net.rawMessage } }
			: { data: okData, error: null },
	);
}

/** Query encadeável: a própria promessa da resposta, com os métodos do builder. */
function query(table: string, okData: unknown) {
	const promise = response(table, okData);
	const q = Object.assign(promise, {
		select: () => q,
		eq: () => q,
		ilike: () => q,
		in: () => q,
		order: () => q,
		maybeSingle: () => promise,
	});
	return q;
}

const mockSupabase = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("./supabase", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./supabase")>();
	return { ...actual, getSupabase: () => mockSupabase.client };
});

function okDataFor(table: string): unknown {
	if (table === "user_plans") return { plan: "pro" };
	if (table === "campaigns") return [];
	return [];
}

beforeEach(() => {
	vi.clearAllMocks();
	net.failing.clear();
	net.hang = false;
	mockSupabase.client = {
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: { session: { user: { id: "user-1", email: "gm@teste.local" } } },
			}),
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: "user-1", email: "gm@teste.local" } },
			}),
		},
		rpc: vi.fn(() => response("rpc", [CAMPAIGN_ROW])),
		from: vi.fn((table: Table) => query(table, okDataFor(table))),
	};
	remote.loadRemoteState.mockResolvedValue({
		characters: [],
		npcs: [],
		sessions: [],
		items: [],
		locations: [],
		lores: [],
		customTemplates: [],
		imageAssets: [],
		activityLog: [],
		factions: [],
		factionReputations: [],
		worldNews: [],
	});
	remote.fetchGlobalTotalCount.mockResolvedValue(0);
	const cached: Campaign = {
		id: "camp-qa",
		name: "QA Designer (teste)",
		description: "",
		ownerId: "owner-1",
		worldId: "world-1",
		myRole: "editor",
		createdAt: 1,
	};
	// Estado de quem recarrega a página: campanhas persistidas, nada confirmado.
	useRPGStore.setState({
		campaigns: [cached],
		activeCampaignId: cached.id,
		activeWorldId: cached.worldId,
		hasLoadedCampaigns: false,
		campaignLoadStatus: "idle",
		isLoadingRemote: false,
		remoteLoadError: null,
		remoteLoadedCampaignId: null,
		baseLoadError: null,
		isRetryingBase: false,
		syncError: null,
	});
});

afterEach(() => {
	vi.useRealTimers();
});

function expectGlobalError() {
	const s = useRPGStore.getState();
	expect(selectDashboardDataStatus(s)).toBe("error");
	expect(s.isLoadingRemote).toBe(false);
	// Nada de mensagem técnica crua na faixa/estado.
	expect(s.syncError).toBe(BASE_LOAD_ERROR_MESSAGE);
	expect(s.syncError).not.toContain("Failed to fetch");
	expect(s.baseLoadError).toBe(BASE_LOAD_ERROR_MESSAGE);
}

describe("painel: falhas das consultas base levam ao erro global", () => {
	it("tudo ok: termina pronto (controle)", async () => {
		await useRPGStore.getState().bootstrapCampaignData();
		const s = useRPGStore.getState();
		expect(selectDashboardDataStatus(s)).toBe("ready");
		expect(s.baseLoadError).toBeNull();
	});

	it("campanhas (RPC + fallback de campaigns/memberships) falhando", async () => {
		net.failing = new Set(["rpc", "memberships", "invites", "campaigns"]);
		await useRPGStore.getState().bootstrapCampaignData();
		expectGlobalError();
		// A carga da mesa nem começa sem campanhas.
		expect(remote.loadRemoteState).not.toHaveBeenCalled();
	});

	it("só memberships falhando no fallback", async () => {
		net.failing = new Set(["rpc", "memberships"]);
		await useRPGStore.getState().bootstrapCampaignData();
		expectGlobalError();
	});

	it("convites falhando (antes virava faixa 'Erro ao carregar convites: ...')", async () => {
		net.failing = new Set(["invites"]);
		await useRPGStore.getState().bootstrapCampaignData();
		expectGlobalError();
	});

	it("plano do mestre (user_plans) falhando não vira 'free' em silêncio", async () => {
		net.failing = new Set(["user_plans"]);
		useRPGStore.setState({ activeCampaignOwnerPlan: "pro" });
		await useRPGStore.getState().bootstrapCampaignData();
		expectGlobalError();
		expect(useRPGStore.getState().activeCampaignOwnerPlan).toBe("pro");
	});

	it("TODO o REST falhando: erro global, nunca skeleton parado", async () => {
		net.failing = new Set([
			"rpc",
			"memberships",
			"invites",
			"campaigns",
			"user_plans",
		]);
		remote.loadRemoteState.mockRejectedValue(new TypeError("Failed to fetch"));
		await useRPGStore.getState().bootstrapCampaignData();
		expectGlobalError();
	});

	it("rede pendurada: depois do prazo o skeleton vira o aviso", async () => {
		vi.useFakeTimers();
		net.hang = true;
		void useRPGStore.getState().bootstrapCampaignData();
		await vi.advanceTimersByTimeAsync(10);
		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("loading");
		await vi.advanceTimersByTimeAsync(BASE_LOAD_TIMEOUT_MS);
		expectGlobalError();
	});

	it("Tentar de novo volta ao skeleton e, com a rede de volta, fica pronto", async () => {
		net.failing = new Set(["rpc", "memberships", "invites", "campaigns"]);
		await useRPGStore.getState().bootstrapCampaignData();
		expectGlobalError();

		net.failing.clear();
		const nonce = useRPGStore.getState().baseRetryNonce;
		const retry = useRPGStore.getState().retryBaseLoad();
		// Logo no clique: skeleton (loading), sem aviso nem faixa.
		const during = useRPGStore.getState();
		expect(selectDashboardDataStatus(during)).toBe("loading");
		expect(during.syncError).toBeNull();
		expect(during.baseRetryNonce).toBe(nonce + 1);
		await retry;
		const s = useRPGStore.getState();
		expect(selectDashboardDataStatus(s)).toBe("ready");
		expect(s.isRetryingBase).toBe(false);
	});

	it("falha da mesa (loadRemoteState) também usa a mensagem leiga", async () => {
		remote.loadRemoteState.mockRejectedValue(new TypeError("Failed to fetch"));
		await useRPGStore.getState().bootstrapCampaignData();
		const s = useRPGStore.getState();
		expect(selectDashboardDataStatus(s)).toBe("error");
		expect(s.syncError).toBe(BASE_LOAD_ERROR_MESSAGE);
	});
});
