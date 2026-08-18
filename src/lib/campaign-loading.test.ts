// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Campaign } from "./store";
import { useRPGStore } from "./store";

const { mockSupabase } = vi.hoisted(() => {
	const failedResponse = {
		data: null,
		error: { message: "network unavailable" },
	};

	function createFailedQuery() {
		const terminal = vi.fn().mockResolvedValue(failedResponse);
		return {
			eq: terminal,
			ilike: vi.fn(() => ({ eq: terminal })),
			in: terminal,
			order: terminal,
		};
	}

	return {
		mockSupabase: {
			auth: {
				getUser: vi.fn().mockResolvedValue({
					data: {
						user: { id: "user-1", email: "user@example.com" },
					},
				}),
			},
			from: vi.fn(() => ({
				select: vi.fn(() => createFailedQuery()),
			})),
			rpc: vi.fn().mockResolvedValue(failedResponse),
		},
	};
});

vi.mock("./supabase", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./supabase")>();
	return {
		...actual,
		getSupabase: () => mockSupabase,
	};
});

const cachedCampaign: Campaign = {
	id: "campaign-1",
	name: "Campanha existente",
	description: "",
	ownerId: "user-1",
	worldId: "world-1",
	myRole: "owner",
	createdAt: 1,
};

describe("campaign loading", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useRPGStore.setState({
			activeCampaignId: cachedCampaign.id,
			activeWorldId: cachedCampaign.worldId,
			campaigns: [cachedCampaign],
			hasLoadedCampaigns: true,
			syncError: null,
		});
	});

	it("keeps the last known campaigns when the remote reload fails", async () => {
		await useRPGStore.getState().loadCampaigns();

		const state = useRPGStore.getState();
		expect(state.campaigns).toEqual([cachedCampaign]);
		expect(state.activeCampaignId).toBe(cachedCampaign.id);
		expect(state.syncError).toContain("network unavailable");
	});

	it("marks an unsuccessful remote reload as an error", async () => {
		await useRPGStore.getState().loadCampaigns();

		expect(useRPGStore.getState().campaignLoadStatus).toBe("error");
	});

	it("keeps the last known campaigns when the Supabase client rejects", async () => {
		mockSupabase.auth.getUser.mockRejectedValueOnce(
			new Error("request aborted"),
		);

		await expect(
			useRPGStore.getState().loadCampaigns(),
		).resolves.toBeUndefined();
		expect(useRPGStore.getState().campaigns).toEqual([cachedCampaign]);
		expect(useRPGStore.getState().campaignLoadStatus).toBe("error");
	});
});
