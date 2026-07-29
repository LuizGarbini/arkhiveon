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
import {
	allowItemWrite,
	constrainItemPayloadForViewer,
	denyUnlessWorldStaff,
	resolveWorldIdForCampaign,
	validateEntityScopeForActiveWorld,
} from "./world-entity-guards";
import { worldEntityDefaultsForCampaign } from "./worldbuilding-slice";

export const itemDefaults: Omit<Item, "id" | "createdAt"> = {
	worldId: "",
	publicationScope: "restricted",
	campaignIds: [],
	visibility: "public",
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
	worldId: "",
	publicationScope: "restricted",
	campaignIds: [],
	visibility: "public",
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
	worldId: "",
	publicationScope: "restricted",
	campaignIds: [],
	visibility: "public",
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
	addItem: (
		item: Partial<Omit<Item, "id" | "createdAt">>,
		actingUserId?: string,
	) => Item;
	updateItem: (id: string, item: Partial<Item>, actingUserId?: string) => void;
	removeItem: (id: string, actingUserId?: string) => void;

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
	addItem: (item, actingUserId) => {
		const access = allowItemWrite(get, set, actingUserId);
		if (!access) return {} as Item;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar item." });
			return {} as Item;
		}
		const activeCampaign = get().campaigns.find((c) => c.id === campaignId);
		const worldId = resolveWorldIdForCampaign(activeCampaign, get().worlds);
		if (!worldId) {
			set({ syncError: "Campanha ativa sem Mundo associado." });
			return {} as Item;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Item;
		}
		const rawPayload =
			access === "owner"
				? constrainItemPayloadForViewer(campaignId, {
						...item,
						createdBy: actingUserId,
					})
				: { ...item, createdBy: item.createdBy ?? actingUserId };

		const effectiveCampaignIds: string[] =
			(rawPayload.publicationScope ?? "restricted") === "restricted" &&
			(!rawPayload.campaignIds || rawPayload.campaignIds.length === 0)
				? [campaignId]
				: (rawPayload.campaignIds ?? []);

		const effectiveWorldId =
			typeof rawPayload.worldId === "string" && rawPayload.worldId.trim() !== ""
				? rawPayload.worldId.trim()
				: worldId;

		const payload = {
			...rawPayload,
			worldId: effectiveWorldId,
			campaignIds: effectiveCampaignIds,
		};

		const created = generateEntry(
			{
				...itemDefaults,
				...worldEntityDefaultsForCampaign(effectiveWorldId, campaignId),
			},
			payload as Partial<Omit<Item, "id" | "createdAt">>,
		) as Item;
		const scopeError = validateEntityScopeForActiveWorld(
			get,
			created.publicationScope,
			created.campaignIds,
		);
		if (scopeError) {
			set({ syncError: scopeError });
			return {} as Item;
		}
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
	updateItem: (id, item, actingUserId) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar item." });
			return;
		}
		const originalItems = get().items;
		const existing = originalItems.find((i) => i.id === id);
		if (!existing) return;
		const access = allowItemWrite(get, set, actingUserId, existing);
		if (!access) return;
		const patch =
			access === "owner"
				? constrainItemPayloadForViewer(campaignId, item)
				: item;
		const effectiveCampaignIds: string[] =
			(patch.publicationScope ?? existing.publicationScope ?? "restricted") ===
				"restricted" &&
			(!patch.campaignIds || patch.campaignIds.length === 0)
				? existing.campaignIds && existing.campaignIds.length > 0
					? existing.campaignIds
					: [campaignId]
				: (patch.campaignIds ?? existing.campaignIds ?? []);

		const updated = {
			...existing,
			...patch,
			campaignIds: effectiveCampaignIds,
			createdBy: existing.createdBy,
			updatedAt: Date.now(),
		};
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
	removeItem: (id, actingUserId) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para remover item." });
			return;
		}
		const originalItems = get().items;
		const existing = originalItems.find((i) => i.id === id);
		if (!existing) return;
		if (!allowItemWrite(get, set, actingUserId, existing)) return;
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
		if (!denyUnlessWorldStaff(get, set)) return {} as GameLocation;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar localização." });
			return {} as GameLocation;
		}
		const activeCampaign = get().campaigns.find((c) => c.id === campaignId);
		const worldId = resolveWorldIdForCampaign(activeCampaign, get().worlds);
		if (!worldId) {
			set({ syncError: "Campanha ativa sem Mundo associado." });
			return {} as GameLocation;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as GameLocation;
		}
		const effectiveCampaignIds: string[] =
			(location.publicationScope ?? "restricted") === "restricted" &&
			(!location.campaignIds || location.campaignIds.length === 0)
				? [campaignId]
				: (location.campaignIds ?? []);

		const effectiveWorldId =
			typeof location.worldId === "string" && location.worldId.trim() !== ""
				? location.worldId.trim()
				: worldId;

		const created = generateEntry(
			{
				...locationDefaults,
				...worldEntityDefaultsForCampaign(effectiveWorldId, campaignId),
			},
			{
				...location,
				worldId: effectiveWorldId,
				campaignIds: effectiveCampaignIds,
			} as Partial<Omit<GameLocation, "id" | "createdAt">>,
		) as GameLocation;
		const scopeError = validateEntityScopeForActiveWorld(
			get,
			created.publicationScope,
			created.campaignIds,
		);
		if (scopeError) {
			set({ syncError: scopeError });
			return {} as GameLocation;
		}
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
		if (!denyUnlessWorldStaff(get, set)) return;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar localização." });
			return;
		}
		const originalLocations = get().locations;
		const existing = originalLocations.find((l) => l.id === id);
		if (!existing) return;
		const effectiveCampaignIds: string[] =
			(location.publicationScope ??
				existing.publicationScope ??
				"restricted") === "restricted" &&
			(!location.campaignIds || location.campaignIds.length === 0)
				? existing.campaignIds && existing.campaignIds.length > 0
					? existing.campaignIds
					: [campaignId]
				: (location.campaignIds ?? existing.campaignIds ?? []);

		const updated = {
			...existing,
			...location,
			campaignIds: effectiveCampaignIds,
			updatedAt: Date.now(),
		};
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
		if (!denyUnlessWorldStaff(get, set)) return;
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
		if (!denyUnlessWorldStaff(get, set)) return {} as Lore;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para adicionar lore." });
			return {} as Lore;
		}
		const activeCampaign = get().campaigns.find((c) => c.id === campaignId);
		const worldId = resolveWorldIdForCampaign(activeCampaign, get().worlds);
		if (!worldId) {
			set({ syncError: "Campanha ativa sem Mundo associado." });
			return {} as Lore;
		}
		if (isCreationLimitReached(get())) {
			set({
				syncError: `Limite de registros atingido (${FREE_CREATION_LIMIT}). Faça upgrade para o plano Pro.`,
			});
			return {} as Lore;
		}
		const effectiveCampaignIds: string[] =
			(lore.publicationScope ?? "restricted") === "restricted" &&
			(!lore.campaignIds || lore.campaignIds.length === 0)
				? [campaignId]
				: (lore.campaignIds ?? []);

		const effectiveWorldId =
			typeof lore.worldId === "string" && lore.worldId.trim() !== ""
				? lore.worldId.trim()
				: worldId;

		const created = generateEntry(
			{
				...loreDefaults,
				...worldEntityDefaultsForCampaign(effectiveWorldId, campaignId),
				...(lore.isSecret ? { visibility: "master_secret" as const } : {}),
			},
			{
				...lore,
				worldId: effectiveWorldId,
				campaignIds: effectiveCampaignIds,
			} as Partial<Omit<Lore, "id" | "createdAt">>,
		) as Lore;
		const scopeError = validateEntityScopeForActiveWorld(
			get,
			created.publicationScope,
			created.campaignIds,
		);
		if (scopeError) {
			set({ syncError: scopeError });
			return {} as Lore;
		}
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
		if (!denyUnlessWorldStaff(get, set)) return;
		const campaignId = get().activeCampaignId;
		if (!campaignId) {
			set({ syncError: "Nenhuma campanha ativa para atualizar lore." });
			return;
		}
		const originalLores = get().lores;
		const existing = originalLores.find((l) => l.id === id);
		if (!existing) return;
		const effectiveCampaignIds: string[] =
			(lore.publicationScope ?? existing.publicationScope ?? "restricted") ===
				"restricted" &&
			(!lore.campaignIds || lore.campaignIds.length === 0)
				? existing.campaignIds && existing.campaignIds.length > 0
					? existing.campaignIds
					: [campaignId]
				: (lore.campaignIds ?? existing.campaignIds ?? []);

		const updated = {
			...existing,
			...lore,
			campaignIds: effectiveCampaignIds,
			updatedAt: Date.now(),
		};
		if (typeof lore.isSecret === "boolean") {
			updated.visibility = lore.isSecret ? "master_secret" : "public";
		} else if (lore.visibility) {
			updated.isSecret = lore.visibility === "master_secret";
		}
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
		if (!denyUnlessWorldStaff(get, set)) return;
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
