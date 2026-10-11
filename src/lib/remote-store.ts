import type {
	Json,
	Tables,
	TablesInsert,
	TablesUpdate,
} from "./database.types";
import {
	fetchCampaignWorldId,
	loadWorldbuildingState,
} from "./remote-worldbuilding";
import { getSupabase, SUPABASE_TABLES } from "./supabase";

export type RemoteEntityKind =
	| "character"
	| "npc"
	| "session"
	| "item"
	| "location"
	| "lore"
	| "customTemplate";

export type RemoteActivityAction = "create" | "update" | "delete";

export interface RemoteActivityEntry {
	id: string;
	timestamp: number;
	action: RemoteActivityAction;
	entityKind: RemoteEntityKind;
	entityId: string;
	entityName: string;
}

export interface RemoteImageAsset {
	id: string;
	campaignId: string;
	/** Mundo da campanha dona (preenchido pela migração 0036). */
	worldId?: string;
	createdBy: string;
	name: string;
	url: string;
	storageKey?: string;
	mimeType: string;
	sizeBytes: number;
	width?: number;
	height?: number;
	isPrivate: boolean;
	createdAt: number;
	updatedAt?: number;
}

export interface RemoteStateSnapshot {
	characters: unknown[];
	npcs: unknown[];
	sessions: unknown[];
	items: unknown[];
	locations: unknown[];
	lores: unknown[];
	customTemplates: unknown[];
	imageAssets: RemoteImageAsset[];
	activityLog: RemoteActivityEntry[];
	factions: unknown[];
	factionReputations: unknown[];
	worldNews: unknown[];
}

type EntityTable =
	| "characters"
	| "npcs"
	| "sessions"
	| "items"
	| "locations"
	| "lores"
	| "custom_templates";

type EntityRow = Tables<EntityTable>;
type EntityInsert = TablesInsert<EntityTable>;
type EntityUpdate = TablesUpdate<EntityTable>;
type ActivityRow = Tables<"activity_log">;
type ActivityInsert = TablesInsert<"activity_log">;
type ImageAssetInsert = TablesInsert<"image_assets">;
type ImageAssetUpdate = TablesUpdate<"image_assets">;

function requireSupabase() {
	const supabase = getSupabase();
	if (!supabase) {
		throw new Error("Supabase não está configurado.");
	}
	return supabase;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJson(value: Record<string, unknown>): Json {
	return value as Json;
}

function stringValue(value: unknown, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
	return typeof value === "number" ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function isMissingImageAssetsTableError(error: unknown): boolean {
	if (!isRecord(error)) return false;
	const message = typeof error.message === "string" ? error.message : "";
	const code = typeof error.code === "string" ? error.code : "";
	return (
		code === "PGRST205" ||
		(message.includes("image_assets") && message.includes("schema cache"))
	);
}

function toTimestamp(value?: string | null): number | undefined {
	if (!value) return undefined;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? undefined : timestamp;
}

type WorldEntityTable = "npcs" | "items" | "locations" | "lores";

type WorldEntityRow = Tables<WorldEntityTable> & {
	is_secret?: boolean;
	created_by?: string | null;
};

function worldEntityRowFields(
	entity: Record<string, unknown>,
): Record<string, unknown> {
	const fields: Record<string, unknown> = {};
	if (typeof entity.worldId === "string" && entity.worldId.trim() !== "") {
		fields.world_id = entity.worldId.trim();
	}
	if (typeof entity.publicationScope === "string" && entity.publicationScope) {
		fields.publication_scope = entity.publicationScope;
	}
	if (typeof entity.visibility === "string" && entity.visibility) {
		fields.visibility = entity.visibility;
	}
	if (Array.isArray(entity.campaignIds)) {
		fields.campaign_ids = entity.campaignIds.filter(
			(id) => typeof id === "string" && id.trim() !== "",
		);
	}
	return fields;
}

const WORLD_ENTITY_COLUMNS =
	"id,data,created_at,updated_at,created_by,world_id,publication_scope,visibility,campaign_ids";

const LORE_WORLD_ENTITY_COLUMNS = `${WORLD_ENTITY_COLUMNS},is_secret`;

function fromWorldEntityRow(
	row: WorldEntityRow,
	table: WorldEntityTable,
): unknown {
	const entity = fromEntityRow(row) as Record<string, unknown>;
	const visibility =
		row.visibility ??
		(table === "lores" && row.is_secret ? "master_secret" : "public");
	return {
		...entity,
		worldId: row.world_id ?? undefined,
		publicationScope: row.publication_scope ?? "restricted",
		visibility,
		campaignIds: (row.campaign_ids ?? []).filter(
			(id): id is string => typeof id === "string" && id.trim() !== "",
		),
		...(row.created_by ? { createdBy: row.created_by } : {}),
		...(table === "lores"
			? { isSecret: row.is_secret ?? visibility === "master_secret" }
			: {}),
	};
}

function fromActivityRow(row: ActivityRow): RemoteActivityEntry {
	return {
		id: row.id,
		timestamp: toTimestamp(row.created_at) ?? Date.now(),
		action: row.action as RemoteActivityAction,
		entityKind: row.entity_kind as RemoteEntityKind,
		entityId: row.entity_id,
		entityName: row.entity_name,
	};
}

function fromImageAssetRow(row: Record<string, unknown>): RemoteImageAsset {
	return {
		id: stringValue(row.id, crypto.randomUUID()),
		campaignId: stringValue(row.campaign_id, ""),
		worldId: typeof row.world_id === "string" ? row.world_id : undefined,
		createdBy: stringValue(row.created_by, ""),
		name: stringValue(row.name, "Imagem sem nome"),
		url: stringValue(row.url, ""),
		storageKey:
			typeof row.storage_key === "string" ? row.storage_key : undefined,
		mimeType: stringValue(row.mime_type, "image/webp"),
		sizeBytes: numberValue(row.size_bytes, 0),
		width: typeof row.width === "number" ? row.width : undefined,
		height: typeof row.height === "number" ? row.height : undefined,
		isPrivate: booleanValue(row.is_private, false),
		createdAt: toTimestamp(row.created_at as string | null) ?? Date.now(),
		updatedAt: toTimestamp(row.updated_at as string | null),
	};
}

function tableFor(kind: RemoteEntityKind): EntityTable {
	const tables: Record<RemoteEntityKind, EntityTable> = {
		character: SUPABASE_TABLES.characters,
		npc: SUPABASE_TABLES.npcs,
		session: SUPABASE_TABLES.sessions,
		item: SUPABASE_TABLES.items,
		location: SUPABASE_TABLES.locations,
		lore: SUPABASE_TABLES.lores,
		customTemplate: SUPABASE_TABLES.customTemplates,
	};
	return tables[kind];
}

function entityName(
	kind: RemoteEntityKind,
	entity: Record<string, unknown>,
): string {
	if (kind === "character" && typeof entity.characterName === "string") {
		return entity.characterName;
	}
	if (kind === "session" && typeof entity.title === "string") {
		return entity.title;
	}
	if (kind === "lore" && typeof entity.title === "string") {
		return entity.title;
	}
	if (typeof entity.name === "string") {
		return entity.name;
	}
	return "";
}

function rowFor(
	kind: RemoteEntityKind,
	entity: Record<string, unknown>,
	campaignId: string,
): EntityInsert {
	const base = {
		id: stringValue(entity.id, crypto.randomUUID()),
		data: toJson(entity),
		campaign_id: campaignId,
	};

	switch (kind) {
		case "character": {
			// `createdBy` é só leitura (coluna created_by); não vai para `data`.
			const { createdBy: _createdBy, ...characterData } = entity;
			return {
				...base,
				data: toJson(characterData),
				name: entityName(kind, entity),
				system: stringValue(entity.system, "generic"),
			};
		}
		case "npc":
			return {
				...base,
				...worldEntityRowFields(entity),
				name: entityName(kind, entity),
				importance: stringValue(entity.importance, "supporting"),
			};
		case "session":
			return {
				...base,
				title: entityName(kind, entity),
				session_number: numberValue(entity.number, 1),
				session_date: stringValue(entity.date, ""),
			};
		case "item":
			return {
				...base,
				...worldEntityRowFields(entity),
				name: entityName(kind, entity),
				item_type: stringValue(entity.type, ""),
				rarity: stringValue(entity.rarity, "comum"),
			};
		case "location":
			return {
				...base,
				...worldEntityRowFields(entity),
				name: entityName(kind, entity),
				location_type: stringValue(entity.type, ""),
				region: stringValue(entity.region, ""),
			};
		case "lore":
			return {
				...base,
				...worldEntityRowFields(entity),
				title: entityName(kind, entity),
				category: stringValue(entity.category, ""),
				importance: stringValue(entity.importance, "supporting"),
				is_secret: booleanValue(
					entity.isSecret,
					entity.visibility === "master_secret",
				),
			};
		case "customTemplate":
			return {
				...base,
				name: entityName(kind, entity),
				description: stringValue(entity.description, ""),
			};
	}
}

async function insertEntityRow(
	kind: RemoteEntityKind,
	row: EntityInsert,
): Promise<void> {
	const supabase = requireSupabase();

	switch (kind) {
		case "character": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.characters)
				.insert(row as TablesInsert<"characters">);
			if (error) throw error;
			return;
		}
		case "npc": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.npcs)
				.insert(row as TablesInsert<"npcs">);
			if (error) throw error;
			return;
		}
		case "session": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.sessions)
				.insert(row as TablesInsert<"sessions">);
			if (error) throw error;
			return;
		}
		case "item": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.items)
				.insert(row as TablesInsert<"items">);
			if (error) throw error;
			return;
		}
		case "location": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.locations)
				.insert(row as TablesInsert<"locations">);
			if (error) throw error;
			return;
		}
		case "lore": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.lores)
				.insert(row as TablesInsert<"lores">);
			if (error) throw error;
			return;
		}
		case "customTemplate": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.customTemplates)
				.insert(row as TablesInsert<"custom_templates">);
			if (error) throw error;
			return;
		}
	}
}

async function updateEntityRow(
	kind: RemoteEntityKind,
	id: string,
	row: EntityUpdate,
): Promise<void> {
	const supabase = requireSupabase();

	switch (kind) {
		case "character": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.characters)
				.update(row as TablesUpdate<"characters">)
				.eq("id", id);
			if (error) throw error;
			return;
		}
		case "npc": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.npcs)
				.update(row as TablesUpdate<"npcs">)
				.eq("id", id);
			if (error) throw error;
			return;
		}
		case "session": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.sessions)
				.update(row as TablesUpdate<"sessions">)
				.eq("id", id);
			if (error) throw error;
			return;
		}
		case "item": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.items)
				.update(row as TablesUpdate<"items">)
				.eq("id", id);
			if (error) throw error;
			return;
		}
		case "location": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.locations)
				.update(row as TablesUpdate<"locations">)
				.eq("id", id);
			if (error) throw error;
			return;
		}
		case "lore": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.lores)
				.update(row as TablesUpdate<"lores">)
				.eq("id", id);
			if (error) throw error;
			return;
		}
		case "customTemplate": {
			const { error } = await supabase
				.from(SUPABASE_TABLES.customTemplates)
				.update(row as TablesUpdate<"custom_templates">)
				.eq("id", id);
			if (error) throw error;
			return;
		}
	}
}

function fromEntityRow(row: EntityRow): unknown {
	const data = isRecord(row.data) ? row.data : {};
	const fallback: Record<string, unknown> = {
		id: row.id,
		createdAt: toTimestamp(row.created_at) ?? Date.now(),
	};
	const updatedAt = toTimestamp(row.updated_at);
	if (updatedAt) fallback.updatedAt = updatedAt;
	return { ...fallback, ...data };
}

async function selectEntities(
	table: EntityTable,
	campaignId: string,
): Promise<unknown[]> {
	const supabase = requireSupabase();
	const isCharacters = table === SUPABASE_TABLES.characters;
	const { data, error } = await supabase
		.from(table)
		.select(
			isCharacters
				? "id,data,created_at,updated_at,created_by"
				: "id,data,created_at,updated_at",
		)
		.eq("campaign_id", campaignId)
		.order("updated_at", { ascending: false });
	if (error) throw error;
	const rows = (data ?? []) as unknown as (EntityRow & {
		created_by?: string | null;
	})[];
	if (!isCharacters) return rows.map(fromEntityRow);
	// Ficha: `createdBy` vem só da coluna (quem pode vincular itens).
	return rows.map((row) => {
		const entity = fromEntityRow(row) as Record<string, unknown>;
		delete entity.createdBy;
		return row.created_by ? { ...entity, createdBy: row.created_by } : entity;
	});
}

async function selectWorldEntities(
	table: WorldEntityTable,
	worldId: string,
): Promise<unknown[]> {
	const supabase = requireSupabase();
	const columns =
		table === "lores" ? LORE_WORLD_ENTITY_COLUMNS : WORLD_ENTITY_COLUMNS;
	const { data, error } = await supabase
		.from(table)
		.select(columns)
		.eq("world_id", worldId)
		.order("updated_at", { ascending: false });
	if (error) throw error;
	return ((data ?? []) as unknown as WorldEntityRow[]).map((row) =>
		fromWorldEntityRow(row, table),
	);
}

const IMAGE_ASSET_COLUMNS =
	"id,campaign_id,created_by,name,url,storage_key,mime_type,size_bytes,width,height,is_private,created_at,updated_at";

/** `image_assets.world_id` ainda não existe (migração 0036 não aplicada). */
function isMissingImageAssetWorldColumn(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const record = error as { code?: unknown; message?: unknown };
	if (record.code === "42703") return true;
	const message = typeof record.message === "string" ? record.message : "";
	return message.includes("world_id");
}

/**
 * Imagens da galeria. Com `worldId`, traz as imagens de todas as campanhas do
 * mundo (a RLS decide o que cada um vê). Sem a coluna `world_id` no banco,
 * cai para as imagens da campanha ativa.
 */
export async function loadRemoteImageAssets(
	campaignId: string,
	worldId?: string | null,
): Promise<RemoteImageAsset[]> {
	const supabase = requireSupabase();

	if (worldId) {
		const { data, error } = await supabase
			.from(SUPABASE_TABLES.imageAssets)
			.select(`${IMAGE_ASSET_COLUMNS},world_id`)
			.eq("world_id", worldId)
			.order("updated_at", { ascending: false });

		if (!error) {
			return ((data ?? []) as Record<string, unknown>[]).map(fromImageAssetRow);
		}
		if (isMissingImageAssetsTableError(error)) return [];
		if (!isMissingImageAssetWorldColumn(error)) throw error;
	}

	const { data, error } = await supabase
		.from(SUPABASE_TABLES.imageAssets)
		.select(IMAGE_ASSET_COLUMNS)
		.eq("campaign_id", campaignId)
		.order("updated_at", { ascending: false });

	if (error) {
		if (isMissingImageAssetsTableError(error)) return [];
		throw error;
	}
	return ((data ?? []) as Record<string, unknown>[]).map(fromImageAssetRow);
}

export async function loadRemoteState(
	campaignId: string,
): Promise<RemoteStateSnapshot> {
	const worldId = await fetchCampaignWorldId(campaignId);

	const activityQuery = requireSupabase()
		.from(SUPABASE_TABLES.activity)
		.select("id,action,entity_kind,entity_id,entity_name,created_at")
		.eq("campaign_id", campaignId);

	const [
		characters,
		sessions,
		customTemplates,
		imageAssets,
		activityRows,
		npcs,
		items,
		locations,
		lores,
		worldbuilding,
	] = await Promise.all([
		selectEntities(SUPABASE_TABLES.characters, campaignId),
		selectEntities(SUPABASE_TABLES.sessions, campaignId),
		selectEntities(SUPABASE_TABLES.customTemplates, campaignId),
		loadRemoteImageAssets(campaignId, worldId),
		activityQuery.order("created_at", { ascending: false }).limit(200),
		worldId
			? selectWorldEntities(SUPABASE_TABLES.npcs, worldId)
			: Promise.resolve([]),
		worldId
			? selectWorldEntities(SUPABASE_TABLES.items, worldId)
			: Promise.resolve([]),
		worldId
			? selectWorldEntities(SUPABASE_TABLES.locations, worldId)
			: Promise.resolve([]),
		worldId
			? selectWorldEntities(SUPABASE_TABLES.lores, worldId)
			: Promise.resolve([]),
		worldId ? loadWorldbuildingState(worldId) : Promise.resolve(null),
	]);

	if (activityRows.error) throw activityRows.error;

	return {
		characters,
		npcs,
		sessions,
		items,
		locations,
		lores,
		customTemplates,
		imageAssets,
		activityLog: ((activityRows.data ?? []) as ActivityRow[]).map(
			fromActivityRow,
		),
		factions: worldbuilding?.factions ?? [],
		factionReputations: worldbuilding?.factionReputations ?? [],
		worldNews: worldbuilding?.worldNews ?? [],
	};
}

export async function createRemoteImageAsset(
	asset: RemoteImageAsset,
	campaignId: string,
): Promise<RemoteImageAsset> {
	const supabase = requireSupabase();
	const row: ImageAssetInsert = {
		id: asset.id,
		campaign_id: campaignId,
		name: asset.name,
		url: asset.url,
		storage_key: asset.storageKey ?? null,
		mime_type: asset.mimeType,
		size_bytes: asset.sizeBytes,
		width: asset.width ?? null,
		height: asset.height ?? null,
		is_private: asset.isPrivate,
	};
	if (asset.createdBy) row.created_by = asset.createdBy;

	const { error } = await supabase
		.from(SUPABASE_TABLES.imageAssets)
		.insert(row);
	if (error) throw error;
	return asset;
}

export async function updateRemoteImageAsset(
	id: string,
	patch: Partial<Pick<RemoteImageAsset, "name" | "isPrivate">>,
): Promise<void> {
	const supabase = requireSupabase();
	const row: ImageAssetUpdate = {};
	if (typeof patch.name === "string") row.name = patch.name;
	if (typeof patch.isPrivate === "boolean") row.is_private = patch.isPrivate;

	const { error } = await supabase
		.from(SUPABASE_TABLES.imageAssets)
		.update(row)
		.eq("id", id);
	if (error) throw error;
}

export async function deleteRemoteImageAsset(id: string): Promise<void> {
	const supabase = requireSupabase();
	const { error } = await supabase
		.from(SUPABASE_TABLES.imageAssets)
		.delete()
		.eq("id", id);
	if (error) throw error;
}

export async function createRemoteEntity<T extends { id: string }>(
	kind: RemoteEntityKind,
	entity: T,
	campaignId: string,
): Promise<T> {
	const row = rowFor(kind, entity as Record<string, unknown>, campaignId);
	await insertEntityRow(kind, row);
	return entity;
}

export async function updateRemoteEntity<T extends { id: string }>(
	kind: RemoteEntityKind,
	entity: T,
	campaignId: string,
): Promise<T> {
	const row = rowFor(kind, entity as Record<string, unknown>, campaignId);
	await updateEntityRow(kind, entity.id, row);
	return entity;
}

export async function deleteRemoteEntity(
	kind: RemoteEntityKind,
	id: string,
): Promise<void> {
	const supabase = requireSupabase();
	const table = tableFor(kind);
	const { error } = await supabase.from(table).delete().eq("id", id);
	if (error) throw error;
}

export async function fetchGlobalTotalCount(
	campaignId?: string | null,
): Promise<number> {
	const supabase = requireSupabase();

	if (!campaignId) return 0;

	// 1. Encontrar o owner_id desta campanha
	const { data: campaignData, error: campaignError } = await supabase
		.from(SUPABASE_TABLES.campaigns)
		.select("owner_id")
		.eq("id", campaignId)
		.maybeSingle();

	if (campaignError || !campaignData?.owner_id) return 0;
	const ownerId = campaignData.owner_id;

	// 2. Encontrar todas as campanhas pertencentes a esse mesmo owner
	const { data: ownerCampaigns, error: ownerCampaignsError } = await supabase
		.from(SUPABASE_TABLES.campaigns)
		.select("id")
		.eq("owner_id", ownerId);

	if (ownerCampaignsError || !ownerCampaigns || ownerCampaigns.length === 0)
		return 0;
	const campaignIds = ownerCampaigns.map((c) => c.id);

	const tables: EntityTable[] = [
		SUPABASE_TABLES.characters,
		SUPABASE_TABLES.npcs,
		SUPABASE_TABLES.sessions,
		SUPABASE_TABLES.items,
		SUPABASE_TABLES.locations,
		SUPABASE_TABLES.lores,
	];

	// 3. Contar todos os registros criados em qualquer uma dessas campanhas (independente de quem criou)
	const counts = await Promise.all(
		tables.map((table) =>
			supabase
				.from(table)
				.select("*", { count: "exact", head: true })
				.in("campaign_id", campaignIds)
				.then(({ count }) => count || 0),
		),
	);

	return counts.reduce((acc, count) => acc + count, 0);
}

export async function createRemoteActivity(
	entry: Omit<RemoteActivityEntry, "id" | "timestamp">,
	campaignId: string,
): Promise<void> {
	const supabase = requireSupabase();
	const row: ActivityInsert = {
		action: entry.action,
		campaign_id: campaignId,
		entity_kind: entry.entityKind,
		entity_id: entry.entityId,
		entity_name: entry.entityName,
	};
	const { error } = await supabase.from(SUPABASE_TABLES.activity).insert(row);
	if (error) throw error;
}
