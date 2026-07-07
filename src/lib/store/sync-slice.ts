import type { StateCreator } from "zustand";
import { fetchGlobalTotalCount, loadRemoteState } from "../remote-store";
import { getSupabase } from "../supabase";
import type { UserPlan } from "../user-plan";
import { characterDefaults } from "./character-slice";
import {
	itemDefaults,
	locationDefaults,
	loreDefaults,
} from "./collection-slice";
import { remoteErrorMessage } from "./helpers";
import { npcDefaults } from "./npc-slice";
import { sessionDefaults } from "./session-slice";
import type {
	ActivityEntry,
	AppNotification,
	Character,
	CustomTemplate,
	GameLocation,
	ImageAsset,
	Item,
	Lore,
	Npc,
	RPGState,
	Session,
} from "./types";

export const FREE_CREATION_LIMIT = 20;

/**
 * Verifica se o limite de criação foi atingido.
 * Usuários Pro não possuem limite, e membros herdam o plano do mestre da campanha.
 */
export function isCreationLimitReached(state: RPGState): boolean {
	if (state.userPlan === "pro" || state.activeCampaignOwnerPlan === "pro")
		return false;
	return state.globalRecordsCount >= FREE_CREATION_LIMIT;
}

export interface SyncSlice {
	isLoadingRemote: boolean;
	syncError: string | null;
	activityLog: ActivityEntry[];
	userPlan: UserPlan;
	setUserPlan: (plan: UserPlan) => void;
	globalRecordsCount: number;
	loadRemoteData: () => Promise<void>;
	setupRealtime: () => () => void;
	clearLocalData: () => void;
	clearActivity: () => void;
	notifications: AppNotification[];
	addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
	markAllNotificationsAsRead: () => void;
	clearNotifications: () => void;
}

type SupabasePayloadRow = Record<string, unknown> & {
	name?: string;
	data?: {
		characterName?: string;
		name?: string;
		title?: string;
	};
};

const ENTITY_KIND_LABELS: Record<string, string> = {
	characters: "Personagem",
	npcs: "NPC",
	sessions: "Sessão",
	items: "Item",
	locations: "Local",
	lores: "Lore",
	image_assets: "Imagem",
};

function extractEntityName(row: SupabasePayloadRow | null): string {
	if (!row) return "Registro";
	return (
		row.data?.characterName ||
		row.data?.name ||
		row.data?.title ||
		row.name ||
		"Registro"
	);
}

function applyGlobalRecordsCountChange(
	set: Parameters<StateCreator<RPGState, [], [], SyncSlice>>[0],
	eventType: string,
): void {
	if (eventType === "INSERT") {
		set((s) => ({ globalRecordsCount: s.globalRecordsCount + 1 }));
	} else if (eventType === "DELETE") {
		set((s) => ({
			globalRecordsCount: Math.max(0, s.globalRecordsCount - 1),
		}));
	}
}

function buildEntityNotification(
	eventType: string,
	label: string,
	entityName: string,
): Omit<AppNotification, "id" | "createdAt" | "read"> | null {
	if (eventType === "INSERT") {
		return {
			variant: "info",
			title: `Novo ${label}`,
			description: `"${entityName}" foi criado na campanha compartilhada.`,
		};
	}
	if (eventType === "UPDATE") {
		return {
			variant: "info",
			title: `${label} Atualizado`,
			description: `"${entityName}" teve alterações salvas.`,
		};
	}
	if (eventType === "DELETE") {
		return {
			variant: "error",
			title: `${label} Removido`,
			description: `Um registro de ${label.toLowerCase()} foi deletado.`,
		};
	}
	return null;
}

function isRealtimeEchoOfLocalMutation(
	get: () => RPGState,
	storeKey: keyof RPGState,
	eventType: string,
	newRow: Record<string, unknown> | undefined,
	oldRow: Record<string, unknown> | undefined,
	currentUserId: string | null,
): boolean {
	if (eventType === "INSERT") {
		if (currentUserId == null || !newRow) return false;
		const creatorId = newRow.created_by ?? newRow.user_id;
		return creatorId === currentUserId;
	}
	if (eventType === "UPDATE" && newRow?.id && newRow.data) {
		const currentArray = get()[storeKey] as Array<
			{ id: string } & Record<string, unknown>
		>;
		const localItem = currentArray.find((item) => item.id === newRow.id);
		if (!localItem) return false;
		const incoming = newRow.data as Record<string, unknown>;
		return Object.keys(incoming).every((key) => localItem[key] === incoming[key]);
	}
	if (eventType === "DELETE" && oldRow?.id) {
		const currentArray = get()[storeKey] as Array<{ id: string }>;
		return !currentArray.some((item) => item.id === oldRow.id);
	}
	return false;
}

export const createSyncSlice: StateCreator<RPGState, [], [], SyncSlice> = (
	set,
	get,
) => ({
	isLoadingRemote: false,
	syncError: null,
	activityLog: [],
	userPlan: "free",
	setUserPlan: (plan) => set({ userPlan: plan }),
	globalRecordsCount: 0,
	notifications: [],
	addNotification: (notification) => {
		const newNotification: AppNotification = {
			id: crypto.randomUUID(),
			createdAt: Date.now(),
			read: false,
			...notification,
		};
		set((s) => ({
			notifications: [newNotification, ...s.notifications].slice(0, 50),
		}));
	},
	markAllNotificationsAsRead: () => {
		set((s) => ({
			notifications: s.notifications.map((n) => ({ ...n, read: true })),
		}));
	},
	clearNotifications: () => {
		set({ notifications: [] });
	},
	loadRemoteData: async () => {
		const state = get();
		const hasData =
			state.characters.length > 0 ||
			state.npcs.length > 0 ||
			state.sessions.length > 0 ||
			state.items.length > 0 ||
			state.locations.length > 0 ||
			state.lores.length > 0 ||
			state.customTemplates.length > 0 ||
			state.imageAssets.length > 0;

		const startCampaignId = get().activeCampaignId;

		// Só mostra skeleton se não houver NENHUM dado local ainda
		if (!hasData) {
			set({ isLoadingRemote: true, syncError: null });
		} else {
			set({ syncError: null });
		}
		try {
			if (!startCampaignId) {
				set({ isLoadingRemote: false });
				return;
			}
			const [remote, globalCount] = await Promise.all([
				loadRemoteState(startCampaignId),
				fetchGlobalTotalCount(startCampaignId),
			]);

			// Verificar se a campanha ativa mudou no meio do caminho
			if (get().activeCampaignId !== startCampaignId) {
				return;
			}

			// Validação defensiva básica
			const ensureArray = (val: unknown) => (Array.isArray(val) ? val : []);

			set({
				globalRecordsCount: globalCount,
				characters: ensureArray(remote.characters).map((c) => ({
					...characterDefaults,
					...(c as Partial<Character>),
				})) as Character[],
				npcs: ensureArray(remote.npcs).map((n) => ({
					...npcDefaults,
					...(n as Partial<Npc>),
				})) as Npc[],
				sessions: ensureArray(remote.sessions).map((s) => ({
					...sessionDefaults,
					...(s as Partial<Session>),
				})) as Session[],
				items: ensureArray(remote.items).map((i) => ({
					...itemDefaults,
					...(i as Partial<Item>),
				})) as Item[],
				locations: ensureArray(remote.locations).map((l) => ({
					...locationDefaults,
					...(l as Partial<GameLocation>),
				})) as GameLocation[],
				lores: ensureArray(remote.lores).map((l) => ({
					...loreDefaults,
					...(l as Partial<Lore>),
				})) as Lore[],
				customTemplates: ensureArray(
					remote.customTemplates,
				) as CustomTemplate[],
				imageAssets: ensureArray(remote.imageAssets) as ImageAsset[],
				activityLog: ensureArray(remote.activityLog) as ActivityEntry[],
				isLoadingRemote: false,
			});
		} catch (error) {
			if (get().activeCampaignId === startCampaignId) {
				set({ isLoadingRemote: false, syncError: remoteErrorMessage(error) });
			}
		}
	},
	setupRealtime: () => {
		const supabase = getSupabase();
		if (!supabase) return () => {};

		const campaignId = get().activeCampaignId;
		const uniqueSuffix = Math.random().toString(36).substring(2, 11);
		const channelName = `db-changes-${campaignId || "global"}-${uniqueSuffix}`;

		let isCleanedUp = false;
		let channel: ReturnType<typeof supabase.channel> | null = null;

		void supabase.auth.getUser().then(({ data }) => {
			if (isCleanedUp) return;
			const currentUserId = data.user?.id ?? null;

			channel = supabase
				.channel(channelName)
				.on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
					const { eventType, table, new: newRow, old: oldRow } = payload;

					const tableToKey: Record<string, keyof RPGState> = {
						characters: "characters",
						npcs: "npcs",
						sessions: "sessions",
						items: "items",
						locations: "locations",
						lores: "lores",
						custom_templates: "customTemplates",
						image_assets: "imageAssets",
						activity_log: "activityLog",
					};

					const storeKey = tableToKey[table];
					if (!storeKey) return;

					const activeCampaignId = get().activeCampaignId;
					if (!activeCampaignId) return;

					const rowCampaignId =
						eventType === "DELETE"
							? oldRow && "campaign_id" in oldRow
								? (oldRow as { campaign_id: string }).campaign_id
								: null
							: newRow && "campaign_id" in newRow
								? (newRow as { campaign_id: string }).campaign_id
								: null;

					const belongsToActiveCampaign = rowCampaignId === activeCampaignId;

					const countTables = [
						"characters",
						"npcs",
						"sessions",
						"items",
						"locations",
						"lores",
					];
					const isCountTable = countTables.includes(table);

					const activeCamp = get().campaigns.find(
						(c) => c.id === activeCampaignId,
					);
					const activeOwnerId = activeCamp?.ownerId;

					const ownerCampaignIds = activeOwnerId
						? get()
								.campaigns.filter((c) => c.ownerId === activeOwnerId)
								.map((c) => c.id)
						: activeCampaignId
							? [activeCampaignId]
							: [];

					const belongsToOwnerCampaigns =
						rowCampaignId && ownerCampaignIds.includes(rowCampaignId);

					const isOwnAction = isRealtimeEchoOfLocalMutation(
						get,
						storeKey,
						eventType,
						newRow,
						oldRow,
						currentUserId,
					);

					const newRowCasted = newRow as SupabasePayloadRow | null;
					const oldRowCasted = oldRow as SupabasePayloadRow | null;


					if (
						belongsToActiveCampaign &&
						!isOwnAction &&
						currentUserId != null &&
						table in ENTITY_KIND_LABELS
					) {
						const entityName = extractEntityName(newRowCasted ?? oldRowCasted);
						const label = ENTITY_KIND_LABELS[table] || "Registro";
						const notification = buildEntityNotification(
							eventType,
							label,
							entityName,
						);
						if (notification) {
							get().addNotification(notification);
						}
					}

					if (!belongsToActiveCampaign) {
						if (isCountTable && belongsToOwnerCampaigns) {
							applyGlobalRecordsCountChange(set, eventType);
						}
						return;
					}

					if (isCountTable && belongsToOwnerCampaigns) {
						applyGlobalRecordsCountChange(set, eventType);
					}

					set((state) => {
					const currentArray = state[storeKey] as Array<
						{ id: string } & Record<string, unknown>
					>;

					if (eventType === "INSERT") {
						// Evita duplicata se já foi adicionado localmente
						if (currentArray.some((item) => item.id === newRow.id))
							return state;

						let processed = newRow.data || newRow;
						if (table === "activity_log") {
							processed = {
								id: newRow.id,
								action: newRow.action,
								entityKind: newRow.entity_kind,
								entityId: newRow.entity_id,
								entityName: newRow.entity_name,
								timestamp: new Date(newRow.created_at).getTime(),
							};
						} else if (table === "image_assets") {
							processed = {
								id: newRow.id,
								campaignId: newRow.campaign_id,
								createdBy: newRow.created_by,
								name: newRow.name,
								url: newRow.url,
								storageKey: newRow.storage_key ?? undefined,
								mimeType: newRow.mime_type,
								sizeBytes: newRow.size_bytes ?? 0,
								width: newRow.width ?? undefined,
								height: newRow.height ?? undefined,
								isPrivate: newRow.is_private ?? false,
								createdAt: new Date(newRow.created_at).getTime(),
								updatedAt: newRow.updated_at
									? new Date(newRow.updated_at).getTime()
									: undefined,
							};
						} else {
							processed = { id: newRow.id, ...newRow.data };
						}

						return {
							[storeKey]: [processed, ...currentArray].slice(
								0,
								table === "activity_log" ? 200 : 1000,
							),
						};
					}

					if (eventType === "UPDATE") {
						if (table === "image_assets") {
							return {
								[storeKey]: currentArray.map((item) =>
									item.id === newRow.id
										? {
												...item,
												name: newRow.name,
												isPrivate: newRow.is_private,
												updatedAt: newRow.updated_at
													? new Date(newRow.updated_at).getTime()
													: Date.now(),
											}
										: item,
								),
							};
						}

						return {
							[storeKey]: currentArray.map((item) =>
								item.id === newRow.id ? { ...item, ...newRow.data } : item,
							),
						};
					}

					if (eventType === "DELETE") {
						return {
							[storeKey]: currentArray.filter((item) => item.id !== oldRow.id),
						};
					}

					return state;
				});
			});

			channel.subscribe((status, err) => {
				console.log("[Realtime subscription status]", status, err);
				if (status === "CHANNEL_ERROR") {
					console.error("Realtime channel error:", err);
				}
			});
		});

		return () => {
			isCleanedUp = true;
			if (channel) {
				void supabase.removeChannel(channel);
			}
		};
	},
	clearLocalData: () =>
		set({
			characters: [],
			npcs: [],
			sessions: [],
			items: [],
			locations: [],
			lores: [],
			customTemplates: [],
			imageAssets: [],
			activityLog: [],
			notifications: [],
			syncError: null,
		}),
	clearActivity: () => set({ activityLog: [] }),
});
