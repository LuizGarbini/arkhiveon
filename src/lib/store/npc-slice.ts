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
import {
	denyUnlessWorldStaff,
	validateEntityScopeForActiveWorld,
} from "./world-entity-guards";
import { worldEntityDefaultsForCampaign } from "./worldbuilding-slice";

export const npcDefaults: Omit<Npc, "id" | "createdAt"> = {
	worldId: "",
	publicationScope: "restricted",
	campaignIds: [],
	visibility: "public",
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
		if (!denyUnlessWorldStaff(get, set)) return null;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar NPC." });
			return null;
		}
		const activeCampaign = get().campaigns.find((c) => c.id === campaignId);
		if (!activeCampaign?.worldId) {
			set({ syncError: "Campanha ativa sem Mundo associado." });
			return null;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return null;
		}
		const created = generateEntry(
			{
				...npcDefaults,
				...worldEntityDefaultsForCampaign(activeCampaign.worldId, campaignId),
			},
			npc,
		) as Npc;
		const scopeError = validateEntityScopeForActiveWorld(
			get,
			created.publicationScope,
			created.campaignIds,
		);
		if (scopeError) {
			set({ syncError: scopeError });
			return null;
		}
		const log = {
			action: "create" as const,
			entityKind: "npc" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		const originalNpcs = get().npcs;
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			npcs: [...state.npcs, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		void Promise.all([
			createRemoteEntity("npc", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				npcs: originalNpcs,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter((l) => l.entityId !== created.id),
				syncError: remoteErrorMessage(error),
			}));
		});
		return created;
	},
	updateNpc: (id, npc) => {
		if (!denyUnlessWorldStaff(get, set)) return;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar NPC." });
			return;
		}
		const originalNpcs = get().npcs;
		const existing = originalNpcs.find((n) => n.id === id);
		if (!existing) return;
		const updated = { ...existing, ...npc, updatedAt: Date.now() };
		const scopeError = validateEntityScopeForActiveWorld(
			get,
			updated.publicationScope,
			updated.campaignIds,
		);
		if (scopeError) {
			set({ syncError: scopeError });
			return;
		}
		const log = {
			action: "update" as const,
			entityKind: "npc" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};
		set((state) => ({
			npcs: state.npcs.map((n) => (n.id === id ? updated : n)),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			updateRemoteEntity("npc", updated, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				npcs: originalNpcs,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "update"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	removeNpc: (id) => {
		if (!denyUnlessWorldStaff(get, set)) return;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover NPC." });
			return;
		}
		const originalNpcs = get().npcs;
		const existing = originalNpcs.find((n) => n.id === id);
		if (!existing) return;
		const log = {
			action: "delete" as const,
			entityKind: "npc" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			npcs: state.npcs.filter((n) => n.id !== id),
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
			syncError: null,
		}));
		void Promise.all([
			deleteRemoteEntity("npc", id),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				npcs: originalNpcs,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "delete"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
});
