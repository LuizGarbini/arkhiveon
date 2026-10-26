// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { selectDashboardDataStatus } from "@/components/dashboard/dashboard-count-status";
import type { Campaign } from "./store";
import { useRPGStore } from "./store";
import { BASE_LOAD_ERROR_MESSAGE } from "./store/helpers";
import {
	BASE_LOAD_TIMEOUT_MS,
	CAMPAIGN_SWITCH_TIMEOUT_MS,
} from "./store/sync-slice";

/** Prazo em que a carga ainda é só “lenta”; o teto vira erro. */
const SLOW_MS = 20_000;
const CEILING_MS = 60_000;

/**
 * Consultas base do painel (antes de loadRemoteData): campanhas, vínculos,
 * plano do mestre e convites. Qualquer uma falhando leva ao estado de erro
 * global, sem skeleton infinito e sem mensagem técnica crua.
 */

type Table = "rpc" | "memberships" | "invites" | "campaigns" | "user_plans";

const net = vi.hoisted(() => ({
	failing: new Set<string>(),
	hang: false,
	release: [] as Array<() => void>,
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
	const payload = () =>
		net.failing.has(table)
			? { data: null, error: { message: net.rawMessage } }
			: { data: okData, error: null };
	if (net.hang) {
		return new Promise((resolve) => {
			net.release.push(() => resolve(payload()));
		});
	}
	return Promise.resolve(payload());
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
	net.release = [];
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
		isBaseLoadSlow: false,
		isRetryingBase: false,
		syncError: null,
	});
});

function releaseHang() {
	net.hang = false;
	const pending = net.release.splice(0);
	for (const resume of pending) resume();
}

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
		expect(s.isBaseLoadSlow).toBe(false);
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

	it("rede pendurada passa de 20s: fica lenta, sem erro e sem sair do skeleton", async () => {
		vi.useFakeTimers();
		net.hang = true;
		void useRPGStore.getState().bootstrapCampaignData();
		await vi.advanceTimersByTimeAsync(10);
		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("loading");
		await vi.advanceTimersByTimeAsync(SLOW_MS);
		const slow = useRPGStore.getState();
		expect(slow.isBaseLoadSlow).toBe(true);
		expect(slow.baseLoadError).toBeNull();
		expect(slow.syncError).toBeNull();
		expect(selectDashboardDataStatus(slow)).toBe("loading");
		expect(slow.campaignLoadStatus).not.toBe("error");
	});

	it("erro real de rede vira erro e não fica só como conexão lenta", async () => {
		net.failing = new Set(["rpc", "memberships", "invites", "campaigns"]);
		await useRPGStore.getState().bootstrapCampaignData();
		expectGlobalError();
		expect(useRPGStore.getState().isBaseLoadSlow).toBe(false);
	});

	it("rede pendurada até o teto de 60s: aí sim vira erro", async () => {
		vi.useFakeTimers();
		net.hang = true;
		void useRPGStore.getState().bootstrapCampaignData();
		await vi.advanceTimersByTimeAsync(SLOW_MS);
		expect(useRPGStore.getState().isBaseLoadSlow).toBe(true);
		expect(useRPGStore.getState().baseLoadError).toBeNull();
		await vi.advanceTimersByTimeAsync(CEILING_MS - SLOW_MS);
		expect(BASE_LOAD_TIMEOUT_MS).toBe(CEILING_MS);
		expectGlobalError();
		expect(useRPGStore.getState().isBaseLoadSlow).toBe(false);
		// Sem snapshot de campanhas, a raiz não pode ficar em
		// "Carregando campanhas..." para sempre.
		expect(useRPGStore.getState().campaignLoadStatus).toBe("error");
	});

	it("sucesso depois da lentidão ou do teto limpa slow e o erro", async () => {
		vi.useFakeTimers();
		net.hang = true;
		const pending = useRPGStore.getState().bootstrapCampaignData();
		await vi.advanceTimersByTimeAsync(CEILING_MS);
		expect(useRPGStore.getState().baseLoadError).not.toBeNull();
		expectGlobalError();
		releaseHang();
		await pending;
		const s = useRPGStore.getState();
		expect(s.isBaseLoadSlow).toBe(false);
		expect(s.baseLoadError).toBeNull();
		expect(s.syncError).toBeNull();
		expect(selectDashboardDataStatus(s)).toBe("ready");
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

describe("primeira carga: dados da mesa usam o prazo de ~10s da troca", () => {
	const lateRemote = {
		characters: [{ id: "late-hero", characterName: "Hera" }],
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
	};

	it("sem resposta em 10s mostra o erro e, se os dados chegarem depois, entram", async () => {
		vi.useFakeTimers();
		let releaseRemote: (value: unknown) => void = () => {};
		remote.loadRemoteState.mockImplementation(
			() =>
				new Promise((resolve) => {
					releaseRemote = resolve;
				}),
		);
		const pending = useRPGStore.getState().bootstrapCampaignData();
		await vi.advanceTimersByTimeAsync(1);
		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("loading");
		expect(useRPGStore.getState().remoteLoadError).toBeNull();
		await vi.advanceTimersByTimeAsync(CAMPAIGN_SWITCH_TIMEOUT_MS - 2);
		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("loading");
		await vi.advanceTimersByTimeAsync(1);
		const timedOut = useRPGStore.getState();
		expect(selectDashboardDataStatus(timedOut)).toBe("error");
		expect(timedOut.syncError).toBe(BASE_LOAD_ERROR_MESSAGE);
		expect(timedOut.remoteLoadError).toBe(BASE_LOAD_ERROR_MESSAGE);
		expect(timedOut.baseLoadError).toBeNull();
		expect(timedOut.isLoadingRemote).toBe(false);
		expect(timedOut.isBaseLoadSlow).toBe(false);
		expect(timedOut.campaignLoadStatus).toBe("ready");
		expect(BASE_LOAD_TIMEOUT_MS).toBe(60_000);
		expect(CAMPAIGN_SWITCH_TIMEOUT_MS).toBe(10_000);

		releaseRemote(lateRemote);
		await pending;
		const done = useRPGStore.getState();
		expect(selectDashboardDataStatus(done)).toBe("ready");
		expect(done.remoteLoadError).toBeNull();
		expect(done.syncError).toBeNull();
		expect(done.remoteLoadedCampaignId).toBe("camp-qa");
		expect(done.characters.some((c) => c.id === "late-hero")).toBe(true);
	});
});

describe("troca de campanha: falha ou ~10s vira erro, sem o teto de 60s", () => {
	const other: Campaign = {
		id: "camp-b",
		name: "Outra mesa",
		description: "",
		ownerId: "owner-1",
		worldId: "world-1",
		myRole: "owner",
		createdAt: 2,
	};

	const emptyRemote = {
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
	};

	function armSwitch() {
		const current = useRPGStore.getState().campaigns[0];
		useRPGStore.setState({
			campaigns: [current, other],
			activeCampaignId: current.id,
			activeWorldId: current.worldId,
			hasLoadedCampaigns: true,
			campaignLoadStatus: "ready",
			remoteLoadedCampaignId: current.id,
			remoteLoadError: null,
			baseLoadError: null,
			isLoadingRemote: false,
			isRetryingBase: false,
			isBaseLoadSlow: false,
			syncError: null,
		});
	}

	it("rede da troca pendurada vira erro aos 10s e segue carregando antes disso", async () => {
		vi.useFakeTimers();
		armSwitch();
		remote.loadRemoteState.mockImplementation(() => new Promise(() => {}));
		void useRPGStore.getState().switchCampaign(other.id);
		await vi.advanceTimersByTimeAsync(1);
		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("loading");
		await vi.advanceTimersByTimeAsync(9_998);
		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("loading");
		await vi.advanceTimersByTimeAsync(1);
		const s = useRPGStore.getState();
		expect(selectDashboardDataStatus(s)).toBe("error");
		expect(s.syncError).toBe(BASE_LOAD_ERROR_MESSAGE);
		expect(s.syncError).not.toContain("Failed to fetch");
		expect(s.isLoadingRemote).toBe(false);
		expect(s.isBaseLoadSlow).toBe(false);
		// O teto de loadCampaigns continua 60s e não é o que derrubou a troca.
		expect(s.campaignLoadStatus).toBe("ready");
		expect(BASE_LOAD_TIMEOUT_MS).toBe(60_000);
	});

	it("troca que falha: Tentar de novo recarrega a mesa de destino", async () => {
		armSwitch();
		remote.loadRemoteState.mockRejectedValueOnce(new Error("500"));
		await useRPGStore.getState().switchCampaign(other.id);
		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("error");
		const callsBeforeRetry = remote.loadRemoteState.mock.calls.length;

		remote.loadRemoteState.mockResolvedValueOnce(emptyRemote);
		remote.fetchGlobalTotalCount.mockResolvedValue(0);
		await useRPGStore.getState().retryBaseLoad();

		expect(selectDashboardDataStatus(useRPGStore.getState())).toBe("ready");
		expect(useRPGStore.getState().activeCampaignId).toBe(other.id);
		expect(remote.loadRemoteState.mock.calls.length).toBe(callsBeforeRetry + 1);
		expect(remote.loadRemoteState).toHaveBeenLastCalledWith(other.id);
	});
});
