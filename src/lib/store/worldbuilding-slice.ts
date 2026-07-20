import type { StateCreator } from "zustand";
import {
	createRemoteFaction,
	createRemoteNewsComment,
	createRemoteWorldNews,
	deleteRemoteFaction,
	deleteRemoteNewsComment,
	deleteRemoteWorldNews,
	loadRemoteNewsComments,
	updateRemoteFaction,
	updateRemoteFactionReputation,
	updateRemoteNewsComment,
	updateRemoteWorldNews,
} from "../remote-worldbuilding";
import { getSupabase } from "../supabase";
import { WORLD_GRIMOIRE_FORBIDDEN } from "../worldbuilding/campaign-content";
import {
	canCommentOnNews,
	defaultWorldEntityFields,
	isWorldStaffInWorld,
	validateRestrictedScope,
} from "../worldbuilding/visibility";
import { generateEntry, remoteErrorMessage } from "./helpers";
import type {
	Faction,
	FactionReputationStatus,
	NewsComment,
	RPGState,
	WorldNews,
} from "./types";

export const factionDefaults: Omit<Faction, "id" | "createdAt" | "worldId"> = {
	name: "",
	leader: "",
	seat: "",
	goals: "",
	alignment: "",
	influence: "",
	description: "",
	imageUrl: "",
};

export const worldNewsDefaults: Omit<
	WorldNews,
	"id" | "createdAt" | "worldId" | "authorId"
> = {
	title: "",
	body: "",
	category: "",
	audience: "global",
	campaignIds: [],
	visibility: "public",
	commentsLocked: false,
};

function activeWorldContext(get: () => RPGState) {
	const activeCampaignId = get().activeCampaignId;
	const activeCampaign = get().campaigns.find((c) => c.id === activeCampaignId);
	if (!activeCampaign?.worldId) return null;
	return {
		campaign: activeCampaign,
		worldCampaignIds: get()
			.campaigns.filter((c) => c.worldId === activeCampaign.worldId)
			.map((c) => c.id),
	};
}

function assertWorldStaff(
	get: () => RPGState,
	set: Parameters<StateCreator<RPGState, [], [], WorldbuildingSlice>>[0],
	message: string = WORLD_GRIMOIRE_FORBIDDEN,
): boolean {
	const activeCampaignId = get().activeCampaignId;
	const activeCampaign = get().campaigns.find((c) => c.id === activeCampaignId);
	if (
		!activeCampaign?.worldId ||
		!isWorldStaffInWorld(get().campaigns, activeCampaign.worldId)
	) {
		set({ syncError: message });
		return false;
	}
	return true;
}

export interface WorldbuildingSlice {
	factions: Faction[];
	factionReputations: RPGState["factionReputations"];
	worldNews: WorldNews[];
	newsComments: NewsComment[];

	addFaction: (
		faction: Partial<Omit<Faction, "id" | "createdAt" | "worldId">>,
	) => Faction | null;
	updateFaction: (id: string, faction: Partial<Faction>) => void;
	removeFaction: (id: string) => void;
	updateFactionReputation: (
		factionId: string,
		campaignId: string,
		status: FactionReputationStatus,
	) => void;

	addWorldNews: (
		news: Partial<Omit<WorldNews, "id" | "createdAt" | "worldId" | "authorId">>,
	) => Promise<WorldNews | null>;
	updateWorldNews: (id: string, news: Partial<WorldNews>) => void;
	removeWorldNews: (id: string) => void;
	loadNewsComments: (newsId: string) => Promise<void>;
	addNewsComment: (
		newsId: string,
		body: string,
		parentId?: string | null,
	) => Promise<NewsComment | null>;
	updateNewsComment: (id: string, body: string) => void;
	removeNewsComment: (id: string) => void;
}

export const createWorldbuildingSlice: StateCreator<
	RPGState,
	[],
	[],
	WorldbuildingSlice
> = (set, get) => ({
	factions: [],
	factionReputations: [],
	worldNews: [],
	newsComments: [],

	addFaction: (faction) => {
		const ctx = activeWorldContext(get);
		if (!ctx) {
			set({ syncError: "Nenhuma campanha ativa para adicionar facção." });
			return null;
		}
		if (
			!assertWorldStaff(
				get,
				set,
				"Sem permissão para gerenciar facções do Mundo.",
			)
		) {
			return null;
		}

		const created = {
			...(generateEntry(factionDefaults, faction) as Omit<Faction, "worldId">),
			worldId: ctx.campaign.worldId,
		} as Faction;
		const seededReps = ctx.worldCampaignIds.map((campaignId) => ({
			id: crypto.randomUUID(),
			factionId: created.id,
			campaignId,
			status: "neutral" as const,
			createdAt: Date.now(),
		}));
		const original = get().factions;
		const originalReps = get().factionReputations;
		set((state) => ({
			factions: [...state.factions, created],
			factionReputations: [...state.factionReputations, ...seededReps],
			syncError: null,
		}));

		void createRemoteFaction(created).catch((error) => {
			set({
				factions: original,
				factionReputations: originalReps,
				syncError: remoteErrorMessage(error),
			});
		});

		return created;
	},

	updateFaction: (id, faction) => {
		if (
			!assertWorldStaff(
				get,
				set,
				"Sem permissão para gerenciar facções do Mundo.",
			)
		) {
			return;
		}
		const original = get().factions;
		set((state) => ({
			factions: state.factions.map((f) =>
				f.id === id ? { ...f, ...faction, updatedAt: Date.now() } : f,
			),
			syncError: null,
		}));
		void updateRemoteFaction(id, faction).catch((error) => {
			set({ factions: original, syncError: remoteErrorMessage(error) });
		});
	},

	removeFaction: (id) => {
		if (
			!assertWorldStaff(
				get,
				set,
				"Sem permissão para gerenciar facções do Mundo.",
			)
		) {
			return;
		}
		const originalFactions = get().factions;
		const originalReps = get().factionReputations;
		set((state) => ({
			factions: state.factions.filter((f) => f.id !== id),
			factionReputations: state.factionReputations.filter(
				(r) => r.factionId !== id,
			),
			syncError: null,
		}));
		void deleteRemoteFaction(id).catch((error) => {
			set({
				factions: originalFactions,
				factionReputations: originalReps,
				syncError: remoteErrorMessage(error),
			});
		});
	},

	updateFactionReputation: (factionId, campaignId, status) => {
		if (!assertWorldStaff(get, set, "Sem permissão para editar reputação.")) {
			return;
		}
		const original = get().factionReputations;
		set((state) => {
			const exists = state.factionReputations.some(
				(r) => r.factionId === factionId && r.campaignId === campaignId,
			);
			return {
				factionReputations: exists
					? state.factionReputations.map((r) =>
							r.factionId === factionId && r.campaignId === campaignId
								? { ...r, status, updatedAt: Date.now() }
								: r,
						)
					: [
							...state.factionReputations,
							{
								id: crypto.randomUUID(),
								factionId,
								campaignId,
								status,
								createdAt: Date.now(),
								updatedAt: Date.now(),
							},
						],
				syncError: null,
			};
		});
		void updateRemoteFactionReputation(factionId, campaignId, status).catch(
			(error) => {
				set({
					factionReputations: original,
					syncError: remoteErrorMessage(error),
				});
			},
		);
	},

	addWorldNews: async (news) => {
		const ctx = activeWorldContext(get);
		if (!ctx) {
			set({
				syncError:
					"Campanha sem Mundo associado. Recarregue ou recrie a campanha online.",
			});
			return null;
		}
		if (!assertWorldStaff(get, set, "Sem permissão para gerenciar o mural.")) {
			return null;
		}

		const supabase = getSupabase();
		let authorId = "";
		if (supabase) {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user?.id) {
				set({ syncError: "Sessão inválida. Faça login novamente." });
				return null;
			}
			authorId = user.id;
		}

		const audience = news.audience ?? worldNewsDefaults.audience;
		let campaignIds = news.campaignIds ?? [];
		if (audience === "restricted" && campaignIds.length === 0) {
			const activeCampaignId = get().activeCampaignId;
			if (activeCampaignId) campaignIds = [activeCampaignId];
		}

		const draft = {
			...(generateEntry(worldNewsDefaults, {
				...news,
				audience,
				campaignIds,
			}) as Omit<WorldNews, "worldId" | "authorId">),
			worldId: ctx.campaign.worldId,
			authorId,
		} as WorldNews;

		const scopeError = validateRestrictedScope(
			draft.audience,
			draft.campaignIds,
			ctx.worldCampaignIds,
		);
		if (scopeError) {
			set({ syncError: scopeError });
			return null;
		}

		const original = get().worldNews;
		set((state) => ({
			worldNews: [draft, ...state.worldNews],
			syncError: null,
		}));

		try {
			await createRemoteWorldNews(draft);
			return draft;
		} catch (error) {
			set({ worldNews: original, syncError: remoteErrorMessage(error) });
			return null;
		}
	},

	updateWorldNews: (id, news) => {
		if (!assertWorldStaff(get, set, "Sem permissão para gerenciar o mural.")) {
			return;
		}
		const ctx = activeWorldContext(get);
		if (ctx && news.audience !== undefined) {
			const campaignIds =
				news.campaignIds ??
				get().worldNews.find((n) => n.id === id)?.campaignIds ??
				[];
			const scopeError = validateRestrictedScope(
				news.audience,
				campaignIds,
				ctx.worldCampaignIds,
			);
			if (scopeError) {
				set({ syncError: scopeError });
				return;
			}
		}
		const original = get().worldNews;
		set((state) => ({
			worldNews: state.worldNews.map((n) =>
				n.id === id ? { ...n, ...news, updatedAt: Date.now() } : n,
			),
			syncError: null,
		}));
		void updateRemoteWorldNews(id, news).catch((error) => {
			set({ worldNews: original, syncError: remoteErrorMessage(error) });
		});
	},

	removeWorldNews: (id) => {
		if (!assertWorldStaff(get, set, "Sem permissão para gerenciar o mural.")) {
			return;
		}
		const originalNews = get().worldNews;
		const originalComments = get().newsComments;
		set((state) => ({
			worldNews: state.worldNews.filter((n) => n.id !== id),
			newsComments: state.newsComments.filter((c) => c.newsId !== id),
			syncError: null,
		}));
		void deleteRemoteWorldNews(id).catch((error) => {
			set({
				worldNews: originalNews,
				newsComments: originalComments,
				syncError: remoteErrorMessage(error),
			});
		});
	},

	loadNewsComments: async (newsId) => {
		try {
			const comments = await loadRemoteNewsComments(newsId);
			set((state) => ({
				newsComments: [
					...state.newsComments.filter((c) => c.newsId !== newsId),
					...comments,
				],
				worldNews: state.worldNews.map((n) =>
					n.id === newsId ? { ...n, commentCount: comments.length } : n,
				),
			}));
		} catch (error) {
			set({ syncError: remoteErrorMessage(error) });
		}
	},

	addNewsComment: async (newsId, body, parentId = null) => {
		const trimmed = body.trim();
		if (!trimmed) return null;

		const news = get().worldNews.find((n) => n.id === newsId);
		if (!news) {
			set({ syncError: "Notícia não encontrada." });
			return null;
		}

		const activeCampaignId = get().activeCampaignId;
		const activeCampaign = get().campaigns.find(
			(c) => c.id === activeCampaignId,
		);
		const activeCtx = activeCampaign?.worldId
			? { id: activeCampaign.id, worldId: activeCampaign.worldId }
			: null;
		const role = activeCampaign?.myRole;

		if (!canCommentOnNews(news, activeCtx, role, get().campaigns)) {
			set({ syncError: "Sem permissão para comentar nesta notícia." });
			return null;
		}

		if (parentId) {
			const parent = get().newsComments.find((c) => c.id === parentId);
			if (!parent || parent.newsId !== newsId || parent.parentId != null) {
				set({
					syncError:
						"Respostas só são permitidas em comentários de primeiro nível.",
				});
				return null;
			}
		}

		const supabase = getSupabase();
		let authorId = "";
		if (supabase) {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user?.id) {
				set({ syncError: "Sessão inválida. Faça login novamente." });
				return null;
			}
			authorId = user.id;
		}

		const comment: NewsComment = {
			id: crypto.randomUUID(),
			newsId,
			authorId,
			parentId,
			body: trimmed,
			createdAt: Date.now(),
		};

		const original = get().newsComments;
		const originalNews = get().worldNews;
		set((state) => ({
			newsComments: [...state.newsComments, comment],
			worldNews: state.worldNews.map((n) =>
				n.id === newsId ? { ...n, commentCount: (n.commentCount ?? 0) + 1 } : n,
			),
			syncError: null,
		}));

		try {
			await createRemoteNewsComment(comment);
			return comment;
		} catch (error) {
			set({
				newsComments: original,
				worldNews: originalNews,
				syncError: remoteErrorMessage(error),
			});
			return null;
		}
	},

	updateNewsComment: (id, body) => {
		const original = get().newsComments;
		set((state) => ({
			newsComments: state.newsComments.map((c) =>
				c.id === id ? { ...c, body, updatedAt: Date.now() } : c,
			),
			syncError: null,
		}));
		void updateRemoteNewsComment(id, body).catch((error) => {
			set({ newsComments: original, syncError: remoteErrorMessage(error) });
		});
	},

	removeNewsComment: (id) => {
		const target = get().newsComments.find((c) => c.id === id);
		const original = get().newsComments;
		const originalNews = get().worldNews;
		const removedCount = original.filter(
			(c) => c.id === id || c.parentId === id,
		).length;
		set((state) => ({
			newsComments: state.newsComments.filter(
				(c) => c.id !== id && c.parentId !== id,
			),
			worldNews: target
				? state.worldNews.map((n) =>
						n.id === target.newsId
							? {
									...n,
									commentCount: Math.max(
										0,
										(n.commentCount ?? removedCount) - removedCount,
									),
								}
							: n,
					)
				: state.worldNews,
			syncError: null,
		}));
		void deleteRemoteNewsComment(id).catch((error) => {
			set({
				newsComments: original,
				worldNews: originalNews,
				syncError: remoteErrorMessage(error),
			});
		});
	},
});

export function worldEntityDefaultsForCampaign(
	worldId: string,
	campaignId: string,
) {
	return defaultWorldEntityFields(worldId, campaignId);
}
