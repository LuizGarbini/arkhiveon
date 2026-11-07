// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "../store";
import type { Campaign } from "./types";

const CAMPAIGN_ID = "camp-1";
const OWNER_ID = "user-a";
const NEXT_OWNER_ID = "user-b";
const GENERIC = "Não foi possível transferir o mestre.";
const UNAVAILABLE = "transferência indisponível no momento";
const OWNER_CHANGED = "O mestre da campanha mudou.";
const AMBIGUOUS = "Não foi possível confirmar a transferência.";

interface TransferResult {
	status: string;
	message: string;
	members?: Array<{ userId: string; role: string }>;
	invites?: unknown[];
}

const harness = vi.hoisted(() => {
	const writes: string[] = [];
	const state = {
		user: { id: "user-a", email: "a@mesa.app" } as {
			id: string;
			email: string;
		} | null,
		clientEnabled: true,
		listener: null as
			| ((
					event: string,
					session: { user: { id: string; email: string } } | null,
			  ) => void)
			| null,
	};
	const rpc = vi.fn();
	const from = vi.fn((table: string) => {
		writes.push(table);
		return {};
	});
	const client = {
		rpc,
		from,
		auth: {
			getSession: vi.fn(async () => ({
				data: { session: state.user ? { user: state.user } : null },
			})),
			getUser: vi.fn(async () => ({ data: { user: state.user } })),
			onAuthStateChange: vi.fn(
				(
					callback: (
						event: string,
						session: { user: { id: string; email: string } } | null,
					) => void,
				) => {
					state.listener = callback;
					return { data: { subscription: { unsubscribe: vi.fn() } } };
				},
			),
		},
	};
	return { writes, state, rpc, from, client };
});

vi.mock("../supabase", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../supabase")>();
	return {
		...actual,
		getSupabase: () => (harness.state.clientEnabled ? harness.client : null),
	};
});

vi.mock("../worldbuilding/world-service", () => ({
	resolveWorldIdForNewCampaign: vi.fn(
		async (_ownerUserId: string, options?: { worldId?: string }) => ({
			worldId: options?.worldId ?? "world-1",
			createdWorld: null,
		}),
	),
	loadAccessibleWorlds: vi.fn(async () => []),
	createRemoteWorld: vi.fn(),
	deleteRemoteWorld: vi.fn(),
	updateRemoteWorld: vi.fn(),
}));

const ownedCampaign: Campaign = {
	id: CAMPAIGN_ID,
	name: "Mesa da Aurora",
	description: "",
	ownerId: OWNER_ID,
	worldId: "world-1",
	myRole: "owner",
	createdAt: 1,
};

const keptNotification = {
	id: "notif-1",
	variant: "info" as const,
	title: "Convite antigo",
	description: "Não criar outra",
	createdAt: 1,
	read: false,
};

const swappedMembers = [
	{
		id: "m-a",
		userId: OWNER_ID,
		email: "a@mesa.app",
		role: "editor" as const,
	},
	{
		id: "m-b",
		userId: NEXT_OWNER_ID,
		email: "b@mesa.app",
		role: "owner" as const,
	},
];

function transfer(campaignId = CAMPAIGN_ID, newOwnerId = NEXT_OWNER_ID) {
	const action = (
		useRPGStore.getState() as {
			transferCampaignOwnership?: (
				campaignId: string,
				newOwnerId: string,
			) => Promise<TransferResult>;
		}
	).transferCampaignOwnership;
	if (!action) {
		return Promise.reject(new Error("transferCampaignOwnership ausente"));
	}
	return action(campaignId, newOwnerId);
}

function successRow() {
	return {
		data: [
			{
				campaign_id: CAMPAIGN_ID,
				previous_owner_id: OWNER_ID,
				new_owner_id: NEXT_OWNER_ID,
			},
		],
		error: null,
	};
}

function setOnline(online: boolean) {
	Object.defineProperty(window.navigator, "onLine", {
		configurable: true,
		get: () => online,
	});
}

describe("transferCampaignOwnership", () => {
	let loadCampaigns: ReturnType<typeof vi.fn>;
	let loadMembers: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		harness.writes.length = 0;
		harness.state.user = { id: OWNER_ID, email: "a@mesa.app" };
		harness.state.clientEnabled = true;
		harness.state.listener = null;
		setOnline(true);
		vi.stubEnv("VITE_ENABLE_TRANSFER_CAMPAIGN_OWNERSHIP", "true");
		harness.client.auth.getSession.mockImplementation(async () => ({
			data: {
				session: harness.state.user ? { user: harness.state.user } : null,
			},
		}));
		harness.client.auth.getUser.mockImplementation(async () => ({
			data: { user: harness.state.user },
		}));
		harness.rpc.mockResolvedValue(successRow());
		harness.from.mockImplementation((table: string) => {
			harness.writes.push(table);
			return {};
		});
		loadCampaigns = vi.fn(async () => undefined);
		loadMembers = vi.fn(async () => ({
			members: swappedMembers,
			invites: [],
		}));
		useRPGStore.setState({
			campaigns: [{ ...ownedCampaign }],
			activeCampaignId: CAMPAIGN_ID,
			activeWorldId: "world-1",
			notifications: [{ ...keptNotification }],
			remoteLoadedCampaignId: null,
			worlds: [
				{
					id: "world-1",
					name: "Valência",
					ownerUserId: OWNER_ID,
					isDefault: false,
					createdAt: 1,
				},
			],
			userPlan: "pro",
			loadCampaigns: loadCampaigns as never,
			loadCampaignMembersAndInvites: loadMembers as never,
			loadRemoteData: vi.fn(async () => undefined) as never,
			loadWorlds: vi.fn(async () => undefined) as never,
			clearActiveCampaignEntities: vi.fn() as never,
		});
	});

	it("com a flag apagada não chama a RPC", async () => {
		vi.stubEnv("VITE_ENABLE_TRANSFER_CAMPAIGN_OWNERSHIP", "");
		const result = await transfer();
		expect(result.status).toBe("disabled");
		expect(harness.rpc).not.toHaveBeenCalled();
		expect(harness.writes).toEqual([]);
	});

	it("true com outra grafia continua fechado", async () => {
		vi.stubEnv("VITE_ENABLE_TRANSFER_CAMPAIGN_OWNERSHIP", "TRUE");
		const result = await transfer();
		expect(result.status).toBe("disabled");
		expect(harness.rpc).not.toHaveBeenCalled();
	});

	it("chama só transfer_campaign_ownership com os dois ids", async () => {
		const result = await transfer();
		expect(harness.rpc).toHaveBeenCalledExactlyOnceWith(
			"transfer_campaign_ownership",
			{ p_campaign_id: CAMPAIGN_ID, p_new_owner_id: NEXT_OWNER_ID },
		);
		expect(harness.writes).toEqual([]);
		expect(result.status).toBe("success");
	});

	it("42883 diz que a transferência está indisponível e não escreve", async () => {
		harness.rpc.mockResolvedValue({
			data: null,
			error: { code: "42883", message: "undefined_function" },
		});
		const result = await transfer();
		expect(result.status).toBe("unavailable");
		expect(result.message).toBe(UNAVAILABLE);
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(harness.writes).toEqual([]);
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
		expect(useRPGStore.getState().campaigns[0]?.myRole).toBe("owner");
	});

	it("PGRST202 também fica indisponível sem escrita", async () => {
		harness.rpc.mockResolvedValue({
			data: null,
			error: { code: "PGRST202", message: "function not found" },
		});
		const result = await transfer();
		expect(result.message).toBe(UNAVAILABLE);
		expect(harness.writes).toEqual([]);
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
	});

	it("sessão ausente antes do envio não dispara RPC", async () => {
		harness.state.user = null;
		const result = await transfer();
		expect(result.status).toBe("aborted");
		expect(harness.rpc).not.toHaveBeenCalled();
		expect(loadCampaigns).not.toHaveBeenCalled();
	});

	it("troca de conta antes do envio não dispara RPC", async () => {
		let reads = 0;
		harness.client.auth.getSession.mockImplementation(async () => {
			reads += 1;
			const id = reads === 1 ? OWNER_ID : "user-c";
			return { data: { session: { user: { id, email: `${id}@mesa.app` } } } };
		});
		const result = await transfer();
		expect(result.status).toBe("aborted");
		expect(harness.rpc).not.toHaveBeenCalled();
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
	});

	it("SIGNED_OUT antes do envio não dispara RPC", async () => {
		let release: (() => void) | undefined;
		harness.client.auth.getSession.mockImplementation(
			() =>
				new Promise((resolve) => {
					release = () =>
						resolve({
							data: {
								session: { user: { id: OWNER_ID, email: "a@mesa.app" } },
							},
						});
				}),
		);
		const pending = transfer();
		await vi.waitFor(() =>
			expect(harness.client.auth.onAuthStateChange).toHaveBeenCalled(),
		);
		harness.state.listener?.("SIGNED_OUT", null);
		release?.();
		const result = await pending;
		expect(result.status).toBe("aborted");
		expect(harness.rpc).not.toHaveBeenCalled();
		expect(loadCampaigns).not.toHaveBeenCalled();
	});

	it("troca de campanha antes do envio não dispara RPC", async () => {
		let release: (() => void) | undefined;
		harness.client.auth.getSession.mockImplementation(
			() =>
				new Promise((resolve) => {
					release = () =>
						resolve({
							data: {
								session: { user: { id: OWNER_ID, email: "a@mesa.app" } },
							},
						});
				}),
		);
		const pending = transfer();
		await vi.waitFor(() =>
			expect(harness.client.auth.getSession).toHaveBeenCalled(),
		);
		await useRPGStore.getState().switchCampaign("camp-2");
		release?.();
		const result = await pending;
		expect(result.status).toBe("aborted");
		expect(harness.rpc).not.toHaveBeenCalled();
		expect(loadCampaigns).not.toHaveBeenCalled();
	});

	it("resposta atrasada depois da troca de conta não recarrega a sessão nova", async () => {
		let finish: (value: ReturnType<typeof successRow>) => void = () => {};
		harness.rpc.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const pending = transfer();
		await vi.waitFor(() => expect(harness.rpc).toHaveBeenCalledTimes(1));
		harness.state.user = { id: "user-c", email: "c@mesa.app" };
		finish(successRow());
		const result = await pending;
		expect(result.status).toBe("aborted");
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
		expect(useRPGStore.getState().campaigns[0]).toMatchObject({
			ownerId: OWNER_ID,
			myRole: "owner",
		});
		expect(harness.rpc).toHaveBeenCalledTimes(1);
	});

	it("resposta atrasada depois da troca de campanha não recarrega", async () => {
		let finish: (value: ReturnType<typeof successRow>) => void = () => {};
		harness.rpc.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const pending = transfer();
		await vi.waitFor(() => expect(harness.rpc).toHaveBeenCalledTimes(1));
		await useRPGStore.getState().switchCampaign("camp-2");
		finish(successRow());
		const result = await pending;
		expect(result.status).toBe("aborted");
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
		expect(
			useRPGStore.getState().campaigns.find((item) => item.id === CAMPAIGN_ID)
				?.myRole,
		).toBe("owner");
	});

	it("SIGNED_OUT com a RPC no ar não aplica o resultado nem recarrega", async () => {
		let finish: (value: ReturnType<typeof successRow>) => void = () => {};
		harness.rpc.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const pending = transfer();
		await vi.waitFor(() => expect(harness.rpc).toHaveBeenCalledTimes(1));
		useRPGStore.getState().resetCampaigns();
		harness.state.user = null;
		finish(successRow());
		const result = await pending;
		expect(result.status).toBe("aborted");
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
		expect(useRPGStore.getState().campaigns).toEqual([]);
	});

	it("ACK vazio recarrega campanhas e membros uma vez, sem repetir a RPC", async () => {
		harness.rpc.mockResolvedValue({ data: null, error: null });
		const result = await transfer();
		expect(result.status).toBe("ambiguous");
		expect(result.message).toBe(AMBIGUOUS);
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
		expect(loadMembers).toHaveBeenCalledTimes(1);
		expect(harness.writes).toEqual([]);
	});

	it("erro sem código é ACK desconhecido e não repete a RPC", async () => {
		harness.rpc.mockResolvedValue({
			data: null,
			error: { message: "Failed to fetch" },
		});
		const result = await transfer();
		expect(result.status).toBe("ambiguous");
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
		expect(loadMembers).toHaveBeenCalledTimes(1);
	});

	it("exceção de rede é ACK perdido, com um refetch e uma RPC", async () => {
		harness.rpc.mockRejectedValue(new Error("Failed to fetch"));
		const result = await transfer();
		expect(result.status).toBe("ambiguous");
		expect(result.message).toBe(AMBIGUOUS);
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
		expect(loadMembers).toHaveBeenCalledTimes(1);
	});

	it("lista vazia da RPC também é ACK ambíguo", async () => {
		harness.rpc.mockResolvedValue({ data: [], error: null });
		const result = await transfer();
		expect(result.status).toBe("ambiguous");
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
		expect(loadMembers).toHaveBeenCalledTimes(1);
	});

	it("segunda chamada simultânea não dispara outra RPC", async () => {
		let finish: (value: ReturnType<typeof successRow>) => void = () => {};
		harness.rpc.mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const first = transfer();
		const second = transfer(CAMPAIGN_ID, "user-c");
		try {
			await vi.waitFor(() => expect(harness.rpc).toHaveBeenCalledTimes(1));
			await expect(second).resolves.toMatchObject({ status: "duplicate" });
			expect(harness.rpc).toHaveBeenCalledTimes(1);
			finish(successRow());
			await first;
			expect(harness.rpc).toHaveBeenCalledTimes(1);
		} finally {
			finish(successRow());
		}
	});

	it("offline não enfileira e uma nova tentativa continua sem RPC", async () => {
		setOnline(false);
		const first = await transfer();
		const second = await transfer();
		expect(first.status).toBe("offline");
		expect(second.status).toBe("offline");
		expect(first.message).toBe(
			"A transferência de mestre só funciona com conexão.",
		);
		expect(harness.rpc).not.toHaveBeenCalled();
	});

	it("sem cliente remoto também não enfileira", async () => {
		harness.state.clientEnabled = false;
		const result = await transfer();
		expect(result.status).toBe("offline");
		expect(harness.rpc).not.toHaveBeenCalled();
	});

	it("42501 é genérico e só recarrega os membros", async () => {
		harness.rpc.mockResolvedValue({
			data: null,
			error: {
				code: "42501",
				message: "transferência de mestre não permitida",
			},
		});
		const result = await transfer();
		expect(result.status).toBe("forbidden");
		expect(result.message).toBe(GENERIC);
		expect(result.message).not.toContain("não permitida");
		expect(loadMembers).toHaveBeenCalledTimes(1);
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(useRPGStore.getState().campaigns[0]?.myRole).toBe("owner");
	});

	it("40001 avisa que o mestre mudou e recarrega campanhas e membros", async () => {
		harness.rpc.mockResolvedValue({
			data: null,
			error: { code: "40001", message: "campaign owner changed, retry" },
		});
		const result = await transfer();
		expect(result.status).toBe("owner-changed");
		expect(result.message).toBe(OWNER_CHANGED);
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
		expect(loadMembers).toHaveBeenCalledTimes(1);
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(harness.writes).toEqual([]);
	});

	it("23514 é genérico e não recarrega", async () => {
		harness.rpc.mockResolvedValue({
			data: null,
			error: { code: "23514", message: "ownership invariant violated" },
		});
		const result = await transfer();
		expect(result.status).toBe("invalid");
		expect(result.message).toBe(GENERIC);
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
	});

	it("outro código também é genérico, sem retry", async () => {
		harness.rpc.mockResolvedValue({
			data: null,
			error: { code: "XX000", message: "boom" },
		});
		const result = await transfer();
		expect(result.status).toBe("generic");
		expect(result.message).toBe(GENERIC);
		expect(harness.rpc).toHaveBeenCalledTimes(1);
		expect(loadCampaigns).not.toHaveBeenCalled();
		expect(loadMembers).not.toHaveBeenCalled();
	});

	it("sucesso deixa o antigo mestre como editor, recarrega e não cria notificação", async () => {
		const result = await transfer();
		expect(result.status).toBe("success");
		expect(result.members).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ userId: OWNER_ID, role: "editor" }),
				expect.objectContaining({ userId: NEXT_OWNER_ID, role: "owner" }),
			]),
		);
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
		expect(loadMembers).toHaveBeenCalledWith(CAMPAIGN_ID);
		expect(useRPGStore.getState().campaigns[0]).toMatchObject({
			ownerId: NEXT_OWNER_ID,
			myRole: "editor",
		});
		expect(useRPGStore.getState().notifications).toEqual([keptNotification]);
		expect(harness.writes).toEqual([]);
		expect(harness.rpc).toHaveBeenCalledTimes(1);
	});

	it("mantém o INSERT de owner do client ao criar campanha", async () => {
		const inserts: Array<{ table: string; payload: Record<string, unknown> }> =
			[];
		harness.from.mockImplementation((table: string) => {
			const chain = {
				select: () => chain,
				eq: () => chain,
				maybeSingle: async () => ({ data: { plan: "pro" }, error: null }),
				insert: (payload: Record<string, unknown>) => {
					inserts.push({ table, payload });
					return Promise.resolve({ data: null, error: null });
				},
			};
			return chain;
		});
		useRPGStore.setState({ campaigns: [], userPlan: "pro" });
		const created = await useRPGStore
			.getState()
			.createCampaign("Mesa Nova", "", { worldId: "world-1" });
		const campaignInsert = inserts.find((item) => item.table === "campaigns");
		const membershipInsert = inserts.find(
			(item) => item.table === "memberships",
		);
		expect(campaignInsert?.payload).toMatchObject({
			owner_id: OWNER_ID,
			id: created.id,
		});
		expect(membershipInsert?.payload).toMatchObject({
			role: "owner",
			user_id: OWNER_ID,
			campaign_id: created.id,
		});
	});
});
