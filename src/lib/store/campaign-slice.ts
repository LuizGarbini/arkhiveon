import type { StateCreator } from "zustand";
import { getSupabase, SUPABASE_TABLES } from "../supabase";
import {
	campaignPerWorldLimitError,
	countOwnedCampaignsInWorld,
	countOwnedWorlds,
	maxOwnedCampaignsPerWorld,
	maxOwnedWorlds,
	worldLimitError,
} from "../worldbuilding/plan-limits";
import { resolveActiveContextAfterCampaignLoad } from "../worldbuilding/resolve-active-context";
import { isWorldStaffInWorld } from "../worldbuilding/visibility";
import {
	createRemoteWorld,
	deleteRemoteWorld,
	loadAccessibleWorlds,
	resolveWorldIdForNewCampaign,
	updateRemoteWorld,
} from "../worldbuilding/world-service";
import { remoteErrorMessage } from "./helpers";
import type {
	Campaign,
	CampaignLoadStatus,
	Invite,
	InviteStatus,
	MembershipRole,
	RPGState,
	RpgSystem,
	UserPlan,
	World,
} from "./types";
import { RPG_SYSTEMS } from "./types";

interface CampaignRecord {
	created_at: string | null;
	description: string | null;
	id: string;
	member_limit: number | null;
	name: string | null;
	owner_id: string | null;
	system: string | null;
	updated_at: string | null;
	world_id: string | null;
}

function normalizeCampaignRole(role: unknown): MembershipRole {
	if (role === "owner" || role === "editor" || role === "viewer") {
		return role;
	}
	return "viewer";
}

function isRpgSystem(system: unknown): system is RpgSystem {
	return (
		typeof system === "string" &&
		(system.startsWith("custom_") ||
			RPG_SYSTEMS.some((knownSystem) => knownSystem.value === system))
	);
}

function mapCampaignRecord(record: CampaignRecord, role: unknown): Campaign {
	return {
		id: record.id,
		name: record.name ?? "Sem nome",
		description: record.description ?? "",
		ownerId: record.owner_id ?? "",
		worldId: record.world_id ?? "",
		system: isRpgSystem(record.system) ? record.system : "dnd5e",
		myRole: normalizeCampaignRole(role),
		memberLimit:
			typeof record.member_limit === "number" ? record.member_limit : 6,
		createdAt: record.created_at
			? new Date(record.created_at).getTime()
			: Date.now(),
		updatedAt: record.updated_at
			? new Date(record.updated_at).getTime()
			: undefined,
	};
}

export interface CampaignSlice {
	campaigns: Campaign[];
	activeCampaignId: string | null;
	activeWorldId: string | null;
	activeCampaignOwnerPlan: UserPlan;
	/** Stays true after the first authoritative load, including during refreshes. */
	hasLoadedCampaigns: boolean;
	campaignLoadStatus: CampaignLoadStatus;
	pendingInvites: Invite[];
	worlds: World[];

	loadCampaigns: () => Promise<void>;
	createCampaign: (
		name: string,
		description?: string,
		options?: { worldId?: string; newWorldName?: string; system?: RpgSystem },
	) => Promise<Campaign>;
	updateCampaign: (
		id: string,
		data: Partial<
			Pick<Campaign, "name" | "description" | "system" | "memberLimit">
		>,
	) => void;
	deleteCampaign: (id: string) => Promise<void>;
	switchCampaign: (id: string) => Promise<void>;
	switchWorld: (worldId: string) => Promise<void>;

	loadWorlds: () => Promise<void>;
	createWorld: (name: string) => Promise<World>;
	updateWorld: (id: string, data: Partial<Pick<World, "name">>) => void;
	deleteWorld: (id: string) => Promise<void>;

	loadInvites: () => Promise<void>;
	createInvite: (
		campaignId: string,
		email: string,
		role: "editor" | "viewer",
	) => Promise<void>;
	revokeInvite: (inviteId: string) => Promise<void>;
	acceptInvite: (inviteId: string) => Promise<void>;
	declineInvite: (inviteId: string) => Promise<void>;
	removeMember: (campaignId: string, userId: string) => Promise<void>;
	loadCampaignMembersAndInvites: (campaignId: string) => Promise<{
		members: Array<{
			id: string;
			userId: string;
			email: string;
			role: MembershipRole;
		}>;
		invites: Invite[];
	}>;
	resetCampaigns: () => void;
}

export const createCampaignSlice: StateCreator<
	RPGState,
	[],
	[],
	CampaignSlice
> = (set, get) => ({
	campaigns: [],
	activeCampaignId: null,
	activeWorldId: null,
	activeCampaignOwnerPlan: "free",
	hasLoadedCampaigns: false,
	campaignLoadStatus: "idle",
	pendingInvites: [],

	worlds: [],

	resetCampaigns: () =>
		set({
			campaigns: [],
			activeCampaignId: null,
			activeWorldId: null,
			activeCampaignOwnerPlan: "free",
			hasLoadedCampaigns: false,
			campaignLoadStatus: "idle",
			pendingInvites: [],
			worlds: [],
		}),

	loadWorlds: async () => {
		const supabase = getSupabase();
		if (!supabase) {
			set({ worlds: [] });
			return;
		}
		try {
			const worlds = await loadAccessibleWorlds();
			set({ worlds, syncError: null });
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			set({ syncError: `Erro ao carregar mundos: ${errMsg}` });
		}
	},

	createWorld: async (name) => {
		const supabase = getSupabase();
		if (!supabase) {
			throw new Error("Supabase não está configurado.");
		}
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			throw new Error("Usuário não autenticado.");
		}

		// Obter plano atualizado do usuário no banco para evitar limites stale
		const { data: planRow } = await supabase
			.from(SUPABASE_TABLES.userPlans)
			.select("plan")
			.eq("user_id", user.id)
			.maybeSingle();
		const currentPlan: UserPlan =
			(planRow as { plan?: UserPlan } | null)?.plan || get().userPlan || "free";
		if (currentPlan !== get().userPlan) {
			set({ userPlan: currentPlan });
		}

		let currentWorlds = get().worlds;
		try {
			const fetchedWorlds = await loadAccessibleWorlds();
			if (fetchedWorlds.length > 0) {
				currentWorlds = fetchedWorlds;
				set({ worlds: fetchedWorlds });
			}
		} catch {
			// Mantém currentWorlds locais
		}

		if (
			countOwnedWorlds(currentWorlds, user.id) >= maxOwnedWorlds(currentPlan)
		) {
			const errorMsg = worldLimitError(currentPlan);
			set({ syncError: errorMsg });
			throw new Error(errorMsg);
		}
		const created = await createRemoteWorld({
			ownerUserId: user.id,
			name,
			isDefault: countOwnedWorlds(currentWorlds, user.id) === 0,
		});
		set((state) => ({
			worlds: [...state.worlds.filter((w) => w.id !== created.id), created],
			activeWorldId: created.id,
			syncError: null,
		}));
		return created;
	},

	updateWorld: (id, data) => {
		const original = get().worlds;
		set((state) => ({
			worlds: state.worlds.map((w) =>
				w.id === id ? { ...w, ...data, updatedAt: Date.now() } : w,
			),
			syncError: null,
		}));
		void updateRemoteWorld(id, data).catch((error) => {
			const errMsg = error instanceof Error ? error.message : String(error);
			set({
				worlds: original,
				syncError: `Erro ao atualizar mundo: ${errMsg}`,
			});
		});
	},

	deleteWorld: async (id) => {
		const state = get();
		const targetWorld = state.worlds.find((w) => w.id === id);
		if (targetWorld?.isDefault) {
			throw new Error("Não é possível excluir o Mundo Padrão.");
		}

		await deleteRemoteWorld(id);

		set((prev) => {
			const nextWorlds = prev.worlds.filter((w) => w.id !== id);
			const defaultWorld = nextWorlds.find((w) => w.isDefault) ?? nextWorlds[0];
			const nextActiveWorldId =
				prev.activeWorldId === id
					? (defaultWorld?.id ?? null)
					: prev.activeWorldId;

			return {
				worlds: nextWorlds,
				activeWorldId: nextActiveWorldId,
				syncError: null,
			};
		});

		await get().loadCampaigns();
	},

	loadCampaigns: async () => {
		set({ campaignLoadStatus: "loading" });
		const supabase = getSupabase();
		if (!supabase) {
			set({ hasLoadedCampaigns: true, campaignLoadStatus: "ready" });
			return;
		}

		let campaigns: Campaign[];
		try {
			const sessionRes = await supabase.auth?.getSession?.();
			let user = sessionRes?.data?.session?.user;
			if (!user) {
				const userRes = await supabase.auth.getUser();
				user = userRes?.data?.user ?? undefined;
			}
			if (!user || !user.email) {
				set({
					campaignLoadStatus: "error",
					syncError:
						"Erro ao carregar campanhas: sessão autenticada indisponível",
				});
				return;
			}

			const userEmailClean = user.email.trim().toLowerCase();

			// 1. Tentar obter campanhas via RPC SECURITY DEFINER (imune a bloqueios de RLS)
			const { data: rpcData, error: rpcError } = await supabase.rpc(
				"get_user_accessible_campaigns",
			);

			const campaignsMap = new Map<string, Campaign>();

			if (!rpcError && rpcData) {
				rpcData.forEach((row) => {
					campaignsMap.set(row.id, mapCampaignRecord(row, row.my_role));
				});
			} else {
				// Fallback: consulta direta com Resolução Tripla
				const { data: memberData, error: memberError } = await supabase
					.from(SUPABASE_TABLES.memberships)
					.select(`
					role,
					campaign_id,
					campaign:campaigns (
						id,
						name,
						description,
						owner_id,
						world_id,
						system,
						member_limit,
						created_at,
						updated_at
					)
				`)
					.eq("user_id", user.id);

				const { data: acceptedInvitesData, error: acceptedInvitesError } =
					await supabase
						.from(SUPABASE_TABLES.invites)
						.select("campaign_id, role")
						.ilike("email", userEmailClean)
						.eq("status", "accepted");

				const membershipCampaignIds = new Set(
					(memberData ?? []).map((membership) => membership.campaign_id),
				);

				const missingFromMemberships = (acceptedInvitesData ?? []).filter(
					(invite) => !membershipCampaignIds.has(invite.campaign_id),
				);

				let extraCampaignRows: Array<{
					role: string;
					campaign: CampaignRecord;
				}> = [];
				let extraCampaignError: unknown = null;
				if (missingFromMemberships.length > 0) {
					const missingIds = missingFromMemberships.map(
						(invite) => invite.campaign_id,
					);
					const { data: extraCamps, error } = await supabase
						.from(SUPABASE_TABLES.campaigns)
						.select(
							"id, name, description, owner_id, world_id, system, member_limit, created_at, updated_at",
						)
						.in("id", missingIds);
					extraCampaignError = error;

					if (extraCamps) {
						extraCampaignRows = extraCamps.map((campaign) => {
							const inv = missingFromMemberships.find(
								(invite) => invite.campaign_id === campaign.id,
							);
							return {
								role: inv?.role || "viewer",
								campaign,
							};
						});
					}
				}

				const { data: ownedCampaignsData, error: ownedCampaignsError } =
					await supabase
						.from(SUPABASE_TABLES.campaigns)
						.select(
							"id, name, description, owner_id, world_id, system, member_limit, created_at, updated_at",
						)
						.eq("owner_id", user.id);

				const fallbackError =
					memberError ??
					acceptedInvitesError ??
					extraCampaignError ??
					ownedCampaignsError;
				if (fallbackError) {
					set({
						campaignLoadStatus: "error",
						syncError: `Erro ao carregar campanhas: ${remoteErrorMessage(fallbackError)}`,
					});
					return;
				}

				const ownedCampaignRows = (ownedCampaignsData ?? []).map(
					(campaign) => ({
						role: "owner",
						campaign,
					}),
				);

				const combinedRows = [
					...(memberData ?? []),
					...extraCampaignRows,
					...ownedCampaignRows,
				];

				combinedRows.forEach((row) => {
					const c = row.campaign;
					if (c && !campaignsMap.has(c.id)) {
						campaignsMap.set(c.id, mapCampaignRecord(c, row.role));
					}
				});
			}

			campaigns = Array.from(campaignsMap.values());
			set({
				campaigns,
				syncError: null,
				hasLoadedCampaigns: true,
				campaignLoadStatus: "ready",
			});
		} catch (error) {
			set({
				campaignLoadStatus: "error",
				syncError: `Erro ao carregar campanhas: ${remoteErrorMessage(error)}`,
			});
			return;
		}

		// Carregar Mundos acessíveis + garantir Mundos das campanhas aceitas
		try {
			const worlds = await loadAccessibleWorlds();
			const worldIds = new Set(worlds.map((w) => w.id));
			const missingWorldIds = campaigns
				.map((c) => c.worldId)
				.filter((wid) => wid && !worldIds.has(wid));

			if (missingWorldIds.length > 0) {
				const { data: extraWorlds } = await supabase
					.from("worlds")
					.select("id, name, is_default, owner_user_id, created_at, updated_at")
					.in("id", missingWorldIds);

				if (extraWorlds) {
					const mappedExtra = extraWorlds.map((row) => ({
						id: row.id,
						name: row.name,
						isDefault: row.is_default,
						ownerUserId: row.owner_user_id,
						createdAt: row.created_at
							? new Date(row.created_at).getTime()
							: Date.now(),
						updatedAt: row.updated_at ? Date.parse(row.updated_at) : undefined,
					}));
					set({ worlds: [...worlds, ...mappedExtra] });
				} else {
					set({ worlds });
				}
			} else {
				set({ worlds });
			}
		} catch {
			// Campanhas já carregaram
		}

		const state = get();
		const resolved = resolveActiveContextAfterCampaignLoad({
			campaigns,
			activeCampaignId: state.activeCampaignId,
			activeWorldId: state.activeWorldId,
		});

		set({
			activeCampaignId: resolved.campaignId,
			activeWorldId: resolved.worldId,
		});

		if (resolved.campaignId) {
			const activeCamp = campaigns.find((c) => c.id === resolved.campaignId);
			if (activeCamp) {
				const { data: planData } = await supabase
					.from(SUPABASE_TABLES.userPlans)
					.select("plan")
					.eq("user_id", activeCamp.ownerId)
					.maybeSingle();
				const ownerPlan = (planData as any)?.plan || "free";
				set({
					activeCampaignOwnerPlan: ownerPlan as UserPlan,
				});
			}
		}

		void get().loadInvites();
	},

	createCampaign: async (name, description = "", options) => {
		const supabase = getSupabase();
		const id = crypto.randomUUID();
		const originalCampaigns = get().campaigns;
		const originalActiveCampaignId = get().activeCampaignId;
		const originalActiveWorldId = get().activeWorldId;

		if (supabase) {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					throw new Error("Erro ao criar campanha: usuário não autenticado.");
				}

				if (options?.worldId) {
					const known = get().worlds.some((w) => w.id === options.worldId);
					const staffOnWorld = isWorldStaffInWorld(
						get().campaigns,
						options.worldId,
					);
					const ownsWorld = get().worlds.some(
						(w) => w.id === options.worldId && w.ownerUserId === user.id,
					);
					if (!known && !staffOnWorld && !ownsWorld) {
						throw new Error(
							"Mundo inválido ou sem permissão para associar a campanha.",
						);
					}
				}

				const { worldId, createdWorld } = await resolveWorldIdForNewCampaign(
					user.id,
					options,
				);

				const { data: planRow } = await supabase
					.from(SUPABASE_TABLES.userPlans)
					.select("plan")
					.eq("user_id", user.id)
					.maybeSingle();
				const currentPlan: UserPlan =
					(planRow as { plan?: UserPlan } | null)?.plan ||
					get().userPlan ||
					"free";
				if (currentPlan !== get().userPlan) {
					set({ userPlan: currentPlan });
				}

				const state = get();
				if (
					countOwnedCampaignsInWorld(state.campaigns, worldId) >=
					maxOwnedCampaignsPerWorld(currentPlan)
				) {
					const errorMsg = campaignPerWorldLimitError(currentPlan);
					set({ syncError: errorMsg });
					throw new Error(errorMsg);
				}

				const campaign: Campaign = {
					id,
					name,
					description,
					ownerId: user.id,
					worldId,
					system: options?.system ?? "dnd5e",
					myRole: "owner",
					memberLimit: 6,
					createdAt: Date.now(),
				};

				// Não atualizar o store antes do remoto: evita flash do onboarding
				// (campanhaCount > 0) e rollback quando o insert falha.
				const { error: campaignError } = await supabase
					.from(SUPABASE_TABLES.campaigns)
					.insert({
						id,
						name,
						description,
						owner_id: user.id,
						world_id: worldId,
						system: options?.system ?? "dnd5e",
					} as any);
				if (campaignError) {
					throw new Error(
						`falha ao salvar campanha: ${remoteErrorMessage(campaignError)}`,
						{ cause: campaignError },
					);
				}

				const { error: membershipError } = await supabase
					.from(SUPABASE_TABLES.memberships)
					.insert({
						campaign_id: id,
						role: "owner",
						user_id: user.id,
					});
				if (membershipError) {
					await supabase.from(SUPABASE_TABLES.campaigns).delete().eq("id", id);
					throw new Error(
						`falha ao criar membership do owner: ${remoteErrorMessage(membershipError)}`,
						{ cause: membershipError },
					);
				}

				set((state) => ({
					campaigns: [...state.campaigns, campaign],
					activeCampaignId: id,
					activeWorldId: worldId,
					worlds: createdWorld
						? [
								...state.worlds.filter((w) => w.id !== createdWorld.id),
								createdWorld,
							]
						: state.worlds,
					syncError: null,
				}));

				// Garante Mundo Padrão recém-criado na lista local
				await get().loadWorlds();

				return campaign;
			} catch (error) {
				const detail = remoteErrorMessage(error);
				set({
					campaigns: originalCampaigns,
					activeCampaignId: originalActiveCampaignId,
					activeWorldId: originalActiveWorldId,
					syncError: `Erro ao criar campanha: ${detail}`,
				});
				console.error("[createCampaign]", detail, error);
				throw error;
			}
		} else {
			set({
				syncError:
					"Não é possível criar campanha offline: é necessário um Mundo no servidor.",
			});
			throw new Error(
				"Não é possível criar campanha offline: é necessário um Mundo no servidor.",
			);
		}
	},

	updateCampaign: (id, data) => {
		const originalCampaigns = get().campaigns;
		set((state) => ({
			campaigns: state.campaigns.map((c) =>
				c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c,
			),
			syncError: null,
		}));

		const supabase = getSupabase();
		if (supabase) {
			const updatePayload: Record<string, unknown> = {};
			if (data.name !== undefined) updatePayload.name = data.name;
			if (data.description !== undefined)
				updatePayload.description = data.description;
			if (data.system !== undefined) updatePayload.system = data.system;
			if (data.memberLimit !== undefined)
				updatePayload.member_limit = data.memberLimit;

			void supabase
				.from(SUPABASE_TABLES.campaigns)
				.update(updatePayload as any)
				.eq("id", id)
				.then(({ error }) => {
					if (error) {
						set({
							campaigns: originalCampaigns,
							syncError: `Erro ao atualizar campanha: ${error.message}`,
						});
					}
				});
		}
	},

	deleteCampaign: async (id) => {
		const state = get();
		// Não permitir deletar a última campanha
		if (state.campaigns.length <= 1) return;

		const originalCampaigns = state.campaigns;

		const promoteOrphan = <
			T extends {
				campaignIds: string[];
				publicationScope?: "global" | "restricted";
				audience?: "global" | "restricted";
			},
		>(
			items: T[],
			scopeKey: "publicationScope" | "audience",
		): T[] =>
			items.map((item) => {
				const scope = item[scopeKey] ?? "global";
				if (scope !== "restricted" || !item.campaignIds.includes(id)) {
					return item;
				}
				const nextIds = item.campaignIds.filter((cid) => cid !== id);
				return {
					...item,
					campaignIds: nextIds,
					[scopeKey]: nextIds.length === 0 ? "global" : scope,
				};
			});

		const supabase = getSupabase();
		if (supabase) {
			const { error } = await supabase
				.from(SUPABASE_TABLES.campaigns)
				.delete()
				.eq("id", id);
			if (error) {
				set({
					syncError: `Erro ao deletar campanha: ${error.message}`,
				});
				return;
			}
		}

		set((prev) => ({
			campaigns: prev.campaigns.filter((c) => c.id !== id),
			factionReputations: prev.factionReputations.filter(
				(r) => r.campaignId !== id,
			),
			npcs: promoteOrphan(prev.npcs, "publicationScope"),
			items: promoteOrphan(prev.items, "publicationScope"),
			locations: promoteOrphan(prev.locations, "publicationScope"),
			lores: promoteOrphan(prev.lores, "publicationScope"),
			worldNews: promoteOrphan(prev.worldNews, "audience"),
			syncError: null,
		}));

		// Se deletou a campanha ativa, trocar para a primeira disponível
		if (state.activeCampaignId === id) {
			const remaining = originalCampaigns.filter((c) => c.id !== id);
			if (remaining.length > 0) {
				await get().switchCampaign(remaining[0].id);
			}
		}
	},

	switchCampaign: async (id) => {
		const state = get();
		const activeCamp = state.campaigns.find((c) => c.id === id);
		if (state.activeCampaignId === id) {
			if (activeCamp) set({ activeWorldId: activeCamp.worldId });
			return;
		}

		// Limpar entidades da mesa anterior sem derrubar bootstrap/campanhas
		state.clearActiveCampaignEntities();
		set({
			activeCampaignId: id,
			activeWorldId: activeCamp?.worldId ?? state.activeWorldId,
		});

		// Carregar o plano do criador da campanha ativa
		const supabase = getSupabase();
		if (activeCamp && supabase) {
			const { data: planData } = await supabase
				.from(SUPABASE_TABLES.userPlans)
				.select("plan")
				.eq("user_id", activeCamp.ownerId)
				.maybeSingle();
			const ownerPlan = (planData as any)?.plan || "free";
			set({ activeCampaignOwnerPlan: ownerPlan as UserPlan });
		}

		// Recarregar dados da nova campanha
		await get().loadRemoteData();
	},

	switchWorld: async (worldId) => {
		const state = get();
		if (!worldId) return;
		const currentInWorld = state.campaigns.find(
			(c) => c.id === state.activeCampaignId && c.worldId === worldId,
		);
		if (currentInWorld) {
			set({ activeWorldId: worldId });
			return;
		}
		const firstInWorld = state.campaigns.find((c) => c.worldId === worldId);
		if (firstInWorld) {
			await get().switchCampaign(firstInWorld.id);
			return;
		}
		if (state.activeCampaignId) {
			state.clearActiveCampaignEntities();
		}
		set({ activeCampaignId: null, activeWorldId: worldId });
	},

	loadInvites: async () => {
		const supabase = getSupabase();
		if (!supabase) return;

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user || !user.email) return;

		const userEmailClean = user.email.trim().toLowerCase();

		const { data, error } = await supabase
			.from(SUPABASE_TABLES.invites)
			.select(`
				id,
				campaign_id,
				email,
				role,
				status,
				invited_by,
				created_at,
				campaign:campaigns ( name )
			`)
			.ilike("email", userEmailClean)
			.eq("status", "pending")
			.order("created_at", { ascending: false });

		if (error) {
			set({ syncError: `Erro ao carregar convites: ${error.message}` });
			return;
		}

		// Se o RLS omitiu o nome da campanha no join, buscar nomes diretamente
		const rawRows = data ?? [];
		const missingNameCampaignIds = rawRows
			.filter((row: any) => !row.campaign?.name && row.campaign_id)
			.map((row: any) => row.campaign_id as string);

		let campaignNamesMap: Record<string, string> = {};
		if (missingNameCampaignIds.length > 0) {
			const { data: fetchedCamps } = await supabase
				.from(SUPABASE_TABLES.campaigns)
				.select("id, name")
				.in("id", missingNameCampaignIds);

			if (fetchedCamps) {
				campaignNamesMap = Object.fromEntries(
					fetchedCamps.map((c: any) => [c.id, c.name]),
				);
			}
		}

		const pendingInvites: Invite[] = rawRows.map((row: any) => ({
			id: row.id,
			campaignId: row.campaign_id,
			email: row.email,
			role: row.role,
			status: row.status,
			invitedBy: row.invited_by,
			createdAt: new Date(row.created_at).getTime(),
			campaignName:
				row.campaign?.name ||
				campaignNamesMap[row.campaign_id] ||
				"Mesa de RPG",
		}));

		set({ pendingInvites, syncError: null });

		// Adicionar convites pendentes às Notificações do sino no topo
		if (pendingInvites.length > 0) {
			const currentNotifications = get().notifications;
			pendingInvites.forEach((invite) => {
				const notifTitle = "Convite para Campanha ✉️";
				const notifDesc = `Você foi convidado para a mesa "${invite.campaignName}" como ${invite.role === "editor" ? "Co-Mestre" : "Jogador"}.`;

				const alreadyExists = currentNotifications.some(
					(n) => n.description === notifDesc,
				);

				if (!alreadyExists) {
					get().addNotification({
						title: notifTitle,
						description: notifDesc,
						variant: "info",
					});
				}
			});
		}
	},

	createInvite: async (campaignId, email, role) => {
		const supabase = getSupabase();
		if (!supabase) return;

		const targetEmail = email.trim().toLowerCase();

		// 1. Contar membros (excluindo owner)
		const { data: memberCountData, error: memberError } = await supabase
			.from(SUPABASE_TABLES.memberships)
			.select("user_id")
			.eq("campaign_id", campaignId)
			.neq("role", "owner");

		if (memberError) {
			set({
				syncError: `Erro ao validar limite de membros: ${memberError.message}`,
			});
			return;
		}

		// 2. Contar convites pendentes
		const { data: inviteCountData, error: inviteError } = await supabase
			.from(SUPABASE_TABLES.invites)
			.select("id")
			.eq("campaign_id", campaignId)
			.eq("status", "pending");

		if (inviteError) {
			set({
				syncError: `Erro ao validar limite de convites: ${inviteError.message}`,
			});
			return;
		}

		const totalParticipants =
			(memberCountData?.length || 0) + (inviteCountData?.length || 0);
		const memberLimit =
			get().campaigns.find((campaign) => campaign.id === campaignId)
				?.memberLimit ?? 6;
		if (totalParticipants >= memberLimit) {
			const errorMsg = `Limite de participantes atingido (maximo de ${memberLimit} por mesa).`;
			set({ syncError: errorMsg });
			throw new Error(errorMsg);
		}
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const { error } = await supabase.from(SUPABASE_TABLES.invites).insert({
			campaign_id: campaignId,
			email: targetEmail,
			role: role,
			status: "pending",
			invited_by: user.id,
		});

		if (error) {
			set({ syncError: `Erro ao enviar convite: ${error.message}` });
			throw error;
		}
	},

	revokeInvite: async (inviteId) => {
		const supabase = getSupabase();
		if (!supabase) return;

		const { error } = await supabase
			.from(SUPABASE_TABLES.invites)
			.delete()
			.eq("id", inviteId);

		if (error) {
			set({ syncError: `Erro ao revogar convite: ${error.message}` });
			throw error;
		}
	},

	removeMember: async (campaignId, userId) => {
		const supabase = getSupabase();
		if (!supabase) return;

		const members = await get().loadCampaignMembersAndInvites(campaignId);
		const target = members.members.find((m) => m.userId === userId);
		const actorRole = get().campaigns.find((c) => c.id === campaignId)?.myRole;

		if (target?.role === "owner" && actorRole !== "owner") {
			const errorMsg = "Co-mestres não podem remover ou alterar o mestre.";
			set({ syncError: errorMsg });
			throw new Error("CANNOT_MODIFY_OWNER");
		}

		const { error } = await supabase
			.from(SUPABASE_TABLES.memberships)
			.delete()
			.eq("campaign_id", campaignId)
			.eq("user_id", userId);

		if (error) {
			set({ syncError: `Erro ao remover membro: ${error.message}` });
			throw error;
		}
	},

	acceptInvite: async (inviteId) => {
		const supabase = getSupabase();
		if (!supabase) return;

		// 1. Obter dados do convite antes de aceitar
		const { data: invite, error: fetchError } = await supabase
			.from(SUPABASE_TABLES.invites)
			.select("campaign_id, role, email")
			.eq("id", inviteId)
			.maybeSingle();

		if (fetchError || !invite) {
			const errorMsg = "Convite não encontrado ou já expirado.";
			set({ syncError: errorMsg });
			throw new Error(errorMsg);
		}

		// 2. Atualizar status do convite para 'accepted'
		const { error } = await supabase
			.from(SUPABASE_TABLES.invites)
			.update({ status: "accepted" })
			.eq("id", inviteId);

		if (error) {
			set({ syncError: `Erro ao aceitar convite: ${error.message}` });
			throw error;
		}

		// 3. Garantir a inserção do usuário na tabela de memberships
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (user && invite.campaign_id) {
			const { error: memberError } = await supabase
				.from(SUPABASE_TABLES.memberships)
				.upsert(
					{
						campaign_id: invite.campaign_id,
						user_id: user.id,
						role: invite.role as MembershipRole,
					},
					{ onConflict: "campaign_id, user_id" },
				);

			if (memberError) {
				console.warn(
					"Aviso ao registrar pertencimento no banco:",
					memberError.message,
				);
			}
		}

		set((state) => ({
			pendingInvites: state.pendingInvites.filter((i) => i.id !== inviteId),
		}));

		// 4. Recarregar campanhas e mundos acessíveis
		await get().loadCampaigns();

		// 5. Trocar ativamente o contexto para a nova campanha aceita!
		if (invite.campaign_id) {
			await get().switchCampaign(invite.campaign_id);
		}
	},

	declineInvite: async (inviteId) => {
		const supabase = getSupabase();
		if (!supabase) return;

		const { error } = await supabase
			.from(SUPABASE_TABLES.invites)
			.update({ status: "declined" })
			.eq("id", inviteId);

		if (error) {
			set({ syncError: `Erro ao recusar convite: ${error.message}` });
			throw error;
		}

		set((state) => ({
			pendingInvites: state.pendingInvites.filter((i) => i.id !== inviteId),
		}));
	},

	loadCampaignMembersAndInvites: async (campaignId) => {
		const supabase = getSupabase();
		if (!supabase) return { members: [], invites: [] };

		// 1. Carregar membros via RPC segura
		const { data: membersData, error: membersError } = await (
			supabase as any
		).rpc("get_campaign_members", { p_campaign_id: campaignId });

		if (membersError) {
			set({ syncError: `Erro ao carregar membros: ${membersError.message}` });
			throw membersError;
		}

		// 2. Carregar convites pendentes
		const { data: invitesData, error: invitesError } = await supabase
			.from(SUPABASE_TABLES.invites)
			.select("*")
			.eq("campaign_id", campaignId)
			.eq("status", "pending");

		if (invitesError) {
			set({ syncError: `Erro ao carregar convites: ${invitesError.message}` });
			throw invitesError;
		}

		return {
			members: (membersData ?? []).map((m: any) => ({
				id: m.membership_id,
				userId: m.user_id,
				email: m.email,
				role: m.role as MembershipRole,
			})),
			invites: (invitesData ?? []).map((i: any) => ({
				id: i.id,
				campaignId: i.campaign_id,
				email: i.email,
				role: i.role as "editor" | "viewer",
				status: i.status as InviteStatus,
				invitedBy: i.invited_by,
				createdAt: new Date(i.created_at).getTime(),
			})),
		};
	},
});
