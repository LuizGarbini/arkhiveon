import type { StateCreator } from "zustand";
import {
	createRemoteActivity,
	createRemoteEntity,
	deleteRemoteEntity,
	updateRemoteEntity,
} from "../remote-store";
import {
	entityNameOf,
	generateEntry,
	pushLog,
	remoteErrorMessage,
} from "./helpers";
import { FREE_CREATION_LIMIT, isCreationLimitReached } from "./sync-slice";
import type { Npc, RPGState } from "./types";

export const npcDefaults: Omit<Npc, "id" | "createdAt"> = {
	kind: "npc",
	name: "",
	race: "",
	role: "",
	location: "",
	faction: "",
	alignment: "",
	disposition: "neutral",
	importance: "supporting",
	cr: "",
	appearance: "",
	mannerisms: "",
	motivations: "",
	secrets: "",
	relationships: "",
	stats: "",
	description: "",
	imageUrl: "",
	isAlive: true,
	linkedCharacterId: "",
	entityLinks: [],
};

export interface NpcSlice {
	npcs: Npc[];
	addNpc: (npc: Partial<Omit<Npc, "id" | "createdAt">>) => Npc | null;
	updateNpc: (id: string, npc: Partial<Npc>) => void;
	removeNpc: (id: string) => void;
}

export const createNpcSlice: StateCreator<RPGState, [], [], NpcSlice> = (
	set,
	get,
) => ({
	npcs: [],
	addNpc: (npc) => {
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Npc;
		}
		const created = generateEntry(npcDefaults, npc) as Npc;
		const log = {
			action: "create" as const,
			entityKind: "npc" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		set((state) => ({
			npcs: [...state.npcs, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		const campaignId = get().activeCampaignId;
		void Promise.all([
			createRemoteEntity("npc", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
		return created;
	},
	updateNpc: (id, npc) =>
		set((state) => {
			const existing = state.npcs.find((n) => n.id === id);
			if (!existing) return state;
			const updated = { ...existing, ...npc, updatedAt: Date.now() };
			const log = {
				action: "update" as const,
				entityKind: "npc" as const,
				entityId: id,
				entityName: entityNameOf(updated),
			};
			void Promise.all([
				updateRemoteEntity("npc", updated),
				createRemoteActivity(log, get().activeCampaignId),
			]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
			return {
				npcs: state.npcs.map((n) => (n.id === id ? updated : n)),
				activityLog: pushLog(state.activityLog, log),
				syncError: null,
			};
		}),
	removeNpc: (id) =>
		set((state) => {
			const existing = state.npcs.find((n) => n.id === id);
			if (existing) {
				const log = {
					action: "delete" as const,
					entityKind: "npc" as const,
					entityId: id,
					entityName: entityNameOf(existing),
				};
				void Promise.all([
					deleteRemoteEntity("npc", id),
					createRemoteActivity(log, get().activeCampaignId),
				]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
				return {
					npcs: state.npcs.filter((n) => n.id !== id),
					activityLog: pushLog(state.activityLog, log),
					globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
					syncError: null,
				};
			}
			return state;
		}),
});
