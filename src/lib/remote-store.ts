import type {
	Json,
	Tables,
	TablesInsert,
	TablesUpdate,
} from "./database.types";
import { getSupabase, SUPABASE_TABLES } from "./supabase";

export type RemoteEntityKind =
	| "character"
	| "npc"
	| "session"
	| "item"
	| "location"
	| "lore";

export type RemoteActivityAction = "create" | "update" | "delete";

export interface RemoteActivityEntry {
	id: string;
	timestamp: number;
	action: RemoteActivityAction;
	entityKind: RemoteEntityKind;
	entityId: string;
	entityName: string;
}

export interface RemoteStateSnapshot {
	characters: unknown[];
	npcs: unknown[];
	sessions: unknown[];
	items: unknown[];
	locations: unknown[];
	lores: unknown[];
	activityLog: RemoteActivityEntry[];
}

type EntityTable =
	| "characters"
	| "npcs"
	| "sessions"
	| "items"
	| "locations"
	| "lores";

type EntityRow = Tables<EntityTable>;
type EntityInsert = TablesInsert<EntityTable>;
type EntityUpdate = TablesUpdate<EntityTable>;
type ActivityRow = Tables<"activity_log">;
type ActivityInsert = TablesInsert<"activity_log">;

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

function toTimestamp(value?: string | null): number | undefined {
	if (!value) return undefined;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? undefined : timestamp;
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

function fromActivityRow(row: ActivityRow): RemoteActivityEntry {
	return {
		id: row.id,
		timestamp: toTimestamp(row.created_at) ?? Date.now(),
		action: row.action,
		entityKind: row.entity_kind,
		entityId: row.entity_id,
		entityName: row.entity_name,
	};
}

function tableFor(kind: RemoteEntityKind): EntityTable {
	const tables = {
		character: SUPABASE_TABLES.characters,
		npc: SUPABASE_TABLES.npcs,
		session: SUPABASE_TABLES.sessions,
		item: SUPABASE_TABLES.items,
		location: SUPABASE_TABLES.locations,
		lore: SUPABASE_TABLES.lores,
	} as const;
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
	const base: Record<string, unknown> = {
		id: stringValue(entity.id, crypto.randomUUID()),
		data: toJson(entity),
		campaign_id: campaignId,
	};

	switch (kind) {
		case "character":
			return {
				...base,
				name: entityName(kind, entity),
				system: stringValue(entity.system, "generic"),
			};
		case "npc":
			return {
				...base,
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
				name: entityName(kind, entity),
				item_type: stringValue(entity.type, ""),
				rarity: stringValue(entity.rarity, "comum"),
			};
		case "location":
			return {
				...base,
				name: entityName(kind, entity),
				location_type: stringValue(entity.type, ""),
				region: stringValue(entity.region, ""),
			};
		case "lore":
			return {
				...base,
				title: entityName(kind, entity),
				category: stringValue(entity.category, ""),
				importance: stringValue(entity.importance, "supporting"),
				is_secret: booleanValue(entity.isSecret, false),
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
	}
}

async function selectEntities(table: EntityTable, campaignId: string): Promise<unknown[]> {
	const supabase = requireSupabase();
	const { data, error } = await supabase
		.from(table)
		.select("id,data,created_at,updated_at")
		.eq("campaign_id", campaignId)
		.order("updated_at", { ascending: false });
	if (error) throw error;
	return ((data ?? []) as EntityRow[]).map(fromEntityRow);
}

export async function loadRemoteState(campaignId: string): Promise<RemoteStateSnapshot> {
	const supabase = requireSupabase();

	const activityQuery = supabase
		.from(SUPABASE_TABLES.activity)
		.select("id,action,entity_kind,entity_id,entity_name,created_at")
		.eq("campaign_id", campaignId);

	const [characters, npcs, sessions, items, locations, lores, activityRows] =
		await Promise.all([
			selectEntities(SUPABASE_TABLES.characters, campaignId),
			selectEntities(SUPABASE_TABLES.npcs, campaignId),
			selectEntities(SUPABASE_TABLES.sessions, campaignId),
			selectEntities(SUPABASE_TABLES.items, campaignId),
			selectEntities(SUPABASE_TABLES.locations, campaignId),
			selectEntities(SUPABASE_TABLES.lores, campaignId),
			activityQuery
				.order("created_at", { ascending: false })
				.limit(200),
		]);

	if (activityRows.error) throw activityRows.error;

	return {
		characters,
		npcs,
		sessions,
		items,
		locations,
		lores,
		activityLog: ((activityRows.data ?? []) as ActivityRow[]).map(
			fromActivityRow,
		),
	};
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

export async function fetchGlobalTotalCount(): Promise<number> {
	const supabase = requireSupabase();
	const tables: EntityTable[] = [
		SUPABASE_TABLES.characters,
		SUPABASE_TABLES.npcs,
		SUPABASE_TABLES.sessions,
		SUPABASE_TABLES.items,
		SUPABASE_TABLES.locations,
		SUPABASE_TABLES.lores,
	];

	const counts = await Promise.all(
		tables.map((table) =>
			supabase
				.from(table)
				.select("*", { count: "exact", head: true })
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
		entity_kind: entry.entityKind,
		entity_id: entry.entityId,
		entity_name: entry.entityName,
	};
	(row as Record<string, unknown>).campaign_id = campaignId;
	const { error } = await supabase.from(SUPABASE_TABLES.activity).insert(row);
	if (error) throw error;
}
