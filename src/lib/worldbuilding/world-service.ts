import type { TablesInsert, TablesUpdate } from "../database.types";
import { getSupabase } from "../supabase";
import type { World } from "../store/types";

export interface DefaultWorldResult {
	worldId: string;
	created: boolean;
}

function requireSupabase() {
	const supabase = getSupabase();
	if (!supabase) {
		throw new Error("Supabase não está configurado.");
	}
	return supabase;
}

function toTimestamp(value?: string | null): number | undefined {
	if (!value) return undefined;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? undefined : timestamp;
}

function mapWorldRow(row: {
	id: string;
	name: string;
	is_default: boolean;
	owner_user_id: string;
	created_at: string;
	updated_at: string;
}): World {
	return {
		id: row.id,
		name: row.name,
		isDefault: row.is_default,
		ownerUserId: row.owner_user_id,
		createdAt: toTimestamp(row.created_at) ?? Date.now(),
		updatedAt: toTimestamp(row.updated_at),
	};
}

/**
 * Obtém ou cria o Mundo Padrão do owner (§9.1).
 */
export async function resolveDefaultWorldId(
	ownerUserId: string,
): Promise<DefaultWorldResult> {
	const supabase = getSupabase();
	if (!supabase) {
		return { worldId: crypto.randomUUID(), created: true };
	}

	const db = requireSupabase();
	const { data: existing, error: fetchError } = await db
		.from("worlds")
		.select("id")
		.eq("owner_user_id", ownerUserId)
		.eq("is_default", true)
		.maybeSingle();

	if (fetchError) throw fetchError;
	if (existing?.id) {
		return { worldId: existing.id, created: false };
	}

	const worldId = crypto.randomUUID();
	const row: TablesInsert<"worlds"> = {
		id: worldId,
		owner_user_id: ownerUserId,
		name: "Mundo Padrão",
		is_default: true,
	};
	const { error: insertError } = await db.from("worlds").insert(row);

	if (insertError) throw insertError;
	return { worldId, created: true };
}

/** Mundos visíveis ao usuário (dono ou membro de alguma campanha). */
export async function loadAccessibleWorlds(): Promise<World[]> {
	const db = requireSupabase();
	const { data, error } = await db
		.from("worlds")
		.select("id,name,is_default,owner_user_id,created_at,updated_at")
		.order("created_at", { ascending: true });
	if (error) throw error;
	return (data ?? []).map(mapWorldRow);
}

export async function createRemoteWorld(input: {
	ownerUserId: string;
	name: string;
	isDefault?: boolean;
}): Promise<World> {
	const db = requireSupabase();
	const id = crypto.randomUUID();
	const row: TablesInsert<"worlds"> = {
		id,
		owner_user_id: input.ownerUserId,
		name: input.name.trim() || "Novo Mundo",
		is_default: input.isDefault ?? false,
	};
	const { data, error } = await db
		.from("worlds")
		.insert(row)
		.select("id,name,is_default,owner_user_id,created_at,updated_at")
		.single();
	if (error) throw error;
	return mapWorldRow(data);
}

export async function updateRemoteWorld(
	id: string,
	patch: { name?: string },
): Promise<void> {
	const db = requireSupabase();
	const row: TablesUpdate<"worlds"> = {};
	if (patch.name !== undefined) row.name = patch.name.trim();
	const { error } = await db.from("worlds").update(row).eq("id", id);
	if (error) throw error;
}

export async function deleteRemoteWorld(id: string): Promise<void> {
	const db = requireSupabase();
	const { data: world } = await db
		.from("worlds")
		.select("is_default")
		.eq("id", id)
		.maybeSingle();

	if (world?.is_default) {
		throw new Error("Não é possível excluir o Mundo Padrão.");
	}

	const { error } = await db.from("worlds").delete().eq("id", id);
	if (error) throw error;
}


/**
 * Resolve o world_id para uma nova campanha (§9.1).
 * - worldId informado → usa
 * - newWorldName → cria Mundo novo (não padrão)
 * - senão → Mundo Padrão
 */
export async function resolveWorldIdForNewCampaign(
	ownerUserId: string,
	options?: { worldId?: string; newWorldName?: string },
): Promise<{ worldId: string; createdWorld: World | null }> {
	if (options?.worldId) {
		return { worldId: options.worldId, createdWorld: null };
	}
	if (options?.newWorldName?.trim()) {
		const createdWorld = await createRemoteWorld({
			ownerUserId,
			name: options.newWorldName.trim(),
			isDefault: false,
		});
		return { worldId: createdWorld.id, createdWorld };
	}
	const { worldId } = await resolveDefaultWorldId(ownerUserId);
	return { worldId, createdWorld: null };
}
