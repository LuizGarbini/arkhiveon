import type { Database, Json } from "@/lib/database.types";
import type { VTTToken } from "./types";

export const TOKEN_PLACE_FAILED =
	"Não foi possível colocar o token. Tente novamente.";
export const TOKEN_PLACE_NEEDS_GM =
	"É necessário estar conectado como mestre para colocar tokens.";

type TokenInsert = Database["public"]["Tables"]["vtt_tokens"]["Insert"];
type TokenRow = Database["public"]["Tables"]["vtt_tokens"]["Row"];

export interface TokenInsertError {
	code?: string;
	message?: string;
}

export type TokenInsertFn = (
	payload: TokenInsert,
) => PromiseLike<{ data: TokenRow | null; error: TokenInsertError | null }>;

export function requirePlaceContext<T>(input: {
	client: T | null;
	sceneId: string | null | undefined;
	isGM: boolean;
}): { client: T; sceneId: string } {
	if (!input.client || !input.sceneId || !input.isGM) {
		throw new Error(TOKEN_PLACE_NEEDS_GM);
	}
	return { client: input.client, sceneId: input.sceneId };
}

export function isMissingTempHpColumn(
	error: TokenInsertError | null | undefined,
): boolean {
	if (!error) return false;
	if (error.code === "42703" || error.code === "PGRST204") return true;
	return Boolean(error.message?.includes("temp_hp"));
}

export function buildTokenInsertPayload(
	sceneId: string,
	tokenData: Partial<VTTToken>,
	hpColumns: { hp_current: number | null; hp_max: number | null },
): TokenInsert {
	return {
		scene_id: sceneId,
		character_id: tokenData.characterId || null,
		npc_id: tokenData.npcId || null,
		name: tokenData.name || "Token",
		avatar_url: tokenData.avatarUrl || null,
		layer: tokenData.layer || "token",
		x: tokenData.x || 0,
		y: tokenData.y || 0,
		size_cells: tokenData.sizeCells || 1.0,
		rotation: tokenData.rotation || 0,
		hp_current: hpColumns.hp_current,
		hp_max: hpColumns.hp_max,
		temp_hp: tokenData.tempHp ?? 0,
		elevation: tokenData.elevation || 0,
		conditions: (tokenData.conditions || []) as unknown as Json,
		auras: (tokenData.auras || []) as unknown as Json,
		vision_range: tokenData.visionRange || 6,
		is_locked: tokenData.isLocked || false,
		is_hidden: tokenData.isHidden || false,
		controlled_by: (tokenData.controlledBy || []) as unknown as Json,
	};
}

function withoutTempHp(payload: TokenInsert): TokenInsert {
	const next = { ...payload };
	delete next.temp_hp;
	return next;
}

export async function insertVttToken(
	insert: TokenInsertFn,
	payload: TokenInsert,
): Promise<TokenRow> {
	const first = await insert(payload);
	if (
		first.error &&
		isMissingTempHpColumn(first.error) &&
		Object.hasOwn(payload, "temp_hp")
	) {
		const retry = await insert(withoutTempHp(payload));
		if (retry.error || !retry.data) {
			console.error("Erro ao criar token:", retry.error);
			throw new Error(TOKEN_PLACE_FAILED);
		}
		return retry.data;
	}
	if (first.error || !first.data) {
		console.error("Erro ao criar token:", first.error);
		throw new Error(TOKEN_PLACE_FAILED);
	}
	return first.data;
}
