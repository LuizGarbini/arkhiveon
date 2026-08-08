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
	Invite,
	InviteStatus,
	MembershipRole,
	RPGState,
	RpgSystem,
	UserPlan,
	World,
} from "./types";

interface MembershipCampaignRow {
	role?: string | null;
	campaign: {
		id: string;
		name?: string | null;
		description?: string | null;
		owner_id?: string | null;
		world_id?: string | null;
		system?: string | null;
		created_at?: string | null;
		updated_at?: string | null;
	} | null;
}

export interface CampaignSlice {
	campaigns: Campaign[];
	activeCampaignId: string | null;
	activeWorldId: string | null;
	activeCampaignOwnerPlan: UserPlan;
	/** False until the first loadCampaigns() for this session finishes. */
	hasLoadedCampaigns: boolean;
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
		data: Partial<Pick<Campaign, "name" | "description" | "system">>,
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
	pendingInvites: [],

	worlds: [],

	resetCampaigns: () =>
		set({
			campaigns: [],
			activeCampaignId: null,
			activeWorldId: null,
			activeCampaignOwnerPlan: "free",
			hasLoadedCampaigns: false,
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
		const state = get();
		if (
			countOwnedWorlds(state.worlds, user.id) >= maxOwnedWorlds(state.userPlan)
		) {
			const errorMsg = worldLimitError(state.userPlan);
			set({ syncError: errorMsg });
			throw new Error(errorMsg);
		}
		const created = await createRemoteWorld({
			ownerUserId: user.id,
			name,
			isDefault: countOwnedWorlds(state.worlds, user.id) === 0,
		});
		set((state) => ({
			worlds: [...state.worlds, created],
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
			const defaultWorld =
				nextWorlds.find((w) => w.isDefault) ?? nextWorlds[0];
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
		const supabase = getSupabase();
		if (!supabase) {
			set({ hasLoadedCampaigns: true });
			return;
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			set({ hasLoadedCampaigns: true });
			return;
		}

		// Carregar campanhas das quais o usuário é membro, com role
		const { data, error } = await supabase
			.from(SUPABASE_TABLES.memberships)
			.select(`
				role,
				campaign:campaigns (
					id,
					name,
					description,
					owner_id,
					world_id,
					system,
					created_at,
					updated_at
				)
			`)
			.eq("user_id", user.id)
			.order("created_at", { ascending: true });

		if (error) {
			set({
				syncError: `Erro ao carregar campanhas: ${error.message}`,
				hasLoadedCampaigns: true,
			});
			return;
		}

		const campaigns: Campaign[] = (
			(data ?? []) as unknown as MembershipCampaignRow[]
		)
			.filter((row) => row.campaign !== null)
			.map((row) => {
				const c = row.campaign;
				if (!c) throw new Error("Campanha ausente no membership.");
				return {
					id: c.id,
					name: c.name ?? "Sem nome",
					description: c.description ?? "",
					ownerId: c.owner_id ?? "",
					worldId: c.world_id ?? "",
					system: (c.system as RpgSystem) ?? "dnd5e",
					myRole: row.role as MembershipRole,
					createdAt: c.created_at
						? new Date(c.created_at).getTime()
						: Date.now(),
					updatedAt: c.updated_at
						? new Date(c.updated_at).getTime()
						: undefined,
				};
			});

		set({ campaigns, syncError: null, hasLoadedCampaigns: true });

		// Mundos acessíveis (dono ou membro de campanha)
		try {
			const worlds = await loadAccessibleWorlds();
			set({ worlds });
		} catch {
			// Campanhas já carregaram; mundos podem falhar sem bloquear a sessão
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
				const state = get();
				if (
					countOwnedCampaignsInWorld(state.campaigns, worldId) >=
					maxOwnedCampaignsPerWorld(state.userPlan)
				) {
					const errorMsg = campaignPerWorldLimitError(state.userPlan);
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
			.eq("email", user.email)
			.eq("status", "pending")
			.order("created_at", { ascending: false });

		if (error) {
			set({ syncError: `Erro ao carregar convites: ${error.message}` });
			return;
		}

		const pendingInvites: Invite[] = (data ?? []).map((row: any) => ({
			id: row.id,
			campaignId: row.campaign_id,
			email: row.email,
			role: row.role,
			status: row.status,
			invitedBy: row.invited_by,
			createdAt: new Date(row.created_at).getTime(),
			campaignName: row.campaign?.name || "Campanha sem nome",
		}));

		set({ pendingInvites, syncError: null });
	},

	createInvite: async (campaignId, email, role) => {
		const supabase = getSupabase();
		if (!supabase) return;

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
		if (totalParticipants >= 6) {
			const errorMsg =
				"Limite de participantes atingido (máximo de 6 por mesa).";
			set({ syncError: errorMsg });
			throw new Error(errorMsg);
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		const { error } = await supabase.from(SUPABASE_TABLES.invites).insert({
			campaign_id: campaignId,
			email: email.trim(),
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

		const { error } = await supabase
			.from(SUPABASE_TABLES.invites)
			.update({ status: "accepted" })
			.eq("id", inviteId);

		if (error) {
			set({ syncError: `Erro ao aceitar convite: ${error.message}` });
			throw error;
		}

		set((state) => ({
			pendingInvites: state.pendingInvites.filter((i) => i.id !== inviteId),
		}));

		await get().loadCampaigns();
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
