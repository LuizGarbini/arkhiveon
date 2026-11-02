/**
 * Contexto da mesa: uma ficha (de quem pergunta, ou o alvo) e a cena ativa.
 * O select lista só as colunas que o resumo e a cena usam.
 */

import {
	type CharacterRow,
	summarizeCharacter,
} from "../_shared/ia-mesa-character.ts";
import { isCampaignId } from "../_shared/ia-mesa-guard.ts";
import {
	fogShapesFromPaths,
	type MesaContextInput,
	type MesaContextToken,
	type MesaFogShape,
} from "./logic.ts";

const CHARACTER_COLUMNS = "id, name, system, data";
const SCENE_COLUMNS = "id, name, fog_enabled";
const TOKEN_COLUMNS = "name, layer, x, y, is_hidden, character_id";
const FOG_COLUMNS = "revealed_paths";

export interface MesaQueryResult {
	data: unknown;
	error: unknown;
}

export interface MesaFilter {
	eq(column: string, value: unknown): MesaFilter;
	limit(count: number): MesaFilter;
	maybeSingle(): Promise<MesaQueryResult>;
	list(): Promise<MesaQueryResult>;
}

export interface MesaDb {
	from(table: string): {
		select(columns: string): MesaFilter;
	};
}

interface RawFilter {
	eq(column: string, value: unknown): RawFilter;
	limit(count: number): RawFilter;
	maybeSingle(): Promise<MesaQueryResult>;
	then: PromiseLike<MesaQueryResult>["then"];
}

/** Adapta o query builder do Supabase ao contrato estreito do loader. */
export function mesaDbFromClient(client: {
	from(table: string): { select(columns: string): RawFilter };
}): MesaDb {
	const wrap = (query: RawFilter): MesaFilter => ({
		eq(column, value) {
			return wrap(query.eq(column, value));
		},
		limit(count) {
			return wrap(query.limit(count));
		},
		maybeSingle() {
			return query.maybeSingle();
		},
		list() {
			return Promise.resolve(query);
		},
	});
	return {
		from(table) {
			return {
				select(columns) {
					return wrap(client.from(table).select(columns));
				},
			};
		},
	};
}

function asCharacter(value: unknown): CharacterRow | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const row = value as Record<string, unknown>;
	if (typeof row.id !== "string") return null;
	return {
		id: row.id,
		name: row.name,
		system: row.system,
		data: row.data,
	};
}

async function oneCharacter(
	db: MesaDb,
	campaignId: string,
	column: "user_id" | "created_by" | "id",
	value: string,
): Promise<CharacterRow | null> {
	const { data } = await db
		.from("characters")
		.select(CHARACTER_COLUMNS)
		.eq("campaign_id", campaignId)
		.eq(column, value)
		.limit(1)
		.maybeSingle();
	return asCharacter(data);
}

function mapTokens(value: unknown): MesaContextToken[] {
	if (!Array.isArray(value)) return [];
	const tokens: MesaContextToken[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const raw = item as Record<string, unknown>;
		const layer =
			raw.layer === "gm" || raw.layer === "map" || raw.layer === "token"
				? raw.layer
				: "token";
		tokens.push({
			name: typeof raw.name === "string" ? raw.name : "Token",
			layer,
			x: typeof raw.x === "number" ? raw.x : 0,
			y: typeof raw.y === "number" ? raw.y : 0,
			hidden: raw.is_hidden === true,
			characterId:
				typeof raw.character_id === "string" ? raw.character_id : null,
		});
	}
	return tokens;
}

export async function loadIaMesaCharacter(
	db: MesaDb,
	input: { campaignId: string; characterId: string },
): Promise<CharacterRow | null> {
	if (!isCampaignId(input.campaignId) || !isCampaignId(input.characterId)) {
		return null;
	}
	return oneCharacter(db, input.campaignId, "id", input.characterId);
}

/** Ficha de quem pergunta (user_id, senão created_by) e a cena com is_active. */
export async function loadIaMesaContext(
	db: MesaDb,
	input: { campaignId: string; userId: string; role?: "gm" | "player" },
): Promise<{ context: MesaContextInput; asker: CharacterRow | null }> {
	const role = input.role ?? "gm";
	let asker: CharacterRow | null = null;
	if (isCampaignId(input.campaignId) && isCampaignId(input.userId)) {
		asker = await oneCharacter(db, input.campaignId, "user_id", input.userId);
		if (!asker) {
			asker = await oneCharacter(
				db,
				input.campaignId,
				"created_by",
				input.userId,
			);
		}
	}

	let sceneName = "Sem cena ativa";
	let fogEnabled = false;
	let tokens: MesaContextToken[] = [];
	let fog: MesaFogShape[] = [];
	if (isCampaignId(input.campaignId)) {
		const { data: sceneRow } = await db
			.from("vtt_scenes")
			.select(SCENE_COLUMNS)
			.eq("campaign_id", input.campaignId)
			.eq("is_active", true)
			.maybeSingle();
		if (sceneRow && typeof sceneRow === "object" && !Array.isArray(sceneRow)) {
			const scene = sceneRow as Record<string, unknown>;
			if (typeof scene.id === "string") {
				sceneName =
					typeof scene.name === "string" && scene.name.trim()
						? scene.name
						: sceneName;
				fogEnabled = scene.fog_enabled === true;
				const { data: tokenRows } = await db
					.from("vtt_tokens")
					.select(TOKEN_COLUMNS)
					.eq("scene_id", scene.id)
					.list();
				tokens = mapTokens(tokenRows);
				const { data: fogRow } = await db
					.from("vtt_fog_states")
					.select(FOG_COLUMNS)
					.eq("scene_id", scene.id)
					.maybeSingle();
				const paths =
					fogRow && typeof fogRow === "object" && !Array.isArray(fogRow)
						? (fogRow as { revealed_paths?: unknown }).revealed_paths
						: [];
				fog = fogShapesFromPaths(paths);
			}
		}
	}

	return {
		asker,
		context: {
			role,
			sheetText: asker ? JSON.stringify(summarizeCharacter(asker)) : "",
			sceneName,
			gmNotes: "",
			fogEnabled,
			tokens,
			fog,
		},
	};
}
