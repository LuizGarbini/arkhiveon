import type { StateCreator } from "zustand";
import {
	entityNameOf,
	generateEntry,
	pushLog,
} from "./helpers";
import { FREE_CREATION_LIMIT, isCreationLimitReached } from "./sync-slice";
import type { Quest, RPGState } from "./types";
import { worldEntityDefaultsForCampaign } from "./worldbuilding-slice";

export const questDefaults: Omit<Quest, "id" | "createdAt"> = {
	worldId: "",
	publicationScope: "restricted",
	campaignIds: [],
	visibility: "public",
	title: "",
	description: "",
	status: "active",
	category: "main",
	giverNpcName: "",
	locationName: "",
	reward: "",
	notes: "",
};

export interface QuestSlice {
	quests: Quest[];
	addQuest: (quest: Partial<Omit<Quest, "id" | "createdAt">>) => Quest;
	updateQuest: (id: string, quest: Partial<Quest>) => void;
	removeQuest: (id: string) => void;
}

export const createQuestSlice: StateCreator<
	RPGState,
	[],
	[],
	QuestSlice
> = (set, get) => ({
	quests: [],
	addQuest: (quest) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar missão." });
			return {} as Quest;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Quest;
		}

		const activeCampaign = get().campaigns.find((c) => c.id === campaignId);
		const worldId = activeCampaign?.worldId || "";

		const defaults = {
			...questDefaults,
			...(worldId ? worldEntityDefaultsForCampaign(worldId, campaignId) : {}),
		};

		const created = generateEntry(defaults, quest) as Quest;
		const log = {
			action: "create" as const,
			entityKind: "quest" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};

		set((state) => ({
			quests: [created, ...state.quests],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));

		return created;
	},

	updateQuest: (id, patch) => {
		const existing = get().quests.find((q) => q.id === id);
		if (!existing) return;

		const updated = { ...existing, ...patch, updatedAt: Date.now() };
		const log = {
			action: "update" as const,
			entityKind: "quest" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};

		set((state) => ({
			quests: state.quests.map((q) => (q.id === id ? updated : q)),
			activityLog: pushLog(state.activityLog, log),
		}));
	},

	removeQuest: (id) => {
		const existing = get().quests.find((q) => q.id === id);
		if (!existing) return;

		const log = {
			action: "delete" as const,
			entityKind: "quest" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};

		set((state) => ({
			quests: state.quests.filter((q) => q.id !== id),
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
		}));
	},
});
