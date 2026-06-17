import type { StateCreator } from "zustand";
import { getSupabase, SUPABASE_TABLES } from "../supabase";
import type { Campaign, MembershipRole, RPGState } from "./types";

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

	loadCampaigns: () => Promise<void>;
	createCampaign: (name: string, description?: string) => Promise<Campaign>;
	updateCampaign: (
		id: string,
		data: Partial<Pick<Campaign, "name" | "description">>,
	) => void;
	deleteCampaign: (id: string) => Promise<void>;
	switchCampaign: (id: string) => Promise<void>;
}

export const createCampaignSlice: StateCreator<
	RPGState,
	[],
	[],
	CampaignSlice
> = (set, get) => ({
	campaigns: [],
	activeCampaignId: null,

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
		if (
			!state.activeCampaignId ||
			!campaigns.some((c) => c.id === state.activeCampaignId)
		) {
			if (campaigns.length > 0) {
				set({ activeCampaignId: campaigns[0].id });
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
		const campaign: Campaign = {
			id,
			name,
			description,
			ownerId: "", // será preenchido pelo supabase (auth.uid())
			myRole: "owner",
			createdAt: Date.now(),
		};

		const originalCampaigns = get().campaigns;

		set((state) => ({
			campaigns: [...state.campaigns, campaign],
			syncError: null,
		}));

		if (supabase) {
			try {
				// Criar a campanha
				const { error: campaignError } = await supabase
					.from(SUPABASE_TABLES.campaigns)
					.insert({
						id,
						name,
						description,
					});
				if (campaignError) {
					throw campaignError;
				}

				// Criar membership 'owner' para o criador
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					throw new Error("Erro ao criar membership: usuário não autenticado.");
				}

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
			} catch (error) {
				const errMsg = error instanceof Error ? error.message : String(error);
				set({
					campaigns: originalCampaigns,
					syncError: `Erro ao criar campanha: ${errMsg}`,
				});
				throw error;
			}
		}

		return campaign;
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

		// Recarregar dados da nova campanha
		await get().loadRemoteData();
	},
});
