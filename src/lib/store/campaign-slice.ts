import type { StateCreator } from "zustand";
import { getSupabase, SUPABASE_TABLES } from "../supabase";
import type {
	Campaign,
	Invite,
	InviteStatus,
	MembershipRole,
	RPGState,
	UserPlan,
} from "./types";

interface MembershipCampaignRow {
	role?: string | null;
	campaign: {
		id: string;
		name?: string | null;
		description?: string | null;
		owner_id?: string | null;
		created_at?: string | null;
		updated_at?: string | null;
	} | null;
}

export interface CampaignSlice {
	campaigns: Campaign[];
	activeCampaignId: string | null;
	activeCampaignOwnerPlan: UserPlan;
	pendingInvites: Invite[];

	loadCampaigns: () => Promise<void>;
	createCampaign: (name: string, description?: string) => Promise<Campaign>;
	updateCampaign: (
		id: string,
		data: Partial<Pick<Campaign, "name" | "description">>,
	) => void;
	deleteCampaign: (id: string) => Promise<void>;
	switchCampaign: (id: string) => Promise<void>;

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
}

export const createCampaignSlice: StateCreator<
	RPGState,
	[],
	[],
	CampaignSlice
> = (set, get) => ({
	campaigns: [],
	activeCampaignId: null,
	activeCampaignOwnerPlan: "free",
	pendingInvites: [],

	loadCampaigns: async () => {
		const supabase = getSupabase();
		if (!supabase) return;

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
					created_at,
					updated_at
				)
			`)
			.order("created_at", { ascending: true });

		if (error) {
			set({ syncError: `Erro ao carregar campanhas: ${error.message}` });
			return;
		}

		const campaigns: Campaign[] = ((data ?? []) as MembershipCampaignRow[])
			.filter((row) => row.campaign !== null)
			.map((row) => {
				const c = row.campaign;
				if (!c) throw new Error("Campanha ausente no membership.");
				return {
					id: c.id,
					name: c.name ?? "Sem nome",
					description: c.description ?? "",
					ownerId: c.owner_id ?? "",
					myRole: row.role as MembershipRole,
					createdAt: c.created_at
						? new Date(c.created_at).getTime()
						: Date.now(),
					updatedAt: c.updated_at
						? new Date(c.updated_at).getTime()
						: undefined,
				};
			});

		set({ campaigns, syncError: null });

		// Se não há campanha ativa, ou a ativa não existe mais, selecionar a primeira
		const state = get();
		const activeId =
			state.activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);
		if (activeId) {
			if (
				!state.activeCampaignId ||
				!campaigns.some((c) => c.id === state.activeCampaignId)
			) {
				set({ activeCampaignId: activeId });
			}

			// Carregar o plano do dono da campanha ativa
			const activeCamp = campaigns.find((c) => c.id === activeId);
			if (activeCamp) {
				const { data: planData } = await supabase
					.from(SUPABASE_TABLES.userPlans)
					.select("plan")
					.eq("user_id", activeCamp.ownerId)
					.maybeSingle();
				const ownerPlan = (planData as any)?.plan || "free";
				set({ activeCampaignOwnerPlan: ownerPlan as UserPlan });
			}
		}
	},

	createCampaign: async (name, description = "") => {
		const state = get();
		const maxCampaigns = state.userPlan === "pro" ? 5 : 1;
		if (state.campaigns.length >= maxCampaigns) {
			const errorMsg = `Limite de campanhas atingido (${maxCampaigns}). ${
				state.userPlan === "pro"
					? "Você atingiu o limite máximo de 5 campanhas do plano Pro."
					: "Faça upgrade para o plano Pro para criar até 5 campanhas."
			}`;
			set({ syncError: errorMsg });
			throw new Error(errorMsg);
		}

		const supabase = getSupabase();
		const id = crypto.randomUUID();
		const originalCampaigns = get().campaigns;

		if (supabase) {
			try {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					throw new Error("Erro ao criar campanha: usuário não autenticado.");
				}

				const campaign: Campaign = {
					id,
					name,
					description,
					ownerId: user.id,
					myRole: "owner",
					createdAt: Date.now(),
				};

				set((state) => ({
					campaigns: [...state.campaigns, campaign],
					syncError: null,
				}));

				// Criar a campanha com owner_id explicitamente passado
				const { error: campaignError } = await supabase
					.from(SUPABASE_TABLES.campaigns)
					.insert({
						id,
						name,
						description,
						owner_id: user.id,
					});
				if (campaignError) {
					throw campaignError;
				}

				// Criar membership 'owner' para o criador
				const { error: membershipError } = await supabase
					.from(SUPABASE_TABLES.memberships)
					.insert({
						campaign_id: id,
						role: "owner",
						user_id: user.id,
					});
				if (membershipError) {
					// Rollback remote campaign insertion
					await supabase.from(SUPABASE_TABLES.campaigns).delete().eq("id", id);
					throw membershipError;
				}

				return campaign;
			} catch (error) {
				const errMsg = error instanceof Error ? error.message : String(error);
				set({
					campaigns: originalCampaigns,
					syncError: `Erro ao criar campanha: ${errMsg}`,
				});
				throw error;
			}
		} else {
			const campaign: Campaign = {
				id,
				name,
				description,
				ownerId: "",
				myRole: "owner",
				createdAt: Date.now(),
			};
			set((state) => ({
				campaigns: [...state.campaigns, campaign],
				syncError: null,
			}));
			return campaign;
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
			void supabase
				.from(SUPABASE_TABLES.campaigns)
				.update({ name: data.name, description: data.description })
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
		const originalActiveId = state.activeCampaignId;

		set((prev) => ({
			campaigns: prev.campaigns.filter((c) => c.id !== id),
			syncError: null,
		}));

		// Se deletou a campanha ativa, trocar para a primeira disponível
		if (state.activeCampaignId === id) {
			const remaining = state.campaigns.filter((c) => c.id !== id);
			if (remaining.length > 0) {
				await get().switchCampaign(remaining[0].id);
			}
		}

		const supabase = getSupabase();
		if (supabase) {
			const { error } = await supabase
				.from(SUPABASE_TABLES.campaigns)
				.delete()
				.eq("id", id);
			if (error) {
				set({
					campaigns: originalCampaigns,
					activeCampaignId: originalActiveId,
					syncError: `Erro ao deletar campanha: ${error.message}`,
				});
			}
		}
	},

	switchCampaign: async (id) => {
		const state = get();
		if (state.activeCampaignId === id) return;

		// Limpar dados locais e setar nova campanha
		state.clearLocalData();
		set({ activeCampaignId: id });

		// Carregar o plano do criador da campanha ativa
		const activeCamp = state.campaigns.find((c) => c.id === id);
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
