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
import type { GameLocation, Item, Lore, RPGState } from "./types";

export const itemDefaults: Omit<Item, "id" | "createdAt"> = {
	name: "",
	type: "",
	rarity: "comum",
	subtype: "",
	weight: "",
	value: "",
	requiresAttunement: false,
	attunedTo: "",
	charges: "",
	source: "",
	stats: "",
	properties: "",
	description: "",
	owner: "",
	imageUrl: "",
	equipped: false,
	entityLinks: [],
};

export const locationDefaults: Omit<GameLocation, "id" | "createdAt"> = {
	name: "",
	type: "",
	region: "",
	parentLocation: "",
	dangerLevel: "baixo",
	climate: "",
	terrain: "",
	population: "",
	government: "",
	economy: "",
	notableInhabitants: "",
	keyFeatures: "",
	hooks: "",
	history: "",
	description: "",
	imageUrl: "",
	mapUrl: "",
	visited: false,
	entityLinks: [],
};

export const loreDefaults: Omit<Lore, "id" | "createdAt"> = {
	title: "",
	category: "",
	era: "",
	importance: "supporting",
	tags: "",
	relatedEntities: "",
	source: "",
	knownBy: "",
	content: "",
	notes: "",
	isSecret: false,
	imageUrl: "",
	entityLinks: [],
};

export interface CollectionSlice {
	items: Item[];
	addItem: (item: Partial<Omit<Item, "id" | "createdAt">>) => Item;
	updateItem: (id: string, item: Partial<Item>) => void;
	removeItem: (id: string) => void;

	locations: GameLocation[];
	addLocation: (
		location: Partial<Omit<GameLocation, "id" | "createdAt">>,
	) => GameLocation;
	updateLocation: (id: string, location: Partial<GameLocation>) => void;
	removeLocation: (id: string) => void;

	lores: Lore[];
	addLore: (lore: Partial<Omit<Lore, "id" | "createdAt">>) => Lore;
	updateLore: (id: string, lore: Partial<Lore>) => void;
	removeLore: (id: string) => void;
}

export const createCollectionSlice: StateCreator<
	RPGState,
	[],
	[],
	CollectionSlice
> = (set, get) => ({
	items: [],
	addItem: (item) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar item." });
			return {} as Item;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Item;
		}
		const created = generateEntry(itemDefaults, item) as Item;
		const log = {
			action: "create" as const,
			entityKind: "item" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		const originalItems = get().items;
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			items: [...state.items, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		void Promise.all([
			createRemoteEntity("item", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				items: originalItems,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter((l) => l.entityId !== created.id),
				syncError: remoteErrorMessage(error),
			}));
		});
		return created;
	},
	updateItem: (id, item) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar item." });
			return;
		}
		const originalItems = get().items;
		const existing = originalItems.find((i) => i.id === id);
		if (!existing) return;
		const updated = { ...existing, ...item, updatedAt: Date.now() };
		const log = {
			action: "update" as const,
			entityKind: "item" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};
		set((state) => ({
			items: state.items.map((i) => (i.id === id ? updated : i)),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			updateRemoteEntity("item", updated, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				items: originalItems,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "update"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	removeItem: (id) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover item." });
			return;
		}
		const originalItems = get().items;
		const existing = originalItems.find((i) => i.id === id);
		if (!existing) return;
		const log = {
			action: "delete" as const,
			entityKind: "item" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			items: state.items.filter((i) => i.id !== id),
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
			syncError: null,
		}));
		void Promise.all([
			deleteRemoteEntity("item", id),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				items: originalItems,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "delete"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},

	locations: [],
	addLocation: (location) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar localização." });
			return {} as GameLocation;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as GameLocation;
		}
		const created = generateEntry(locationDefaults, location) as GameLocation;
		const log = {
			action: "create" as const,
			entityKind: "location" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		const originalLocations = get().locations;
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			locations: [...state.locations, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		void Promise.all([
			createRemoteEntity("location", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				locations: originalLocations,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter((l) => l.entityId !== created.id),
				syncError: remoteErrorMessage(error),
			}));
		});
		return created;
	},
	updateLocation: (id, location) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar localização." });
			return;
		}
		const originalLocations = get().locations;
		const existing = originalLocations.find((l) => l.id === id);
		if (!existing) return;
		const updated = { ...existing, ...location, updatedAt: Date.now() };
		const log = {
			action: "update" as const,
			entityKind: "location" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};
		set((state) => ({
			locations: state.locations.map((l) => (l.id === id ? updated : l)),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			updateRemoteEntity("location", updated, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				locations: originalLocations,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "update"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	removeLocation: (id) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover localização." });
			return;
		}
		const originalLocations = get().locations;
		const existing = originalLocations.find((l) => l.id === id);
		if (!existing) return;
		const log = {
			action: "delete" as const,
			entityKind: "location" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			locations: state.locations.filter((l) => l.id !== id),
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
			syncError: null,
		}));
		void Promise.all([
			deleteRemoteEntity("location", id),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				locations: originalLocations,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "delete"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},

	lores: [],
	addLore: (lore) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar lore." });
			return {} as Lore;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Lore;
		}
		const created = generateEntry(loreDefaults, lore) as Lore;
		const log = {
			action: "create" as const,
			entityKind: "lore" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		const originalLores = get().lores;
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			lores: [...state.lores, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		void Promise.all([
			createRemoteEntity("lore", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				lores: originalLores,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter((l) => l.entityId !== created.id),
				syncError: remoteErrorMessage(error),
			}));
		});
		return created;
	},
	updateLore: (id, lore) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar lore." });
			return;
		}
		const originalLores = get().lores;
		const existing = originalLores.find((l) => l.id === id);
		if (!existing) return;
		const updated = { ...existing, ...lore, updatedAt: Date.now() };
		const log = {
			action: "update" as const,
			entityKind: "lore" as const,
			entityId: id,
			entityName: entityNameOf(updated),
		};
		set((state) => ({
			lores: state.lores.map((l) => (l.id === id ? updated : l)),
			activityLog: pushLog(state.activityLog, log),
			syncError: null,
		}));
		void Promise.all([
			updateRemoteEntity("lore", updated, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				lores: originalLores,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "update"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
	removeLore: (id) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover lore." });
			return;
		}
		const originalLores = get().lores;
		const existing = originalLores.find((l) => l.id === id);
		if (!existing) return;
		const log = {
			action: "delete" as const,
			entityKind: "lore" as const,
			entityId: id,
			entityName: entityNameOf(existing),
		};
		const originalCount = get().globalRecordsCount;
		set((state) => ({
			lores: state.lores.filter((l) => l.id !== id),
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
			syncError: null,
		}));
		void Promise.all([
			deleteRemoteEntity("lore", id),
			createRemoteActivity(log, campaignId),
		]).catch((error) => {
			set((state) => ({
				lores: originalLores,
				globalRecordsCount: originalCount,
				activityLog: state.activityLog.filter(
					(l) => !(l.entityId === id && l.action === "delete"),
				),
				syncError: remoteErrorMessage(error),
			}));
		});
	},
});
