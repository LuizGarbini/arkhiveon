import type { StateCreator } from "zustand";
import { normalizeItemWeapon } from "@/core/rules/item-mechanics";
import {
	fetchGlobalTotalCount,
	loadRemoteActivity,
	loadRemoteState,
} from "../remote-store";
import { getSupabase } from "../supabase";
import type { UserPlan } from "../user-plan";
import { characterDefaults } from "./character-slice";
import {
	itemDefaults,
	locationDefaults,
	loreDefaults,
} from "./collection-slice";
import { BASE_LOAD_ERROR_MESSAGE, remoteErrorMessage } from "./helpers";
import { npcDefaults } from "./npc-slice";
import { sessionDefaults } from "./session-slice";
import type {
	ActivityEntry,
	AppNotification,
	Character,
	CustomTemplate,
	Faction,
	FactionReputation,
	GameLocation,
	ImageAsset,
	Item,
	Lore,
	NewsComment,
	Npc,
	RPGState,
	Session,
	WorldNews,
} from "./types";
import { factionDefaults, worldNewsDefaults } from "./worldbuilding-slice";

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

/**
 * Sem resposta de loadCampaigns: o skeleton continua e o painel avisa que a
 * conexão está lenta. Não é erro.
 */
export const BASE_LOAD_SLOW_MS = 20_000;
/** Teto só de loadCampaigns: sem resposta, aí sim vira o aviso de erro. */
export const BASE_LOAD_TIMEOUT_MS = 60_000;
/**
 * Carga da mesa ativa (primeira abertura e troca). Não usa o teto de
 * loadCampaigns: se falhar ou passar disso, o painel mostra o erro.
 */
export const CAMPAIGN_SWITCH_TIMEOUT_MS = 10_000;

/**
 * Prazo único da carga da mesa ativa: troca e primeira abertura. A resposta
 * que chega depois ainda entra (loadRemoteData publica e limpa o erro).
 */
export function armCampaignDataDeadline(
	get: () => RPGState,
	set: (partial: Partial<RPGState>) => void,
	campaignId: string,
	isCancelled: () => boolean,
): { fail: () => void; cancel: () => void } {
	const fail = () => {
		if (isCancelled()) return;
		const current = get();
		if (current.activeCampaignId !== campaignId) return;
		if (
			current.remoteLoadedCampaignId === campaignId &&
			current.remoteLoadError == null
		) {
			return;
		}
		set({
			isLoadingRemote: false,
			isRetryingBase: false,
			isBaseLoadSlow: false,
			remoteLoadError: BASE_LOAD_ERROR_MESSAGE,
			syncError: BASE_LOAD_ERROR_MESSAGE,
		});
	};
	const timer = setTimeout(fail, CAMPAIGN_SWITCH_TIMEOUT_MS);
	return {
		fail,
		cancel: () => {
			clearTimeout(timer);
		},
	};
}

let bootstrapToken = 0;
/** Descarta o resultado de uma carga da mesa substituída por outra. */
let remoteLoadToken = 0;
/** Quantas vezes reportBaseLoadError rodou. Separa teto de falha real. */
let baseLoadFailureSeq = 0;

export interface SyncSlice {
	isLoadingRemote: boolean;
	syncError: string | null;
	/** Erro da última carga da mesa ativa (não inclui erros de escrita). */
	remoteLoadError: string | null;
	/** Mesa cujos dados remotos já chegaram nesta sessão (null = nenhuma ainda). */
	remoteLoadedCampaignId: string | null;
	baseLoadError: string | null;
	/** loadCampaigns passou de ~20s e ainda não respondeu. */
	isBaseLoadSlow: boolean;
	isRetryingBase: boolean;
	baseRetryNonce: number;
	reportBaseLoadError: () => void;
	bootstrapCampaignData: () => Promise<void>;
	retryBaseLoad: () => Promise<void>;
	activityLog: ActivityEntry[];
	/** Falha só da timeline (o resto da mesa carregou). */
	activityLoadError: string | null;
	/** Nova tentativa só da timeline em andamento. */
	isLoadingActivity: boolean;
	retryActivity: () => Promise<void>;
	userPlan: UserPlan;
	setUserPlan: (plan: UserPlan) => void;
	globalRecordsCount: number;
	loadRemoteData: () => Promise<void>;
	setupRealtime: () => () => void;
	clearLocalData: () => void;
	clearActiveCampaignEntities: () => void;
	clearActivity: () => void;
	notifications: AppNotification[];
	addNotification: (
		notification: Omit<AppNotification, "id" | "createdAt" | "read">,
	) => void;
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
		const creatorId = newRow.created_by ?? newRow.user_id ?? newRow.author_id;
		return creatorId === currentUserId;
	}
	if (eventType === "UPDATE" && newRow?.id && newRow.data) {
		const currentArray = get()[storeKey] as Array<
			{ id: string } & Record<string, unknown>
		>;
		const localItem = currentArray.find((item) => item.id === newRow.id);
		if (!localItem) return false;
		const incoming = newRow.data as Record<string, unknown>;
		return Object.keys(incoming).every(
			(key) => localItem[key] === incoming[key],
		);
	}
	if (eventType === "DELETE" && oldRow?.id) {
		const currentArray = get()[storeKey] as Array<{ id: string }>;
		return !currentArray.some((item) => item.id === oldRow.id);
	}
	return false;
}

function toMillis(value: unknown): number | undefined {
	if (typeof value !== "string" || !value) return undefined;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? undefined : timestamp;
}

function mapFlatWorldbuildingRow(
	table: string,
	row: Record<string, unknown>,
): Record<string, unknown> | null {
	if (table === "world_news") {
		return {
			id: row.id,
			worldId: row.world_id,
			authorId: row.author_id ?? "",
			title: row.title,
			body: row.body,
			category: row.category,
			audience: row.audience,
			campaignIds: row.campaign_ids ?? [],
			visibility: row.visibility,
			commentsLocked: row.comments_locked ?? false,
			createdAt: toMillis(row.created_at) ?? Date.now(),
			updatedAt: toMillis(row.updated_at),
		};
	}
	if (table === "news_comments") {
		return {
			id: row.id,
			newsId: row.news_id,
			authorId: row.author_id ?? "",
			parentId: row.parent_id ?? null,
			body: row.body,
			createdAt: toMillis(row.created_at) ?? Date.now(),
			updatedAt: toMillis(row.updated_at),
		};
	}
	if (table === "factions") {
		return {
			id: row.id,
			worldId: row.world_id,
			name: row.name,
			leader: row.leader,
			seat: row.seat,
			goals: row.goals,
			alignment: row.alignment,
			influence: row.influence,
			description: row.description,
			imageUrl: row.image_url ?? "",
			createdAt: toMillis(row.created_at) ?? Date.now(),
			updatedAt: toMillis(row.updated_at),
		};
	}
	if (table === "faction_reputations") {
		return {
			id: row.id,
			factionId: row.faction_id,
			campaignId: row.campaign_id,
			status: row.status,
			createdAt: toMillis(row.created_at) ?? Date.now(),
			updatedAt: toMillis(row.updated_at),
		};
	}
	return null;
}

const FLAT_WORLDBUILDING_TABLES = new Set([
	"world_news",
	"news_comments",
	"factions",
	"faction_reputations",
]);

export const createSyncSlice: StateCreator<RPGState, [], [], SyncSlice> = (
	set,
	get,
) => ({
	isLoadingRemote: false,
	syncError: null,
	remoteLoadError: null,
	remoteLoadedCampaignId: null,
	baseLoadError: null,
	isBaseLoadSlow: false,
	isRetryingBase: false,
	baseRetryNonce: 0,
	reportBaseLoadError: () => {
		baseLoadFailureSeq += 1;
		set((s) => ({
			baseLoadError: BASE_LOAD_ERROR_MESSAGE,
			syncError: BASE_LOAD_ERROR_MESSAGE,
			isLoadingRemote: false,
			isRetryingBase: false,
			isBaseLoadSlow: false,
			// Prazo estourado com as campanhas ainda pendentes: sai do
			// "Carregando campanhas..." da raiz em vez de ficar nele para sempre.
			campaignLoadStatus:
				s.campaignLoadStatus === "idle" || s.campaignLoadStatus === "loading"
					? "error"
					: s.campaignLoadStatus,
		}));
	},
	bootstrapCampaignData: async () => {
		const token = ++bootstrapToken;
		const failureSeqAtStart = baseLoadFailureSeq;
		// Nova tentativa: o aviso de lentidão só volta depois de ~20s desta carga.
		set({ isBaseLoadSlow: false });
		let campaignsSettled = false;
		let ceilingSeq: number | null = null;
		// Timers só de loadCampaigns, não estado derivado de render: ~20s avisa
		// lentidão sem trocar o skeleton; ~60s ou erro real vira falha.
		// loadRemoteData (depois das campanhas) usa o prazo de ~10s da troca.
		const slowTimer = setTimeout(() => {
			if (token !== bootstrapToken || campaignsSettled) return;
			set({ isBaseLoadSlow: true });
		}, BASE_LOAD_SLOW_MS);
		const ceilingTimer = setTimeout(() => {
			if (token !== bootstrapToken || campaignsSettled) return;
			get().reportBaseLoadError();
			ceilingSeq = baseLoadFailureSeq;
		}, BASE_LOAD_TIMEOUT_MS);
		const clearCampaignTimers = () => {
			clearTimeout(slowTimer);
			clearTimeout(ceilingTimer);
		};
		try {
			await get().loadCampaigns();
			campaignsSettled = true;
			clearCampaignTimers();
			if (token !== bootstrapToken) return;
			const state = get();
			const onlyCeilingFailed =
				ceilingSeq != null &&
				baseLoadFailureSeq === ceilingSeq &&
				baseLoadFailureSeq === failureSeqAtStart + 1;
			const realFailure =
				state.campaignLoadStatus !== "ready" ||
				(state.baseLoadError != null && !onlyCeilingFailed);
			if (realFailure) {
				// Falha das campanhas, do plano do mestre ou dos convites: estado de
				// erro global (antes a falha das campanhas deixava o painel em "loading").
				get().reportBaseLoadError();
				return;
			}
			// Campanhas chegaram (mesmo depois do teto): some lentidão e o erro do prazo.
			set({
				isBaseLoadSlow: false,
				baseLoadError: null,
				syncError: null,
			});
			const fresh = get();
			if (
				fresh.campaigns.length > 0 &&
				!fresh.activeCampaignId &&
				!fresh.activeWorldId
			) {
				await get().switchCampaign(fresh.campaigns[0].id);
			}
			if (token !== bootstrapToken) return;
			const campaignId = get().activeCampaignId;
			const deadline = campaignId
				? armCampaignDataDeadline(
						get,
						set,
						campaignId,
						() => token !== bootstrapToken,
					)
				: null;
			try {
				await get().loadRemoteData();
			} finally {
				deadline?.cancel();
			}
			if (token !== bootstrapToken) return;
			if (
				get().remoteLoadError === null &&
				get().campaignLoadStatus === "ready"
			) {
				set({
					isBaseLoadSlow: false,
					baseLoadError: null,
					syncError: null,
				});
			} else {
				set({ isBaseLoadSlow: false });
			}
		} catch {
			campaignsSettled = true;
			if (token === bootstrapToken) get().reportBaseLoadError();
		} finally {
			campaignsSettled = true;
			clearCampaignTimers();
			if (token === bootstrapToken) set({ isRetryingBase: false });
		}
	},
	retryBaseLoad: async () => {
		const before = get();
		// Campanhas já confirmadas e a falha é da mesa (troca ou loadRemoteData):
		// refaz essa carga, com o prazo de ~10s, sem repetir o teto de 60s.
		const retrySwitch =
			before.baseLoadError == null &&
			before.hasLoadedCampaigns &&
			before.campaignLoadStatus === "ready" &&
			before.activeCampaignId != null;
		set((s) => ({
			baseLoadError: null,
			remoteLoadError: null,
			syncError: null,
			isBaseLoadSlow: false,
			isRetryingBase: true,
			isLoadingRemote: true,
			baseRetryNonce: s.baseRetryNonce + 1,
		}));
		if (retrySwitch && before.activeCampaignId) {
			bootstrapToken += 1;
			try {
				await get().switchCampaign(before.activeCampaignId);
			} finally {
				if (get().isRetryingBase) set({ isRetryingBase: false });
			}
			return;
		}
		await get().bootstrapCampaignData();
	},
	activityLog: [],
	activityLoadError: null,
	isLoadingActivity: false,
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
		const loadToken = ++remoteLoadToken;
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

		// Skeleton se não houver dado local ou se for nova tentativa após falha
		// (nunca spinner: a tela volta ao skeleton enquanto tenta de novo).
		if (!hasData || state.remoteLoadError !== null) {
			set({ isLoadingRemote: true, syncError: null, remoteLoadError: null });
		} else {
			set({ syncError: null, remoteLoadError: null });
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
			if (
				loadToken !== remoteLoadToken ||
				get().activeCampaignId !== startCampaignId
			) {
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
				items: ensureArray(remote.items).map((i) => {
					const item = { ...itemDefaults, ...(i as Partial<Item>) } as Item;
					return item.weapon
						? { ...item, weapon: normalizeItemWeapon(item.weapon) }
						: item;
				}) as Item[],
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
				activityLoadError: remote.activityLoadError ?? null,
				isLoadingActivity: false,
				factions: ensureArray(remote.factions).map((f) => ({
					...factionDefaults,
					worldId: "",
					...(f as Partial<Faction>),
				})) as Faction[],
				factionReputations: ensureArray(
					remote.factionReputations,
				) as FactionReputation[],
				worldNews: ensureArray(remote.worldNews).map((n) => ({
					...worldNewsDefaults,
					worldId: "",
					authorId: "",
					...(n as Partial<WorldNews>),
				})) as WorldNews[],
				newsComments: [] as NewsComment[],
				isLoadingRemote: false,
				remoteLoadedCampaignId: startCampaignId,
				remoteLoadError: null,
				syncError: null,
			});
		} catch {
			if (
				loadToken !== remoteLoadToken ||
				get().activeCampaignId !== startCampaignId
			) {
				return;
			}
			set({
				isLoadingRemote: false,
				syncError: BASE_LOAD_ERROR_MESSAGE,
				remoteLoadError: BASE_LOAD_ERROR_MESSAGE,
			});
		}
	},
	retryActivity: async () => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) return;
		set({ isLoadingActivity: true, activityLoadError: null });
		try {
			const activityLog = await loadRemoteActivity(campaignId);
			if (get().activeCampaignId !== campaignId) return;
			set({ activityLog, isLoadingActivity: false });
		} catch (error) {
			if (get().activeCampaignId !== campaignId) return;
			set({
				isLoadingActivity: false,
				activityLoadError: remoteErrorMessage(error),
			});
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
						factions: "factions",
						faction_reputations: "factionReputations",
						world_news: "worldNews",
						news_comments: "newsComments",
					};

					if (table === "invites") {
						void get().loadInvites();
						return;
					}
					if (table === "memberships") {
						void get().loadCampaigns();
						return;
					}

					const storeKey = tableToKey[table];
					if (!storeKey) return;

					const activeCampaignId = get().activeCampaignId;
					if (!activeCampaignId) return;

					const activeCamp = get().campaigns.find(
						(c) => c.id === activeCampaignId,
					);
					const activeWorldId = activeCamp?.worldId;

					const worldEntityTables = new Set([
						"npcs",
						"items",
						"locations",
						"lores",
						"factions",
						"world_news",
						// Galeria de imagens é do mundo (migração 0036 traz `world_id`).
						"image_assets",
					]);

					const rowCampaignId =
						eventType === "DELETE"
							? oldRow && "campaign_id" in oldRow
								? (oldRow as { campaign_id: string }).campaign_id
								: null
							: newRow && "campaign_id" in newRow
								? (newRow as { campaign_id: string }).campaign_id
								: null;

					const rowWorldId =
						eventType === "DELETE"
							? oldRow && "world_id" in oldRow
								? (oldRow as { world_id: string }).world_id
								: null
							: newRow && "world_id" in newRow
								? (newRow as { world_id: string }).world_id
								: null;

					const rowNewsId =
						eventType === "DELETE"
							? oldRow && "news_id" in oldRow
								? (oldRow as { news_id: string }).news_id
								: null
							: newRow && "news_id" in newRow
								? (newRow as { news_id: string }).news_id
								: null;

					const belongsToActiveCampaign = rowCampaignId === activeCampaignId;
					const belongsToActiveWorld =
						worldEntityTables.has(table) &&
						rowWorldId != null &&
						rowWorldId === activeWorldId;

					const belongsToActiveWorldNews =
						table === "news_comments" &&
						rowNewsId != null &&
						get().worldNews.some(
							(n) => n.id === rowNewsId && n.worldId === activeWorldId,
						);

					const belongsToWorldCampaignReputation =
						table === "faction_reputations" &&
						rowCampaignId != null &&
						get().campaigns.some(
							(c) => c.id === rowCampaignId && c.worldId === activeWorldId,
						);

					const countTables = [
						"characters",
						"npcs",
						"sessions",
						"items",
						"locations",
						"lores",
					];
					const isCountTable = countTables.includes(table);

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

					const isRelevant =
						belongsToActiveCampaign ||
						belongsToActiveWorld ||
						belongsToActiveWorldNews ||
						belongsToWorldCampaignReputation;

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
						isRelevant &&
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

					if (!isRelevant) {
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

							let processed: Record<string, unknown>;
							const flatMapped = FLAT_WORLDBUILDING_TABLES.has(table)
								? mapFlatWorldbuildingRow(table, newRow)
								: null;
							if (flatMapped) {
								processed = flatMapped;
								// Reputações locais usam UUID próprio; o trigger do DB
								// gera outro id. Deduplica pela chave natural.
								if (table === "faction_reputations") {
									const factionId = processed.factionId as string;
									const campaignId = processed.campaignId as string;
									const withoutLocalSeed = currentArray.filter(
										(item) =>
											!(
												"factionId" in item &&
												item.factionId === factionId &&
												item.campaignId === campaignId
											),
									);
									return {
										[storeKey]: [processed, ...withoutLocalSeed].slice(0, 1000),
									};
								}
							} else if (table === "activity_log") {
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
									worldId: newRow.world_id ?? undefined,
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

							const flatMapped = FLAT_WORLDBUILDING_TABLES.has(table)
								? mapFlatWorldbuildingRow(table, newRow)
								: null;
							if (flatMapped) {
								return {
									[storeKey]: currentArray.map((item) =>
										item.id === newRow.id ? { ...item, ...flatMapped } : item,
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
								[storeKey]: currentArray.filter(
									(item) => item.id !== oldRow.id,
								),
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
	clearLocalData: () => {
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
			factions: [],
			factionReputations: [],
			worldNews: [],
			newsComments: [],
			notifications: [],
			syncError: null,
			remoteLoadError: null,
			remoteLoadedCampaignId: null,
			baseLoadError: null,
			isBaseLoadSlow: false,
			isRetryingBase: false,
			activityLoadError: null,
			isLoadingActivity: false,
		});
		get().resetCampaigns();
	},
	/** Limpa entidades da mesa ativa sem derrubar campanhas/mundos/bootstrap. */
	clearActiveCampaignEntities: () => {
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
			factions: [],
			factionReputations: [],
			worldNews: [],
			newsComments: [],
			notifications: [],
			syncError: null,
			remoteLoadError: null,
			remoteLoadedCampaignId: null,
			baseLoadError: null,
			isBaseLoadSlow: false,
			isRetryingBase: false,
			activityLoadError: null,
			isLoadingActivity: false,
		});
	},
	clearActivity: () => set({ activityLog: [] }),
});
