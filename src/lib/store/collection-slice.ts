import type { StateCreator } from "zustand";
import type { Item, GameLocation, Lore, RPGState } from "./types";
import { generateEntry, pushLog, entityNameOf, remoteErrorMessage } from "./helpers";
import { createRemoteEntity, createRemoteActivity, updateRemoteEntity, deleteRemoteEntity } from "../remote-store";
import { FREE_CREATION_LIMIT, isCreationLimitReached } from "./sync-slice";

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
	addLocation: (location: Partial<Omit<GameLocation, "id" | "createdAt">>) => GameLocation;
	updateLocation: (id: string, location: Partial<GameLocation>) => void;
	removeLocation: (id: string) => void;

	lores: Lore[];
	addLore: (lore: Partial<Omit<Lore, "id" | "createdAt">>) => Lore;
	updateLore: (id: string, lore: Partial<Lore>) => void;
	removeLore: (id: string) => void;
}

export const createCollectionSlice: StateCreator<RPGState, [], [], CollectionSlice> = (set, get) => ({
	items: [],
	addItem: (item) => {
		if (isCreationLimitReached(get())) {
			set({ syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.` });
			return {} as Item;
		}
		const created = generateEntry(itemDefaults, item) as Item;
		const log = {
			action: "create" as const,
			entityKind: "item" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		set((state) => ({
			items: [...state.items, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		const campaignId = get().activeCampaignId!;
		void Promise.all([
			createRemoteEntity("item", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
		return created;
	},
	updateItem: (id, item) =>
		set((state) => {
			const existing = state.items.find((i) => i.id === id);
			if (!existing) return state;
			const updated = { ...existing, ...item, updatedAt: Date.now() };
			const log = {
				action: "update" as const,
				entityKind: "item" as const,
				entityId: id,
				entityName: entityNameOf(updated),
			};
			void Promise.all([
				updateRemoteEntity("item", updated, get().activeCampaignId!),
				createRemoteActivity(log, get().activeCampaignId!),
			]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
			return {
				items: state.items.map((i) => (i.id === id ? updated : i)),
				activityLog: pushLog(state.activityLog, log),
				syncError: null,
			};
		}),
	removeItem: (id) =>
		set((state) => {
			const existing = state.items.find((i) => i.id === id);
			if (existing) {
				const log = {
					action: "delete" as const,
					entityKind: "item" as const,
					entityId: id,
					entityName: entityNameOf(existing),
				};
				void Promise.all([
					deleteRemoteEntity("item", id),
					createRemoteActivity(log, get().activeCampaignId!),
				]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
				return {
					items: state.items.filter((i) => i.id !== id),
					activityLog: pushLog(state.activityLog, log),
					globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
					syncError: null,
				};
			}
			return state;
		}),

	locations: [],
	addLocation: (location) => {
		if (isCreationLimitReached(get())) {
			set({ syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.` });
			return {} as GameLocation;
		}
		const created = generateEntry(locationDefaults, location) as GameLocation;
		const log = {
			action: "create" as const,
			entityKind: "location" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		set((state) => ({
			locations: [...state.locations, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		const campaignId = get().activeCampaignId!;
		void Promise.all([
			createRemoteEntity("location", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
		return created;
	},
	updateLocation: (id, location) =>
		set((state) => {
			const existing = state.locations.find((l) => l.id === id);
			if (!existing) return state;
			const updated = { ...existing, ...location, updatedAt: Date.now() };
			const log = {
				action: "update" as const,
				entityKind: "location" as const,
				entityId: id,
				entityName: entityNameOf(updated),
			};
			void Promise.all([
				updateRemoteEntity("location", updated, get().activeCampaignId!),
				createRemoteActivity(log, get().activeCampaignId!),
			]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
			return {
				locations: state.locations.map((l) => (l.id === id ? updated : l)),
				activityLog: pushLog(state.activityLog, log),
				syncError: null,
			};
		}),
	removeLocation: (id) =>
		set((state) => {
			const existing = state.locations.find((l) => l.id === id);
			if (existing) {
				const log = {
					action: "delete" as const,
					entityKind: "location" as const,
					entityId: id,
					entityName: entityNameOf(existing),
				};
				void Promise.all([
					deleteRemoteEntity("location", id),
					createRemoteActivity(log, get().activeCampaignId!),
				]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
				return {
					locations: state.locations.filter((l) => l.id !== id),
					activityLog: pushLog(state.activityLog, log),
					globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
					syncError: null,
				};
			}
			return state;
		}),

	lores: [],
	addLore: (lore) => {
		if (isCreationLimitReached(get())) {
			set({ syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.` });
			return {} as Lore;
		}
		const created = generateEntry(loreDefaults, lore) as Lore;
		const log = {
			action: "create" as const,
			entityKind: "lore" as const,
			entityId: created.id,
			entityName: entityNameOf(created),
		};
		set((state) => ({
			lores: [...state.lores, created],
			activityLog: pushLog(state.activityLog, log),
			globalRecordsCount: state.globalRecordsCount + 1,
			syncError: null,
		}));
		const campaignId = get().activeCampaignId!;
		void Promise.all([
			createRemoteEntity("lore", created, campaignId),
			createRemoteActivity(log, campaignId),
		]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
		return created;
	},
	updateLore: (id, lore) =>
		set((state) => {
			const existing = state.lores.find((l) => l.id === id);
			if (!existing) return state;
			const updated = { ...existing, ...lore, updatedAt: Date.now() };
			const log = {
				action: "update" as const,
				entityKind: "lore" as const,
				entityId: id,
				entityName: entityNameOf(updated),
			};
			void Promise.all([
				updateRemoteEntity("lore", updated, get().activeCampaignId!),
				createRemoteActivity(log, get().activeCampaignId!),
			]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
			return {
				lores: state.lores.map((l) => (l.id === id ? updated : l)),
				activityLog: pushLog(state.activityLog, log),
				syncError: null,
			};
		}),
	removeLore: (id) =>
		set((state) => {
			const existing = state.lores.find((l) => l.id === id);
			if (existing) {
				const log = {
					action: "delete" as const,
					entityKind: "lore" as const,
					entityId: id,
					entityName: entityNameOf(existing),
				};
				void Promise.all([
					deleteRemoteEntity("lore", id),
					createRemoteActivity(log, get().activeCampaignId!),
				]).catch((error) => set({ syncError: remoteErrorMessage(error) }));
				return {
					lores: state.lores.filter((l) => l.id !== id),
					activityLog: pushLog(state.activityLog, log),
					globalRecordsCount: Math.max(0, state.globalRecordsCount - 1),
					syncError: null,
				};
			}
			return state;
		}),
});
